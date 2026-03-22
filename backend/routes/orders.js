const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

const toNumber = (value) => {
  const num = parseFloat(value)
  return Number.isFinite(num) ? num : 0
}

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100

const getInsertId = (result) => result?.insertId || result

function calculateOrderAmounts(items = [], discount = 0, deliveryCharges = 0, otherCharges = 0) {
  const normalizedItems = Array.isArray(items) ? items : []
  const subtotal = round2(
    normalizedItems.reduce((sum, item) => sum + (toNumber(item.quantity) * toNumber(item.unit_price)), 0)
  )
  const discountAmount = Math.min(Math.max(toNumber(discount), 0), subtotal)
  const taxableSubtotal = round2(subtotal - discountAmount)

  let remainingDiscount = discountAmount
  let cgst = 0
  let sgst = 0
  let igst = 0

  normalizedItems.forEach((item, index) => {
    const lineSubtotal = round2(toNumber(item.quantity) * toNumber(item.unit_price))
    const lineDiscount = subtotal > 0
      ? (index === normalizedItems.length - 1
        ? remainingDiscount
        : round2(discountAmount * (lineSubtotal / subtotal)))
      : 0

    remainingDiscount = round2(remainingDiscount - lineDiscount)
    const taxableLineAmount = Math.max(0, round2(lineSubtotal - lineDiscount))

    cgst += taxableLineAmount * toNumber(item.cgst_pct) / 100
    sgst += taxableLineAmount * toNumber(item.sgst_pct) / 100
    igst += taxableLineAmount * toNumber(item.igst_pct) / 100
  })

  const cgstAmount = round2(cgst)
  const sgstAmount = round2(sgst)
  const igstAmount = round2(igst)
  const delivery = round2(toNumber(deliveryCharges))
  const other = round2(toNumber(otherCharges))

  return {
    subtotal,
    discountAmount,
    taxableSubtotal,
    cgst: cgstAmount,
    sgst: sgstAmount,
    igst: igstAmount,
    deliveryCharges: delivery,
    otherCharges: other,
    total: round2(taxableSubtotal + cgstAmount + sgstAmount + igstAmount + delivery + other),
  }
}

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
    const { status, payment_status, customer_id, from, to } = req.query
    let w = '1=1'; const r = []
    if (status)         { w += ' AND o.status=?';         r.push(status) }
    if (payment_status) { w += ' AND o.payment_status=?'; r.push(payment_status) }
    if (customer_id)    { w += ' AND o.customer_id=?';    r.push(customer_id) }
    if (from)           { w += ' AND DATE(o.order_date) >= ?'; r.push(from) }
    if (to)             { w += ' AND DATE(o.order_date) <= ?'; r.push(to) }
    const [rows] = await sequelize.query(
      `SELECT o.*, c.name as customer_name, c.phone as customer_phone
       FROM orders o LEFT JOIN customers c ON o.customer_id=c.id
       WHERE ${w} ORDER BY o.order_date DESC, o.created_at DESC`,
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
      customer_gst, gst_number, customer_id:cid,
      order_date, delivery_date, status, notes,
      delivery_charges=0, other_charges=0, discount=0,
      payment_mode, lr_number, transport_name, vehicle_number,
      items=[]
    } = req.body

    let custId = cid
    if (!custId && customer_name) {
      const [ex] = await sequelize.query('SELECT id FROM customers WHERE name=?', { replacements:[customer_name], transaction:t })
      if (ex.length) { custId = ex[0].id }
      else {
        const [insertCustomer] = await sequelize.query(
          'INSERT INTO customers(name,phone,email,address,gst_number)VALUES(?,?,?,?,?)',
          { replacements:[customer_name,customer_phone||null,customer_email||null,customer_address||null,customer_gst||gst_number||null], transaction:t }
        )
        custId = getInsertId(insertCustomer)
      }
    }

    const amounts = calculateOrderAmounts(items, discount, delivery_charges, other_charges)
    const num   = await genOrderNumber()

    // Detect columns
    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'`, { transaction:t })
    const has = (c) => cols.map(x=>x.COLUMN_NAME).includes(c)

    const fields = ['order_number','customer_id','status','order_date','delivery_date','subtotal','delivery_charges','other_charges','discount','total_amount','notes','created_by']
    const vals   = [num,custId,status||'PENDING',order_date,delivery_date||null,amounts.subtotal,amounts.deliveryCharges,amounts.otherCharges,amounts.discountAmount,amounts.total,notes||null,req.user.id]

    if (has('cgst'))          { fields.push('cgst');          vals.push(amounts.cgst) }
    if (has('sgst'))          { fields.push('sgst');          vals.push(amounts.sgst) }
    if (has('igst'))          { fields.push('igst');          vals.push(amounts.igst) }
    if (has('tax'))           { fields.push('tax');           vals.push(amounts.cgst + amounts.sgst + amounts.igst) }
    if (has('payment_mode'))  { fields.push('payment_mode');  vals.push(payment_mode||'CASH') }
    if (has('lr_number'))     { fields.push('lr_number');     vals.push(lr_number||null) }
    if (has('transport_name')){ fields.push('transport_name');vals.push(transport_name||null) }
    if (has('vehicle_number')){ fields.push('vehicle_number');vals.push(vehicle_number||null) }

    const [insertOrder] = await sequelize.query(
      `INSERT INTO orders(${fields.join(',')}) VALUES(${fields.map(()=>'?').join(',')})`,
      { replacements:vals, transaction:t }
    )
    const orderId = getInsertId(insertOrder)

    // Item columns
    const [iCols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='order_items'`, { transaction:t })
    const hasI = (c) => iCols.map(x=>x.COLUMN_NAME).includes(c)

    for (const item of items) {
      const iF = ['order_id','product_id','custom_product_name','quantity','unit_price','total_price']
      const iV = [orderId,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,toNumber(item.quantity) * toNumber(item.unit_price)]
      if (hasI('unit'))     { iF.push('unit');     iV.push(item.unit||'Pcs.') }
      if (hasI('cgst_pct')) { iF.push('cgst_pct'); iV.push(parseFloat(item.cgst_pct)||0) }
      if (hasI('sgst_pct')) { iF.push('sgst_pct'); iV.push(parseFloat(item.sgst_pct)||0) }
      if (hasI('igst_pct')) { iF.push('igst_pct'); iV.push(parseFloat(item.igst_pct)||0) }
      if (hasI('hsn_code')) { iF.push('hsn_code'); iV.push(item.hsn_code||null) }
      if (hasI('notes'))    { iF.push('notes');    iV.push(item.notes||null) }
      await sequelize.query(`INSERT INTO order_items(${iF.join(',')}) VALUES(${iF.map(()=>'?').join(',')})`, { replacements:iV, transaction:t })
    }

    await t.commit()
    res.json({ success:true, id:orderId, order_number:num })
  } catch (err) {
    await t.rollback()
    console.error('Order create error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const {
      status, payment_status, amount_paid, delivery_date, order_date,
      delivery_charges=0, other_charges=0, discount=0, notes, payment_mode,
      customer_name, customer_phone, customer_email, customer_address, customer_gst, gst_number,
      lr_number, transport_name, vehicle_number, items
    } = req.body

    const [cols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='orders'`, { transaction:t })
    const has = (c) => cols.map(x=>x.COLUMN_NAME).includes(c)

    if (customer_name) {
      const [existingOrder] = await sequelize.query('SELECT customer_id FROM orders WHERE id=?', { replacements:[req.params.id], transaction:t })
      const existingCustomerId = existingOrder[0]?.customer_id

      if (existingCustomerId) {
        await sequelize.query(
          'UPDATE customers SET name=?, phone=?, email=?, address=?, gst_number=? WHERE id=?',
          { replacements:[customer_name, customer_phone||null, customer_email||null, customer_address||null, customer_gst||gst_number||null, existingCustomerId], transaction:t }
        )
      }
    }

    if (items && items.length) {
      const amounts = calculateOrderAmounts(items, discount, delivery_charges, other_charges)
      const upd   = ['status=?','payment_status=?','amount_paid=?','delivery_date=?','order_date=?','subtotal=?','delivery_charges=?','other_charges=?','discount=?','total_amount=?','notes=?']
      const vals  = [status,payment_status,amount_paid||0,delivery_date||null,order_date||null,amounts.subtotal,amounts.deliveryCharges,amounts.otherCharges,amounts.discountAmount,amounts.total,notes||null]
      if (has('cgst'))         { upd.push('cgst=?');         vals.push(amounts.cgst) }
      if (has('sgst'))         { upd.push('sgst=?');         vals.push(amounts.sgst) }
      if (has('igst'))         { upd.push('igst=?');         vals.push(amounts.igst) }
      if (has('tax'))          { upd.push('tax=?');          vals.push(amounts.cgst + amounts.sgst + amounts.igst) }
      if (has('payment_mode')) { upd.push('payment_mode=?'); vals.push(payment_mode||'CASH') }
      if (has('lr_number'))     { upd.push('lr_number=?');      vals.push(lr_number||null) }
      if (has('transport_name')){ upd.push('transport_name=?'); vals.push(transport_name||null) }
      if (has('vehicle_number')){ upd.push('vehicle_number=?'); vals.push(vehicle_number||null) }
      vals.push(req.params.id)
      await sequelize.query(`UPDATE orders SET ${upd.join(',')} WHERE id=?`, { replacements:vals, transaction:t })

      const [iCols] = await sequelize.query(`SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='order_items'`, { transaction:t })
      const hasI = (c) => iCols.map(x=>x.COLUMN_NAME).includes(c)
      await sequelize.query('DELETE FROM order_items WHERE order_id=?', { replacements:[req.params.id], transaction:t })
      for (const item of items) {
        const itemFields = ['order_id','product_id','custom_product_name','quantity','unit_price','total_price']
        const itemValues = [req.params.id,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,toNumber(item.quantity) * toNumber(item.unit_price)]
        if (hasI('unit'))     { itemFields.push('unit');     itemValues.push(item.unit||'Pcs.') }
        if (hasI('cgst_pct')) { itemFields.push('cgst_pct'); itemValues.push(parseFloat(item.cgst_pct)||0) }
        if (hasI('sgst_pct')) { itemFields.push('sgst_pct'); itemValues.push(parseFloat(item.sgst_pct)||0) }
        if (hasI('igst_pct')) { itemFields.push('igst_pct'); itemValues.push(parseFloat(item.igst_pct)||0) }
        if (hasI('hsn_code')) { itemFields.push('hsn_code'); itemValues.push(item.hsn_code||null) }
        if (hasI('notes'))    { itemFields.push('notes');    itemValues.push(item.notes||null) }
        await sequelize.query(
          `INSERT INTO order_items(${itemFields.join(',')}) VALUES(${itemFields.map(()=>'?').join(',')})`,
          { replacements:itemValues, transaction:t }
        )
      }
    } else {
      await sequelize.query('UPDATE orders SET status=?,payment_status=?,amount_paid=?,delivery_date=?,order_date=?,notes=? WHERE id=?',
        { replacements:[status,payment_status,amount_paid||0,delivery_date||null,order_date||null,notes||null,req.params.id], transaction:t }
      )
    }
    await t.commit(); res.json({ success:true })
  } catch (err) { await t.rollback(); res.status(500).json({ error:err.message }) }
})

module.exports = router
