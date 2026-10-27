import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  buyer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  quantity: {
    type: Number,
    default: 1,
    required: true,
  },
  total_price: {
    type: Number,
    required: true,
  },
  rental_duration: {
    type: Number,
    min: 1,
    default: null,
  },
  payment_method: {
    type: String,
    default: 'Cash',
  },
  payment_status: {
    type: String,
    enum: ['unpaid', 'pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'pending_verification', 'pending_approval'],
    default: 'unpaid',
  },
  payment_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Payment',
    default: null,
  },
  delivery_address: {
    type: String,
    default: 'Campus Pickup',
  },
  status: {
    type: String,
    enum: ['pending', 'delivered', 'rental_active', 'return_requested', 'completed', 'cancelled', 'cancel_requested', 'returned'],
    default: 'pending',
  },
  completed_at: {
    type: Date,
    default: null,
  },
  rental_started_at: {
    type: Date,
    default: null,
  },
  rental_due_at: {
    type: Date,
    default: null,
  },
  return_requested_at: {
    type: Date,
    default: null,
  },
  returned_at: {
    type: Date,
    default: null,
  },
  rental_extensions: [{
    extended_at: { type: Date, default: Date.now },
    extension_duration: { type: Number, required: true },
    extension_period: { type: String, default: 'day' },
    cost: { type: Number, required: true },
    previous_due_at: { type: Date },
    new_due_at: { type: Date },
    payment_method: { type: String, default: 'Razorpay' },
    payment_id: { type: String, default: null }
  }],
  buyer_rating: {
    type: Number,
    min: 0.5,
    max: 5,
    default: null,
  },
  rated_at: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

orderSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

export default Order;
