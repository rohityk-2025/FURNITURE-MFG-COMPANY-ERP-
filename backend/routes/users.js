const express = require('express')
const bcrypt  = require('bcryptjs')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

router.get('/', auth, adminOnly, async (req, res) => {
  const [rows] = await sequelize.query('SELECT id,name,email,role,phone,is_active,created_at FROM users ORDER BY created_at DESC')
  res.json(rows)
})
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, phone, role='MANAGER' } = req.body
    const hash = await bcrypt.hash(password, 10)
    const [r] = await sequelize.query('INSERT INTO users(name,email,password,phone,role)VALUES(?,?,?,?,?)',{replacements:[name,email,hash,phone,role]})
    res.json({ success:true, id:r })
  } catch(e){ res.status(400).json({error:e.message}) }
})
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name, phone, is_active } = req.body
  await sequelize.query('UPDATE users SET name=?,phone=?,is_active=? WHERE id=?',{replacements:[name,phone,is_active,req.params.id]})
  res.json({ success:true })
})
router.delete('/:id', auth, adminOnly, async (req, res) => {
  await sequelize.query('UPDATE users SET is_active=0 WHERE id=?',{replacements:[req.params.id]})
  res.json({ success:true })
})
module.exports = router
