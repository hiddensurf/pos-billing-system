import { useEffect, useMemo, useState } from "react"

import {
  createPurchase,
  getProducts,
  getPurchases,
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

function emptyItem() {
  return {
    product_id: "",
    quantity: 1,
    unit_cost: "",
  }
}

export default function Purchases() {
  const { token } = useAuth()

  const [purchases, setPurchases] = useState([])
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPurchase, setSelectedPurchase] = useState(null)

  const [form, setForm] = useState({
    supplier_id: "",
    invoice_number: "",
    purchase_date: new Date().toISOString().slice(0, 10),
    paid_amount: "",
    notes: "",
    items: [emptyItem()],
  })

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [purchaseData, productData, supplierData] =
        await Promise.all([
          getPurchases(token),
          getProducts(token),
          getSuppliers(token),
        ])

      setPurchases(purchaseData || [])
      setProducts(productData || [])
      setSuppliers(supplierData || [])
    } catch (err) {
      setError(err.message || "Failed to load purchases")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const activeProducts = products

  const activeSuppliers = useMemo(
    () => suppliers.filter((supplier) => supplier.is_active),
    [suppliers],
  )

  const filteredPurchases = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return purchases

    return purchases.filter((purchase) => {
      const supplier = suppliers.find(
        (item) => item.id === purchase.supplier_id,
      )

      return (
        String(purchase.id).includes(query) ||
        (purchase.invoice_number || "")
          .toLowerCase()
          .includes(query) ||
        (supplier?.name || "").toLowerCase().includes(query)
      )
    })
  }, [purchases, search, suppliers])

  const purchaseTotal = useMemo(
    () =>
      form.items.reduce((total, item) => {
        const quantity = Number(item.quantity) || 0
        const unitCost = Number(item.unit_cost) || 0

        return total + quantity * unitCost
      }, 0),
    [form.items],
  )

  const paidAmount = Number(form.paid_amount) || 0
  const dueAmount = Math.max(purchaseTotal - paidAmount, 0)

  function supplierName(supplierId) {
    return (
      suppliers.find((supplier) => supplier.id === supplierId)?.name ||
      `Supplier #${supplierId}`
    )
  }

  function productName(productId) {
    return (
      products.find((product) => product.id === productId)?.name ||
      `Product #${productId}`
    )
  }

  function resetForm() {
    setForm({
      supplier_id: "",
      invoice_number: "",
      purchase_date: new Date().toISOString().slice(0, 10),
      paid_amount: "",
      notes: "",
      items: [emptyItem()],
    })
  }

  function closeCreateModal() {
    if (saving) return

    setShowCreate(false)
    resetForm()
    setError("")
  }

  function updateItem(index, field, value) {
    setForm((current) => {
      const items = [...current.items]

      items[index] = {
        ...items[index],
        [field]: value,
      }

      return {
        ...current,
        items,
      }
    })
  }

  function addItem() {
    setForm((current) => ({
      ...current,
      items: [...current.items, emptyItem()],
    }))
  }

  function removeItem(index) {
    setForm((current) => {
      if (current.items.length === 1) {
        return current
      }

      return {
        ...current,
        items: current.items.filter((_, itemIndex) => itemIndex !== index),
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!form.supplier_id) {
      setError("Please select a supplier")
      return
    }

    const validItems = form.items.filter(
      (item) =>
        item.product_id &&
        Number(item.quantity) > 0 &&
        Number(item.unit_cost) >= 0,
    )

    if (validItems.length !== form.items.length) {
      setError("Please complete every purchase item")
      return
    }

    if (validItems.length === 0) {
      setError("Add at least one purchase item")
      return
    }

    if (paidAmount > purchaseTotal) {
      setError("Paid amount cannot exceed purchase total")
      return
    }

    const productIds = validItems.map((item) => Number(item.product_id))

    if (new Set(productIds).size !== productIds.length) {
      setError(
        "The same product cannot be added more than once to a purchase",
      )
      return
    }

    const payload = {
      supplier_id: Number(form.supplier_id),
      invoice_number: form.invoice_number.trim() || null,
      purchase_date: form.purchase_date
        ? `${form.purchase_date}T00:00:00+00:00`
        : null,
      paid_amount: paidAmount.toFixed(2),
      notes: form.notes.trim() || null,
      items: validItems.map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity),
        unit_cost: Number(item.unit_cost).toFixed(2),
      })),
    }

    try {
      setSaving(true)

      const created = await createPurchase(token, payload)

      setPurchases((current) => [...current, created])
      setSuccess(
        `Purchase #${created.id} created successfully. Stock has been updated.`,
      )

      setShowCreate(false)
      resetForm()
    } catch (err) {
      setError(err.message || "Failed to create purchase")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Purchases
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Record supplier purchases and stock received.
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
          New Purchase
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
          placeholder="Search by invoice, supplier, or purchase ID..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading purchases...
          </div>
        ) : filteredPurchases.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No purchases found.
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
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Total
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Paid
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Due
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((purchase) => {
                  const due =
                    Number(purchase.total_amount || 0) -
                    Number(purchase.paid_amount || 0)

                  return (
                    <tr key={purchase.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        #{purchase.id}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {purchase.invoice_number || "—"}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {supplierName(purchase.supplier_id)}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(purchase.purchase_date)}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(purchase.total_amount)}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(purchase.paid_amount)}
                      </td>

                      <td className="px-4 py-3 text-right text-slate-700">
                        {formatMoney(due)}
                      </td>

                      <td className="px-4 py-3">
                        <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
                          {purchase.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedPurchase(purchase)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto my-8 max-w-4xl rounded-xl bg-white shadow-xl">
            <form onSubmit={handleSubmit}>
              <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    New Purchase
                  </h2>

                  <p className="text-sm text-slate-500">
                    Stock will be increased when the purchase is created.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="text-2xl text-slate-400 hover:text-slate-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6 p-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Supplier *
                    </label>

                    <select
                      required
                      value={form.supplier_id}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          supplier_id: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    >
                      <option value="">Select supplier</option>

                      {activeSuppliers.map((supplier) => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Invoice Number
                    </label>

                    <input
                      type="text"
                      maxLength={100}
                      value={form.invoice_number}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          invoice_number: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Purchase Date
                    </label>

                    <input
                      type="date"
                      value={form.purchase_date}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          purchase_date: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      Purchase Items
                    </h3>

                    <button
                      type="button"
                      onClick={addItem}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-3">
                    {form.items.map((item, index) => {
                      const lineTotal =
                        (Number(item.quantity) || 0) *
                        (Number(item.unit_cost) || 0)

                      return (
                        <div
                          key={index}
                          className="grid gap-3 rounded-lg border border-slate-200 p-3 md:grid-cols-[2fr_1fr_1fr_auto]"
                        >
                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Product
                            </label>

                            <select
                              required
                              value={item.product_id}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "product_id",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            >
                              <option value="">
                                Select product
                              </option>

                              {activeProducts.map((product) => (
                                <option
                                  key={product.id}
                                  value={product.id}
                                >
                                  {product.name} ({product.sku})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Quantity
                            </label>

                            <input
                              required
                              min="1"
                              type="number"
                              value={item.quantity}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "quantity",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />
                          </div>

                          <div>
                            <label className="mb-1 block text-xs font-medium text-slate-500">
                              Unit Cost
                            </label>

                            <input
                              required
                              min="0"
                              step="0.01"
                              type="number"
                              value={item.unit_cost}
                              onChange={(event) =>
                                updateItem(
                                  index,
                                  "unit_cost",
                                  event.target.value,
                                )
                              }
                              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                            />

                            <p className="mt-1 text-xs text-slate-500">
                              {formatMoney(lineTotal)}
                            </p>
                          </div>

                          <div className="flex items-end">
                            <button
                              type="button"
                              disabled={form.items.length === 1}
                              onClick={() => removeItem(index)}
                              className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Paid Amount
                    </label>

                    <input
                      min="0"
                      max={purchaseTotal}
                      step="0.01"
                      type="number"
                      value={form.paid_amount}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          paid_amount: event.target.value,
                        }))
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                    />
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Purchase Total
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatMoney(purchaseTotal)}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">
                      Supplier Due
                    </p>

                    <p className="mt-1 text-lg font-bold text-slate-900">
                      {formatMoney(dueAmount)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Notes
                  </label>

                  <textarea
                    rows="3"
                    value={form.notes}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeCreateModal}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedPurchase && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-4">
          <div className="mx-auto my-8 max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Purchase #{selectedPurchase.id}
                </h2>

                <p className="text-sm text-slate-500">
                  {selectedPurchase.invoice_number || "No invoice number"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="text-2xl text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <p className="text-xs text-slate-500">Supplier</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {supplierName(selectedPurchase.supplier_id)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Date</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatDate(selectedPurchase.purchase_date)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Total</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatMoney(selectedPurchase.total_amount)}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Paid</p>
                  <p className="mt-1 font-medium text-slate-900">
                    {formatMoney(selectedPurchase.paid_amount)}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        Product
                      </th>
                      <th className="px-4 py-3 text-right">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right">
                        Unit Cost
                      </th>
                      <th className="px-4 py-3 text-right">
                        Total
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {selectedPurchase.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          {productName(item.product_id)}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {item.quantity}
                        </td>

                        <td className="px-4 py-3 text-right">
                          {formatMoney(item.unit_cost)}
                        </td>

                        <td className="px-4 py-3 text-right font-medium">
                          {formatMoney(item.total_cost)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedPurchase.notes && (
                <div>
                  <p className="text-xs text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {selectedPurchase.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedPurchase(null)}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
