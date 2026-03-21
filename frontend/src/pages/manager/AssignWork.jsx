import { useState, useEffect, useCallback } from "react";
import api from "../../utils/api";
import {
  Modal,
  LoadingPage,
  StatusBadge,
  PageHeader,
  Tabs,
  fmt,
  fmtDate,
  fmtDateTime,
} from "../../components/ui";
import { useToast } from "../../components/ui";

const emptyForm = {
  worker_id: "",
  product_id: "",
  custom_product_name: "",
  quantity: 1,
  commission: "",
  due_date: "",
  notes: "",
};

export default function AssignWork() {
  const toast = useToast();
  const [assignments, setAssignments] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("assigned");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(null);
  const [useCustom, setUseCustom] = useState(false);

  // Use useCallback to prevent re-creation on every render
  const load = useCallback(async () => {
    try {
      const r = await api.get("/work-assignments");
      setAssignments(r.data);
    } catch {
      toast("Failed to load", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    Promise.all([api.get("/workers"), api.get("/products")])
      .then(([w, p]) => {
        setWorkers(w.data);
        setProducts(p.data);
      })
      .catch(console.error);
  }, [load]);

  const handleProductChange = (pid) => {
    const prod = products.find((p) => p.id === parseInt(pid));
    setForm((f) => ({
      ...f,
      product_id: pid,
      commission: prod ? String(prod.commission) : f.commission,
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/work-assignments", {
        worker_id: parseInt(form.worker_id),
        product_id: useCustom
          ? null
          : form.product_id
            ? parseInt(form.product_id)
            : null,
        custom_product_name: useCustom ? form.custom_product_name : null,
        quantity: parseInt(form.quantity),
        commission: parseFloat(form.commission) || 0,
        due_date: form.due_date || null,
        notes: form.notes || null,
      });
      toast("Work assigned successfully");
      setModal(false);
      setForm(emptyForm);
      setUseCustom(false);
      // Optimistically reload
      load();
    } catch (err) {
      toast(err.response?.data?.error || "Failed to assign", "error");
    } finally {
      setSaving(false);
    }
  };

  // FIXED: Mark as done - updates state immediately without refresh
  const handleMarkDone = async (id) => {
    if (completing === id) return; // prevent double-click
    setCompleting(id);
    try {
      await api.put(`/work-assignments/${id}`, {
        status: "COMPLETED",
        completed_date: new Date().toISOString().split("T")[0],
      });
      // Update state immediately - no full reload needed
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === id
            ? {
                ...a,
                status: "COMPLETED",
                completed_date: new Date().toISOString().split("T")[0],
              }
            : a,
        ),
      );
      toast("Marked as completed ✓");
    } catch {
      toast("Failed to update status", "error");
    } finally {
      setCompleting(null);
    }
  };

  const assigned = assignments.filter((a) => a.status !== "COMPLETED");
  const completed = assignments.filter((a) => a.status === "COMPLETED");
  const displayed = tab === "assigned" ? assigned : completed;

  const paymentBadge = (a) => {
    if (!a.is_paid && a.status !== "COMPLETED") return null;
    if (a.is_paid)
      return <span className="badge badge-green text-xs">Paid</span>;
    return <span className="badge badge-red text-xs">Unpaid</span>;
  };

  if (loading) return <LoadingPage />;

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Work Assignments"
        subtitle={`${assigned.length} active · ${completed.length} completed`}
        action={
          <button
            onClick={() => {
              setForm(emptyForm);
              setUseCustom(false);
              setModal(true);
            }}
            className="btn-primary"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Assign Work
          </button>
        }
      />

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "assigned", label: "Assigned", count: assigned.length },
          { id: "completed", label: "Completed", count: completed.length },
        ]}
      />

      {displayed.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-14 h-14 bg-surface-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-surface-300">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="font-semibold text-surface-600 mb-1">
            {tab === "assigned"
              ? "No active assignments"
              : "No completed assignments"}
          </p>
          <p className="text-sm text-surface-400 mb-4">
            {tab === "assigned"
              ? "Assign work to workers to get started"
              : "Completed jobs will appear here"}
          </p>
          {tab === "assigned" && (
            <button
              onClick={() => setModal(true)}
              className="btn-primary mx-auto"
            >
              Assign Work
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {displayed.map((a) => (
            <div
              key={a.id}
              className="card p-4 flex flex-col gap-3 hover:shadow-card-md transition-all"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary-100 text-primary-700 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {a.worker_name?.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-surface-900 text-sm truncate">
                      {a.worker_name}
                    </div>
                    <div className="text-xs text-surface-400 truncate">
                      {a.assigned_by_name}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={a.status} />
                  {paymentBadge(a)}
                </div>
              </div>

              {/* Product info */}
              <div className="bg-surface-50 rounded-xl p-3 space-y-1">
                <div className="font-semibold text-surface-800 text-sm">
                  {a.custom_product_name || a.product_name_db || "Custom Item"}
                </div>
                <div className="flex items-center gap-4 text-xs text-surface-500">
                  <span>
                    Qty:{" "}
                    <strong className="text-surface-700">{a.quantity}</strong>
                  </span>
                  <span>
                    Commission:{" "}
                    <strong className="text-green-600">
                      {fmt(a.commission * a.quantity)}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Timestamps */}
              <div className="space-y-1 text-xs text-surface-400">
                <div className="flex items-center gap-2">
                  <svg
                    className="w-3.5 h-3.5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>Assigned: {fmtDateTime(a.created_at)}</span>
                </div>
                {a.due_date && (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>Due: {fmtDate(a.due_date)}</span>
                  </div>
                )}
                {a.status === "COMPLETED" && a.completed_date && (
                  <div className="flex items-center gap-2 text-green-600">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span>Completed: {fmtDate(a.completed_date)}</span>
                  </div>
                )}
                {a.is_paid && a.paid_date && (
                  <div className="flex items-center gap-2 text-primary-600">
                    <svg
                      className="w-3.5 h-3.5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>Paid: {fmtDate(a.paid_date)}</span>
                  </div>
                )}
              </div>

              {a.notes && (
                <p className="text-xs text-surface-400 border-t border-surface-100 pt-2">
                  {a.notes}
                </p>
              )}

              {/* Action */}
              {a.status !== "COMPLETED" && (
                <button
                  onClick={() => handleMarkDone(a.id)}
                  disabled={completing === a.id}
                  className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 transition-all min-h-[44px] disabled:opacity-50"
                >
                  {completing === a.id ? (
                    <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                  {completing === a.id ? "Updating..." : "Mark as Done"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Assign Work Modal */}
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          setForm(emptyForm);
          setUseCustom(false);
        }}
        title="Assign Work to Worker"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Worker *</label>
            <select
              className="input"
              value={form.worker_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, worker_id: e.target.value }))
              }
              required
            >
              <option value="">Select worker...</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} — {w.skill || "General"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="label mb-0">Product *</label>
              <button
                type="button"
                onClick={() => {
                  setUseCustom(!useCustom);
                  setForm((f) => ({
                    ...f,
                    product_id: "",
                    custom_product_name: "",
                  }));
                }}
                className="text-xs text-primary-500 hover:text-primary-700 font-semibold"
              >
                {useCustom ? "← Select from list" : "+ Custom product"}
              </button>
            </div>
            {useCustom ? (
              <input
                className="input"
                value={form.custom_product_name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    custom_product_name: e.target.value,
                  }))
                }
                required={useCustom}
                placeholder="Enter custom product name"
              />
            ) : (
              <select
                className="input"
                value={form.product_id}
                onChange={(e) => handleProductChange(e.target.value)}
                required={!useCustom}
              >
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.commission} commission)
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Quantity</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      quantity: Math.max(1, f.quantity - 1),
                    }))
                  }
                  className="w-10 h-10 bg-surface-100 hover:bg-surface-200 rounded-xl font-bold text-surface-700 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  −
                </button>
                <input
                  className="input text-center"
                  type="number"
                  value={form.quantity}
                  min={1}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      quantity: Math.max(1, parseInt(e.target.value) || 1),
                    }))
                  }
                />
                <button
                  type="button"
                  onClick={() =>
                    setForm((f) => ({ ...f, quantity: f.quantity + 1 }))
                  }
                  className="w-10 h-10 bg-surface-100 hover:bg-surface-200 rounded-xl font-bold text-surface-700 flex items-center justify-center flex-shrink-0 transition-colors"
                >
                  +
                </button>
              </div>
            </div>
            <div>
              <label className="label">Commission / piece (₹)</label>
              <input
                className="input"
                type="number"
                value={form.commission}
                min={0}
                onChange={(e) =>
                  setForm((f) => ({ ...f, commission: e.target.value }))
                }
                placeholder="500"
              />
              {form.commission && form.quantity > 1 && (
                <p className="text-xs text-green-600 mt-1 font-semibold">
                  Total: {fmt(parseFloat(form.commission) * form.quantity)}
                </p>
              )}
            </div>
            <div>
              <label className="label">Due Date</label>
              <input
                className="input"
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, due_date: e.target.value }))
                }
              />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea
              className="input resize-none"
              rows={2}
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Special instructions..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModal(false)}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1"
            >
              {saving ? "Assigning..." : "Assign Work"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
