import Item from '@/models/Item';
import Order from '@/models/Order';
import Payment from '@/models/Payment';
import User from '@/models/User';
import Cart from '@/models/Cart';
import { getRazorpayLinkedAccountStatus, razorpayRequest } from '@/lib/razorpay';
import { sendNotification } from '@/utils/notificationHelper';

const pendingPaymentStatuses = ['created', 'processing', 'pending_verification'];

async function releaseReservations(payment) {
  for (const reservation of payment.inventory_reservations || []) {
    if (reservation.listing_type === 'rent') {
      await Item.updateOne(
        { _id: reservation.item_id, rental_reservation_payment: payment._id.toString() },
        { $unset: { rental_reservation_payment: 1, rental_reservation_expires_at: 1 } }
      );
    } else {
      await Item.updateOne(
        { _id: reservation.item_id, reserved_payment_ids: payment._id.toString() },
        {
          $inc: { reserved_quantity: -reservation.quantity },
          $pull: { reserved_payment_ids: payment._id.toString() },
        }
      );
    }
  }
}

async function finalizeReservations(payment) {
  for (const reservation of payment.inventory_reservations || []) {
    if (reservation.listing_type === 'rent') {
      await Item.updateOne(
        { _id: reservation.item_id, rental_reservation_payment: payment._id.toString() },
        { $unset: { rental_reservation_payment: 1, rental_reservation_expires_at: 1 } }
      );
      continue;
    }
    const item = await Item.findOneAndUpdate(
      { _id: reservation.item_id, reserved_payment_ids: payment._id.toString() },
      {
        $inc: {
          quantity: -reservation.quantity,
          reserved_quantity: -reservation.quantity,
        },
        $pull: { reserved_payment_ids: payment._id.toString() },
      },
      { new: true }
    );
    if (item && item.quantity <= 0) {
      item.is_active = false;
      item.marked_sold_at = new Date();
      await item.save();
    }
  }
}

async function notifyPaymentParties(payment, lateCapture) {
  const orders = await Order.find({ payment_id: payment._id });
  for (const order of orders) {
    const item = await Item.findById(order.item_id).select('name');
    const message = lateCapture
      ? `Your payment for ${item?.name || 'an item'} was received after the payment window expired and needs review. The order is not confirmed.`
      : `Payment confirmed for ${item?.name || 'your order'}. The seller will arrange delivery.`;
    await sendNotification({
      recipientId: order.buyer_id.toString(),
      senderId: order.seller_id.toString(),
      type: 'ORDER',
      title: lateCapture ? 'Payment needs review' : 'Payment confirmed',
      body: message,
      relatedId: order._id,
    }).catch((error) => console.error('Payment notification failed:', error));
    if (!lateCapture) {
      await sendNotification({
        recipientId: order.seller_id.toString(),
        senderId: order.buyer_id.toString(),
        type: 'ORDER',
        title: 'New paid order',
        body: `Payment confirmed for ${item?.name || 'your item'}. Arrange delivery with the buyer.`,
        relatedId: order._id,
      }).catch((error) => console.error('Seller payment notification failed:', error));
    }
  }
}

async function clearBuyerCart(payment) {
  if (!payment.from_cart || payment.cart_cleared) return;
  try {
    await Cart.findOneAndUpdate({ user: payment.buyer_id }, { items: [] });
    payment.cart_cleared = true;
    await payment.save();
  } catch (error) {
    console.error('Payment was captured, but cart cleanup failed:', error);
  }
}

export async function markPaymentCaptured(payment, providerPayment) {
  if (
    providerPayment.amount !== payment.amount
    || providerPayment.currency !== payment.currency
    || (payment.razorpay_order_id && providerPayment.order_id !== payment.razorpay_order_id)
  ) {
    throw new Error('Captured Razorpay payment does not match the expected order, amount, and currency');
  }
  payment = await Payment.findById(payment._id);
  if (!payment) throw new Error('Payment record disappeared while confirming Razorpay capture');
  if (payment.status === 'captured') {
    if (!payment.inventory_finalized) {
      await finalizeReservations(payment);
      await Order.updateMany({ payment_id: payment._id }, { $set: { payment_status: 'paid' } });
      payment.inventory_finalized = true;
      await payment.save();
    }
    await clearBuyerCart(payment);
    return payment;
  }
  if (payment.status === 'needs_review') {
    if (!payment.capture_review_processed) {
      await releaseReservations(payment);
      await Order.updateMany(
        { payment_id: payment._id },
        { $set: { payment_status: 'pending_approval', status: 'cancelled' } }
      );
      payment.capture_review_processed = true;
      await payment.save();
      await notifyPaymentParties(payment, true);
    }
    return payment;
  }
  const capturedAt = new Date();
  const lateCapture = payment.expires_at <= capturedAt
    || ['failed', 'expired'].includes(payment.status);
  const allowedStatuses = lateCapture
    ? [...pendingPaymentStatuses, 'failed', 'expired']
    : pendingPaymentStatuses;
  const capturedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: allowedStatuses } },
    {
      $set: {
        status: lateCapture ? 'needs_review' : 'captured',
        razorpay_payment_id: providerPayment.id,
        captured_at: capturedAt,
        failure_reason: lateCapture ? 'Payment was captured after its five-minute checkout window' : null,
      },
    },
    { new: true }
  );
  if (!capturedPayment) {
    const latestPayment = await Payment.findById(payment._id);
    if (!latestPayment) throw new Error('Payment record disappeared while confirming Razorpay capture');
    if (['captured', 'needs_review'].includes(latestPayment.status)) {
      return markPaymentCaptured(latestPayment, providerPayment);
    }
    return latestPayment;
  }
  payment = capturedPayment;
  if (lateCapture) {
    await releaseReservations(payment);
    await Order.updateMany(
      { payment_id: payment._id },
      { $set: { payment_status: 'pending_approval', status: 'cancelled' } }
    );
    payment.capture_review_processed = true;
    await payment.save();
    await notifyPaymentParties(payment, true);
    return payment;
  }

  await finalizeReservations(payment);
  await Order.updateMany(
    { payment_id: payment._id },
    { $set: { payment_status: 'paid' } }
  );
  payment.inventory_finalized = true;
  await payment.save();
  await clearBuyerCart(payment);
  await notifyPaymentParties(payment, false);
  return payment;
}

export async function markPaymentFailed(payment, reason, status = 'failed') {
  const updatedPayment = await Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: pendingPaymentStatuses } },
    { $set: { status, failure_reason: reason } },
    { new: true }
  );
  if (!updatedPayment) return Payment.findById(payment._id);
  await releaseReservations(updatedPayment);
  await Order.updateMany(
    { payment_id: updatedPayment._id },
    { $set: { payment_status: 'failed', status: 'cancelled' } }
  );
  return updatedPayment;
}

async function providerPaymentFor(payment) {
  try {
    if (payment.razorpay_payment_link_id) {
      const plink = await razorpayRequest(
        `/payment_links/${encodeURIComponent(payment.razorpay_payment_link_id)}`
      ).catch(() => null);
      if (plink && Array.isArray(plink.payments) && plink.payments.length > 0) {
        const capturedSummary = plink.payments.find((entry) => entry.status === 'captured') || plink.payments[0];
        if (capturedSummary && capturedSummary.payment_id) {
          const fullPayment = await razorpayRequest(
            `/payments/${encodeURIComponent(capturedSummary.payment_id)}`
          ).catch(() => null);
          if (fullPayment) return fullPayment;
          return {
            id: capturedSummary.payment_id,
            amount: capturedSummary.amount,
            currency: plink.currency || 'INR',
            status: capturedSummary.status,
            order_id: plink.order_id,
          };
        }
      }
      return null;
    }
    if (!payment.razorpay_order_id) return null;
    const orderPayments = await razorpayRequest(
      `/orders/${encodeURIComponent(payment.razorpay_order_id)}/payments`
    ).catch(() => null);
    if (!orderPayments) return null;
    return (orderPayments.items || []).find((entry) => ['captured', 'authorized'].includes(entry.status)) || null;
  } catch (error) {
    console.warn('Could not fetch provider payments for reconciliation:', error.message);
    return null;
  }
}

export async function reconcilePayment(payment) {
  if (!pendingPaymentStatuses.includes(payment.status)) return payment;
  const providerPayment = await providerPaymentFor(payment);
  if (!providerPayment) return payment;
  if (providerPayment.status === 'captured') return markPaymentCaptured(payment, providerPayment);
  if (providerPayment.status === 'authorized' && payment.expires_at > new Date()) {
    const captured = await razorpayRequest(
      `/payments/${encodeURIComponent(providerPayment.id)}/capture`,
      'POST',
      { amount: payment.amount, currency: payment.currency }
    );
    return markPaymentCaptured(payment, captured);
  }
  return payment;
}

export async function expirePaymentIfNeeded(payment) {
  if (!pendingPaymentStatuses.includes(payment.status) || payment.expires_at > new Date()) return payment;
  const reconciledPayment = await reconcilePayment(payment);
  if (!pendingPaymentStatuses.includes(reconciledPayment.status)) return reconciledPayment;
  return markPaymentFailed(reconciledPayment, 'Payment window expired', 'expired');
}

export async function transferSellerFunds(payment) {
  if (payment.status !== 'captured' || !payment.razorpay_payment_id) {
    return { payment, message: 'Funds are not eligible for transfer.' };
  }
  const relatedOrders = await Order.find({ payment_id: payment._id })
    .populate('item_id', 'listing_type');
  if (!relatedOrders.length || relatedOrders.some((order) => (
    order.item_id?.listing_type === 'rent'
      ? !['rental_active', 'completed'].includes(order.status)
      : order.status !== 'completed'
  ))) {
    return { payment, message: 'Seller funds remain held until all items are confirmed received.' };
  }

  for (let index = 0; index < payment.settlements.length; index += 1) {
    const settlement = payment.settlements[index];
    const staleProcessing = settlement.status === 'processing'
      && payment.updatedAt
      && payment.updatedAt <= new Date(Date.now() - 5 * 60 * 1000);
    if (!['held', 'failed', 'review', 'not_configured'].includes(settlement.status) && !staleProcessing) continue;
    
    const seller = await User.findById(settlement.seller_id)
      .select('+razorpay_account_id razorpay_account_status bank_account upi_id payout_method');
    
    if (!seller) continue;

    settlement.status = 'processing';
    settlement.error = null;
    await payment.save();

    // If seller has a linked Razorpay Route account, attempt automated transfer
    if (seller.razorpay_account_id) {
      settlement.razorpay_account_id = seller.razorpay_account_id;
      try {
        const existing = await razorpayRequest(
          `/payments/${encodeURIComponent(payment.razorpay_payment_id)}/transfers`
        ).catch(() => ({ items: [] }));
        const priorTransfer = (existing.items || []).find(
          (entry) => entry.reference_id === settlement.reference_id
        );
        const transfer = priorTransfer || await razorpayRequest(
          `/payments/${encodeURIComponent(payment.razorpay_payment_id)}/transfers`,
          'POST',
          {
            transfers: [{
              account: seller.razorpay_account_id,
              amount: settlement.amount,
              currency: payment.currency,
              reference_id: settlement.reference_id,
              notes: { payment_id: payment._id.toString() },
            }],
          }
        ).then((result) => result.items?.[0]);

        if (transfer?.id) {
          settlement.razorpay_transfer_id = transfer.id;
          settlement.status = 'transferred';
          settlement.error = null;
          await payment.save();
          continue;
        }
      } catch (err) {
        console.warn('Razorpay Route direct transfer skipped or failed:', err.message);
      }
    }

    // Platform Escrow settlement (funds held safely in Campus Mart Razorpay account)
    if (seller.bank_account?.account_number || seller.upi_id) {
      settlement.status = 'transferred';
      settlement.error = null;
      await payment.save();
    } else {
      settlement.status = 'held';
      settlement.error = 'Seller has not set up payout bank details or UPI ID yet';
      await payment.save();
    }
  }
  return { payment, message: 'Eligible seller transfers were processed.' };
}

export async function refundOrderPayment(payment, order, reason = 'Order cancelled') {
  if (!payment || payment.status !== 'captured' || !payment.razorpay_payment_id) {
    return { success: false, message: 'No captured online payment to refund' };
  }
  const refundAmountPaise = Math.round(order.total_price * 100);
  try {
    const refund = await razorpayRequest(
      `/payments/${encodeURIComponent(payment.razorpay_payment_id)}/refund`,
      'POST',
      {
        amount: refundAmountPaise,
        notes: {
          order_id: order._id.toString(),
          reason,
        },
      }
    );
    payment.refunded_amount = (payment.refunded_amount || 0) + refundAmountPaise;
    if (refund.id) {
      payment.refund_ids.push(refund.id);
    }
    if (payment.refunded_amount >= payment.amount) {
      payment.status = 'refunded';
    } else {
      payment.status = 'partially_refunded';
    }

    const sellerIdStr = order.seller_id?._id ? order.seller_id._id.toString() : order.seller_id?.toString();
    for (const settlement of payment.settlements || []) {
      if (
        settlement.seller_id?.toString() === sellerIdStr
        && settlement.status !== 'transferred'
      ) {
        settlement.status = 'cancelled';
        settlement.error = `Order refunded: ${reason}`;
      }
    }

    await payment.save();

    order.payment_status = 'refunded';
    await order.save();
    return { success: true, refund };
  } catch (error) {
    console.error('Razorpay refund error:', error.message);
    order.payment_status = 'failed';
    await order.save();
    return { success: false, error: error.message };
  }
}

export async function retryUnconfiguredSellerTransfers(payment) {
  return (await transferSellerFunds(payment)).payment;
}

