import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: {
    type: String,
    default: null,
  },
  icon_url: {
    type: String,
    default: null,
  }
}, { timestamps: false }); // PG schema didn't explicitly have timestamps for categories

categorySchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

export default Category;
