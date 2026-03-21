const express = require('express')
const { sequelize } = require('../config/database')
const { auth, adminOnly } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const [r]=await sequelize.query('SELECT * FROM company_details WHERE id=1')
  res.json(r[0]||{})
})
router.put('/', auth, adminOnly, async (req, res) => {
  const { company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,upi_id,upi_phone,bank_name,bank_account,bank_ifsc,invoice_prefix,invoice_terms } = req.body
  await sequelize.query(`INSERT INTO company_details(id,company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,upi_id,upi_phone,bank_name,bank_account,bank_ifsc,invoice_prefix,invoice_terms)VALUES(1,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE company_name=VALUES(company_name),tagline=VALUES(tagline),gst_number=VALUES(gst_number),pan_number=VALUES(pan_number),address=VALUES(address),city=VALUES(city),state=VALUES(state),pincode=VALUES(pincode),phone=VALUES(phone),email=VALUES(email),website=VALUES(website),upi_id=VALUES(upi_id),upi_phone=VALUES(upi_phone),bank_name=VALUES(bank_name),bank_account=VALUES(bank_account),bank_ifsc=VALUES(bank_ifsc),invoice_prefix=VALUES(invoice_prefix),invoice_terms=VALUES(invoice_terms)`,{replacements:[company_name,tagline,gst_number,pan_number,address,city,state,pincode,phone,email,website,upi_id,upi_phone,bank_name,bank_account,bank_ifsc,invoice_prefix,invoice_terms]})
  res.json({ success:true })
})
module.exports = router
