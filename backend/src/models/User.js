import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  full_name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  phone: {
    type: String,
    required: true,
  },
  student_id: {
    type: String,
    required: true,
    unique: true,
  },
  department: {
    type: String,
    default: null,
  },
  year_semester: {
    type: String,
    default: null,
  },
  profile_photo_url: {
    type: String,
    default: null,
  },
  is_verified: {
    type: Boolean,
    default: false,
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student',
  },
  is_suspended: {
    type: Boolean,
    default: false,
  },
  fcmToken: {
    type: String,
    default: null,
  },
  razorpay_account_id: {
    type: String,
    default: null,
    select: false,
  },
  razorpay_stakeholder_id: {
    type: String,
    default: null,
    select: false,
  },
  razorpay_product_id: {
    type: String,
    default: null,
    select: false,
  },
  razorpay_onboarding_lock_until: {
    type: Date,
    default: null,
    select: false,
  },
  razorpay_account_status: {
    type: String,
    enum: ['not_started', 'pending', 'under_review', 'needs_clarification', 'activated', 'rejected', 'suspended', 'linked_account'],
    default: 'not_started',
  },
  bank_account: {
    account_number: { type: String, default: null },
    ifsc_code: { type: String, default: null },
    beneficiary_name: { type: String, default: null },
    bank_name: { type: String, default: null },
  },
  upi_id: {
    type: String,
    default: null,
  },
  is_upi_verified: {
    type: Boolean,
    default: false,
  },
  payout_method: {
    type: String,
    enum: ['bank_account', 'upi', 'none'],
    default: 'none',
  },
}, { timestamps: true });

userSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

// Clear cached model to support Next.js hot-reloading
if (mongoose.models.User) {
  delete mongoose.models.User;
}
const User = mongoose.model('User', userSchema);

export default User;
