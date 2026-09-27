import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporter_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  target_type: {
    type: String,
    enum: ['user', 'item'],
    required: true
  },
  target_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'target_type'
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  proof_image: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending'
  }
}, { timestamps: true });

// Prevent overwrite model error in development
if (mongoose.models.Report) delete mongoose.models.Report;
const Report = mongoose.models.Report || mongoose.model('Report', reportSchema);

export default Report;