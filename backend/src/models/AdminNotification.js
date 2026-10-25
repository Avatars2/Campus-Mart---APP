import mongoose from 'mongoose';

const adminNotificationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  body: {
    type: String,
    required: true,
    trim: true,
  },
  targetType: {
    type: String,
    enum: ['ALL', 'SPECIFIC'],
    default: 'ALL',
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  recipientCount: {
    type: Number,
    default: 0,
  },
  attachment: {
    url: { type: String, default: null },
    name: { type: String, default: null },
    mimeType: { type: String, default: null },
    size: { type: Number, default: null },
  },
}, { timestamps: true });

adminNotificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

if (mongoose.models.AdminNotification) {
  delete mongoose.models.AdminNotification;
}
const AdminNotification = mongoose.model('AdminNotification', adminNotificationSchema);

export default AdminNotification;

