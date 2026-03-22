const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

const VALID_CATS = ['MATERIAL','UTILITIES','TRANSPORT','MAINTENANCE','RENT','OTHER']

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, category } = req.query
    let w = "COALESCE(e.is_active,1)=1"
    const r = []
    if (from) { w += ' AND e.date>=?'; r.push(from) }
    if (to)   { w += ' AND e.date<=?'; r.push(to) }
    if (category) { w += ' AND e.category=?'; r.push(category) }
    const [rows] = await sequelize.query(
      `SELECT e.*, u.name as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by=u.id WHERE ${w} ORDER BY e.created_at DESC`,
      { replacements:r }
    )
    res.json(rows)
  } catch(err) { res.status(500).json({ error:err.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { title, category, amount, tax_pct, tax_amount, vendor_name, vendor_gst, description, date } = req.body
    const cat = VALID_CATS.includes(category) ? category : 'OTHER'
    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='expenses'`)
    const colNames = cols.map(c=>c.COLUMN_NAME)
    const fields = ['title','category','amount','date','created_by']
    const vals   = [title, cat, amount, date, req.user.id]
    if (colNames.includes('tax_pct'))    { fields.push('tax_pct');    vals.push(tax_pct||null) }
    if (colNames.includes('tax_amount')) { fields.push('tax_amount'); vals.push(tax_amount||null) }
    if (colNames.includes('vendor_name')){ fields.push('vendor_name');vals.push(vendor_name||null) }
    if (colNames.includes('vendor_gst')) { fields.push('vendor_gst'); vals.push(vendor_gst||null) }
    if (colNames.includes('description')){ fields.push('description');vals.push(description||null) }
    if (colNames.includes('notes') && !colNames.includes('description')){ fields.push('notes');vals.push(description||null) }
    const [r] = await sequelize.query(
      `INSERT INTO expenses(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,
      { replacements:vals }
    )
    res.json({ success:true, id:r })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { title, category, amount, tax_pct, tax_amount, vendor_name, vendor_gst, description, date } = req.body
    const cat = VALID_CATS.includes(category) ? category : 'OTHER'
    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='expenses'`)
    const colNames = cols.map(c=>c.COLUMN_NAME)
    const updates = ['title=?','category=?','amount=?','date=?']
    const vals    = [title, cat, amount, date]
    if (colNames.includes('tax_pct'))    { updates.push('tax_pct=?');    vals.push(tax_pct||null) }
    if (colNames.includes('tax_amount')) { updates.push('tax_amount=?'); vals.push(tax_amount||null) }
    if (colNames.includes('vendor_name')){ updates.push('vendor_name=?');vals.push(vendor_name||null) }
    if (colNames.includes('vendor_gst')) { updates.push('vendor_gst=?'); vals.push(vendor_gst||null) }
    if (colNames.includes('description')){ updates.push('description=?');vals.push(description||null) }
    vals.push(req.params.id)
    await sequelize.query(`UPDATE expenses SET ${updates.join(',')} WHERE id=?`, { replacements:vals })
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

router.delete('/:id', auth, async (req, res) => {
  try {
    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='expenses' AND COLUMN_NAME='is_active'`)
    if (cols.length) await sequelize.query('UPDATE expenses SET is_active=0 WHERE id=?', { replacements:[req.params.id] })
    else await sequelize.query('DELETE FROM expenses WHERE id=?', { replacements:[req.params.id] })
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

module.exports = router
