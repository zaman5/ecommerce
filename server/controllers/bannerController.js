import { getBanner } from '../models/Banner.js';

function pickWritable(body) {
  const data = {};
  for (const key of ['title', 'subtitle', 'image', 'link', 'ctaLabel', 'theme', 'tag']) {
    if (key in body) data[key] = typeof body[key] === 'string' ? body[key].trim() : body[key];
  }
  if ('imageUrl' in body && !data.image) data.image = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : body.imageUrl;
  if ('linkUrl' in body && !data.link) data.link = typeof body.linkUrl === 'string' ? body.linkUrl.trim() : body.linkUrl;
  if ('isActive' in body) data.isActive = !!body.isActive;
  else if ('active' in body) data.isActive = !!body.active;
  if ('order' in body) {
    const n = Number(body.order);
    data.order = Number.isFinite(n) ? n : 0;
  } else if ('sortOrder' in body) {
    const n = Number(body.sortOrder);
    data.order = Number.isFinite(n) ? n : 0;
  }
  return data;
}

// GET /api/banners
export async function listBanners(req, res, next) {
  try {
    const Banner = getBanner();
    const banners = await Banner.findAll({
      where: { isActive: true },
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json(banners);
  } catch (err) {
    console.error('Error fetching banners:', err.message);
    res.json([]);
  }
}

// GET /api/banners/admin/all
export async function listAllBanners(req, res, next) {
  try {
    const Banner = getBanner();
    const banners = await Banner.findAll({
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json(banners);
  } catch (err) {
    console.error('Error fetching all banners:', err.message);
    res.json([]);
  }
}

// POST /api/banners  (admin)
export async function createBanner(req, res, next) {
  try {
    const Banner = getBanner();
    const data = pickWritable(req.body);
    if (!data.title) return res.status(400).json({ message: 'A banner needs a title.' });
    if (!data.image) return res.status(400).json({ message: 'A banner needs a background image.' });

    if (data.order === undefined) {
      const last = await Banner.findOne({ order: [['order', 'DESC']] });
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
    const Banner = getBanner();
    const data = pickWritable(req.body);
    if ('title' in data && !data.title) {
      return res.status(400).json({ message: 'A banner needs a title.' });
    }
    if ('image' in data && !data.image) {
      return res.status(400).json({ message: 'A banner needs a background image.' });
    }

    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });

    await banner.update(data);
    res.json(banner);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/banners/:id  (admin)
export async function deleteBanner(req, res, next) {
  try {
    const Banner = getBanner();
    const banner = await Banner.findByPk(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Banner not found.' });
    await banner.destroy();
    res.json({ message: 'Banner deleted.' });
  } catch (err) {
    next(err);
  }
}
