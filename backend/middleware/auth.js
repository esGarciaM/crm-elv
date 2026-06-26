import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'crm-patrocinios-secret-key-change-in-production';

export function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

export function authMiddleware(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.split(' ')[1];
  } else if (req.query.token) {
    token = req.query.token;
  }
  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol admin' });
  }
  next();
}
