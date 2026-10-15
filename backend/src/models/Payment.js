import mongoose from 'mongoose';

const settlementSchema = new mongoose.Schema({
  seller_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  razorpay_account_id: { type: String, default: null },
  amount: { type: Number, required: true },
  status: {
    type: String,
    enum: ['not_configured', 'held', 'processing', 'transferred', 'failed', 'review', 'cancelled'],
    default: 'not_configured',
  },
  razorpay_transfer_id: { type: String, default: null },
  error: { type: String, default: null },
  reference_id: { type: String, required: true },
}, { _id: false });

const inventoryReservationSchema = new mongoose.Schema({
  item_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Item', required: true },
  listing_type: { type: String, enum: ['sell', 'rent'], required: true },
  quantity: { type: Number, min: 1, required: true },
}, { _id: false });

const paymentSchema = new mongoose.Schema({
  buyer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  from_cart: { type: Boolean, default: false },
  idempotency_key: { type: String, unique: true, sparse: true },
  order_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],
  inventory_reservations: { type: [inventoryReservationSchema], default: [] },
  amount: { type: Number, required: true },
  currency: { type: String, enum: ['INR'], default: 'INR' },
  provider: { type: String, enum: ['razorpay'], default: 'razorpay' },
  status: {
    type: String,
    enum: ['created', 'processing', 'captured', 'failed', 'expired', 'needs_review', 'partially_refunded', 'refunded', 'pending_verification', 'pending_approval'],
    default: 'created',
  },
  razorpay_order_id: { type: String, unique: true, sparse: true },
  razorpay_payment_link_id: { type: String, unique: true, sparse: true },
  razorpay_payment_link_url: { type: String, default: null },
  razorpay_payment_id: { type: String, unique: true, sparse: true },
  utr_number: { type: String, default: null },
  method: { type: String, default: 'UPI' },
  expires_at: { type: Date, required: true },
  settlements: { type: [settlementSchema], default: [] },
  captured_at: { type: Date, default: null },
  failure_reason: { type: String, default: null },
  refunded_amount: { type: Number, default: 0 },
  refund_ids: { type: [String], default: [] },
  processed_webhook_ids: { type: [String], default: [] },
  inventory_finalized: { type: Boolean, default: false },
  capture_review_processed: { type: Boolean, default: false },
  cart_cleared: { type: Boolean, default: false },
}, { timestamps: true });

if (mongoose.models.Payment) {
  delete mongoose.models.Payment;
}
const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
