const express = require('express')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const [r] = await sequelize.query('SELECT * FROM products WHERE is_active=1 ORDER BY name')
  res.json(r)
})
router.post('/', auth, adminOnly, async (req, res) => {
  const { name,category,description,price,commission } = req.body
  const [r] = await sequelize.query('INSERT INTO products(name,category,description,price,commission)VALUES(?,?,?,?,?)',{replacements:[name,category,description,price,commission||0]})
  res.json({ success:true, id:r })
})
router.put('/:id', auth, adminOnly, async (req, res) => {
  const { name,category,description,price,commission,is_active } = req.body
  await sequelize.query('UPDATE products SET name=?,category=?,description=?,price=?,commission=?,is_active=? WHERE id=?',{replacements:[name,category,description,price,commission,is_active,req.params.id]})
  res.json({ success:true })
})
router.delete('/:id', auth, adminOnly, async (req, res) => {
  await sequelize.query('UPDATE products SET is_active=0 WHERE id=?',{replacements:[req.params.id]})
  res.json({ success:true })
})
module.exports = router
