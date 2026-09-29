import { useEffect, useState } from "react"

import {
  getSalesReport,
  getStockReport,
} from "../../api/client"
import { useAuth } from "../../auth/AuthContext"

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function stockStatusClasses(status) {
  switch (status) {
    case "in_stock":
      return "bg-green-100 text-green-700"

    case "low_stock":
      return "bg-orange-100 text-orange-700"

    case "out_of_stock":
      return "bg-red-100 text-red-700"

    default:
      return "bg-slate-100 text-slate-700"
  }
}

export default function Reports() {
  const { token } = useAuth()

  const [salesReport, setSalesReport] = useState(null)
  const [stockReport, setStockReport] = useState({
    products: [],
  })

  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadReports(filters = {}) {
    try {
      setLoading(true)
      setError("")

      const [salesData, stockData] = await Promise.all([
        getSalesReport(token, filters),
        getStockReport(token),
      ])

      setSalesReport(salesData || null)
      setStockReport(stockData || { products: [] })
    } catch (err) {
      setError(err.message || "Failed to load reports")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadReports()
  }, [token])

  async function handleApplyFilters(event) {
    event.preventDefault()

    await loadReports({
      from_date: fromDate,
      to_date: toDate,
    })
  }

  async function handleClearFilters() {
    setFromDate("")
    setToDate("")

    await loadReports()
  }

  const products = stockReport?.products || []

  const lowStockCount = products.filter(
    (product) => product.stock_status === "low_stock",
  ).length

  const outOfStockCount = products.filter(
    (product) => product.stock_status === "out_of_stock",
  ).length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Reports
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Review sales performance and current inventory status.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form
        onSubmit={handleApplyFilters}
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sales From Date
            </label>

            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Sales To Date
            </label>

            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Apply
            </button>

            <button
              type="button"
              onClick={handleClearFilters}
              disabled={loading}
              className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          The date range applies to the Sales Report. The Stock Report
          always shows the current inventory state.
        </p>
      </form>

      {loading ? (
        <div className="rounded-xl bg-white p-6 text-sm text-slate-500 shadow-sm">
          Loading reports...
        </div>
      ) : (
        <>
          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Sales Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Sales and refunds for the selected date range.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Sales
                </p>

                <p className="mt-1 text-2xl font-bold text-green-600">
                  {formatMoney(salesReport?.total_sales)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Refunds
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {formatMoney(salesReport?.total_refunds)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Net Sales
                </p>

                <p
                  className={`mt-1 text-2xl font-bold ${
                    Number(salesReport?.net_sales || 0) >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {formatMoney(salesReport?.net_sales)}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Sales Count
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {salesReport?.sale_count ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Returned Sales
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {salesReport?.returned_sale_count ?? 0}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Refunds are filtered by their own return date. Therefore,
              a selected date range can show refunds for sales that were
              originally created outside the range.
            </div>
          </section>

          <section>
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Stock Report
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Current inventory snapshot.
              </p>
            </div>

            <div className="mb-4 grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Total Products
                </p>

                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {products.length}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Low Stock
                </p>

                <p className="mt-1 text-2xl font-bold text-orange-600">
                  {lowStockCount}
                </p>
              </div>

              <div className="rounded-xl bg-white p-5 shadow-sm">
                <p className="text-sm text-slate-500">
                  Out of Stock
                </p>

                <p className="mt-1 text-2xl font-bold text-red-600">
                  {outOfStockCount}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl bg-white shadow-sm">
              {products.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-500">
                  No products found in stock report.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Product
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          SKU
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Current Stock
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Cost Price
                        </th>

                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Selling Price
                        </th>

                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Status
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {products.map((product) => (
                        <tr
                          key={product.product_id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-4 py-3">
                            <div className="font-medium text-slate-900">
                              {product.product_name}
                            </div>

                            <div className="text-xs text-slate-500">
                              Product #{product.product_id}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-slate-700">
                            {product.sku}
                          </td>

                          <td className="px-4 py-3 text-right font-medium text-slate-900">
                            {product.current_stock}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatMoney(product.cost_price)}
                          </td>

                          <td className="px-4 py-3 text-right text-slate-700">
                            {formatMoney(product.selling_price)}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${stockStatusClasses(
                                product.stock_status,
                              )}`}
                            >
                              {product.stock_status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
