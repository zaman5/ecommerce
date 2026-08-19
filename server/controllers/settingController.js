import Setting from '../models/Setting.js';

// GET /api/settings/jazzcash  (public — shown at checkout)
export async function getJazzCash(req, res, next) {
  try {
    const settings = await Setting.getInstance();
    res.json({
      phone: settings.jazzcashPhone,
      qrImage: settings.jazzcashQrImage,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/jazzcash  (admin only)
export async function updateJazzCash(req, res, next) {
  try {
    const { phone, qrImage } = req.body;
    const settings = await Setting.getInstance();

    if (phone !== undefined) settings.jazzcashPhone = phone.trim();
    if (qrImage !== undefined) settings.jazzcashQrImage = qrImage;

    await settings.save();
    res.json({
      phone: settings.jazzcashPhone,
      qrImage: settings.jazzcashQrImage,
    });
  } catch (err) {
    next(err);
  }
}
