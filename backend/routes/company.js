const express = require('express')
const multer  = require('multer')
const path    = require('path')
const fs      = require('fs')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router  = express.Router()

const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${req.body.type || 'file'}_${Date.now()}${path.extname(file.originalname)}`)
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

router.get('/', auth, async (req, res) => {
  try {
    const [r] = await sequelize.query('SELECT * FROM company_details WHERE id=1')
    res.json(r[0] || {})
  } catch(err) { res.status(500).json({ error: err.message }) }
})

router.post('/upload', auth, adminOnly, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' })
  const url = `/uploads/${req.file.filename}`
  res.json({ url })
})

router.put('/', auth, adminOnly, async (req, res) => {
  try {
    const { company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,logo_url,qr_url,upi_id,upi_phone,bank_name,bank_account,bank_ifsc,bank_branch,invoice_prefix,invoice_terms,extra_info } = req.body
    await sequelize.query(`INSERT INTO company_details(id,company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,logo_url,qr_url,upi_id,upi_phone,bank_name,bank_account,bank_ifsc,bank_branch,invoice_prefix,invoice_terms,extra_info)
      VALUES(1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE company_name=VALUES(company_name),tagline=VALUES(tagline),gst_number=VALUES(gst_number),pan_number=VALUES(pan_number),address=VALUES(address),city=VALUES(city),state=VALUES(state),pincode=VALUES(pincode),phone=VALUES(phone),email=VALUES(email),website=VALUES(website),logo_url=VALUES(logo_url),qr_url=VALUES(qr_url),upi_id=VALUES(upi_id),upi_phone=VALUES(upi_phone),bank_name=VALUES(bank_name),bank_account=VALUES(bank_account),bank_ifsc=VALUES(bank_ifsc),bank_branch=VALUES(bank_branch),invoice_prefix=VALUES(invoice_prefix),invoice_terms=VALUES(invoice_terms),extra_info=VALUES(extra_info)`,
      {replacements:[company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,logo_url||'',qr_url||'',upi_id,upi_phone,bank_name,bank_account,bank_ifsc,bank_branch,invoice_prefix,invoice_terms,extra_info||'']})
    res.json({ success: true })
  } catch(err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
