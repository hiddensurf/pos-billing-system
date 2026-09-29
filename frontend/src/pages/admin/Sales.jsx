import { useEffect, useMemo, useState } from "react"

import {
  getProducts,
  getSale,
  getSales,
  getStaff,
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

    case "returned":
      return "bg-orange-100 text-orange-700"

    case "cancelled":
      return "bg-red-100 text-red-700"

    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default function Sales() {
  const { token } = useAuth()

  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [staff, setStaff] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [search, setSearch] = useState("")
  const [selectedSale, setSelectedSale] = useState(null)
  const [loadingSale, setLoadingSale] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const [salesData, productData, staffData] =
        await Promise.all([
          getSales(token),
          getProducts(token),
          getStaff(token),
        ])

      setSales(salesData || [])
      setProducts(productData || [])
      setStaff(staffData || [])
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

    return sales.filter((sale) => {
      const staffMember = staff.find(
        (item) => item.id === sale.staff_id,
      )

      return (
        String(sale.id).includes(query) ||
        (sale.bill_number || "").toLowerCase().includes(query) ||
        String(sale.staff_id).includes(query) ||
        (staffMember?.username || "")
          .toLowerCase()
          .includes(query) ||
        (staffMember?.name || "")
          .toLowerCase()
          .includes(query) ||
        (sale.payment_method || "")
          .toLowerCase()
          .includes(query) ||
        (sale.status || "").toLowerCase().includes(query)
      )
    })
  }, [sales, search, staff])

  function staffName(staffId) {
    const member = staff.find(
      (item) => item.id === staffId,
    )

    if (!member) return `Staff #${staffId}`

    return member.name || member.username || `Staff #${staffId}`
  }

  function productName(productId) {
    return (
      products.find((product) => product.id === productId)
        ?.name || `Product #${productId}`
    )
  }

  async function handleViewSale(saleId) {
    try {
      setLoadingSale(true)
      setError("")

      const sale = await getSale(token, saleId)

      setSelectedSale(sale)
    } catch (err) {
      setError(err.message || "Failed to load sale")
    } finally {
      setLoadingSale(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Sales
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View completed transactions and billing history.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Transactions
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {sales.length}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Sales
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatMoney(
              sales.reduce(
                (total, sale) =>
                  total + Number(sale.total_amount || 0),
                0,
              ),
            )}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Completed
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {
              sales.filter(
                (sale) => sale.status === "completed",
              ).length
            }
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by bill number, staff, payment method, status, or sale ID..."
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

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Staff
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Subtotal
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Discount
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Total
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Payment
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
                {filteredSales.map((sale) => (
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

                    <td className="px-4 py-3 text-slate-700">
                      {staffName(sale.staff_id)}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(sale.subtotal)}
                    </td>

                    <td className="px-4 py-3 text-right text-slate-700">
                      {formatMoney(sale.discount)}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(sale.total_amount)}
                    </td>

                    <td className="px-4 py-3 capitalize text-slate-700">
                      {sale.payment_method}
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
                        onClick={() =>
                          handleViewSale(sale.id)
                        }
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

      {loadingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-white px-6 py-4 text-sm text-slate-600 shadow-xl">
            Loading sale details...
          </div>
        </div>
      )}

      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {selectedSale.bill_number}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Sale #{selectedSale.id} ·{" "}
                  {formatDateTime(selectedSale.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Staff
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {staffName(selectedSale.staff_id)}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Payment Method
                  </p>

                  <p className="mt-1 capitalize font-medium text-slate-900">
                    {selectedSale.payment_method}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Status
                  </p>

                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-medium ${statusClasses(
                      selectedSale.status,
                    )}`}
                  >
                    {selectedSale.status}
                  </span>
                </div>
              </div>

              <div>
                <h3 className="mb-3 font-semibold text-slate-900">
                  Items
                </h3>

                <div className="overflow-hidden rounded-lg border border-slate-200">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Product
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Qty
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Unit Price
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Discount
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Total
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedSale.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-slate-700">
                            {productName(item.product_id)}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {item.quantity}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatMoney(item.unit_price)}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatMoney(item.discount)}
                          </td>

                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {formatMoney(item.total_amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Subtotal
                  </span>

                  <span className="text-slate-900">
                    {formatMoney(selectedSale.subtotal)}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-slate-500">
                    Sale Discount
                  </span>

                  <span className="text-slate-900">
                    {formatMoney(selectedSale.discount)}
                  </span>
                </div>

                <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-semibold">
                  <span>Total</span>

                  <span>
                    {formatMoney(selectedSale.total_amount)}
                  </span>
                </div>

                {selectedSale.payment_method === "cash" && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Cash Tendered
                      </span>

                      <span>
                        {formatMoney(
                          selectedSale.cash_tendered,
                        )}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">
                        Change Due
                      </span>

                      <span className="font-medium text-green-600">
                        {formatMoney(
                          selectedSale.change_due,
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedSale(null)}
                className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
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
