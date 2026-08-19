import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema(
  {
    line1: String,
    city: String,
    province: String,
    postalCode: String,
    phone: String,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['client', 'admin', 'shopmanager'], default: 'client' },
    phone: { type: String, default: '' },
    address: { type: addressSchema, default: {} },
    // Shop manager scoping — only meaningful when role === 'shopmanager'.
    // The admin assigns one or both: categories give broad access to every
    // product filed under them, while assignedProducts grants item-level access.
    assignedCategories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Category' }],
    assignedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    // Admin can disable a shop manager without deleting the account.
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Virtual: set a plain password, get it hashed automatically
userSchema.methods.setPassword = async function (plain) {
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(plain, salt);
};

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
  const safe = {
    id: this._id.toString(),
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    address: this.address,
    createdAt: this.createdAt,
  };
  if (this.role === 'shopmanager') {
    safe.assignedCategories = (this.assignedCategories || []).map((id) => (id._id || id).toString());
    safe.assignedProducts = (this.assignedProducts || []).map((id) => (id._id || id).toString());
    safe.isActive = this.isActive;
  }
  return safe;
};

export default mongoose.model('User', userSchema);
