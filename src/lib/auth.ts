import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'localmint-dev-secret-change-in-production';

export function createToken(payload: { userId: string; restaurantId: string; slug: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; restaurantId: string; slug: string };
  } catch {
    return null;
  }
}
