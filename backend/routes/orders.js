const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()
const genNum = () => `ORD-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Math.floor(1000+Math.random()*9000)}`

router.get('/', auth, async (req, res) => {
  const { status,payment_status } = req.query
  let w='1=1'; const r=[]
  if(status){w+=' AND o.status=?';r.push(status)}
  if(payment_status){w+=' AND o.payment_status=?';r.push(payment_status)}
  const [rows] = await sequelize.query(`SELECT o.*,c.name as customer_name,c.phone as customer_phone FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE ${w} ORDER BY o.created_at DESC`,{replacements:r})
  res.json(rows)
})
router.get('/:id', auth, async (req, res) => {
  const [o] = await sequelize.query(`SELECT o.*,c.name as customer_name,c.phone as customer_phone,c.email as customer_email,c.address as customer_address,c.gst_number FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.id=?`,{replacements:[req.params.id]})
  if(!o.length) return res.status(404).json({error:'Not found'})
  const [items] = await sequelize.query(`SELECT oi.*,p.name as product_name_db FROM order_items oi LEFT JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`,{replacements:[req.params.id]})
  res.json({ order:o[0], items })
})
router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction()
  try {
    const { customer_name,customer_phone,customer_email,customer_address,customer_gst,customer_id:cid,order_date,delivery_date,status,notes,tax,delivery_charges,other_charges,discount,items } = req.body
    let custId=cid
    if(!custId){
      const [ex]=await sequelize.query('SELECT id FROM customers WHERE name=?',{replacements:[customer_name],transaction:t})
      if(ex.length){custId=ex[0].id}else{
        const [cr]=await sequelize.query('INSERT INTO customers(name,phone,email,address,gst_number)VALUES(?,?,?,?,?)',{replacements:[customer_name,customer_phone,customer_email,customer_address,customer_gst],transaction:t})
        custId=cr
      }
    }
    const sub=items.reduce((s,i)=>s+(i.quantity*i.unit_price),0)
    const total=sub+parseFloat(tax||0)+parseFloat(delivery_charges||0)+parseFloat(other_charges||0)-parseFloat(discount||0)
    const num=genNum()
    const [or]=await sequelize.query(`INSERT INTO orders(order_number,customer_id,status,order_date,delivery_date,subtotal,tax,delivery_charges,other_charges,discount,total_amount,notes,created_by)VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,{replacements:[num,custId,status||'PENDING',order_date,delivery_date||null,sub,tax||0,delivery_charges||0,other_charges||0,discount||0,total,notes,req.user.id],transaction:t})
    for(const item of items){
      await sequelize.query('INSERT INTO order_items(order_id,product_id,custom_product_name,quantity,unit_price,total_price,notes)VALUES(?,?,?,?,?,?,?)',{replacements:[or,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,item.quantity*item.unit_price,item.notes||null],transaction:t})
    }
    await t.commit()
    res.json({ success:true, id:or, order_number:num })
  }catch(e){await t.rollback();res.status(500).json({error:e.message})}
})
router.put('/:id', auth, async (req, res) => {
  const t=await sequelize.transaction()
  try{
    const { status,payment_status,amount_paid,delivery_date,tax,delivery_charges,other_charges,discount,notes,items } = req.body
    if(items){
      const sub=items.reduce((s,i)=>s+(i.quantity*i.unit_price),0)
      const total=sub+parseFloat(tax||0)+parseFloat(delivery_charges||0)+parseFloat(other_charges||0)-parseFloat(discount||0)
      await sequelize.query(`UPDATE orders SET status=?,payment_status=?,amount_paid=?,delivery_date=?,subtotal=?,tax=?,delivery_charges=?,other_charges=?,discount=?,total_amount=?,notes=? WHERE id=?`,{replacements:[status,payment_status,amount_paid||0,delivery_date||null,sub,tax||0,delivery_charges||0,other_charges||0,discount||0,total,notes,req.params.id],transaction:t})
      await sequelize.query('DELETE FROM order_items WHERE order_id=?',{replacements:[req.params.id],transaction:t})
      for(const item of items){
        await sequelize.query('INSERT INTO order_items(order_id,product_id,custom_product_name,quantity,unit_price,total_price,notes)VALUES(?,?,?,?,?,?,?)',{replacements:[req.params.id,item.product_id||null,item.custom_product_name||null,item.quantity,item.unit_price,item.quantity*item.unit_price,item.notes||null],transaction:t})
      }
    }else{
      await sequelize.query('UPDATE orders SET status=?,payment_status=?,amount_paid=?,delivery_date=?,notes=? WHERE id=?',{replacements:[status,payment_status,amount_paid||0,delivery_date||null,notes,req.params.id],transaction:t})
    }
    await t.commit()
    res.json({success:true})
  }catch(e){await t.rollback();res.status(500).json({error:e.message})}
})
module.exports = router
