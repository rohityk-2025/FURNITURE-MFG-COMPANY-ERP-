import { useState, useEffect, useCallback } from 'react'
import api from '../../utils/api'
import {
  Modal,
  LoadingPage,
  EmptyState,
  SearchBar,
  StatusBadge,
  fmt,
  fmtDate,
  useToast,
  PageHeader,
  Avatar,
  FormSection,
  StatCard,
  DetailGrid,
} from '../../components/ui'

const empty = { name: '', phone: '', email: '', address: '', gst_number: '' }

export default function Customers() {
  const toast = useToast()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const [profile, setProfile] = useState(null)
  const [orders, setOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get('/customers')
      setCustomers(r.data)
    } catch {
      toast('Failed to load', 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openProfile = async (customer) => {
    setProfile(customer)
    setOrders([])
    setOrdersLoading(true)
    try {
      const r = await api.get('/orders', { params: { customer_id: customer.id } })
      setOrders(r.data)
    } catch {}
    finally {
      setOrdersLoading(false)
    }
  }

  const openEdit = (customer) => {
    setEditData(customer)
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      gst_number: customer.gst_number || '',
    })
    setModal(true)
  }

  const openAdd = () => {
    setEditData(null)
    setForm(empty)
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editData) await api.put(`/customers/${editData.id}`, form)
      else await api.post('/customers', form)
      toast(editData ? 'Customer updated' : 'Customer added')
      setModal(false)
      load()
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = customers.filter(
    (customer) =>
      !search ||
      customer.name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.phone?.includes(search) ||
      customer.email?.toLowerCase().includes(search.toLowerCase()),
  )

  const totalOrders = profile ? orders.length : 0
  const totalSpent = profile
    ? orders.reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0)
    : 0
  const balanceDue = profile
    ? orders.reduce(
        (sum, order) =>
          sum + (parseFloat(order.total_amount || 0) - parseFloat(order.amount_paid || 0)),
        0,
      )
    : 0

  if (loading) return <LoadingPage />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Customers"
        subtitle={`${customers.length} customers`}
        action={
          <button onClick={openAdd} className="btn-primary">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Customer
          </button>
        }
      />

      <div className="list-shell">
        <div className="list-toolbar">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, email..."
          />
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            }
            title="No customers"
            desc="Add your first customer to start creating orders."
            action={
              <button onClick={openAdd} className="btn-primary">
                Add Customer
              </button>
            }
          />
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    {['Customer', 'Phone', 'Email', 'GST', 'Address', 'Orders', 'Total Spent', ''].map((h) => (
                      <th key={h} className="table-th">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((customer) => (
                    <tr
                      key={customer.id}
                      className="table-row cursor-pointer"
                      onClick={() => openProfile(customer)}
                    >
                      <td className="table-td">
                        <div className="flex items-center gap-3">
                          <Avatar name={customer.name} src={customer.image_url} />
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {customer.name}
                          </span>
                        </div>
                      </td>
                      <td className="table-td text-xs">{customer.phone || '-'}</td>
                      <td className="table-td text-xs text-slate-500 dark:text-slate-300">
                        {customer.email || '-'}
                      </td>
                      <td className="table-td text-xs font-mono">{customer.gst_number || '-'}</td>
                      <td className="table-td max-w-[180px] truncate text-xs text-slate-500 dark:text-slate-300">
                        {customer.address || '-'}
                      </td>
                      <td className="table-td">
                        <span className="badge-blue">{customer.total_orders || 0}</span>
                      </td>
                      <td className="table-td font-semibold text-green-600">
                        {fmt(customer.total_value || 0)}
                      </td>
                      <td className="table-td">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            openEdit(customer)
                          }}
                          className="btn-ghost icon-button"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden space-y-3 p-3">
              {filtered.map((customer) => (
                <div
                  key={customer.id}
                  className="card-sm p-4 cursor-pointer"
                  onClick={() => openProfile(customer)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={customer.name} size="lg" src={customer.image_url} />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{customer.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-300">
                        {(customer.phone || '-') +
                          ' | ' +
                          (customer.total_orders || 0) +
                          ' orders | ' +
                          fmt(customer.total_value || 0)}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(customer)
                      }}
                      className="btn-ghost icon-button"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editData ? 'Edit Customer' : 'Add Customer'}
        subtitle="Customer forms now follow the same rounded section pattern used across admin and manager."
      >
        <form onSubmit={handleSave} className="form-shell">
          <FormSection title="Basic Information">
            <div>
              <label className="label">Full Name *</label>
              <input
                className="input"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
                placeholder="Reliance Industries"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone</label>
                <input
                  className="input"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="9876543210"
                />
              </div>
              <div>
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="info@company.com"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Business Details">
            <div>
              <label className="label">GST Number</label>
              <input
                className="input"
                value={form.gst_number}
                onChange={(e) => setForm((p) => ({ ...p, gst_number: e.target.value }))}
                placeholder="27AABCU9603R1ZX"
              />
            </div>
            <div>
              <label className="label">Address</label>
              <textarea
                className="input"
                rows={3}
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                placeholder="Full address with city and state"
              />
            </div>
          </FormSection>

          <div className="form-actions">
            <button type="button" onClick={() => setModal(false)} className="btn-secondary" style={{ flex: 1 }}>
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary" style={{ flex: 1 }}>
              {saving ? 'Saving...' : editData ? 'Update Customer' : 'Add Customer'}
            </button>
          </div>
        </form>
      </Modal>

      {profile ? (
        <Modal
          open={!!profile}
          onClose={() => setProfile(null)}
          title={profile.name}
          subtitle="Customer summary and order history"
          size="xl"
        >
          <div className="form-shell">
            <div className="list-summary-grid">
              <StatCard label="Total Orders" value={totalOrders} tone="primary" />
              <StatCard label="Total Spent" value={fmt(totalSpent)} tone="success" />
              <StatCard label="Balance Due" value={fmt(balanceDue)} tone="danger" />
            </div>

            <FormSection title="Customer Details">
              <DetailGrid
                items={[
                  ['Phone', profile.phone || '-'],
                  ['Email', profile.email || '-'],
                  ['GST', profile.gst_number || '-'],
                  ['Address', profile.address || '-'],
                ]}
              />
            </FormSection>

            <FormSection title="Purchase History">
              {ordersLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orders.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No orders yet</p>
              ) : (
                <div className="space-y-2">
                  {orders.map((order) => (
                    <div
                      key={order.id}
                      className="card-sm"
                      style={{ padding: 14, display: 'flex', justifyContent: 'space-between', gap: 16 }}
                    >
                      <div>
                        <div className="text-xs font-mono text-primary-600 font-semibold">
                          {order.order_number}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-300">
                          {fmtDate(order.order_date)}
                          {order.delivery_date ? ` -> ${fmtDate(order.delivery_date)}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-sm">{fmt(order.total_amount)}</div>
                        <StatusBadge status={order.payment_status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </FormSection>
          </div>
        </Modal>
      ) : null}
    </div>
  )
}
