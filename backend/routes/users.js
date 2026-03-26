/**
 * Users Route - manages admin/manager accounts
 * Admin cannot deactivate their own account.
 * Only another admin can deactivate an admin account.
 */
const express = require('express')
const bcrypt  = require('bcryptjs')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

// Get all users
router.get('/', auth, adminOnly, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      'SELECT id, name, email, role, phone, is_active, created_at FROM users ORDER BY created_at DESC'
    )
    res.json(rows)
  } catch(e) { res.status(500).json({ error: e.message }) }
})

// Create new user (manager or admin)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role = 'MANAGER' } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' })
    const hash = await bcrypt.hash(password, 10)
    const [r] = await sequelize.query(
      'INSERT INTO users(name, email, password, phone, role) VALUES(?,?,?,?,?)',
      { replacements: [name, email, hash, phone || null, role] }
    )
    res.json({ success: true, id: r })
  } catch(e) {
    res.status(400).json({ error: e.message })
  }
})

// Update user - name, email, phone, password, is_active
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, phone, password, is_active } = req.body
    const targetId = parseInt(req.params.id)
    const requesterId = req.user.id

    // Get target user to check role
    const [targets] = await sequelize.query('SELECT * FROM users WHERE id=?', { replacements: [targetId] })
    if (!targets.length) return res.status(404).json({ error: 'User not found' })
    const target = targets[0]

    // Admin cannot deactivate their own account
    if (targetId === requesterId && is_active === 0) {
      return res.status(403).json({ error: 'You cannot deactivate your own account. Ask another admin.' })
    }

    const updates = ['name=?', 'phone=?']
    const vals    = [name, phone || null]

    if (email) { updates.push('email=?'); vals.push(email) }
    if (is_active !== undefined) { updates.push('is_active=?'); vals.push(is_active) }
    if (password && password.trim()) {
      const hash = await bcrypt.hash(password, 10)
      updates.push('password=?'); vals.push(hash)
    }

    vals.push(targetId)
    await sequelize.query(`UPDATE users SET ${updates.join(',')} WHERE id=?`, { replacements: vals })
    res.json({ success: true })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// Soft-delete (deactivate) - cannot deactivate self
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id)
    if (targetId === req.user.id) {
      return res.status(403).json({ error: 'You cannot deactivate your own account.' })
    }
    await sequelize.query('UPDATE users SET is_active=0 WHERE id=?', { replacements: [targetId] })
    res.json({ success: true })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

// Reactivate account
router.post('/:id/activate', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query('UPDATE users SET is_active=1 WHERE id=?', { replacements: [req.params.id] })
    res.json({ success: true })
  } catch(e) {
    res.status(500).json({ error: e.message })
  }
})

module.exports = router
