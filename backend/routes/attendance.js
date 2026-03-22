const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

// Get attendance for a specific date
router.get('/', auth, async (req, res) => {
  try {
    const date = req.query.date || new Date().toISOString().split('T')[0]
    const [r] = await sequelize.query(
      `SELECT wa.*, w.name as worker_name, w.skill
       FROM worker_attendance wa JOIN workers w ON wa.worker_id=w.id
       WHERE wa.date=? ORDER BY w.name`,
      { replacements:[date] }
    )
    res.json(r)
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Get all attendance for a month (for calendar + salary sheet)
router.get('/monthly', auth, async (req, res) => {
  try {
    const year  = req.query.year  || new Date().getFullYear()
    const month = req.query.month || (new Date().getMonth()+1)
    const [r] = await sequelize.query(
      `SELECT wa.*, w.name as worker_name, w.skill, w.daily_rate
       FROM worker_attendance wa JOIN workers w ON wa.worker_id=w.id
       WHERE YEAR(wa.date)=? AND MONTH(wa.date)=?
       ORDER BY w.name, wa.date`,
      { replacements:[year,month] }
    )
    res.json(r)
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Mark attendance (upsert)
router.post('/', auth, async (req, res) => {
  try {
    const { worker_id, date, status, notes } = req.body
    await sequelize.query(
      `INSERT INTO worker_attendance(worker_id,date,status,notes,created_by)VALUES(?,?,?,?,?)
       ON DUPLICATE KEY UPDATE status=VALUES(status),notes=VALUES(notes)`,
      { replacements:[worker_id,date,status,notes||null,req.user.id] }
    )
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

module.exports = router
