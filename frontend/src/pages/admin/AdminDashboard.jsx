import { loadDashboardData } from "./dashboardData"
import { useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import {
  getProducts,
  getSalesReport,
  getSupplierDuesSummary,
} from "../../api/client"
import { useAuth } from "../../auth/AuthContext"

function formatMoney(value) {
  return `₹${Number(value || 0).toFixed(2)}`
}

function getToday() {
  return new Date().toISOString().slice(0, 10)
}

const quickLinks = [
  {
    title: "Products",
    description: "Manage products and inventory.",
    path: "/admin/products",
  },
  {
    title: "Purchases",
    description: "Record stock purchases.",
    path: "/admin/purchases",
  },
  {
    title: "Sales",
    description: "Review billing transactions.",
    path: "/admin/sales",
  },
  {
    title: "Reports",
    description: "View sales and stock reports.",
    path: "/admin/reports",
  },
]

export default function AdminDashboard() {
  const { token } = useAuth()
  const { pathname } = useLocation()
  const routeBase = pathname.startsWith("/m") ? "/m" : "/admin"

  const [products, setProducts] = useState([])
  const [todaySales, setTodaySales] = useState(null)
  const [supplierDues, setSupplierDues] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  async function loadDashboard() {
    try {
      setLoading(true)
      setError("")

      const today = getToday()

      const data = await loadDashboardData([
        getProducts(token),
        getSalesReport(token, { from_date: today, to_date: today }),
        getSupplierDuesSummary(token),
      ])
      if (data.products !== null) setProducts(data.products || [])
      if (data.sales !== null) setTodaySales(data.sales || null)
      if (data.dues !== null) setSupplierDues(data.dues || null)
      if (data.hasErrors) setError("Some dashboard data could not be loaded. Other cards remain available.")
    } catch (err) {
      setError(err.message || "Failed to load dashboard")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [token])

  const stockValue = products.reduce(
    (total, product) =>
      total +
      Number(product.stock_quantity || 0) *
        Number(product.cost_price || 0),
    0,
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of your POS billing system.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Products
          </p>
          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "—" : products.length}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            Total products
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Stock Value
          </p>

          <p className="mt-3 text-3xl font-bold text-slate-900">
            {loading ? "—" : formatMoney(stockValue)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Current inventory cost value
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Today's Sales
          </p>

          <p className="mt-3 text-3xl font-bold text-green-600">
            {loading
              ? "—"
              : formatMoney(todaySales?.total_sales)}
          </p>

          <p className="mt-2 text-xs text-slate-500">
            Sales recorded today
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">
            Pending Dues
          </p>
          <p className="mt-3 text-3xl font-bold text-orange-600">
            {loading
              ? "—"
              : formatMoney(supplierDues?.outstanding_amount)}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            All suppliers outstanding
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Quick Access
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Common administration tasks.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {quickLinks.map((item) => (
            <a
              key={item.path}
              href={item.path.replace("/admin", routeBase)}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <h3 className="font-semibold text-slate-900">
                {item.title}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {item.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          System Status
        </h2>

        <div className="mt-4 flex items-center gap-3">
          <span className="h-3 w-3 rounded-full bg-green-500" />

          <div>
            <p className="text-sm font-medium text-slate-900">
              Backend connected
            </p>

            <p className="text-xs text-slate-500">
              API authentication is active.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
