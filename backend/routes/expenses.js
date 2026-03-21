const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, category } = req.query
    let w = '1=1'; const r = []
    if (from) { w += ' AND e.date >= ?'; r.push(from) }
    if (to)   { w += ' AND e.date <= ?'; r.push(to) }
    if (category) { w += ' AND e.category = ?'; r.push(category) }
    const [rows] = await sequelize.query(
      `SELECT e.*,u.name as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by=u.id WHERE ${w} ORDER BY e.created_at DESC`,
      { replacements: r }
    )
    res.json(rows)
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { title,category,amount,tax_pct,tax_amount,vendor_name,vendor_gst,description,date } = req.body
    const [r] = await sequelize.query(
      'INSERT INTO expenses(title,category,amount,tax_pct,tax_amount,vendor_name,vendor_gst,description,date,created_by)VALUES(?,?,?,?,?,?,?,?,?,?)',
      { replacements:[title,category||'OTHER',amount,tax_pct||null,tax_amount||null,vendor_name||null,vendor_gst||null,description||null,date,req.user.id] }
    )
    res.json({ success: true, id: r })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    await sequelize.query('DELETE FROM expenses WHERE id=?',{replacements:[req.params.id]})
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
