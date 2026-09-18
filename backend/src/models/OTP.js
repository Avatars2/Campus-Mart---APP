import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otp_code: {
    type: String,
    required: true,
  },
  expires_at: {
    type: Date,
    required: true,
  },
  attempts: {
    type: Number,
    default: 0,
    min: 0,
  },
  used_at: {
    type: Date,
    default: null,
  }
}, { timestamps: true });

otpSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const OTP = mongoose.models.OTP || mongoose.model('OTP', otpSchema);

export default OTP;
