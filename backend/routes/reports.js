const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

const defaultFrom = () => new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0]
const defaultTo   = () => new Date().toISOString().split('T')[0]

// Sales/Orders
router.get('/sales', auth, async (req, res) => {
  try {
    const from=req.query.from||defaultFrom(), to=req.query.to||defaultTo()
    const [orders] = await sequelize.query(
      `SELECT o.*, c.name as customer_name FROM orders o LEFT JOIN customers c ON o.customer_id=c.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status!='CANCELLED' ORDER BY o.order_date DESC`,
      { replacements:[from,to] }
    )
    const [ps] = await sequelize.query(
      `SELECT COALESCE(oi.custom_product_name,p.name,'Custom') as product_name, SUM(oi.quantity) as total_qty, SUM(oi.total_price) as total_revenue
       FROM order_items oi LEFT JOIN products p ON oi.product_id=p.id LEFT JOIN orders o ON oi.order_id=o.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status!='CANCELLED' GROUP BY product_name ORDER BY total_revenue DESC`,
      { replacements:[from,to] }
    )
    res.json({ orders, productSales:ps, from, to })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Expenses
router.get('/expenses', auth, async (req, res) => {
  try {
    const from=req.query.from||defaultFrom(), to=req.query.to||defaultTo()
    const [expenses] = await sequelize.query(
      `SELECT e.*, u.name as created_by_name FROM expenses e LEFT JOIN users u ON e.created_by=u.id
       WHERE e.date BETWEEN ? AND ? AND COALESCE(e.is_active,1)=1 ORDER BY e.date DESC`,
      { replacements:[from,to] }
    )
    const [bycat] = await sequelize.query(
      `SELECT category, COUNT(*) as count, SUM(amount) as total FROM expenses WHERE date BETWEEN ? AND ? AND COALESCE(is_active,1)=1 GROUP BY category`,
      { replacements:[from,to] }
    )
    res.json({ expenses, byCategory:bycat, from, to })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Profit/Loss
router.get('/profit', auth, async (req, res) => {
  try {
    const [months] = await sequelize.query(
      `SELECT DATE_FORMAT(DATE_SUB(NOW(),INTERVAL n MONTH),'%Y-%m') as month FROM (SELECT 0 n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11) nums ORDER BY month`
    )
    const [sales] = await sequelize.query(
      `SELECT DATE_FORMAT(order_date,'%Y-%m') as month, SUM(total_amount) as sales FROM orders WHERE status!='CANCELLED' AND order_date>=DATE_SUB(NOW(),INTERVAL 12 MONTH) GROUP BY DATE_FORMAT(order_date,'%Y-%m')`
    )
    const [expenses] = await sequelize.query(
      `SELECT DATE_FORMAT(date,'%Y-%m') as month, SUM(amount) as expenses FROM expenses WHERE date>=DATE_SUB(NOW(),INTERVAL 12 MONTH) AND COALESCE(is_active,1)=1 GROUP BY DATE_FORMAT(date,'%Y-%m')`
    )
    const sMap = Object.fromEntries(sales.map(r=>[r.month,parseFloat(r.sales||0)]))
    const eMap = Object.fromEntries(expenses.map(r=>[r.month,parseFloat(r.expenses||0)]))
    const monthly = months.map(({month}) => ({ month, sales:sMap[month]||0, expenses:eMap[month]||0, profit:(sMap[month]||0)-(eMap[month]||0) }))
    res.json({ monthly })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Inventory/Stock
router.get('/inventory', auth, async (req, res) => {
  try {
    const [materials] = await sequelize.query(
      `SELECT m.*, ROUND(m.quantity) as quantity, ROUND(m.min_stock) as min_stock,
              (ROUND(m.quantity) * m.unit_price) as stock_value,
              CASE WHEN ROUND(m.quantity) <= m.min_stock THEN 'LOW' WHEN ROUND(m.quantity) = 0 THEN 'OUT' ELSE 'OK' END as stock_status
       FROM materials m ORDER BY m.name`
    )
    const [transactions] = await sequelize.query(
      `SELECT mt.*, m.name as material_name FROM material_transactions mt JOIN materials m ON mt.material_id=m.id
       WHERE mt.created_at>=DATE_SUB(NOW(),INTERVAL 30 DAY) ORDER BY mt.created_at DESC LIMIT 100`
    )
    res.json({ materials, transactions })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Worker Salary
router.get('/workers', auth, async (req, res) => {
  try {
    const from=req.query.from||defaultFrom(), to=req.query.to||defaultTo()
    const [perf] = await sequelize.query(
      `SELECT w.name, w.skill, w.daily_rate,
              COUNT(wa.id) as total_jobs,
              SUM(CASE WHEN wa.status='COMPLETED' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN wa.status!='COMPLETED' THEN 1 ELSE 0 END) as pending,
              COALESCE(SUM(CASE WHEN wa.status='COMPLETED' THEN wa.commission*wa.quantity ELSE 0 END),0) as total_earned,
              COALESCE(SUM(CASE WHEN wa.is_paid=1 THEN wa.commission*wa.quantity ELSE 0 END),0) as paid
       FROM workers w LEFT JOIN work_assignments wa ON w.id=wa.worker_id AND wa.created_at BETWEEN ? AND ?
       WHERE w.is_active=1 GROUP BY w.id,w.name,w.skill,w.daily_rate ORDER BY completed DESC`,
      { replacements:[from,to] }
    )
    res.json({ performance:perf, from, to })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Payment Report
router.get('/payments', auth, async (req, res) => {
  try {
    const from=req.query.from||defaultFrom(), to=req.query.to||defaultTo()
    const [orders] = await sequelize.query(
      `SELECT o.order_number, c.name as customer_name, o.total_amount, o.amount_paid,
              (o.total_amount - o.amount_paid) as balance, o.payment_status, o.order_date
       FROM orders o LEFT JOIN customers c ON o.customer_id=c.id
       WHERE o.order_date BETWEEN ? AND ? AND o.status!='CANCELLED' ORDER BY o.order_date DESC`,
      { replacements:[from,to] }
    )
    res.json({ orders, from, to })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

module.exports = router

// Enhanced profit report with gross profit
router.get('/profit-summary', auth, async (req, res) => {
  try {
    const from = req.query.from || new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0]
    const to   = req.query.to   || new Date().toISOString().split('T')[0]

    const [[sales]] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount),0) as revenue, COUNT(*) as orders FROM orders WHERE order_date BETWEEN ? AND ? AND status!='CANCELLED'`,
      { replacements:[from,to] }
    )
    const [[exp]] = await sequelize.query(
      `SELECT COALESCE(SUM(amount),0) as expenses FROM expenses WHERE date BETWEEN ? AND ? AND COALESCE(is_active,1)=1`,
      { replacements:[from,to] }
    )
    // Gross profit: revenue - material costs for sold products
    let grossProfit = 0
    try {
      const [[gp]] = await sequelize.query(
        `SELECT COALESCE(SUM(oi.total_price - COALESCE(p.material_cost,0)*oi.quantity),0) as gross
         FROM order_items oi
         JOIN orders o ON oi.order_id=o.id
         LEFT JOIN products p ON oi.product_id=p.id
         WHERE o.order_date BETWEEN ? AND ? AND o.status!='CANCELLED'`,
        { replacements:[from,to] }
      )
      grossProfit = parseFloat(gp.gross||0)
    } catch { grossProfit = parseFloat(sales.revenue||0) }

    const netProfit = parseFloat(sales.revenue||0) - parseFloat(exp.expenses||0)
    res.json({ from, to, revenue:sales.revenue, orders:sales.orders, expenses:exp.expenses, grossProfit, netProfit })
  } catch(err) { res.status(500).json({ error:err.message }) }
})
