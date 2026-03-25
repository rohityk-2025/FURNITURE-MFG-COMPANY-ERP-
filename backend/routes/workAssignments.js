const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

const toNumber = (value) => {
  const num = parseFloat(value)
  return Number.isFinite(num) ? num : 0
}

async function getExpenseCategory(preferred = 'OTHER') {
  try {
    const [rows] = await sequelize.query(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'expenses'
        AND COLUMN_NAME = 'category'
      LIMIT 1
    `)
    const columnType = rows[0]?.COLUMN_TYPE || ''
    const matches = [...columnType.matchAll(/'([^']+)'/g)].map((match) => match[1])
    if (!matches.length) return preferred
    return matches.includes(preferred) ? preferred : (matches.includes('OTHER') ? 'OTHER' : matches[0])
  } catch {
    return preferred
  }
}

router.get('/', auth, async (req, res) => {
  try {
    const { worker_id, status } = req.query
    let w = '1=1'; const r = []
    if (worker_id) { w += ' AND wa.worker_id=?'; r.push(worker_id) }
    if (status)    { w += ' AND wa.status=?';    r.push(status) }
    const [rows] = await sequelize.query(
      `SELECT wa.*, wk.name as worker_name, p.name as product_name_db, u.name as assigned_by_name
       FROM work_assignments wa
       LEFT JOIN workers wk ON wa.worker_id = wk.id
       LEFT JOIN products p  ON wa.product_id = p.id
       LEFT JOIN users u     ON wa.assigned_by = u.id
       WHERE ${w}
       ORDER BY wa.created_at DESC`,
      { replacements: r }
    )
    res.json(rows)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/', auth, async (req, res) => {
  try {
    const { worker_id, product_id, custom_product_name, quantity, commission, due_date, notes } = req.body
    const [r] = await sequelize.query(
      'INSERT INTO work_assignments(worker_id,product_id,custom_product_name,quantity,commission,due_date,notes,assigned_by)VALUES(?,?,?,?,?,?,?,?)',
      { replacements: [worker_id, product_id||null, custom_product_name||null, quantity||1, commission||0, due_date||null, notes||null, req.user.id] }
    )
    res.json({ success: true, id: r })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', auth, async (req, res) => {
  try {
    const { status, completed_date, notes } = req.body
    await sequelize.query(
      'UPDATE work_assignments SET status=?, completed_date=?, notes=? WHERE id=?',
      { replacements: [status, completed_date||null, notes||null, req.params.id] }
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.post('/:id/pay', auth, async (req, res) => {
  try {
    const { amount, payment_type, notes } = req.body
    const [rows] = await sequelize.query('SELECT * FROM work_assignments WHERE id=?', { replacements: [req.params.id] })
    if (!rows.length) return res.status(404).json({ error: 'Not found' })
    const job  = rows[0]
    const total = toNumber(job.commission) * toNumber(job.quantity)
    const [[payments]] = await sequelize.query(
      'SELECT COALESCE(SUM(amount),0) as paid FROM worker_payments WHERE work_assignment_id=?',
      { replacements:[req.params.id] }
    )
    const alreadyPaid = Math.min(toNumber(payments?.paid), total)
    const due = Math.max(0, total - alreadyPaid)
    const requested = toNumber(amount) || due

    if (requested <= 0) return res.status(400).json({ error:'Enter a valid payment amount' })
    if (due <= 0) return res.status(400).json({ error:'This assignment is already fully paid' })

    const paid = Math.min(requested, due)
    const totalPaid = alreadyPaid + paid
    const remaining = Math.max(0, total - totalPaid)
    const today = new Date().toISOString().split('T')[0]
    const payType = payment_type || (remaining > 0 ? 'PARTIAL' : 'FULL')
    const expenseCategory = await getExpenseCategory('SALARY')

    try {
      await sequelize.query(
        'UPDATE work_assignments SET is_paid=?, paid_amount=?, paid_date=? WHERE id=?',
        { replacements: [remaining <= 0 ? 1 : 0, totalPaid, today, req.params.id] }
      )
    } catch {
      await sequelize.query(
        'UPDATE work_assignments SET is_paid=?, paid_date=? WHERE id=?',
        { replacements: [remaining <= 0 ? 1 : 0, today, req.params.id] }
      )
    }
    await sequelize.query(
      'INSERT INTO worker_payments(worker_id,work_assignment_id,amount,payment_date,payment_type,notes,created_by)VALUES(?,?,?,?,?,?,?)',
      { replacements: [job.worker_id, job.id, paid, today, payType, notes||null, req.user.id] }
    )

    // Try inserting expense with description, fall back without it
    try {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,description,created_by)VALUES(?,?,?,?,?,?)",
        { replacements: [`Worker Payment #${req.params.id}`, expenseCategory, paid, today, notes||null, req.user.id] }
      )
    } catch {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,created_by)VALUES(?,?,?,?,?)",
        { replacements: [`Worker Payment #${req.params.id}`, expenseCategory, paid, today, req.user.id] }
      )
    }

    res.json({ success: true, paid, remaining, status: payType })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
