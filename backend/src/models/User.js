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
  fcmToken: {
    type: String,
    default: null,
  }
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
