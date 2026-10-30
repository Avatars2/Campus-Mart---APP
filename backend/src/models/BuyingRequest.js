import mongoose from 'mongoose';

const BuyingRequestSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  request_type: {
    type: String,
    enum: ['buy', 'rent', 'either'],
    default: 'buy',
  },
  target_budget: {
    type: Number,
    default: null,
  },
  rental_period: {
    type: String,
    enum: ['hour', 'day', 'month', null],
    default: null,
  },
  status: {
    type: String,
    enum: ['open', 'fulfilled', 'closed'],
    default: 'open',
  },
  fulfilled_item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    default: null,
  },
  replies_count: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

BuyingRequestSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    const idStr = ret._id ? ret._id.toString() : '';
    ret.id = idStr;
    ret._id = idStr;
    delete ret.__v;
    return ret;
  }
});

if (mongoose.models.BuyingRequest) {
  delete mongoose.models.BuyingRequest;
}

const BuyingRequest = mongoose.model('BuyingRequest', BuyingRequestSchema);

export default BuyingRequest;

