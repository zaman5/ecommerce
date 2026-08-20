import jwt from 'jsonwebtoken';

const DEFAULT_SECRET = 'wondercart_default_jwt_secret_d9f3a1c7e05b4682af6c21be7d4f90ac53e18b7264da0f95cb3e7a1d68f402b9';

export function signToken(user) {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

export function verifyToken(token) {
  const secret = process.env.JWT_SECRET || DEFAULT_SECRET;
  return jwt.verify(token, secret);
}
