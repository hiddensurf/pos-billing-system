const stats = [
  {
    label: "Products",
    value: "—",
    description: "Total products",
  },
  {
    label: "Stock Value",
    value: "—",
    description: "Current inventory value",
  },
  {
    label: "Today's Sales",
    value: "—",
    description: "Sales recorded today",
  },
  {
    label: "Pending Dues",
    value: "—",
    description: "Supplier payments pending",
  },
]

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

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <p className="text-sm font-medium text-slate-500">
              {stat.label}
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-900">
              {stat.value}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {stat.description}
            </p>
          </div>
        ))}
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
              href={item.path}
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
