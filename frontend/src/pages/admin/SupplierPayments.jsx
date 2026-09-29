import { useEffect, useMemo, useState } from "react"

import {
  createSupplierPayment,
  getPurchases,
  getSupplierDues,
  getSupplierPayments,
  getSuppliers,
} from "../../api/client"
import { useAuth } from "../../auth/AuthContext"

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return "—"

  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(value) {
  if (!value) return "—"

  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default function SupplierPayments() {
  const { token } = useAuth()

  const [payments, setPayments] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")

  const [showCreate, setShowCreate] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)

  const [selectedSupplierDue, setSelectedSupplierDue] = useState(null)
  const [loadingDue, setLoadingDue] = useState(false)

  const [form, setForm] = useState({
    supplier_id: "",
    purchase_id: "",
    amount: "",
    payment_method: "cash",
    payment_date: new Date().toISOString().slice(0, 10),
    reference: "",
    notes: "",
  })

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [paymentData, supplierData, purchaseData] =
        await Promise.all([
          getSupplierPayments(token),
          getSuppliers(token),
          getPurchases(token),
        ])

      setPayments(paymentData || [])
      setSuppliers(supplierData || [])
      setPurchases(purchaseData || [])
    } catch (err) {
      setError(err.message || "Failed to load supplier payments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.is_active),
    [suppliers],
  )

  const supplierPurchases = useMemo(() => {
    if (!form.supplier_id) return []

    return purchases.filter(
      (purchase) =>
        purchase.supplier_id === Number(form.supplier_id) &&
        purchase.status !== "cancelled",
    )
  }, [form.supplier_id, purchases])

  const filteredPayments = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return payments

    return payments.filter((payment) => {
      const supplier = suppliers.find(
        (item) => item.id === payment.supplier_id,
      )

      return (
        String(payment.id).includes(query) ||
        String(payment.purchase_id || "").includes(query) ||
        (supplier?.name || "").toLowerCase().includes(query) ||
        (payment.payment_method || "").toLowerCase().includes(query) ||
        (payment.reference || "").toLowerCase().includes(query)
      )
    })
  }, [payments, search, suppliers])

  function supplierName(supplierId) {
    return (
      suppliers.find((supplier) => supplier.id === supplierId)?.name ||
      `Supplier #${supplierId}`
    )
  }

  function purchaseLabel(purchaseId) {
    if (!purchaseId) return "Supplier balance"

    const purchase = purchases.find(
      (item) => item.id === purchaseId,
    )

    if (!purchase) return `Purchase #${purchaseId}`

    return `#${purchase.id}${purchase.invoice_number ? ` — ${purchase.invoice_number}` : ""}`
  }

  function resetForm() {
    setForm({
      supplier_id: "",
      purchase_id: "",
      amount: "",
      payment_method: "cash",
      payment_date: new Date().toISOString().slice(0, 10),
      reference: "",
      notes: "",
    })
  }

  function closeCreateModal() {
    if (saving) return

    setShowCreate(false)
    resetForm()
    setError("")
  }

  function handleSupplierChange(value) {
    setForm((current) => ({
      ...current,
      supplier_id: value,
      purchase_id: "",
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!form.supplier_id) {
      setError("Please select a supplier")
      return
    }

    const amount = Number(form.amount)

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Payment amount must be greater than 0")
      return
    }

    const selectedPurchase = form.purchase_id
      ? purchases.find(
          (purchase) => purchase.id === Number(form.purchase_id),
        )
      : null

    if (selectedPurchase) {
      const outstanding =
        Number(selectedPurchase.total_amount || 0) -
        Number(selectedPurchase.paid_amount || 0)

      if (amount > outstanding) {
        setError(
          `Payment cannot exceed purchase outstanding amount of ${formatMoney(
            outstanding,
          )}`,
        )
        return
      }
    }

    const payload = {
      supplier_id: Number(form.supplier_id),
      purchase_id: form.purchase_id
        ? Number(form.purchase_id)
        : null,
      amount: amount.toFixed(2),
      payment_method: form.payment_method.trim() || "cash",
      payment_date: form.payment_date
        ? `${form.payment_date}T00:00:00+00:00`
        : null,
      reference: form.reference.trim() || null,
      notes: form.notes.trim() || null,
    }

    try {
      setSaving(true)

      const created = await createSupplierPayment(token, payload)

      setPayments((current) => [...current, created])

      setSuccess(
        `Supplier payment #${created.id} recorded successfully.`,
      )

      setShowCreate(false)
      resetForm()
    } catch (err) {
      setError(
        err.message || "Failed to create supplier payment",
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleViewDues(supplierId) {
    try {
      setLoadingDue(true)
      setError("")

      const due = await getSupplierDues(token, supplierId)

      setSelectedSupplierDue(due)
    } catch (err) {
      setError(err.message || "Failed to load supplier dues")
    } finally {
      setLoadingDue(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Supplier Payments
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Record supplier payments and track outstanding dues.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setError("")
            setSuccess("")
            setShowCreate(true)
          }}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          New Payment
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by payment ID, supplier, purchase, method, or reference..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading supplier payments...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No supplier payments found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    ID
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Supplier
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Purchase
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Method
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Reference
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      #{payment.id}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {supplierName(payment.supplier_id)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {purchaseLabel(payment.purchase_id)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {formatDate(payment.payment_date)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(payment.amount)}
                    </td>

                    <td className="px-4 py-3 capitalize text-slate-700">
                      {payment.payment_method}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {payment.reference || "—"}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedPayment(payment)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Supplier Due Lookup
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Check the current outstanding balance for a supplier.
            </p>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedSupplierDue?.supplier_id || ""}
              onChange={(event) => {
                if (event.target.value) {
                  handleViewDues(Number(event.target.value))
                } else {
                  setSelectedSupplierDue(null)
                }
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">Select supplier</option>

              {suppliers.map((supplier) => (
                <option
                  key={supplier.id}
                  value={supplier.id}
                >
                  {supplier.name}
                </option>
              ))}
            </select>

            {loadingDue && (
              <span className="self-center text-xs text-slate-500">
                Loading...
              </span>
            )}
          </div>
        </div>

        {selectedSupplierDue && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Total Purchases
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatMoney(
                  selectedSupplierDue.total_purchase_amount,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Total Paid
              </p>

              <p className="mt-1 text-lg font-semibold text-slate-900">
                {formatMoney(
                  selectedSupplierDue.total_paid_amount,
                )}
              </p>
            </div>

            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-xs text-red-600">
                Outstanding
              </p>

              <p className="mt-1 text-lg font-semibold text-red-700">
                {formatMoney(
                  selectedSupplierDue.outstanding_amount,
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  New Supplier Payment
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Record a payment against a purchase or supplier balance.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                disabled={saving}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5 p-6"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Supplier
                  </label>

                  <select
                    value={form.supplier_id}
                    onChange={(event) =>
                      handleSupplierChange(event.target.value)
                    }
                    required
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="">
                      Select supplier
                    </option>

                    {activeSuppliers.map((supplier) => (
                      <option
                        key={supplier.id}
                        value={supplier.id}
                      >
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Purchase
                  </label>

                  <select
                    value={form.purchase_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        purchase_id: event.target.value,
                      }))
                    }
                    disabled={!form.supplier_id}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500 disabled:bg-slate-100"
                  >
                    <option value="">
                      Supplier balance
                    </option>

                    {supplierPurchases.map((purchase) => {
                      const due =
                        Number(purchase.total_amount || 0) -
                        Number(purchase.paid_amount || 0)

                      return (
                        <option
                          key={purchase.id}
                          value={purchase.id}
                        >
                          #{purchase.id}
                          {purchase.invoice_number
                            ? ` — ${purchase.invoice_number}`
                            : ""}{" "}
                          — Due {formatMoney(due)}
                        </option>
                      )
                    })}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Amount
                  </label>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={form.amount}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        amount: event.target.value,
                      }))
                    }
                    required
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment Method
                  </label>

                  <select
                    value={form.payment_method}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        payment_method: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="cash">Cash</option>
                    <option value="bank_transfer">
                      Bank Transfer
                    </option>
                    <option value="upi">UPI</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Payment Date
                  </label>

                  <input
                    type="date"
                    value={form.payment_date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        payment_date: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Reference
                  </label>

                  <input
                    type="text"
                    maxLength={100}
                    value={form.reference}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reference: event.target.value,
                      }))
                    }
                    placeholder="Transaction/reference number"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Notes
                </label>

                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Optional notes..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>

              {form.purchase_id && (
                <div className="rounded-lg bg-slate-50 p-4 text-sm">
                  {(() => {
                    const purchase = purchases.find(
                      (item) =>
                        item.id === Number(form.purchase_id),
                    )

                    if (!purchase) return null

                    const due =
                      Number(purchase.total_amount || 0) -
                      Number(purchase.paid_amount || 0)

                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-500">
                            Purchase total
                          </span>

                          <span className="font-medium">
                            {formatMoney(
                              purchase.total_amount,
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex justify-between">
                          <span className="text-slate-500">
                            Already paid
                          </span>

                          <span className="font-medium">
                            {formatMoney(
                              purchase.paid_amount,
                            )}
                          </span>
                        </div>

                        <div className="mt-1 flex justify-between">
                          <span className="text-slate-500">
                            Outstanding
                          </span>

                          <span className="font-semibold text-red-600">
                            {formatMoney(due)}
                          </span>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Payment #{selectedPayment.id}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Supplier payment details
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">
                  Supplier
                </span>

                <span className="font-medium text-slate-900">
                  {supplierName(selectedPayment.supplier_id)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Purchase
                </span>

                <span className="font-medium text-slate-900">
                  {purchaseLabel(selectedPayment.purchase_id)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Amount
                </span>

                <span className="font-semibold text-slate-900">
                  {formatMoney(selectedPayment.amount)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Payment method
                </span>

                <span className="capitalize text-slate-900">
                  {selectedPayment.payment_method}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Payment date
                </span>

                <span className="text-slate-900">
                  {formatDateTime(selectedPayment.payment_date)}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-slate-500">
                  Reference
                </span>

                <span className="text-slate-900">
                  {selectedPayment.reference || "—"}
                </span>
              </div>

              <div>
                <p className="text-slate-500">Notes</p>

                <p className="mt-1 text-slate-900">
                  {selectedPayment.notes || "—"}
                </p>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedPayment(null)}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
