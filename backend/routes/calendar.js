const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()
router.get('/', auth, async (req, res) => {
  const y=req.query.year||new Date().getFullYear(); const m=req.query.month||(new Date().getMonth()+1)
  const [ce]=await sequelize.query(`SELECT id,title,description,event_date,event_type,reminder,reminder_days FROM calendar_events WHERE YEAR(event_date)=? AND MONTH(event_date)=?`,{replacements:[y,m]})
  const [del]=await sequelize.query(`SELECT o.id,CONCAT('Delivery: ',c.name) as title,o.order_number as description,o.delivery_date as event_date,'DELIVERY' as event_type FROM orders o JOIN customers c ON o.customer_id=c.id WHERE YEAR(o.delivery_date)=? AND MONTH(o.delivery_date)=? AND o.status NOT IN('DELIVERED','CANCELLED') AND o.delivery_date IS NOT NULL`,{replacements:[y,m]})
  res.json([...ce,...del])
})
router.post('/', auth, async (req, res) => {
  const { title,description,event_date,event_type,reminder,reminder_days } = req.body
  const [r]=await sequelize.query(`INSERT INTO calendar_events(title,description,event_date,event_type,reminder,reminder_days,created_by)VALUES(?,?,?,?,?,?,?)`,{replacements:[title,description,event_date,event_type||'TODO',reminder?1:0,reminder_days||1,req.user.id]})
  res.json({ success:true, id:r })
})
router.delete('/:id', auth, async (req, res) => {
  await sequelize.query('DELETE FROM calendar_events WHERE id=?',{replacements:[req.params.id]})
  res.json({ success:true })
})
module.exports = router
