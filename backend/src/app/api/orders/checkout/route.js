import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/db';
import Order from '@/models/Order';
import Item from '@/models/Item';
import Payment from '@/models/Payment';
import User from '@/models/User';
import { verifyAuth } from '@/lib/auth';
import { sendNotification } from '@/utils/notificationHelper';
import Cart from '@/models/Cart';
import {
  createRazorpayOrder,
  createRazorpayPaymentLink,
  getRazorpayLinkedAccountStatus,
  getRazorpayKeyId,
} from '@/lib/razorpay';
import { expirePaymentIfNeeded } from '@/lib/paymentLifecycle';

export const runtime = 'nodejs';

const orderPopulate = [
  { path: 'item_id', select: 'name price images listing_type rental_period' },
  { path: 'seller_id', select: 'full_name email phone student_id department year_semester' },
  { path: 'buyer_id', select: 'full_name email phone student_id department year_semester' },
];

async function releaseReservations(payment, reservations) {
  for (const reservation of reservations) {
    if (reservation.listingType === 'rent') {
      await Item.updateOne(
        { _id: reservation.itemId, rental_reservation_payment: payment._id.toString() },
        { $unset: { rental_reservation_payment: 1, rental_reservation_expires_at: 1 } }
      );
    } else {
      await Item.updateOne(
        { _id: reservation.itemId, reserved_payment_ids: payment._id.toString() },
        {
          $inc: { reserved_quantity: -reservation.quantity },
          $pull: { reserved_payment_ids: payment._id.toString() },
        }
      );
    }
  }
}

export async function POST(request) {
  let paymentToClean = null;
  const reservations = [];
  const createdOrders = [];
  const cashStockChanges = [];
  let cashOrdersCreated = false;
  try {
    const authResult = await verifyAuth(request);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status || 401 });
    }

    const payload = await request.json();
    const { items, payment_method, delivery_address, from_cart, idempotency_key } = payload;
    const buyerId = authResult.user.id;
    if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
      return NextResponse.json({ error: 'Provide between 1 and 50 checkout items' }, { status: 400 });
    }
    if (!['Razorpay', 'UPI', 'Cash'].includes(payment_method || 'Cash')) {
      return NextResponse.json({ error: 'Unsupported payment method' }, { status: 400 });
    }
    const isOnlinePayment = ['Razorpay', 'UPI'].includes(payment_method);
    const checkoutMode = payload.checkout_mode === 'hosted' ? 'hosted' : 'standard';
    if (isOnlinePayment && (
      typeof idempotency_key !== 'string'
      || !/^[A-Za-z0-9_-]{16,80}$/.test(idempotency_key)
    )) {
      return NextResponse.json({ error: 'A valid checkout request key is required' }, { status: 400 });
    }
    const seenItemIds = new Set();
    const normalizedItems = [];

    await connectDB();
    if (isOnlinePayment) {
      const existingPayment = await Payment.findOne({ buyer_id: buyerId, idempotency_key });
      if (existingPayment) {
        if (
          ['created', 'processing', 'pending_verification'].includes(existingPayment.status)
          && existingPayment.expires_at > new Date()
          && (existingPayment.razorpay_order_id || existingPayment.razorpay_payment_link_id)
        ) {
          const existingOrders = await Order.find({ payment_id: existingPayment._id }).populate(orderPopulate);
          return NextResponse.json({
            message: 'Existing payment session returned',
            orders: existingOrders,
            payment: {
              id: existingPayment._id,
              amount: existingPayment.amount,
              currency: existingPayment.currency,
              expires_at: existingPayment.expires_at,
              key_id: getRazorpayKeyId(),
              razorpay_order_id: existingPayment.razorpay_order_id,
              hosted_checkout_url: existingPayment.razorpay_payment_link_url,
            },
          }, { status: 200 });
        }
        return NextResponse.json({
          error: 'This checkout request was already used. Start a new payment attempt.',
          code: 'IDEMPOTENCY_KEY_USED',
        }, { status: 409 });
      }
    }

    const checkoutItemIds = items
      .map((item) => item?.id || item?._id)
      .filter((itemId) => mongoose.Types.ObjectId.isValid(itemId));
    const expiredPayments = await Payment.find({
      status: { $in: ['created', 'processing', 'pending_verification'] },
      expires_at: { $lte: new Date() },
      'inventory_reservations.item_id': { $in: checkoutItemIds },
    }).limit(25);
    for (const expiredPayment of expiredPayments) {
      await expirePaymentIfNeeded(expiredPayment);
    }

    for (const itemData of items) {
      const itemId = itemData?.id || itemData?._id;
      if (!mongoose.Types.ObjectId.isValid(itemId) || seenItemIds.has(itemId.toString())) {
        return NextResponse.json({ error: 'Checkout contains an invalid or duplicate item' }, { status: 400 });
      }
      seenItemIds.add(itemId.toString());
      const dbItem = await Item.findById(itemId);
      if (!dbItem || !dbItem.is_active || dbItem.is_suspended) {
        return NextResponse.json({ error: 'An item is no longer available' }, { status: 400 });
      }
      if (dbItem.seller_id.toString() === buyerId) {
        return NextResponse.json({ error: `You cannot buy your own item: ${dbItem.name}` }, { status: 400 });
      }

      const quantity = Number(itemData.quantity ?? 1);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        return NextResponse.json({ error: `Choose a valid quantity for ${dbItem.name}` }, { status: 400 });
      }
      if (dbItem.listing_type === 'rent' && quantity !== 1) {
        return NextResponse.json({ error: `Rental listings can only be ordered one at a time: ${dbItem.name}` }, { status: 400 });
      }

      const rentalDuration = dbItem.listing_type === 'rent' ? Number(itemData.rental_duration || 1) : null;
      if (dbItem.listing_type === 'rent' && (!Number.isInteger(rentalDuration) || rentalDuration < 1 || rentalDuration > 999)) {
        return NextResponse.json({ error: `Choose a valid rental duration for ${dbItem.name}` }, { status: 400 });
      }
      if (dbItem.listing_type === 'rent') {
        const activeRental = await Order.exists({
          item_id: dbItem._id,
          status: { $in: ['pending', 'delivered', 'rental_active', 'return_requested'] },
        });
        const activeReservation = dbItem.rental_reservation_expires_at > new Date()
          && Boolean(dbItem.rental_reservation_payment);
        if (activeRental || activeReservation) {
          return NextResponse.json({ error: `${dbItem.name} is currently rented or reserved` }, { status: 400 });
        }
      }

      const price = Number(dbItem.price);
      const totalPrice = Math.round(price * quantity * (rentalDuration || 1) * 100) / 100;
      if (!Number.isFinite(price) || price <= 0 || !Number.isSafeInteger(Math.round(totalPrice * 100))) {
        return NextResponse.json({ error: `Invalid price for ${dbItem.name}` }, { status: 400 });
      }
      normalizedItems.push({ dbItem, quantity, rentalDuration, totalPrice });
    }

    const amount = normalizedItems.reduce((sum, item) => sum + Math.round(item.totalPrice * 100), 0);
    if (!Number.isSafeInteger(amount) || amount < (isOnlinePayment ? 100 : 1)) {
      return NextResponse.json({ error: 'Checkout total is invalid' }, { status: 400 });
    }

    const itemMapById = new Map(normalizedItems.map((entry) => [entry.dbItem._id.toString(), entry]));

    let sellerUser = null;
    let sellerSettlements = [];
    if (isOnlinePayment) {
      const sellerIds = [...new Set(normalizedItems.map((entry) => entry.dbItem.seller_id.toString()))];
      
      // Calculate amount per seller
      for (const sellerId of sellerIds) {
        const sellerItems = normalizedItems.filter((entry) => entry.dbItem.seller_id.toString() === sellerId);
        const sellerAmount = sellerItems.reduce((sum, item) => sum + Math.round(item.totalPrice * 100), 0);
        
        const sellerDoc = await User.findById(sellerId).select('+razorpay_account_id bank_account upi_id');
        sellerSettlements.push({
          seller_id: sellerDoc ? sellerDoc._id : sellerId,
          razorpay_account_id: sellerDoc?.razorpay_account_id || null,
          amount: sellerAmount,
          status: 'held',
          reference_id: `cm_${new mongoose.Types.ObjectId().toString()}`,
        });
      }
    }

    const expiresAt = new Date(Date.now() + 16 * 60 * 1000);
    const payment = isOnlinePayment
      ? await Payment.create({
        buyer_id: buyerId,
        idempotency_key,
        amount,
        inventory_reservations: normalizedItems.map((entry) => ({
          item_id: entry.dbItem._id,
          listing_type: entry.dbItem.listing_type,
          quantity: entry.quantity,
        })),
        currency: 'INR',
        status: 'created',
        expires_at: expiresAt,
        from_cart: Boolean(from_cart),
        settlements: sellerSettlements,
      })
      : null;
    paymentToClean = payment;

    for (const entry of normalizedItems) {
      const { dbItem, quantity } = entry;
      if (dbItem.listing_type === 'rent') {
        if (isOnlinePayment) {
          const reserved = await Item.findOneAndUpdate(
            {
              _id: dbItem._id,
              is_active: true,
              reserved_payment_ids: { $ne: payment._id.toString() },
              $or: [
                { rental_reservation_payment: null },
                { rental_reservation_expires_at: { $lte: new Date() } },
              ],
            },
            {
              $set: {
                rental_reservation_payment: payment._id.toString(),
                rental_reservation_expires_at: expiresAt,
              },
            },
            { new: true }
          );
          if (!reserved) throw new Error(`${dbItem.name} was just reserved; please refresh and try again`);
          reservations.push({ itemId: dbItem._id, listingType: 'rent', quantity: 1 });
        }
      } else {
        const stockCondition = {
          _id: dbItem._id,
          is_active: true,
          $expr: {
            $gte: [
              { $subtract: ['$quantity', { $ifNull: ['$reserved_quantity', 0] }] },
              quantity,
            ],
          },
        };
        const update = isOnlinePayment
          ? {
            $inc: { reserved_quantity: quantity },
            $addToSet: { reserved_payment_ids: payment._id.toString() },
          }
          : { $inc: { quantity: -quantity } };
        const updatedItem = await Item.findOneAndUpdate(stockCondition, update, { new: true });
        if (!updatedItem) throw new Error(`${dbItem.name} no longer has enough stock`);
        if (isOnlinePayment) {
          reservations.push({ itemId: dbItem._id, listingType: 'sell', quantity });
        } else {
          cashStockChanges.push({ itemId: dbItem._id, quantity });
          if (updatedItem.quantity === 0) {
            updatedItem.is_active = false;
            updatedItem.marked_sold_at = new Date();
            await updatedItem.save();
          }
        }
      }
    }

    for (const entry of normalizedItems) {
      const order = await Order.create({
        buyer_id: buyerId,
        seller_id: entry.dbItem.seller_id,
        item_id: entry.dbItem._id,
        quantity: entry.quantity,
        total_price: entry.totalPrice,
        rental_duration: entry.rentalDuration,
        payment_method: isOnlinePayment ? 'Razorpay' : 'Cash',
        payment_status: isOnlinePayment ? 'pending_verification' : 'unpaid',
        payment_id: payment?._id || null,
        delivery_address: delivery_address || 'Campus Pickup',
        status: 'pending',
      });
      createdOrders.push(order);
    }
    if (!isOnlinePayment) cashOrdersCreated = true;

    let checkout = null;
    if (isOnlinePayment) {
      payment.order_ids = createdOrders.map((order) => order._id);
      if (checkoutMode === 'hosted') {
        const paymentLink = await createRazorpayPaymentLink({
          amount,
          currency: 'INR',
          referenceId: payment._id.toString(),
          description: `Campus Mart order ${payment._id.toString()}`,
          notes: { payment_id: payment._id.toString() },
          expiresAt,
        });
        payment.razorpay_payment_link_id = paymentLink.id;
        payment.razorpay_payment_link_url = paymentLink.short_url;
        if (paymentLink.order_id) {
          payment.razorpay_order_id = paymentLink.order_id;
        }
      } else {
        const razorpayOrder = await createRazorpayOrder({
          amount,
          currency: 'INR',
          receipt: payment._id.toString(),
          notes: { payment_id: payment._id.toString() },
          expiresAt,
        });
        payment.razorpay_order_id = razorpayOrder.id;
      }
      await payment.save();
      checkout = {
        id: payment._id,
        amount,
        currency: 'INR',
        key_id: getRazorpayKeyId(),
        razorpay_order_id: payment.razorpay_order_id,
        hosted_checkout_url: payment.razorpay_payment_link_url,
        expires_at: expiresAt,
      };
    } else {
      for (const order of createdOrders) {
        const itemEntry = itemMapById.get(order.item_id.toString());
        if (!itemEntry) continue;

        const dbItem = itemEntry.dbItem;
        await sendNotification({
          recipientId: dbItem.seller_id.toString(),
          senderId: buyerId,
          type: 'ORDER',
          title: 'New Order Received!',
          body: dbItem.listing_type === 'rent'
            ? `Someone requested to rent ${dbItem.name} for ${order.rental_duration} ${dbItem.rental_period || 'day'}${order.rental_duration === 1 ? '' : 's'}.`
            : `Someone just bought your item: ${dbItem.name}`,
          relatedId: order._id,
        }).catch((error) => console.error('Order notification failed:', error));
      }
      if (from_cart) {
        await Cart.findOneAndUpdate({ user: buyerId }, { items: [] }).catch((error) => {
          console.error('Order was created, but cart cleanup failed:', error);
        });
      }
    }

    const populatedOrders = await Order.find({ _id: { $in: createdOrders.map((order) => order._id) } })
      .populate(orderPopulate);
    return NextResponse.json({
      message: isOnlinePayment ? 'Payment session created' : 'Checkout successful',
      orders: populatedOrders,
      ...(checkout ? { payment: checkout } : {}),
    }, { status: 201 });
  } catch (error) {
    if (paymentToClean) {
      await releaseReservations(paymentToClean, reservations).catch((cleanupError) => {
        console.error('Failed to release payment reservations:', cleanupError);
      });
      if (createdOrders.length) {
        await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
      }
      paymentToClean.status = 'failed';
      paymentToClean.failure_reason = error.message;
      await paymentToClean.save().catch((cleanupError) => {
        console.error('Failed to mark checkout payment as failed:', cleanupError);
      });
    } else if (!cashOrdersCreated && cashStockChanges.length) {
      await Order.deleteMany({ _id: { $in: createdOrders.map((order) => order._id) } });
      for (const stockChange of cashStockChanges) {
        await Item.updateOne(
          { _id: stockChange.itemId },
          { $inc: { quantity: stockChange.quantity }, $set: { is_active: true, marked_sold_at: null } }
        );
      }
    }
    console.error('Checkout error:', error);
    const isClientError = error.message.includes('no longer has enough stock')
      || error.message.includes('just reserved');
    return NextResponse.json(
      {
        error: error.message || 'Error during checkout',
        ...(paymentToClean ? { code: 'IDEMPOTENCY_KEY_USED' } : {}),
      },
      { status: isClientError ? 409 : 500 }
    );
  }
}
