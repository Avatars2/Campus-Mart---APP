import mongoose from 'mongoose';

const loginAttemptSchema = new mongoose.Schema({
  identifier: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // MongoDB TTL index: automatically deletes document after 15 minutes (900 seconds)
  }
});

// Clear cached model to support Next.js hot-reloading
if (mongoose.models.LoginAttempt) {
  delete mongoose.models.LoginAttempt;
}
const LoginAttempt = mongoose.models.LoginAttempt || mongoose.model('LoginAttempt', loginAttemptSchema);

export default LoginAttempt;

