const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/', auth, async (req, res) => {
  try {
    const q = `%${req.query.q || ''}%`
    const [orders]    = await sequelize.query(`SELECT o.id,'order' as type,CONCAT(o.order_number,' - ',c.name) as label,o.status as sub FROM orders o LEFT JOIN customers c ON o.customer_id=c.id WHERE o.order_number LIKE ? OR c.name LIKE ? LIMIT 5`,{replacements:[q,q]})
    const [customers] = await sequelize.query(`SELECT id,'customer' as type,name as label,phone as sub FROM customers WHERE name LIKE ? OR phone LIKE ? LIMIT 5`,{replacements:[q,q]})
    const [products]  = await sequelize.query(`SELECT id,'product' as type,name as label,category as sub FROM products WHERE name LIKE ? AND is_active=1 LIMIT 5`,{replacements:[q]})
    res.json([...orders, ...customers, ...products])
  } catch(err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
