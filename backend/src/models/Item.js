import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  seller_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  category_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  condition_rating: {
    type: Number,
    required: true,
  },
  average_rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  ratings_count: {
    type: Number,
    min: 0,
    default: 0,
  },
  listing_type: {
    type: String,
    enum: ['sell', 'rent'],
    default: 'sell',
    required: true,
  },
  images: {
    type: [String],
    default: [],
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  marked_sold_at: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

itemSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Item = mongoose.models.Item || mongoose.model('Item', itemSchema);

export default Item;
