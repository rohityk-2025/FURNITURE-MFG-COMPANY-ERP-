const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

// Summary
router.get('/summary', auth, async (req, res) => {
  try {
    const now  = new Date()
    const from = req.query.from || new Date(now.getFullYear(),now.getMonth(),1).toISOString().split('T')[0]
    const to   = req.query.to   || now.toISOString().split('T')[0]
    const [[s]] = await sequelize.query(
      `SELECT COALESCE(SUM(total_amount),0) as total_sales, COALESCE(SUM(amount_paid),0) as received, COUNT(*) as total_orders FROM orders WHERE order_date BETWEEN ? AND ? AND status!='CANCELLED'`,
      { replacements:[from,to] }
    )
    const [[e]] = await sequelize.query(
      `SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE date BETWEEN ? AND ?`,
      { replacements:[from,to] }
    )
    const [ec] = await sequelize.query(
      `SELECT category, SUM(amount) as total_expenses FROM expenses WHERE date BETWEEN ? AND ? GROUP BY category`,
      { replacements:[from,to] }
    )
    const [ms] = await sequelize.query(
      `SELECT DATE_FORMAT(order_date,'%b %Y') as month, DATE_FORMAT(order_date,'%Y-%m') as sort_key, SUM(total_amount) as sales FROM orders WHERE order_date>=DATE_SUB(NOW(),INTERVAL 6 MONTH) AND status!='CANCELLED' GROUP BY DATE_FORMAT(order_date,'%Y-%m'),DATE_FORMAT(order_date,'%b %Y') ORDER BY sort_key`
    )
    const [me] = await sequelize.query(
      `SELECT DATE_FORMAT(date,'%b %Y') as month, DATE_FORMAT(date,'%Y-%m') as sort_key, SUM(amount) as expenses FROM expenses WHERE date>=DATE_SUB(NOW(),INTERVAL 6 MONTH) GROUP BY DATE_FORMAT(date,'%Y-%m'),DATE_FORMAT(date,'%b %Y') ORDER BY sort_key`
    )
    res.json({ sales:{total:s.total_sales,received:s.received,orders:s.total_orders}, expenses:{total:e.total,byCategory:ec}, profit:s.total_sales-e.total, monthlySales:ms, monthlyExpenses:me })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

// Worker payment per JOB - handles missing paid_amount column
router.get('/workers-payment', auth, async (req, res) => {
  try {
    // Check if paid_amount column exists
    const [cols] = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='work_assignments' AND COLUMN_NAME='paid_amount'`
    )
    const hasPaidAmount = cols.length > 0

    const paidExpr  = hasPaidAmount ? 'COALESCE(wa.paid_amount,0)' : '0'
    const remExpr   = hasPaidAmount
      ? `GREATEST(0,(wa.commission*wa.quantity)-COALESCE(wa.paid_amount,0))`
      : `CASE WHEN wa.is_paid=1 THEN 0 ELSE wa.commission*wa.quantity END`

    const [rows] = await sequelize.query(
      `SELECT wa.id, wa.worker_id, wa.quantity, wa.commission, wa.status, wa.is_paid, wa.completed_date,
              w.name as worker_name, w.phone as worker_phone,
              COALESCE(p.name, wa.custom_product_name, 'Custom') as product_name,
              (wa.commission * wa.quantity) as total_commission,
              ${paidExpr} as paid,
              ${remExpr} as remaining
       FROM work_assignments wa
       JOIN workers w ON wa.worker_id=w.id
       LEFT JOIN products p ON wa.product_id=p.id
       WHERE wa.status='COMPLETED'
       ORDER BY wa.completed_date DESC, wa.id DESC`
    )
    res.json(rows)
  } catch(err) {
    console.error('workers-payment error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

// Pay for a specific job
router.post('/pay-job/:id', auth, async (req, res) => {
  try {
    const { amount } = req.body
    const [rows] = await sequelize.query('SELECT * FROM work_assignments WHERE id=?', { replacements:[req.params.id] })
    if (!rows.length) return res.status(404).json({ error:'Job not found' })
    const job       = rows[0]
    const total     = parseFloat(job.commission)*parseFloat(job.quantity)
    const paid      = parseFloat(amount)
    const remaining = Math.max(0, total-paid)
    const today     = new Date().toISOString().split('T')[0]
    const payType   = remaining>0 ? 'PARTIAL' : 'FULL'
    const isPaid    = remaining<=0 ? 1 : 0

    // Try with paid_amount column first
    try {
      await sequelize.query(
        'UPDATE work_assignments SET is_paid=?,paid_amount=?,paid_date=? WHERE id=?',
        { replacements:[isPaid,paid,today,req.params.id] }
      )
    } catch {
      await sequelize.query(
        'UPDATE work_assignments SET is_paid=?,paid_date=? WHERE id=?',
        { replacements:[isPaid,today,req.params.id] }
      )
    }

    await sequelize.query(
      'INSERT INTO worker_payments(worker_id,work_assignment_id,amount,payment_date,payment_type,created_by)VALUES(?,?,?,?,?,?)',
      { replacements:[job.worker_id,job.id,paid,today,payType,req.user.id] }
    )

    // Add to expenses
    try {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,description,created_by)VALUES(?,?,?,?,?,?)",
        { replacements:[`Worker Pay - ${job.custom_product_name||'Job #'+job.id}`,'SALARY',paid,today,`${payType} payment`,req.user.id] }
      )
    } catch {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,created_by)VALUES(?,?,?,?,?)",
        { replacements:[`Worker Pay #${job.id}`,'SALARY',paid,today,req.user.id] }
      )
    }

    res.json({ success:true, paid, remaining, status:payType })
  } catch(err) {
    console.error('pay-job error:', err.message)
    res.status(500).json({ error:err.message })
  }
})

// Advances
router.get('/advances', auth, async (req, res) => {
  try {
    const [rows] = await sequelize.query(
      `SELECT wa.*, w.name as worker_name, w.phone as worker_phone FROM worker_advances wa JOIN workers w ON wa.worker_id=w.id ORDER BY wa.payment_date DESC`
    )
    res.json(rows)
  } catch(err) { res.status(500).json({ error:err.message }) }
})

router.post('/advance', auth, async (req, res) => {
  try {
    const { worker_id, amount, payment_date, note } = req.body
    if (!worker_id || !amount) return res.status(400).json({ error:'Worker and amount required' })
    const [r] = await sequelize.query(
      'INSERT INTO worker_advances(worker_id,amount,remaining,note,payment_date,created_by)VALUES(?,?,?,?,?,?)',
      { replacements:[worker_id,amount,amount,note||null,payment_date,req.user.id] }
    )
    res.json({ success:true, id:r })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

router.put('/advance/:id', auth, async (req, res) => {
  try {
    const { remaining, note } = req.body
    await sequelize.query('UPDATE worker_advances SET remaining=?,note=? WHERE id=?', { replacements:[remaining,note||null,req.params.id] })
    res.json({ success:true })
  } catch(err) { res.status(500).json({ error:err.message }) }
})

module.exports = router
