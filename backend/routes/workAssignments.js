const express = require('express')
const { sequelize } = require('../config/database')
const { auth } = require('../middleware/auth')
const router = express.Router()

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
    const paid = parseFloat(amount) || (job.commission * job.quantity)
    const today = new Date().toISOString().split('T')[0]

    await sequelize.query(
      'UPDATE work_assignments SET is_paid=1, paid_date=? WHERE id=?',
      { replacements: [today, req.params.id] }
    )
    await sequelize.query(
      'INSERT INTO worker_payments(worker_id,work_assignment_id,amount,payment_date,payment_type,notes,created_by)VALUES(?,?,?,?,?,?,?)',
      { replacements: [job.worker_id, job.id, paid, today, payment_type||'FULL', notes||null, req.user.id] }
    )

    // Try inserting expense with description, fall back without it
    try {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,description,created_by)VALUES(?,?,?,?,?,?)",
        { replacements: [`Worker Payment #${req.params.id}`, 'SALARY', paid, today, notes||null, req.user.id] }
      )
    } catch {
      await sequelize.query(
        "INSERT INTO expenses(title,category,amount,date,created_by)VALUES(?,?,?,?,?)",
        { replacements: [`Worker Payment #${req.params.id}`, 'SALARY', paid, today, req.user.id] }
      )
    }

    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: err.message }) }
})

module.exports = router
