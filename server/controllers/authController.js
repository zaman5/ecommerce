import User from '../models/User.js';
import { signToken } from '../utils/token.js';

// POST /api/auth/register  (creates a client account)
export async function register(req, res, next) {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = new User({ name, email, phone, role: 'client' });
    await user.setPassword(password);
    await user.save();

    const token = signToken(user);
    res.status(201).json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Incorrect email or password.' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ message: 'Incorrect email or password.' });

    const token = signToken(user);
    res.json({ token, user: user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function me(req, res) {
  res.json({ user: req.user.toSafeJSON() });
}

// PUT /api/auth/me
export async function updateProfile(req, res, next) {
  try {
    const { name, phone, address } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (address) req.user.address = { ...req.user.address, ...address };
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
