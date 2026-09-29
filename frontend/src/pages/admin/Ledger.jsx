import { useEffect, useState } from "react"

import {
  getLedger,
  getLedgerEntry,
  getLedgerSummary,
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

function entryTypeClasses(type) {
  switch (type) {
    case "SALE":
      return "bg-green-100 text-green-700"

    case "PURCHASE":
      return "bg-blue-100 text-blue-700"

    case "SALE_RETURN":
      return "bg-orange-100 text-orange-700"

    case "SUPPLIER_PAYMENT":
      return "bg-purple-100 text-purple-700"

    default:
      return "bg-slate-100 text-slate-700"
  }
}

function directionClasses(direction) {
  return direction === "IN"
    ? "text-green-600"
    : "text-red-600"
}

export default function Ledger() {
  const { token } = useAuth()

  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState({
    total_in: "0",
    total_out: "0",
    net_amount: "0",
    entry_count: 0,
  })

  const [entryType, setEntryType] = useState("")
  const [direction, setDirection] = useState("")
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedEntry, setSelectedEntry] = useState(null)
  const [loadingEntry, setLoadingEntry] = useState(false)

  async function loadData() {
    try {
      setLoading(true)
      setError("")

      const filters = {
        entry_type: entryType,
        direction,
        from_date: fromDate,
        to_date: toDate,
      }

      const [ledgerData, summaryData] = await Promise.all([
        getLedger(token, filters),
        getLedgerSummary(token, {
          from_date: fromDate,
          to_date: toDate,
        }),
      ])

      setEntries(ledgerData || [])
      setSummary(
        summaryData || {
          total_in: "0",
          total_out: "0",
          net_amount: "0",
          entry_count: 0,
        },
      )
    } catch (err) {
      setError(err.message || "Failed to load ledger")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  async function handleApplyFilters(event) {
    event.preventDefault()
    await loadData()
  }

  async function handleClearFilters() {
    setEntryType("")
    setDirection("")
    setFromDate("")
    setToDate("")

    try {
      setLoading(true)
      setError("")

      const [ledgerData, summaryData] = await Promise.all([
        getLedger(token),
        getLedgerSummary(token),
      ])

      setEntries(ledgerData || [])
      setSummary(
        summaryData || {
          total_in: "0",
          total_out: "0",
          net_amount: "0",
          entry_count: 0,
        },
      )
    } catch (err) {
      setError(err.message || "Failed to reload ledger")
    } finally {
      setLoading(false)
    }
  }

  async function handleViewEntry(entryId) {
    try {
      setLoadingEntry(true)
      setError("")

      const entry = await getLedgerEntry(token, entryId)
      setSelectedEntry(entry)
    } catch (err) {
      setError(err.message || "Failed to load ledger entry")
    } finally {
      setLoadingEntry(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">
          Ledger
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          View financial ledger entries and transaction flow.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <strong>Ledger note:</strong> OUT includes purchase transactions
        and supplier payments. It should not be interpreted as total cash
        paid, because purchases represent purchase transaction totals.
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total In
          </p>

          <p className="mt-1 text-2xl font-bold text-green-600">
            {formatMoney(summary.total_in)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Total Out
          </p>

          <p className="mt-1 text-2xl font-bold text-red-600">
            {formatMoney(summary.total_out)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Net Amount
          </p>

          <p
            className={`mt-1 text-2xl font-bold ${
              Number(summary.net_amount || 0) >= 0
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatMoney(summary.net_amount)}
          </p>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">
            Entries
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {summary.entry_count}
          </p>
        </div>
      </div>

      <form
        onSubmit={handleApplyFilters}
        className="rounded-xl bg-white p-4 shadow-sm"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Entry Type
            </label>

            <select
              value={entryType}
              onChange={(event) => setEntryType(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">All Types</option>
              <option value="SALE">Sale</option>
              <option value="PURCHASE">Purchase</option>
              <option value="SALE_RETURN">Sale Return</option>
              <option value="SUPPLIER_PAYMENT">
                Supplier Payment
              </option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Direction
            </label>

            <select
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-500"
            >
              <option value="">All Directions</option>
              <option value="IN">In</option>
              <option value="OUT">Out</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              From Date
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
              To Date
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
      </form>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        {loading ? (
          <div className="p-6 text-sm text-slate-500">
            Loading ledger...
          </div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No ledger entries found.
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
                    Date
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Type
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Direction
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Amount
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Reference
                  </th>

                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Description
                  </th>

                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      #{entry.id}
                    </td>

                    <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {formatDateTime(entry.created_at)}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${entryTypeClasses(
                          entry.entry_type,
                        )}`}
                      >
                        {entry.entry_type}
                      </span>
                    </td>

                    <td
                      className={`px-4 py-3 font-semibold ${directionClasses(
                        entry.direction,
                      )}`}
                    >
                      {entry.direction}
                    </td>

                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {formatMoney(entry.amount)}
                    </td>

                    <td className="px-4 py-3 text-slate-700">
                      {entry.reference_type
                        ? `${entry.reference_type}${
                            entry.reference_id
                              ? ` #${entry.reference_id}`
                              : ""
                          }`
                        : "—"}
                    </td>

                    <td className="max-w-xs px-4 py-3 text-slate-700">
                      <span className="line-clamp-2">
                        {entry.description || "—"}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleViewEntry(entry.id)}
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

      {loadingEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-lg bg-white px-6 py-4 text-sm text-slate-600 shadow-xl">
            Loading ledger entry...
          </div>
        </div>
      )}

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Ledger Entry #{selectedEntry.id}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {formatDateTime(selectedEntry.created_at)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="text-xl text-slate-400 hover:text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Entry Type
                  </p>

                  <p className="mt-1 font-medium text-slate-900">
                    {selectedEntry.entry_type}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">
                    Direction
                  </p>

                  <p
                    className={`mt-1 font-semibold ${directionClasses(
                      selectedEntry.direction,
                    )}`}
                  >
                    {selectedEntry.direction}
                  </p>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 p-4">
                <p className="text-xs text-slate-500">
                  Amount
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {formatMoney(selectedEntry.amount)}
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">
                    Reference Type
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedEntry.reference_type || "—"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Reference ID
                  </p>

                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {selectedEntry.reference_id ?? "—"}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Description
                </p>

                <p className="mt-1 text-sm text-slate-700">
                  {selectedEntry.description || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Created By
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  User #{selectedEntry.created_by}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
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
