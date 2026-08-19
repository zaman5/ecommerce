import mongoose from 'mongoose';

// A colour a product can be ordered in. `hex` is only what the swatch is
// painted with; `name` is the thing that gets snapshotted onto an order, so it
// is what the warehouse actually picks by.
const colorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    hex: { type: String, default: '#cccccc', trim: true },
    // Optional photo of the product in this colour. When set, choosing the
    // colour swaps the main gallery picture to it; when empty the gallery
    // simply stays put, so a half-photographed range still behaves.
    image: { type: String, default: '', trim: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    brand: { type: String, default: '' },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, default: 0 }, // original price for showing discounts
    images: { type: [String], default: [] },
    video: { type: String, default: '', trim: true },
    // Empty means the product simply has no colour choice — the storefront then
    // shows no picker and orders carry no colour.
    colors: { type: [colorSchema], default: [] },
    stock: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0 },
    unitsSold: { type: Number, default: 0 }, // powers sales analytics
    isFeatured: { type: Boolean, default: false },
    /**
     * Opt-in to the home page's Flash Sale strip.
     *
     * Only meaningful alongside a real discount — the storefront requires both,
     * so a product left flagged after its discount is removed quietly drops out
     * of the strip instead of appearing there at full price.
     */
    isFlashSale: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Product', productSchema);
