const express = require('express')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

router.get('/', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT w.*,
              COUNT(wa.id) as total_assignments,
              SUM(CASE WHEN wa.status='COMPLETED' THEN 1 ELSE 0 END) as completed_assignments,
              SUM(CASE WHEN wa.status!='COMPLETED' THEN 1 ELSE 0 END) as pending_assignments
       FROM workers w
       LEFT JOIN work_assignments wa ON w.id = wa.worker_id
       WHERE w.is_active = 1
       GROUP BY w.id, w.name, w.phone, w.address, w.skill,
                w.daily_rate, w.is_active, w.joined_date, w.created_at, w.updated_at
       ORDER BY w.name`
    )
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const [w] = await sequelize.query(
      'SELECT * FROM workers WHERE id = ?', { replacements: [req.params.id] }
    )
    const [a] = await sequelize.query(
      `SELECT wa.*, p.name as product_name_db
       FROM work_assignments wa
       LEFT JOIN products p ON wa.product_id = p.id
       WHERE wa.worker_id = ? ORDER BY wa.created_at DESC`,
      { replacements: [req.params.id] }
    )
    res.json({ worker: w[0], assignments: a })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, address, skill, daily_rate, joined_date } = req.body
    const [r] = await sequelize.query(
      'INSERT INTO workers(name,phone,address,skill,daily_rate,joined_date)VALUES(?,?,?,?,?,?)',
      { replacements: [name, phone, address, skill, daily_rate||0, joined_date] }
    )
    res.json({ success: true, id: r })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const { name, phone, address, skill, daily_rate, is_active } = req.body
    await sequelize.query(
      'UPDATE workers SET name=?,phone=?,address=?,skill=?,daily_rate=?,is_active=? WHERE id=?',
      { replacements: [name, phone, address, skill, daily_rate, is_active, req.params.id] }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query(
      'UPDATE workers SET is_active=0 WHERE id=?', { replacements: [req.params.id] }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
