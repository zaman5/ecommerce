import { getFlashSale as getFlashSaleModel } from '../models/FlashSale.js';

const SORTS = ['popular', 'newest', 'priceLow', 'priceHigh', 'rating'];
const MODES = ['midnight', 'endsAt', 'none'];

// GET /api/flash-sale  (public)
export async function getFlashSaleSettings(req, res, next) {
  try {
    const FlashSale = getFlashSaleModel();
    res.json(await FlashSale.getSettings());
  } catch (err) {
    console.error('Error fetching flash sale:', err.message);
    res.json({
      isEnabled: false,
      title: 'Flash Deals',
      timerLabel: 'Ends in',
      ctaLabel: 'Shop All Deals',
      ctaLink: '/shop?onSale=true',
      countdownMode: 'midnight',
      endsAt: null,
      limit: 8,
      sort: 'popular',
    });
  }
}
export const getFlashSale = getFlashSaleSettings;

// PUT /api/flash-sale  (admin)
export async function updateFlashSale(req, res, next) {
  try {
    const FlashSale = getFlashSaleModel();
    const b = req.body;
    const data = {};
    const str = (v, max) => String(v ?? '').trim().slice(0, max);

    if ('isEnabled' in b) data.isEnabled = !!b.isEnabled;
    if ('title' in b) {
      data.title = str(b.title, 80);
      if (!data.title) return res.status(400).json({ message: 'The section needs a heading.' });
    }
    if ('timerLabel' in b) data.timerLabel = str(b.timerLabel, 60);
    if ('ctaLabel' in b) data.ctaLabel = str(b.ctaLabel, 60);
    if ('ctaLink' in b) {
      data.ctaLink = str(b.ctaLink, 300);
      if (!data.ctaLink) return res.status(400).json({ message: 'The button needs a link.' });
    }

    if ('countdownMode' in b) {
      if (!MODES.includes(b.countdownMode)) {
        return res.status(400).json({ message: 'Unknown countdown mode.' });
      }
      data.countdownMode = b.countdownMode;
    }

    if ('endsAt' in b) {
      if (!b.endsAt) {
        data.endsAt = null;
      } else {
        const when = new Date(b.endsAt);
        if (Number.isNaN(when.getTime())) {
          return res.status(400).json({ message: 'That end date is not a valid date and time.' });
        }
        data.endsAt = when;
      }
    }

    const current = await FlashSale.getSettings();
    const mode = data.countdownMode ?? current.countdownMode;
    const endsAt = 'endsAt' in data ? data.endsAt : current.endsAt;
    if (mode === 'endsAt' && !endsAt) {
      return res.status(400).json({
        message: 'Pick the date and time the sale ends, or switch the countdown to daily.',
      });
    }

    if ('limit' in b) {
      const n = Math.round(Number(b.limit));
      if (!Number.isFinite(n) || n < 4 || n > 24) {
        return res.status(400).json({ message: 'Show between 4 and 24 products.' });
      }
      data.limit = n;
    }
    if ('sort' in b) {
      if (!SORTS.includes(b.sort)) return res.status(400).json({ message: 'Unknown ordering.' });
      data.sort = b.sort;
    }

    await current.update(data);
    res.json(current);
  } catch (err) {
    next(err);
  }
}
