import mongoose from 'mongoose';

/**
 * A message sent from the public "Contact us" form.
 *
 * Anyone can write one, so every field is length-capped at the schema as well
 * as in the controller — the cap is the last line of defence if another caller
 * is ever added.
 */
const messageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 200 },
    subject: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    /** Optional — lets a shopper point at the order they are asking about. */
    orderNumber: { type: String, default: '', trim: true, maxlength: 40 },
    isRead: { type: Boolean, default: false },
    /** Set when a signed-in customer writes, so the admin knows who they are. */
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// The inbox is read newest-first, usually filtered to unread.
messageSchema.index({ isRead: 1, createdAt: -1 });

export default mongoose.model('Message', messageSchema);
