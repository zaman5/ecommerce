import { getMessage } from '../models/Message.js';
import { getUser } from '../models/User.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LIMITS = { name: 120, email: 200, subject: 160, body: 4000, orderNumber: 40 };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map();

function liveHits(ip) {
  const now = Date.now();
  return (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
}

function throttled(ip) {
  return liveHits(ip).length >= MAX_PER_WINDOW;
}

function recordSend(ip) {
  const now = Date.now();
  if (recent.size > 5000) {
    for (const [k, v] of recent) if (!v.some((t) => now - t < WINDOW_MS)) recent.delete(k);
  }
  recent.set(ip, [...liveHits(ip), now]);
}

// POST /api/messages
export async function createMessage(req, res, next) {
  try {
    const Message = getMessage();
    if (throttled(req.ip)) {
      return res.status(429).json({
        message: 'You have sent several messages already. Please wait a few minutes before sending another.',
      });
    }

    const str = (v, max) => String(v ?? '').trim().slice(0, max);
    const data = {
      name: str(req.body.name, LIMITS.name),
      email: str(req.body.email, LIMITS.email).toLowerCase(),
      subject: str(req.body.subject, LIMITS.subject),
      body: str(req.body.body, LIMITS.body),
      orderNumber: str(req.body.orderNumber, LIMITS.orderNumber),
      userId: req.user?.id || null,
    };

    if (!data.name) return res.status(400).json({ message: 'Please tell us your name.' });
    if (!EMAIL_RE.test(data.email)) {
      return res.status(400).json({ message: 'Please enter an email address we can reply to.' });
    }
    if (!data.subject) return res.status(400).json({ message: 'Please add a subject.' });
    if (data.body.length < 10) {
      return res.status(400).json({ message: 'Please write a little more so we can help.' });
    }

    const saved = await Message.create(data);
    recordSend(req.ip);
    res.status(201).json({
      message: "Thanks — we've got your message and will reply by email.",
      reference: saved.id,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/messages?filter=unread
export async function listMessages(req, res, next) {
  try {
    const Message = getMessage();
    const where = req.query.filter === 'unread' ? { isRead: false } : {};
    const [items, unread] = await Promise.all([
      Message.findAll({
        where,
        include: [{ association: 'user', attributes: ['name', 'email'] }],
        order: [['createdAt', 'DESC']],
        limit: 200,
      }),
      Message.count({ where: { isRead: false } }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    next(err);
  }
}

// PUT /api/messages/:id
export async function updateMessage(req, res, next) {
  try {
    const Message = getMessage();
    const msg = await Message.findByPk(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    await msg.update({ isRead: !!req.body.isRead });
    res.json(msg);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/messages/:id
export async function deleteMessage(req, res, next) {
  try {
    const Message = getMessage();
    const msg = await Message.findByPk(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    await msg.destroy();
    res.json({ message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
}
