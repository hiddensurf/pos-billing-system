import { NavLink, Outlet, useNavigate } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"

const navigation = [
  {
    label: "Dashboard",
    path: "/admin",
  },
  {
    label: "Products",
    path: "/admin/products",
  },
  {
    label: "Categories",
    path: "/admin/categories",
  },
  {
    label: "Suppliers",
    path: "/admin/suppliers",
  },
  {
    label: "Staff",
    path: "/admin/staff",
  },
  {
    label: "Purchases",
    path: "/admin/purchases",
  },
  {
    label: "Supplier Payments",
    path: "/admin/supplier-payments",
  },
  {
    label: "Sales",
    path: "/admin/sales",
  },
  {
    label: "Returns",
    path: "/admin/returns",
  },
  {
    label: "Ledger",
    path: "/admin/ledger",
  },
  {
    label: "Reports",
    path: "/admin/reports",
  },
]

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
      <div className="flex h-16 items-center border-b border-slate-200 px-6">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            POS Billing
          </h1>
          <p className="text-xs text-slate-500">
            Admin Portal
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {navigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/admin"}
            className={({ isActive }) =>
              [
                "block rounded-lg px-4 py-2.5 text-sm font-medium transition",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              ].join(" ")
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}

function TopBar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/login", { replace: true })
  }

  return (
    <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Dashboard
        </h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-slate-900">
            {user?.full_name || user?.username}
          </p>
          <p className="text-xs capitalize text-slate-500">
            {user?.role}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Logout
        </button>
      </div>
    </header>
  )
}

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-slate-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
