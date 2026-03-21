const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const [r] = await sequelize.query('SELECT * FROM materials ORDER BY name')
  res.json(r)
})
router.post('/', auth, async (req, res) => {
  const { name,unit,quantity,min_stock,unit_price,vendor_name,vendor_phone,notes } = req.body
  const [r] = await sequelize.query('INSERT INTO materials(name,unit,quantity,min_stock,unit_price,vendor_name,vendor_phone,notes)VALUES(?,?,?,?,?,?,?,?)',{replacements:[name,unit,quantity||0,min_stock||0,unit_price||0,vendor_name,vendor_phone,notes]})
  res.json({ success:true, id:r })
})
router.put('/:id', auth, async (req, res) => {
  const { name,unit,min_stock,unit_price,vendor_name,vendor_phone,notes } = req.body
  await sequelize.query('UPDATE materials SET name=?,unit=?,min_stock=?,unit_price=?,vendor_name=?,vendor_phone=?,notes=? WHERE id=?',{replacements:[name,unit,min_stock,unit_price,vendor_name,vendor_phone,notes,req.params.id]})
  res.json({ success:true })
})
router.post('/:id/transaction', auth, async (req, res) => {
  const { type,quantity,unit_price,vendor_name,notes } = req.body
  const [rows] = await sequelize.query('SELECT * FROM materials WHERE id=?',{replacements:[req.params.id]})
  if(!rows.length) return res.status(404).json({error:'Not found'})
  const mat = rows[0]
  let newQty = type==='IN' ? parseFloat(mat.quantity)+parseFloat(quantity) : parseFloat(mat.quantity)-parseFloat(quantity)
  if(newQty<0) return res.status(400).json({error:'Insufficient stock'})
  await sequelize.query('UPDATE materials SET quantity=? WHERE id=?',{replacements:[newQty,req.params.id]})
  await sequelize.query('INSERT INTO material_transactions(material_id,type,quantity,unit_price,vendor_name,notes,created_by)VALUES(?,?,?,?,?,?,?)',{replacements:[req.params.id,type,quantity,unit_price||0,vendor_name,notes,req.user.id]})
  if(type==='IN'&&unit_price){
    const cost=parseFloat(quantity)*parseFloat(unit_price)
    await sequelize.query("INSERT INTO expenses(title,category,amount,date,notes,created_by)VALUES(?,?,?,?,?,?)",{replacements:[`Material: ${mat.name}`,'MATERIAL',cost,new Date().toISOString().split('T')[0],`${quantity} ${mat.unit}`,req.user.id]})
  }
  res.json({ success:true, newQuantity:newQty })
})
router.get('/:id/transactions', auth, async (req, res) => {
  const [r] = await sequelize.query(`SELECT mt.*,u.name as created_by_name FROM material_transactions mt LEFT JOIN users u ON mt.created_by=u.id WHERE mt.material_id=? ORDER BY mt.created_at DESC LIMIT 50`,{replacements:[req.params.id]})
  res.json(r)
})
module.exports = router
