const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

// Generate serial invoice number: {PREFIX}-{MM}{YY}-{0001}
async function genOrderNumber() {
  try {
    const [co] = await sequelize.query('SELECT invoice_prefix FROM company_details WHERE id=1')
    const prefix = (co[0]?.invoice_prefix || 'WC').toUpperCase()
    const now   = new Date()
    const mm    = String(now.getMonth()+1).padStart(2,'0')
    const yy    = String(now.getFullYear()).slice(2)
    const base  = `${prefix}-${mm}${yy}-`

    // Get last serial for this prefix+month
    const [last] = await sequelize.query(
      `SELECT order_number FROM orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`,
      { replacements:[`${base}%`] }
    )
    let serial = 1
    if (last.length) {
      const parts = last[0].order_number.split('-')
      const lastSerial = parseInt(parts[parts.length-1]) || 0
      serial = lastSerial + 1
    }
    return `${base}${String(serial).padStart(4,'0')}`
  } catch {
    const now = new Date()
    return `ORD-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const { status, payment_status, customer_id } = req.query
    let w = '1=1'; const r = []
    if (status)         { w += ' AND o.status=?';         r.push(status) }
    if (payment_status) { w += ' AND o.payment_status=?'; r.push(payment_status) }
    if (customer_id)    { w += ' AND o.customer_id=?';    r.push(customer_id) }
    const [rows] = await sequelize.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone
       FROM orders o LEFT JOIN customers c ON o.customer_id=c.id
       WHERE ${w} ORDER BY o.created_at DESC`,
      { replacements: r }
    )
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/:id', auth, async (req, res) => {
  try {
    const [o] = await sequelize.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone,
              c.email as customer_email, c.address as customer_address, c.gst_number
       FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?`,
      { replacements: [req.params.id] }
    )
    if (!o.length) return res.status(404).json({ error:'Not found' })
    const [items] = await sequelize.query(
      `SELECT oi.*, p.name as product_name_db FROM order_items oi
       LEFT JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`,
      { replacements: [req.params.id] }
    )
    res.json({ order:o[0], items })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const {
      customer_name, customer_phone, customer_email, customer_address,
      customer_gst, customer_id:cid,
      order_date, delivery_date, status, notes,
      cgst=0, sgst=0, igst=0,
      delivery_charges=0, other_charges=0, discount=0,
      payment_mode, lr_number, transport_name, vehicle_number,
      items=[]
    } = req.body

    let custId = cid
    if (!custId && customer_name) {
      const [ex] = await sequelize.query('SELECT id FROM customers WHERE name=?', { replacements:[customer_name], transaction:t })
      if (ex.length) { custId = ex[0].id }
      else {
        const [cr] = await sequelize.query(
          'INSERT INTO customers(name,phone,email,address,gst_number)VALUES(?,?,?,?,?)',
          { replacements:[customer_name,customer_phone||null,customer_email||null,customer_address||null,customer_gst||null], transaction:t }
        )
        custId = cr
      }
    }

    const sub   = items.reduce((s,i)=>s+(parseFloat(i.quantity||0)*parseFloat(i.unit_price||0)),0)
    const cgstV = parseFloat(cgst), sgstV=parseFloat(sgst), igstV=parseFloat(igst)
    const total = sub+cgstV+sgstV+igstV+parseFloat(delivery_charges)+parseFloat(other_charges)-parseFloat(discount)
    const num   = await genOrderNumber()

    // Detect columns
    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'`, { transaction:t })
    const has = (c) => cols.map(x=>x.COLUMN_NAME).includes(c)

    const fields = ['order_number','customer_id','status','order_date','delivery_date','subtotal','delivery_charges','other_charges','discount','total_amount','notes','created_by']
    const vals   = [num,custId,status||'PENDING',order_date,delivery_date||null,sub,delivery_charges,other_charges,discount,total,notes||null,req.user.id]

    if (has('cgst'))          { fields.push('cgst');          vals.push(cgstV) }
    if (has('sgst'))          { fields.push('sgst');          vals.push(sgstV) }
    if (has('igst'))          { fields.push('igst');          vals.push(igstV) }
    if (has('tax'))           { fields.push('tax');           vals.push(cgstV+sgstV+igstV) }
    if (has('payment_mode'))  { fields.push('payment_mode');  vals.push(payment_mode||'CASH') }
    if (has('lr_number'))     { fields.push('lr_number');     vals.push(lr_number||null) }
    if (has('transport_name')){ fields.push('transport_name');vals.push(transport_name||null) }
    if (has('vehicle_number')){ fields.push('vehicle_number');vals.push(vehicle_number||null) }

    const [or] = await sequelize.query(
      `INSERT INTO orders(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,
      { replacements:vals, transaction:t }
    )

    // Item columns
    const [iCols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='order_items'`, { transaction:t })
    const hasI = (c) => iCols.map(x=>x.COLUMN_NAME).includes(c)

    for (const item of items) {
      const iF = ['order_id','product_id','custom_product_name','quantity','unit_price','total_price']
      const iV = [or,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,item.quantity*item.unit_price]
      if (hasI('unit'))     { iF.push('unit');     iV.push(item.unit||'Pcs.') }
      if (hasI('cgst_pct')) { iF.push('cgst_pct'); iV.push(parseFloat(item.cgst_pct)||0) }
      if (hasI('sgst_pct')) { iF.push('sgst_pct'); iV.push(parseFloat(item.sgst_pct)||0) }
      if (hasI('igst_pct')) { iF.push('igst_pct'); iV.push(parseFloat(item.igst_pct)||0) }
      if (hasI('hsn_code')) { iF.push('hsn_code'); iV.push(item.hsn_code||null) }
      if (hasI('notes'))    { iF.push('notes');    iV.push(item.notes||null) }
      await sequelize.query(`INSERT INTO order_items(${iF.join(',')}) VALUES(${iF.map(()=>'?').join(',')})`, { replacements:iV, transaction:t })
    }

    await t.commit()
    res.json({ success:true, id:or, order_number:num })
  } catch (err) {
    await t.rollback()
    console.error('Order create error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const { status, payment_status, amount_paid, delivery_date, cgst=0, sgst=0, igst=0,
            delivery_charges=0, other_charges=0, discount=0, notes, payment_mode, items } = req.body

    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'`, { transaction:t })
    const has = (c) => cols.map(x=>x.COLUMN_NAME).includes(c)

    if (items && items.length) {
      const sub   = items.reduce((s,i)=>s+(parseFloat(i.quantity||0)*parseFloat(i.unit_price||0)),0)
      const total = sub+parseFloat(cgst)+parseFloat(sgst)+parseFloat(igst)+parseFloat(delivery_charges)+parseFloat(other_charges)-parseFloat(discount)
      const upd   = ['status=?','payment_status=?','amount_paid=?','delivery_date=?','subtotal=?','delivery_charges=?','other_charges=?','discount=?','total_amount=?','notes=?']
      const vals  = [status,payment_status,amount_paid||0,delivery_date||null,sub,delivery_charges,other_charges,discount,total,notes||null]
      if (has('cgst'))         { upd.push('cgst=?');         vals.push(parseFloat(cgst)) }
      if (has('sgst'))         { upd.push('sgst=?');         vals.push(parseFloat(sgst)) }
      if (has('igst'))         { upd.push('igst=?');         vals.push(parseFloat(igst)) }
      if (has('tax'))          { upd.push('tax=?');          vals.push(parseFloat(cgst)+parseFloat(sgst)+parseFloat(igst)) }
      if (has('payment_mode')) { upd.push('payment_mode=?'); vals.push(payment_mode||'CASH') }
      vals.push(req.params.id)
      await sequelize.query(`UPDATE orders SET ${upd.join(',')} WHERE id=?`, { replacements:vals, transaction:t })
      await sequelize.query('DELETE FROM order_items WHERE order_id=?', { replacements:[req.params.id], transaction:t })
      for (const item of items) {
        await sequelize.query(
          'INSERT INTO order_items(order_id,product_id,custom_product_name,quantity,unit_price,total_price)VALUES(?,?,?,?,?,?)',
          { replacements:[req.params.id,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,item.quantity*item.unit_price], transaction:t }
        )
      }
    } else {
      await sequelize.query('UPDATE orders SET status=?,payment_status=?,amount_paid=?,delivery_date=?,notes=? WHERE id=?',
        { replacements:[status,payment_status,amount_paid||0,delivery_date||null,notes||null,req.params.id], transaction:t }
      )
    }
    await t.commit(); res.json({ success:true })
  } catch (err) { await t.rollback(); res.status(500).json({ error:err.message }) }
})

module.exports = router
