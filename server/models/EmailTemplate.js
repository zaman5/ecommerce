import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    path: { type: String, default: '' },
    size: { type: Number, default: 0 },
  },
  { _id: true }
);

const emailTemplateSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      unique: true,
      enum: ['order_confirmation', 'order_shipped', 'order_delivered'],
    },
    title: { type: String, required: true },
    subject: { type: String, required: true },
    heading: { type: String, default: '' },
    subtitle: { type: String, default: '' },
    customMessage: { type: String, default: '' },
    closingMessage: { type: String, default: '' },
    footerText: { type: String, default: '' },
    brandColor: { type: String, default: '#1f6b60' },
    headerBanner: { type: String, default: '' },
    attachments: { type: [attachmentSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const EmailTemplate = mongoose.model('EmailTemplate', emailTemplateSchema);
export default EmailTemplate;
