import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  type: {
    type: String,
    enum: ['MESSAGE', 'ORDER', 'SYSTEM', 'WISHLIST', 'REPORT', 'BUYING_REQUEST'],
    required: true,
  },
  subType: {
    type: String,
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  body: {
    type: String,
    required: true,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
  },
  thumbnail: {
    type: String,
    default: null,
  },
  actionUrl: {
    targetScreen: { type: String, default: null },
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  attachment: {
    url: { type: String, default: null },
    name: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null },
  }
}, { timestamps: true });

notificationSchema.index({ recipient: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

if (mongoose.models.Notification) {
  delete mongoose.models.Notification;
}
const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
