const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

router.get('/admin', auth, async (req, res) => {
  try {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]

    const [[s]] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount),0) as total_sales,
              COALESCE(SUM(amount_paid),0) as received,
              COUNT(*) as total_orders,
              SUM(CASE WHEN status='DELIVERED' THEN 1 ELSE 0 END) as delivered,
              SUM(CASE WHEN status IN('PENDING','IN_PRODUCTION') THEN 1 ELSE 0 END) as pending
       FROM orders WHERE order_date >= ? AND status != 'CANCELLED'`,
      { replacements: [monthStart] }
    )
    const [[e]] = await sequelize.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date >= ?`,
      { replacements: [monthStart] }
    )
    const [[w]] = await sequelize.query(
      `SELECT COUNT(*) as total_workers,
              (SELECT COUNT(*) FROM work_assignments WHERE status != 'COMPLETED') as active,
              (SELECT COALESCE(SUM(commission*quantity),0) FROM work_assignments WHERE status='COMPLETED' AND is_paid=0) as pending_pay
       FROM workers WHERE is_active = 1`
    )

    // Monthly sales - fixed GROUP BY
    const [mSales] = await sequelize.query(
      `SELECT DATE_FORMAT(order_date,'%b %Y') as month,
              DATE_FORMAT(order_date,'%Y-%m') as sort_key,
              SUM(total_amount) as sales
       FROM orders
       WHERE order_date >= DATE_SUB(NOW(), INTERVAL 6 MONTH) AND status != 'CANCELLED'
       GROUP BY DATE_FORMAT(order_date,'%Y-%m'), DATE_FORMAT(order_date,'%b %Y')
       ORDER BY sort_key`
    )
    const [mExp] = await sequelize.query(
      `SELECT DATE_FORMAT(date,'%b %Y') as month,
              DATE_FORMAT(date,'%Y-%m') as sort_key,
              SUM(amount) as expenses
       FROM expenses
       WHERE date >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
       GROUP BY DATE_FORMAT(date,'%Y-%m'), DATE_FORMAT(date,'%b %Y')
       ORDER BY sort_key`
    )
    const [we] = await sequelize.query(
      `SELECT wk.name as worker,
              COUNT(wa.id) as assigned,
              SUM(CASE WHEN wa.status='COMPLETED' THEN 1 ELSE 0 END) as completed
       FROM workers wk
       LEFT JOIN work_assignments wa ON wk.id = wa.worker_id
       WHERE wk.is_active = 1
       GROUP BY wk.id, wk.name
       ORDER BY completed DESC
       LIMIT 8`
    )
    const [od] = await sequelize.query(
      `SELECT status, COUNT(*) as count FROM orders GROUP BY status`
    )
    const [ro] = await sequelize.query(
      `SELECT o.*, c.name as customer_name
       FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
       ORDER BY o.created_at DESC LIMIT 5`
    )

    res.json({
      kpis: {
        totalSales: s.total_sales, received: s.received, totalOrders: s.total_orders,
        pendingOrders: s.pending, totalExpenses: e.total,
        profit: s.total_sales - e.total, totalWorkers: w.total_workers,
        activeAssignments: w.active, pendingWorkerPayments: w.pending_pay
      },
      monthlySales: mSales, monthlyExpenses: mExp,
      workerEfficiency: we, orderStatusDist: od, recentOrders: ro
    })
  } catch (err) {
    console.error('dashboard/admin error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

router.get('/manager', auth, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]

    const [[tp]] = await sequelize.query(
      `SELECT COUNT(*) as completed_today FROM work_assignments
       WHERE status='COMPLETED' AND DATE(completed_date) = ?`,
      { replacements: [today] }
    )
    const [[pw]] = await sequelize.query(
      `SELECT COUNT(*) as pending FROM work_assignments WHERE status != 'COMPLETED'`
    )
    const [[os]] = await sequelize.query(
      `SELECT
         SUM(CASE WHEN status NOT IN('DELIVERED','CANCELLED') THEN 1 ELSE 0 END) as active_orders,
         SUM(CASE WHEN status='PENDING' THEN 1 ELSE 0 END) as pending_orders,
         SUM(CASE WHEN status='IN_PRODUCTION' THEN 1 ELSE 0 END) as in_production,
         SUM(CASE WHEN delivery_date = ? THEN 1 ELSE 0 END) as todays_deliveries
       FROM orders`,
      { replacements: [today] }
    )
    const [ra] = await sequelize.query(
      `SELECT wa.*, wk.name as worker_name, p.name as product_name_db
       FROM work_assignments wa
       LEFT JOIN workers wk ON wa.worker_id = wk.id
       LEFT JOIN products p ON wa.product_id = p.id
       WHERE wa.status != 'COMPLETED'
       ORDER BY wa.created_at DESC LIMIT 8`
    )
    const [td] = await sequelize.query(
      `SELECT o.*, c.name as customer_name
       FROM orders o LEFT JOIN customers c ON o.customer_id = c.id
       WHERE o.delivery_date = ? AND o.status != 'DELIVERED'`,
      { replacements: [today] }
    )

    res.json({
      kpis: {
        completedToday: tp.completed_today, pendingWork: pw.pending,
        activeOrders: os.active_orders, pendingOrders: os.pending_orders,
        inProduction: os.in_production, todaysDeliveries: os.todays_deliveries
      },
      recentAssignments: ra, todayDeliveries: td
    })
  } catch (err) {
    console.error('dashboard/manager error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
