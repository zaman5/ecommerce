import mongoose from 'mongoose';

const settingSchema = new mongoose.Schema(
  {
    // Singleton key — there is only ever one settings document.
    key: { type: String, unique: true, default: 'site' },

    // JazzCash payment configuration shown at checkout
    jazzcashPhone: { type: String, default: '03038164288' },
    jazzcashQrImage: { type: String, default: '' },
  },
  { timestamps: true }
);

/**
 * Returns the single settings document, creating one with defaults if it
 * doesn't exist yet. Every read/write should go through this helper.
 */
settingSchema.statics.getInstance = async function () {
  let doc = await this.findOne({ key: 'site' });
  if (!doc) doc = await this.create({ key: 'site' });
  return doc;
};

export default mongoose.model('Setting', settingSchema);
