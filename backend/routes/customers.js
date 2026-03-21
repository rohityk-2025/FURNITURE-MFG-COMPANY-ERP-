const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const [r] = await sequelize.query(`SELECT c.*,COUNT(o.id) as total_orders,COALESCE(SUM(o.total_amount),0) as total_value FROM customers c LEFT JOIN orders o ON c.id=o.customer_id GROUP BY c.id ORDER BY c.name`)
  res.json(r)
})
router.get('/search', auth, async (req, res) => {
  const [r] = await sequelize.query('SELECT * FROM customers WHERE name LIKE ? LIMIT 10',{replacements:[`%${req.query.q}%`]})
  res.json(r)
})
router.post('/', auth, async (req, res) => {
  const { name,phone,email,address,gst_number } = req.body
  const [ex] = await sequelize.query('SELECT id FROM customers WHERE name=?',{replacements:[name]})
  if(ex.length) return res.json({ success:true, id:ex[0].id, existing:true })
  const [r] = await sequelize.query('INSERT INTO customers(name,phone,email,address,gst_number)VALUES(?,?,?,?,?)',{replacements:[name,phone,email,address,gst_number]})
  res.json({ success:true, id:r })
})
router.put('/:id', auth, async (req, res) => {
  const { name,phone,email,address,gst_number } = req.body
  await sequelize.query('UPDATE customers SET name=?,phone=?,email=?,address=?,gst_number=? WHERE id=?',{replacements:[name,phone,email,address,gst_number,req.params.id]})
  res.json({ success:true })
})
module.exports = router
