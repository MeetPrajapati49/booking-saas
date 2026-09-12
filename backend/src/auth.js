import jwt from 'jsonwebtoken';

// Stand-in for Supabase Auth for this MVP round (explicitly out of scope per
// the "no security needed right now" instruction). In production this
// middleware is replaced by verifying the Supabase JWT and RLS enforces
// tenant isolation as a second layer even if this check were skipped.
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export function signToken(business) {
  return jwt.sign({ businessId: business.id, email: business.owner_email }, SECRET, { expiresIn: '7d' });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing authorization token' });
  try {
    const payload = jwt.verify(token, SECRET);
    req.businessId = payload.businessId; // tenant context derived from token, never from client-supplied body
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
