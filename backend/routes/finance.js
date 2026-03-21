const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/expenses', auth, async (req, res) => {
  try {
    const { from, to } = req.query
    let w = '1=1'; const r = []
    if (from) { w += ' AND date >= ?'; r.push(from) }
    if (to)   { w += ' AND date <= ?'; r.push(to) }
    const [rows] = await sequelize.query(
      `SELECT e.*, u.name as created_by_name
       FROM expenses e LEFT JOIN users u ON e.created_by = u.id
       WHERE ${w} ORDER BY e.date DESC`,
      { replacements: r }
    )
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/expenses', auth, async (req, res) => {
  try {
    const { title, category, amount, date, notes } = req.body
    const [r] = await sequelize.query(
      'INSERT INTO expenses(title,category,amount,date,notes,created_by)VALUES(?,?,?,?,?,?)',
      { replacements: [title, category||'OTHER', amount, date, notes, req.user.id] }
    )
    res.json({ success: true, id: r })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/summary', auth, async (req, res) => {
  try {
    const now = new Date()
    const from = req.query.from || new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const to   = req.query.to   || now.toISOString().split('T')[0]

    const [[s]] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount),0) as total_sales,
              COALESCE(SUM(amount_paid),0) as received,
              COUNT(*) as total_orders
       FROM orders WHERE order_date BETWEEN ? AND ? AND status != 'CANCELLED'`,
      { replacements: [from, to] }
    )
    const [[e]] = await sequelize.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date BETWEEN ? AND ?`,
      { replacements: [from, to] }
    )
    const [ec] = await sequelize.query(
      `SELECT category, SUM(amount) as total_expenses
       FROM expenses WHERE date BETWEEN ? AND ?
       GROUP BY category`,
      { replacements: [from, to] }
    )
    const [ms] = await sequelize.query(
      `SELECT DATE_FORMAT(order_date,'%b %Y') as month,
              DATE_FORMAT(order_date,'%Y-%m') as sort_key,
              SUM(total_amount) as sales
       FROM orders
       WHERE order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND status != 'CANCELLED'
       GROUP BY DATE_FORMAT(order_date,'%Y-%m'), DATE_FORMAT(order_date,'%b %Y')
       ORDER BY sort_key`
    )
    const [me] = await sequelize.query(
      `SELECT DATE_FORMAT(date,'%b %Y') as month,
              DATE_FORMAT(date,'%Y-%m') as sort_key,
              SUM(amount) as expenses
       FROM expenses
       WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date,'%Y-%m'), DATE_FORMAT(date,'%b %Y')
       ORDER BY sort_key`
    )

    res.json({
      sales: { total: s.total_sales, received: s.received, orders: s.total_orders },
      expenses: { total: e.total, byCategory: ec },
      profit: s.total_sales - e.total,
      monthlySales: ms, monthlyExpenses: me
    })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.get('/workers-payment', auth, async (req, res) => {
  try {
    const [r] = await sequelize.query(
      `SELECT w.id, w.name, w.phone, w.skill,
              COUNT(wa.id) as total_assignments,
              COALESCE(SUM(CASE WHEN wa.status='COMPLETED' THEN wa.commission*wa.quantity ELSE 0 END),0) as total_earned,
              COALESCE(SUM(CASE WHEN wa.is_paid=1 THEN wa.commission*wa.quantity ELSE 0 END),0) as total_paid,
              COALESCE(SUM(CASE WHEN wa.status='COMPLETED' AND wa.is_paid=0 THEN wa.commission*wa.quantity ELSE 0 END),0) as pending_payment
       FROM workers w
       LEFT JOIN work_assignments wa ON w.id = wa.worker_id
       WHERE w.is_active = 1
       GROUP BY w.id, w.name, w.phone, w.skill
       ORDER BY w.name`
    )
    res.json(r)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/advance', auth, async (req, res) => {
  try {
    const { worker_id, amount, payment_date, note } = req.body
    await sequelize.query(
      'INSERT INTO worker_advances(worker_id,amount,remaining,note,payment_date,created_by)VALUES(?,?,?,?,?,?)',
      { replacements: [worker_id, amount, amount, note||null, payment_date, req.user.id] }
    )
    await sequelize.query(
      "INSERT INTO expenses(title,category,amount,date,notes,created_by)VALUES(?,?,?,?,?,?)",
      { replacements: [`Advance Worker #${worker_id}`, 'SALARY', amount, payment_date, note||null, req.user.id] }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
