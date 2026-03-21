const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/', auth, async (req, res) => {
  try {
    const [r] = await sequelize.query('SELECT * FROM materials ORDER BY name')
    res.json(r)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { name, unit, quantity, min_stock, unit_price, vendor_name, vendor_phone } = req.body
    const [r] = await sequelize.query(
      'INSERT INTO materials(name,unit,quantity,min_stock,unit_price,vendor_name,vendor_phone)VALUES(?,?,?,?,?,?,?)',
      { replacements: [name, unit, quantity||0, min_stock||0, unit_price||0, vendor_name||null, vendor_phone||null] }
    )
    res.json({ success: true, id: r })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { name, unit, min_stock, unit_price, vendor_name, vendor_phone } = req.body
    await sequelize.query(
      'UPDATE materials SET name=?,unit=?,min_stock=?,unit_price=?,vendor_name=?,vendor_phone=? WHERE id=?',
      { replacements: [name, unit, min_stock||0, unit_price||0, vendor_name||null, vendor_phone||null, req.params.id] }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/transaction', auth, async (req, res) => {
  try {
    const { type, quantity, unit_price, vendor_name } = req.body
    const [rows] = await sequelize.query('SELECT * FROM materials WHERE id=?', { replacements: [req.params.id] })
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    const mat = rows[0]
    let newQty = type === 'IN'
      ? parseFloat(mat.quantity) + parseFloat(quantity)
      : parseFloat(mat.quantity) - parseFloat(quantity)
    if (newQty < 0) return res.status(400).json({ error: 'Insufficient stock' })
    await sequelize.query('UPDATE materials SET quantity=? WHERE id=?', { replacements: [newQty, req.params.id] })
    await sequelize.query(
      'INSERT INTO material_transactions(material_id,type,quantity,unit_price,vendor_name,created_by)VALUES(?,?,?,?,?,?)',
      { replacements: [req.params.id, type, quantity, unit_price||0, vendor_name||null, req.user.id] }
    )
    // Auto-create expense for stock IN (using description column which may or may not exist)
    if (type === 'IN' && unit_price) {
      const cost = parseFloat(quantity) * parseFloat(unit_price)
      const today = new Date().toISOString().split('T')[0]
      try {
        // Try inserting with description column (new schema)
        await sequelize.query(
          "INSERT INTO expenses(title,category,amount,date,description,created_by)VALUES(?,?,?,?,?,?)",
          { replacements: [`Material: ${mat.name}`, 'MATERIAL', cost, today, `${quantity} ${mat.unit}`, req.user.id] }
        )
      } catch {
        // Fall back to old schema without description
        await sequelize.query(
          "INSERT INTO expenses(title,category,amount,date,created_by)VALUES(?,?,?,?,?)",
          { replacements: [`Material: ${mat.name}`, 'MATERIAL', cost, today, req.user.id] }
        )
      }
    }
    res.json({ success: true, newQuantity: newQty })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id/transactions', auth, async (req, res) => {
  try {
    const [r] = await sequelize.query(
      `SELECT mt.*, u.name as created_by_name
       FROM material_transactions mt
       LEFT JOIN users u ON mt.created_by = u.id
       WHERE mt.material_id = ?
       ORDER BY mt.created_at DESC LIMIT 50`,
      { replacements: [req.params.id] }
    )
    res.json(r)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
