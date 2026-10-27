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
  original_price: {
    type: Number,
    default: null,
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
  },
  reserved_quantity: {
    type: Number,
    min: 0,
    default: 0,
  },
  reserved_payment_ids: {
    type: [String],
    default: [],
  },
  rental_reservation_payment: {
    type: String,
    default: null,
  },
  rental_reservation_expires_at: {
    type: Date,
    default: null,
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
  rental_period: {
    type: String,
    enum: ['hour', 'day', 'month'],
    default: null,
  },
  images: {
    type: [String],
    default: [],
  },
  is_active: {
    type: Boolean,
    default: true,
  },
  is_suspended: {
    type: Boolean,
    default: false,
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

if (mongoose.models.Item) {
  delete mongoose.models.Item;
}
const Item = mongoose.model('Item', itemSchema);

export default Item;
