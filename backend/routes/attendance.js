const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const date=req.query.date||new Date().toISOString().split('T')[0]
  const [r]=await sequelize.query(`SELECT wa.*,w.name as worker_name,w.skill FROM worker_attendance wa JOIN workers w ON wa.worker_id=w.id WHERE wa.date=? ORDER BY w.name`,{replacements:[date]})
  res.json(r)
})
router.post('/', auth, async (req, res) => {
  const { worker_id,date,status,notes } = req.body
  await sequelize.query(`INSERT INTO worker_attendance(worker_id,date,status,notes,created_by)VALUES(?,?,?,?,?) ON DUPLICATE KEY UPDATE status=VALUES(status),notes=VALUES(notes)`,{replacements:[worker_id,date,status,notes||null,req.user.id]})
  res.json({ success:true })
})
module.exports = router
