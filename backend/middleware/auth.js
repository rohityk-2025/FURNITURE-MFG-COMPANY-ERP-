const jwt = require('jsonwebtoken')
const SECRET = process.env.JWT_SECRET || 'woodcraft_jwt_secret'

const auth = (req, res, next) => {
  const header = req.headers['authorization']
  if (!header) return res.status(401).json({ error: 'No token provided' })

  const token = header.startsWith('Bearer ') ? header.slice(7) : header
  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

const adminOnly = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated' })
  if (req.user.role !== 'ADMIN') return res.status(403).json({ error: 'Admin access required' })
  next()
}

module.exports = { auth, adminOnly }
