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
    role: { type: String, enum: ['client', 'admin'], default: 'client' },
    phone: { type: String, default: '' },
    address: { type: addressSchema, default: {} },
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
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    role: this.role,
    phone: this.phone,
    address: this.address,
    createdAt: this.createdAt,
  };
};

export default mongoose.model('User', userSchema);
