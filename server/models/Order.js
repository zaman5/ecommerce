import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,
    image: String,
    price: Number,
    qty: Number,
  },
  { _id: false }
);

// A single event in the order's tracking timeline
const trackingEventSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
    },
    note: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    // Null for guest checkout — see isGuest / guestEmail / guestToken below.
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    isGuest: { type: Boolean, default: false },
    guestEmail: { type: String, default: '', lowercase: true, trim: true },
    // Secret handed back once at checkout; lets a guest open and cancel their
    // own order later without an account. Never included in JSON responses.
    guestToken: { type: String, default: '', select: false },
    items: [orderItemSchema],
    shippingAddress: {
      fullName: String,
      line1: String,
      city: String,
      province: String,
      postalCode: String,
      phone: String,
    },
    itemsTotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paymentMethod: { type: String, enum: ['cod', 'card', 'jazzcash', 'easypaisa'], default: 'cod' },
    paymentStatus: { type: String, enum: ['unpaid', 'paid', 'refunded'], default: 'unpaid' },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
      default: 'pending',
    },
    tracking: { type: [trackingEventSchema], default: [] },
  },
  { timestamps: true }
);

orderSchema.pre('save', function (next) {
  if (!this.orderNumber) {
    const rand = Math.floor(1000 + Math.random() * 9000);
    this.orderNumber = `BS-${Date.now().toString().slice(-6)}${rand}`;
  }
  next();
});

// An order belongs to either an account or a guest — never neither.
orderSchema.pre('validate', function (next) {
  if (!this.user && !this.guestEmail) {
    return next(new Error('An order needs either a signed-in customer or a guest email.'));
  }
  next();
});

export default mongoose.model('Order', orderSchema);
