import { NavLink, Outlet, useNavigate } from "react-router-dom"
import { useState } from "react"

import { useAuth } from "../../auth/AuthContext"

const primaryNavigation = [
  {
    label: "Home",
    path: "/m",
    icon: "⌂",
  },
  {
    label: "Products",
    path: "/m/products",
    icon: "▣",
  },
  {
    label: "Sales",
    path: "/m/sales",
    icon: "₹",
  },
]

const moreNavigation = [
  {
    label: "Categories",
    path: "/m/categories",
  },
  {
    label: "Suppliers",
    path: "/m/suppliers",
  },
  {
    label: "Staff",
    path: "/m/staff",
  },
  {
    label: "Purchases",
    path: "/m/purchases",
  },
  {
    label: "Supplier Payments",
    path: "/m/supplier-payments",
  },
  {
    label: "Returns",
    path: "/m/returns",
  },
  {
    label: "Ledger",
    path: "/m/ledger",
  },
  {
    label: "Reports",
    path: "/m/reports",
  },
]

function MobileHeader({ onMore }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate("/m/login", { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">
            POS Billing
          </h1>

          <p className="text-xs text-slate-500">
            Admin Portal
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMore}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-lg"
            aria-label="More"
          >
            ⋮
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
          >
            Logout
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 px-4 py-2">
        <p className="truncate text-xs text-slate-500">
          {user?.full_name || user?.username}
        </p>
      </div>
    </header>
  )
}

function BottomNavigation({ onMore }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white">
      <div className="grid grid-cols-4">
        {primaryNavigation.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === "/m"}
            className={({ isActive }) =>
              [
                "flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium",
                isActive
                  ? "text-slate-900"
                  : "text-slate-500",
              ].join(" ")
            }
          >
            <span className="text-lg">
              {item.icon}
            </span>

            <span>{item.label}</span>
          </NavLink>
        ))}

        <button
          type="button"
          onClick={onMore}
          className="flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-medium text-slate-500"
        >
          <span className="text-lg">•••</span>
          <span>More</span>
        </button>
      </div>
    </nav>
  )
}

function MoreMenu({ onClose }) {
  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        onClick={onClose}
        className="absolute inset-0 bg-black/40"
        aria-label="Close menu"
      />

      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-5 pb-7 shadow-2xl">
        <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-slate-300" />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">
            Admin Menu
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-xl text-slate-700"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {moreNavigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className="flex min-h-12 items-center rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700"
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function MobileAdminLayout() {
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <MobileHeader
        onMore={() => setMoreOpen(true)}
      />

      <main className="p-3 sm:p-4">
        <Outlet />
      </main>

      <BottomNavigation
        onMore={() => setMoreOpen(true)}
      />

      {moreOpen && (
        <MoreMenu
          onClose={() => setMoreOpen(false)}
        />
      )}
    </div>
  )
}
