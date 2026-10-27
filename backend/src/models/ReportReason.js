import mongoose from 'mongoose';

const reportReasonSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  target_type: {
    type: String,
    enum: ['all', 'user', 'item'],
    default: 'user',
  },
  is_active: {
    type: Boolean,
    default: true,
  }
}, { timestamps: true });

reportReasonSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    return ret;
  }
});

// Prevent overwrite model error in development hot reloading
if (mongoose.models.ReportReason) delete mongoose.models.ReportReason;
const ReportReason = mongoose.models.ReportReason || mongoose.model('ReportReason', reportReasonSchema);

export default ReportReason;

