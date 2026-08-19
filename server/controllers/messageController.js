import Message from '../models/Message.js';

/** Deliberately loose — an address that round-trips mail is not decidable here. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const LIMITS = { name: 120, email: 200, subject: 160, body: 4000, orderNumber: 40 };

/**
 * A small per-IP throttle for the one endpoint the public can write to.
 *
 * In memory on purpose: it resets on restart and is per-process, so it is a
 * speed bump against a bored visitor, not a defence against a distributed
 * flood. Put a real rate limiter at the edge before exposing this publicly.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const recent = new Map();

function liveHits(ip) {
  const now = Date.now();
  return (recent.get(ip) || []).filter((t) => now - t < WINDOW_MS);
}

/** Checked before doing any work — deliberately does not record the attempt. */
function throttled(ip) {
  return liveHits(ip).length >= MAX_PER_WINDOW;
}

/**
 * Counted only once a message is actually stored.
 *
 * Recording rejected attempts instead would mean five mistyped email addresses
 * locked someone out for ten minutes — punishing the flustered customer this
 * form exists to help, while costing a real flooder nothing.
 */
function recordSend(ip) {
  const now = Date.now();
  // Sweep occasionally so the map cannot grow without bound.
  if (recent.size > 5000) {
    for (const [k, v] of recent) if (!v.some((t) => now - t < WINDOW_MS)) recent.delete(k);
  }
  recent.set(ip, [...liveHits(ip), now]);
}

// POST /api/messages  (public — the Contact us form)
export async function createMessage(req, res, next) {
  try {
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
      // Never taken from the body — a sender cannot claim to be another user.
      user: req.user?._id || null,
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
    // The sender gets an acknowledgement, not the stored document — there is
    // nothing on it they need and it keeps the internal shape private.
    res.status(201).json({
      message: "Thanks — we've got your message and will reply by email.",
      reference: saved._id,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/messages?filter=unread  (admin)
export async function listMessages(req, res, next) {
  try {
    const query = req.query.filter === 'unread' ? { isRead: false } : {};
    const [items, unread] = await Promise.all([
      Message.find(query).populate('user', 'name email').sort({ createdAt: -1 }).limit(200),
      Message.countDocuments({ isRead: false }),
    ]);
    res.json({ items, unread });
  } catch (err) {
    next(err);
  }
}

// PUT /api/messages/:id  (admin) — read / unread only.
export async function updateMessage(req, res, next) {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { isRead: !!req.body.isRead },
      { new: true }
    );
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    res.json(msg);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/messages/:id  (admin)
export async function deleteMessage(req, res, next) {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Message not found.' });
    res.json({ message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
}
