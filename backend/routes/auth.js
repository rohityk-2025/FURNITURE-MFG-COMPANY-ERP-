const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')

const router = express.Router()
const SECRET = process.env.JWT_SECRET || 'woodcraft_jwt_secret'

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' })

    const [rows] = await sequelize.query(
      'SELECT * FROM users WHERE email = ? AND is_active = 1 LIMIT 1',
      { replacements: [email] }
    )

    if (!rows.length)
      return res.status(401).json({ error: 'Invalid email or password' })

    const user = rows[0]
    const ok   = await bcrypt.compare(password, user.password)
    if (!ok)
      return res.status(401).json({ error: 'Invalid email or password' })

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role }
    const token   = jwt.sign(payload, SECRET, { expiresIn: '7d' })

    res.json({ token, user: payload })
  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/auth/me  — verify token is still valid
router.get('/me', auth, (req, res) => {
  res.json({ user: req.user })
})

module.exports = router
