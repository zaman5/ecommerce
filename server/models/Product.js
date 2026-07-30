import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    brand: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    ageGroup: {
      type: String,
      enum: ['0-6m', '6-12m', '1-2y', '2-4y', '4y+', 'all'],
      default: 'all',
    },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0 }, // original price for showing discounts
    images: { type: [String], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    unitsSold: { type: Number, default: 0 }, // powers sales analytics
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', description: 'text', brand: 'text' });

export default mongoose.model('Product', productSchema);
