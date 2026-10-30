import mongoose from 'mongoose';

const BuyingRequestReplySchema = new mongoose.Schema({
  request_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BuyingRequest',
    required: true,
  },
  sender_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
    trim: true,
  },
  item_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    default: null,
  },
  offer_price: {
    type: Number,
    default: null,
  },
}, { timestamps: true });

BuyingRequestReplySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    const idStr = ret._id ? ret._id.toString() : '';
    ret.id = idStr;
    ret._id = idStr;
    delete ret.__v;
    return ret;
  }
});

if (mongoose.models.BuyingRequestReply) {
  delete mongoose.models.BuyingRequestReply;
}

const BuyingRequestReply = mongoose.model('BuyingRequestReply', BuyingRequestReplySchema);

export default BuyingRequestReply;

