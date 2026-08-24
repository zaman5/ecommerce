import jwt from 'jsonwebtoken';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is missing in production.');
    }
    return 'wondercart_dev_jwt_secret_do_not_use_in_prod';
  }
  return secret;
}

export function signToken(user) {
  const secret = getJwtSecret();
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
}
