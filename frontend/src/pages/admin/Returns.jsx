import { useEffect, useMemo, useState } from "react"

import {
  createSaleReturn,
  getProducts,
  getSale,
  getSales,
} from "../../api/client"
import { useAuth } from "../../auth/AuthContext"

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
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

function statusClasses(status) {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-700"

    case "partially_returned":
      return "bg-orange-100 text-orange-700"

    case "returned":
      return "bg-red-100 text-red-700"

    case "cancelled":
      return "bg-slate-100 text-slate-600"

    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default function Returns() {
  const { token } = useAuth()

  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])

  const [loading, setLoading] = useState(true)
  const [loadingSale, setLoadingSale] = useState(false)
  const [processing, setProcessing] = useState(false)

  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [search, setSearch] = useState("")
  const [selectedSale, setSelectedSale] = useState(null)

  const [returnQuantities, setReturnQuantities] = useState({})
  const [reason, setReason] = useState("")

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [salesData, productData] = await Promise.all([
        getSales(token),
        getProducts(token),
      ])

      setSales(salesData || [])
      setProducts(productData || [])
    } catch (err) {
      setError(err.message || "Failed to load sales")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const filteredSales = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) return sales

    return sales.filter(
      (sale) =>
        String(sale.id).includes(query) ||
        (sale.bill_number || "").toLowerCase().includes(query) ||
        (sale.status || "").toLowerCase().includes(query),
    )
  }, [sales, search])

  function productName(productId) {
    return (
      products.find((product) => product.id === productId)?.name ||
      `Product #${productId}`
    )
  }

  function getReturnableQuantity(item) {
    return Number(item.quantity || 0)
  }

  function openSale(sale) {
    if (sale.status === "cancelled" || sale.status === "returned") {
      setError("This sale is not eligible for return.")
      return
    }

    setSelectedSale(sale)
    setReturnQuantities({})
    setReason("")
    setError("")
    setSuccess("")
  }

  async function refreshSelectedSale(saleId) {
    try {
      const refreshedSale = await getSale(token, saleId)

      setSelectedSale(refreshedSale)

      setSales((current) =>
        current.map((sale) =>
          sale.id === refreshedSale.id
            ? refreshedSale
            : sale,
        ),
      )

      setReturnQuantities({})
    } catch (err) {
      setError(
        err.message || "Failed to refresh sale details",
      )
    }
  }

  function closeSale() {
    if (processing) return

    setSelectedSale(null)
    setReturnQuantities({})
    setReason("")
    setError("")
  }

  function updateReturnQuantity(itemId, value) {
    const quantity = Math.max(
      0,
      Math.floor(Number(value) || 0),
    )

    setReturnQuantities((current) => ({
      ...current,
      [itemId]: quantity,
    }))
  }

  const selectedReturnItems = useMemo(() => {
    if (!selectedSale) return []

    return selectedSale.items
      .map((item) => ({
        item,
        quantity: returnQuantities[item.id] || 0,
      }))
      .filter((entry) => entry.quantity > 0)
  }, [selectedSale, returnQuantities])

  const refundPreview = useMemo(() => {
    if (!selectedSale) return 0

    return selectedReturnItems.reduce(
      (total, { item, quantity }) => {
        const itemSubtotal =
          Number(item.unit_price || 0) * quantity

        const itemDiscount =
          Number(item.quantity || 0) > 0
            ? Number(item.discount || 0) *
              quantity /
              Number(item.quantity)
            : 0

        return total + itemSubtotal - itemDiscount
      },
      0,
    )
  }, [selectedSale, selectedReturnItems])

  async function handleSubmitReturn(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    if (!selectedSale) {
      setError("Please select a sale")
      return
    }

    if (selectedReturnItems.length === 0) {
      setError("Select at least one item quantity to return")
      return
    }

    for (const { item, quantity } of selectedReturnItems) {
      const returnable = getReturnableQuantity(item)

      if (quantity > returnable) {
        setError(
          `Cannot return more than ${returnable} units of ${productName(
            item.product_id,
          )}`,
        )
        return
      }
    }

    try {
      setProcessing(true)

      const result = await createSaleReturn(
        token,
        selectedSale.id,
        {
          items: selectedReturnItems.map(
            ({ item, quantity }) => ({
              sale_item_id: item.id,
              quantity,
            }),
          ),
          reason: reason.trim() || null,
        },
      )

      setSuccess(
        `Return #${result.id} processed successfully. Refund: ${formatMoney(
          result.refund_amount,
        )}`,
      )

      await refreshSelectedSale(selectedSale.id)
    } catch (err) {
      setError(
        err.message || "Failed to process return",
      )
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Returns
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Find a sale, select returned items, and process the refund.
        </p>
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
          placeholder="Search by bill number, sale ID, or status..."
          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading sales...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No sales found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Bill
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Date
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Total
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
                {filteredSales.map((sale) => {
                  const eligible =
                    sale.status !== "cancelled" &&
                    sale.status !== "returned"

                  return (
                    <tr
                      key={sale.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {sale.bill_number}
                        </div>

                        <div className="text-xs text-slate-500">
                          Sale #{sale.id}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        {formatDateTime(sale.created_at)}
                      </td>

                      <td className="px-4 py-3 text-right font-medium text-slate-900">
                        {formatMoney(sale.total_amount)}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                            sale.status,
                          )}`}
                        >
                          {sale.status}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={!eligible}
                          onClick={() => openSale(sale)}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {eligible ? "Process Return" : "Not Eligible"}
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

      {loadingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-white px-6 py-4 text-sm text-slate-600 shadow-xl">
            Loading sale details...
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Return — {selectedSale.bill_number}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sale #{selectedSale.id} ·{" "}
                  {formatDateTime(selectedSale.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={closeSale}
                disabled={processing}
                className="text-xl text-slate-400 hover:text-slate-700 disabled:opacity-50"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmitReturn}
              className="space-y-6 p-6"
            >
              <div>
                <h3 className="mb-3 font-semibold text-slate-900">
                  Select Items to Return
                </h3>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Product
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Sold
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Unit Price
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Item Discount
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Return Qty
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Refund
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedSale.items.map((item) => {
                        const returnable =
                          getReturnableQuantity(item)

                        const quantity =
                          returnQuantities[item.id] || 0

                        const refund =
                          Number(item.unit_price || 0) *
                            quantity -
                          (Number(item.quantity || 0) > 0
                            ? Number(item.discount || 0) *
                              quantity /
                              Number(item.quantity)
                            : 0)

                        return (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-slate-700">
                              {productName(item.product_id)}
                            </td>

                            <td className="px-4 py-3 text-right text-slate-700">
                              {returnable}
                            </td>

                            <td className="px-4 py-3 text-right text-slate-700">
                              {formatMoney(item.unit_price)}
                            </td>

                            <td className="px-4 py-3 text-right text-slate-700">
                              {formatMoney(item.discount)}
                            </td>

                            <td className="px-4 py-3 text-right">
                              <input
                                type="number"
                                min="0"
                                max={returnable}
                                step="1"
                                value={quantity || ""}
                                onChange={(event) =>
                                  updateReturnQuantity(
                                    item.id,
                                    event.target.value,
                                  )
                                }
                                className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none focus:border-slate-500"
                              />
                            </td>

                            <td className="px-4 py-3 text-right font-medium text-slate-900">
                              {formatMoney(refund)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Reason
                </label>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  maxLength={255}
                  rows={3}
                  placeholder="Optional return reason..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
                />
              </div>

              <div className="ml-auto max-w-sm rounded-lg bg-slate-50 p-4">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">
                    Items selected
                  </span>

                  <span className="font-medium text-slate-900">
                    {selectedReturnItems.reduce(
                      (total, entry) =>
                        total + entry.quantity,
                      0,
                    )}
                  </span>
                </div>

                <div className="mt-2 flex justify-between border-t border-slate-200 pt-2">
                  <span className="font-medium text-slate-700">
                    Refund amount
                  </span>

                  <span className="text-lg font-bold text-slate-900">
                    {formatMoney(refundPreview)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={closeSale}
                  disabled={processing}
                  className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    processing ||
                    selectedReturnItems.length === 0 ||
                    refundPreview <= 0
                  }
                  className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? "Processing..."
                    : `Process Return — ${formatMoney(
                        refundPreview,
                      )}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
