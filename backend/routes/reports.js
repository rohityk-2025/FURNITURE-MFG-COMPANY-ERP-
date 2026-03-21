const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/sales', auth, async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0]
    const to   = req.query.to   || new Date().toISOString().split('T')[0]
    const [orders] = await sequelize.query(
      `SELECT o.*, c.name as customer_name
       FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status != 'CANCELLED'
       ORDER BY o.order_date DESC`,
      { replacements: [from, to] }
    )
    const [ps] = await sequelize.query(
      `SELECT COALESCE(oi.custom_product_name, p.name, 'Custom') as product_name,
              SUM(oi.quantity) as total_qty,
              SUM(oi.total_price) as total_revenue
       FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       LEFT JOIN orders o ON oi.order_id = o.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status != 'CANCELLED'
       GROUP BY product_name
       ORDER BY total_revenue DESC`,
      { replacements: [from, to] }
    )
    res.json({ orders, productSales: ps })
  } catch (err) {
    console.error('reports/sales error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/workers', auth, async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
    const to   = req.query.to   || new Date().toISOString().split('T')[0]
    const [p] = await sequelize.query(
      `SELECT w.name, w.skill,
              COUNT(wa.id) as total_jobs,
              SUM(CASE WHEN wa.status='COMPLETED' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN wa.status!='COMPLETED' THEN 1 ELSE 0 END) as pending,
              COALESCE(SUM(CASE WHEN wa.status='COMPLETED' THEN wa.commission * wa.quantity ELSE 0 END), 0) as total_earned,
              COALESCE(SUM(CASE WHEN wa.is_paid=1 THEN wa.commission * wa.quantity ELSE 0 END), 0) as paid
       FROM workers w
       LEFT JOIN work_assignments wa ON w.id = wa.worker_id
         AND wa.created_at BETWEEN ? AND ?
       WHERE w.is_active = 1
       GROUP BY w.id, w.name, w.skill
       ORDER BY completed DESC`,
      { replacements: [from, to] }
    )
    res.json({ performance: p })
  } catch (err) {
    console.error('reports/workers error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/profit', auth, async (req, res) => {
  try {
    // Get last 12 months list
    const [months] = await sequelize.query(
      `SELECT DATE_FORMAT(DATE_SUB(NOW(), INTERVAL n MONTH), '%Y-%m') as month
       FROM (
         SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
         UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
         UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
       ) nums
       ORDER BY month`
    )
    const [sales] = await sequelize.query(
      `SELECT DATE_FORMAT(order_date, '%Y-%m') as month, SUM(total_amount) as sales
       FROM orders
       WHERE status != 'CANCELLED'
         AND order_date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(order_date, '%Y-%m')`
    )
    const [expenses] = await sequelize.query(
      `SELECT DATE_FORMAT(date, '%Y-%m') as month, SUM(amount) as expenses
       FROM expenses
       WHERE date >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(date, '%Y-%m')`
    )

    const salesMap    = Object.fromEntries(sales.map(r    => [r.month, parseFloat(r.sales    || 0)]))
    const expensesMap = Object.fromEntries(expenses.map(r => [r.month, parseFloat(r.expenses || 0)]))

    const monthly = months.map(({ month }) => ({
      month,
      sales:    salesMap[month]    || 0,
      expenses: expensesMap[month] || 0,
      profit:   (salesMap[month] || 0) - (expensesMap[month] || 0)
    }))

    res.json({ monthly })
  } catch (err) {
    console.error('reports/profit error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
