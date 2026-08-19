import Banner from '../models/Banner.js';

/** Fields an admin may set. Anything else in the body is ignored. */
function pickWritable(body) {
  const data = {};
  for (const key of ['title', 'subtitle', 'image', 'link', 'ctaLabel', 'theme']) {
    if (key in body) data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  if ('isActive' in body) data.isActive = !!body.isActive;
  if ('order' in body) {
    const n = Number(body.order);
    data.order = Number.isFinite(n) ? n : 0;
  }
  return data;
}

// GET /api/banners
// Public: only what should currently be on screen, already in running order.
export async function listBanners(req, res, next) {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json(banners);
  } catch (err) {
    console.error('Error fetching banners:', err.message);
    res.json([]);
  }
}

// GET /api/banners/admin/all  (admin)
// Includes the switched-off ones, which is the whole point of the admin list.
export async function listAllBanners(req, res, next) {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: 1 });
    res.json(banners);
  } catch (err) {
    console.error('Error fetching all banners:', err.message);
    res.json([]);
  }
}


// POST /api/banners  (admin)
export async function createBanner(req, res, next) {
  try {
    const data = pickWritable(req.body);
    if (!data.title) return res.status(400).json({ message: 'A banner needs a title.' });
    if (!data.image) return res.status(400).json({ message: 'A banner needs a background image.' });

    // New slides go to the end rather than silently sharing position 0 with an
    // existing one, where the tie-break would be creation date anyway.
    if (data.order === undefined) {
      const last = await Banner.findOne().sort({ order: -1 }).select('order');
      data.order = last ? last.order + 1 : 0;
    }

    const banner = await Banner.create(data);
    res.status(201).json(banner);
  } catch (err) {
    next(err);
  }
}

// PUT /api/banners/:id  (admin)
export async function updateBanner(req, res, next) {
  try {
    const data = pickWritable(req.body);
    if ('title' in data && !data.title) {
      return res.status(400).json({ message: 'A banner needs a title.' });
    }
    if ('image' in data && !data.image) {
      return res.status(400).json({ message: 'A banner needs a background image.' });
    }

    const banner = await Banner.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/banners/:id  (admin)
export async function deleteBanner(req, res, next) {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    res.json({ message: 'Banner deleted.' });
  } catch (err) {
    next(err);
  }
}
