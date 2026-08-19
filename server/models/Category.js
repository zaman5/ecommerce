import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
    // Null for a top-level department. The tree is deliberately only two deep —
    // products always hang off a leaf, so "browse a department" means "this
    // category plus its children" and never needs a recursive walk.
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null },
  },
  { timestamps: true }
);

export default mongoose.model('Category', categorySchema);
