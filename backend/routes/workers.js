const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()

const uploadDir = path.join(__dirname, '../../uploads/workers')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, uploadDir),
  filename:    (req,file,cb) => cb(null, `w_${Date.now()}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits:{ fileSize:3*1024*1024 }, fileFilter:(req,file,cb)=>{
  if (file.mimetype.startsWith('image/')) cb(null,true)
  else cb(new Error('Images only'))
}})

// Standalone image upload
router.post('/upload-image', auth, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error:'No file' })
  res.json({ url:`/uploads/workers/${req.file.filename}` })
})

async function getWorkerCols() {
  const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='workers'`)
  return cols.map(c => c.COLUMN_NAME)
}

router.get('/', auth, async (req, res) => {
  try {
    const month = parseInt(req.query.month) || new Date().getMonth()+1
    const year  = parseInt(req.query.year)  || new Date().getFullYear()
    const daysInMonth = new Date(year, month, 0).getDate()
    const cols  = await getWorkerCols()
    const extra = []
    if (cols.includes('image_url'))   extra.push('w.image_url')
    if (cols.includes('worker_type')) extra.push('w.worker_type','w.salary_type')

    const [rows] = await sequelize.query(
      `SELECT w.id, w.name, w.phone, w.address, w.skill, w.daily_rate, w.is_active, w.joined_date, w.created_at, w.updated_at
              ${extra.length ? ','+extra.join(',') : ''},
         COUNT(DISTINCT wa.id) as total_assignments,
         SUM(CASE WHEN wa.status='COMPLETED' THEN 1 ELSE 0 END) as completed_assignments,
         SUM(CASE WHEN wa.status!='COMPLETED' THEN 1 ELSE 0 END) as pending_assignments,
         (SELECT COUNT(*) FROM worker_attendance att WHERE att.worker_id=w.id AND att.status='PRESENT' AND MONTH(att.date)=? AND YEAR(att.date)=?) as present_days,
         (SELECT COUNT(*) FROM worker_attendance att WHERE att.worker_id=w.id AND att.status='HALF_DAY' AND MONTH(att.date)=? AND YEAR(att.date)=?) as half_days,
         ? as days_in_month
       FROM workers w LEFT JOIN work_assignments wa ON w.id=wa.worker_id
       WHERE w.is_active=1
       GROUP BY w.id ORDER BY w.name`,
      { replacements:[month,year,month,year,daysInMonth] }
    )
    res.json(rows)
  } catch (err) { console.error('Workers GET:', err.message); res.status(500).json({ error:err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const [w] = await sequelize.query('SELECT * FROM workers WHERE id=?', { replacements:[req.params.id] })
    if (!w.length) return res.status(404).json({ error:'Not found' })
    const [a] = await sequelize.query(
      `SELECT wa.*, p.name as product_name_db FROM work_assignments wa LEFT JOIN products p ON wa.product_id=p.id WHERE wa.worker_id=? ORDER BY wa.created_at DESC`,
      { replacements:[req.params.id] }
    )
    const [adv] = await sequelize.query('SELECT * FROM worker_advances WHERE worker_id=? ORDER BY payment_date DESC', { replacements:[req.params.id] }).catch(()=>[[]])
    res.json({ worker:w[0], assignments:a, advances:adv })
  } catch (err) { res.status(500).json({ error:err.message }) }
})

// POST - accepts FormData with optional image file
router.post('/', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body
    const name = (body.name||'').trim()
    if (!name) return res.status(400).json({ error:'Worker name is required' })

    // Image URL: either uploaded file or pre-existing URL
    let imageUrl = body.image_url || null
    if (req.file) imageUrl = `/uploads/workers/${req.file.filename}`

    const cols   = await getWorkerCols()
    const fields = ['name','phone','address','skill','daily_rate','joined_date']
    const vals   = [name, body.phone||null, body.address||null, body.skill||null, parseFloat(body.daily_rate)||0, body.joined_date||null]

    if (cols.includes('worker_type')) { fields.push('worker_type'); vals.push(body.worker_type||'PERMANENT') }
    if (cols.includes('salary_type')) { fields.push('salary_type'); vals.push(body.salary_type||'DAILY') }
    if (cols.includes('image_url'))   { fields.push('image_url');   vals.push(imageUrl) }

    const [r] = await sequelize.query(
      `INSERT INTO workers(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,
      { replacements:vals }
    )
    res.json({ success:true, id:r })
  } catch (err) {
    console.error('Worker POST error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

// PUT - accepts FormData with optional image file
router.put('/:id', auth, adminOnly, upload.single('image'), async (req, res) => {
  try {
    const body = req.body
    const name = (body.name||'').trim()
    if (!name) return res.status(400).json({ error:'Worker name is required' })

    let imageUrl = body.image_url || null
    if (req.file) imageUrl = `/uploads/workers/${req.file.filename}`

    const cols    = await getWorkerCols()
    const updates = ['name=?','phone=?','address=?','skill=?','daily_rate=?','is_active=?']
    const vals    = [name, body.phone||null, body.address||null, body.skill||null, parseFloat(body.daily_rate)||0, body.is_active!==undefined ? parseInt(body.is_active) : 1]

    if (cols.includes('worker_type')) { updates.push('worker_type=?'); vals.push(body.worker_type||'PERMANENT') }
    if (cols.includes('salary_type')) { updates.push('salary_type=?'); vals.push(body.salary_type||'DAILY') }
    if (cols.includes('image_url'))   { updates.push('image_url=?');   vals.push(imageUrl) }

    vals.push(req.params.id)
    await sequelize.query(`UPDATE workers SET ${updates.join(',')} WHERE id=?`, { replacements:vals })
    res.json({ success:true })
  } catch (err) {
    console.error('Worker PUT error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    await sequelize.query('UPDATE workers SET is_active=0 WHERE id=?', { replacements:[req.params.id] })
    res.json({ success:true })
  } catch (err) { res.status(500).json({ error:err.message }) }
})

module.exports = router
