import { getUser } from '../models/User.js';
import { signToken } from '../utils/token.js';
import { isValidEmail } from '../utils/email.js';

// POST /api/auth/register  (creates a client account)
export async function register(req, res, next) {
  try {
    const User = getUser();
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Name, email, phone number, and password are required.' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (String(phone).trim().length < 8) {
      return res.status(400).json({ message: 'Please enter a valid phone number (at least 8 digits).' });
    }
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return res.status(400).json({ message: 'Password must contain both letters and numbers for security.' });
    }

    const exists = await User.findOne({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(409).json({ message: 'An account with this email already exists.' });

    const user = User.build({ name: name.trim(), email: email.toLowerCase(), phone: phone.trim(), role: 'client' });
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
    const User = getUser();
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required.' });

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
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
  // Reload with associations for shop manager
  if (req.user.role === 'shopmanager') {
    const User = getUser();
    const full = await User.findByPk(req.user.id, {
      include: [
        { association: 'assignedCategories', attributes: ['id'] },
        { association: 'assignedProducts', attributes: ['id'] },
      ],
    });
    return res.json({ user: full.toSafeJSON() });
  }
  res.json({ user: req.user.toSafeJSON() });
}

// PUT /api/auth/me
export async function updateProfile(req, res, next) {
  try {
    const { name, phone, address } = req.body;
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (address) {
      if (address.line1 !== undefined) req.user.addressLine1 = address.line1;
      if (address.city !== undefined) req.user.addressCity = address.city;
      if (address.province !== undefined) req.user.addressProvince = address.province;
      if (address.postalCode !== undefined) req.user.addressPostalCode = address.postalCode;
      if (address.phone !== undefined) req.user.addressPhone = address.phone;
    }
    await req.user.save();
    res.json({ user: req.user.toSafeJSON() });
  } catch (err) {
    next(err);
  }
}
