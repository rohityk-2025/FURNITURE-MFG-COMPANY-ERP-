const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

const defaultFrom = () => new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0]
const defaultTo   = () => new Date().toISOString().split('T')[0]
const defaultLast3From = () => new Date(new Date().getFullYear(), new Date().getMonth() - 2, 1).toISOString().split('T')[0]

const monthKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (key) => {
  const [year, month] = key.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month:'short', year:'numeric' })
}

function getMonthKeys(from, to) {
  const start = new Date(from)
  const end = new Date(to)
  const keys = []
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1)
  const last = new Date(end.getFullYear(), end.getMonth(), 1)

  while (cursor <= last) {
    keys.push(monthKey(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }

  return keys
}

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
    const from = req.query.from || defaultLast3From()
    const to   = req.query.to || defaultTo()
    const months = getMonthKeys(from, to)

    const [orders] = await sequelize.query(
      `SELECT o.id,
              o.order_number,
              o.order_date,
              c.name as customer_name,
              COALESCE(
                o.total_amount,
                (COALESCE(o.subtotal,0) - COALESCE(o.discount,0)) + COALESCE(o.delivery_charges,0) + COALESCE(o.other_charges,0)
              ) as amount,
              COALESCE(SUM(COALESCE(p.material_cost,0) * COALESCE(oi.quantity,0)),0) as material_cost,
              COALESCE(SUM(COALESCE(p.commission,0) * COALESCE(oi.quantity,0)),0) as commission
       FROM orders o
       LEFT JOIN customers c ON c.id=o.customer_id
       LEFT JOIN order_items oi ON oi.order_id=o.id
       LEFT JOIN products p ON p.id=oi.product_id
       WHERE o.status!='CANCELLED' AND DATE(o.order_date) BETWEEN ? AND ?
       GROUP BY o.id, o.order_number, o.order_date, c.name, o.total_amount, o.subtotal, o.discount, o.delivery_charges, o.other_charges
       ORDER BY o.order_date DESC, o.id DESC`,
      { replacements:[from, to] }
    )

    const [expenseRows] = await sequelize.query(
      `SELECT date, COALESCE(category,'OTHER') as category, amount
       FROM expenses
       WHERE DATE(date) BETWEEN ? AND ?
         AND COALESCE(is_active,1)=1
         AND UPPER(COALESCE(category,'OTHER'))!='MATERIAL'
       ORDER BY date DESC, id DESC`,
      { replacements:[from, to] }
    )

    const orderDetails = orders.map((row, index) => {
      const amount = parseFloat(row.amount || 0)
      const materialCost = parseFloat(row.material_cost || 0)
      const commission = parseFloat(row.commission || 0)
      const grossProfit = amount - materialCost - commission
      const profitPercent = amount > 0 ? (grossProfit / amount) * 100 : 0

      return {
        srNo: index + 1,
        id: row.id,
        orderId: row.order_number || `ORDER-${row.id}`,
        customerName: row.customer_name || 'Walk-in Customer',
        date: row.order_date,
        amount,
        materialCost,
        commission,
        grossProfit,
        profitPercent,
      }
    })

    const monthlyMap = Object.fromEntries(
      months.map((month) => [month, {
        month,
        label: monthLabel(month),
        orders: 0,
        sales: 0,
        materialCost: 0,
        commission: 0,
        grossProfit: 0,
        expenses: 0,
        netProfit: 0,
      }])
    )

    orderDetails.forEach((row) => {
      const month = monthKey(row.date)
      if (!monthlyMap[month]) return
      monthlyMap[month].orders += 1
      monthlyMap[month].sales += row.amount
      monthlyMap[month].materialCost += row.materialCost
      monthlyMap[month].commission += row.commission
      monthlyMap[month].grossProfit += row.grossProfit
    })

    const expenseCategoryMap = {}
    expenseRows.forEach((row) => {
      const amount = parseFloat(row.amount || 0)
      const month = monthKey(row.date)
      const category = row.category || 'OTHER'

      if (monthlyMap[month]) monthlyMap[month].expenses += amount
      expenseCategoryMap[category] = (expenseCategoryMap[category] || 0) + amount
    })

    const monthly = months.map((month) => {
      const row = monthlyMap[month]
      row.netProfit = row.grossProfit - row.expenses
      return row
    })

    const summary = monthly.reduce((acc, row) => ({
      totalOrders: acc.totalOrders + row.orders,
      sales: acc.sales + row.sales,
      materialCost: acc.materialCost + row.materialCost,
      commission: acc.commission + row.commission,
      grossProfit: acc.grossProfit + row.grossProfit,
      expenses: acc.expenses + row.expenses,
      netProfit: acc.netProfit + row.netProfit,
    }), { totalOrders:0, sales:0, materialCost:0, commission:0, grossProfit:0, expenses:0, netProfit:0 })

    const expenseBreakdown = Object.entries(expenseCategoryMap)
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)

    res.json({
      from,
      to,
      monthly,
      summary,
      orderDetails,
      expenseBreakdown,
      operatingExpenseSource: 'Operating expenses are taken from the expenses table for the selected date range, only active entries are included, and category MATERIAL is excluded.',
    })
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
