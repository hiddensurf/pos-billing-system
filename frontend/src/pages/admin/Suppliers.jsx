import { useEffect, useMemo, useState } from "react"

import {
  createSupplier,
  deleteSupplier,
  getSuppliers,
  updateSupplier,
} from "../../api/client"

import { useAuth } from "../../auth/AuthContext"


function SupplierModal({
  supplier,
  onClose,
  onSaved,
}) {
  const { token } = useAuth()

  const [name, setName] = useState(
    supplier?.name || "",
  )
  const [contactPerson, setContactPerson] =
    useState(supplier?.contact_person || "")
  const [phone, setPhone] = useState(
    supplier?.phone || "",
  )
  const [email, setEmail] = useState(
    supplier?.email || "",
  )
  const [address, setAddress] = useState(
    supplier?.address || "",
  )

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSaving(true)

    try {
      const payload = {
        name: name.trim(),
        contact_person:
          contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
      }

      if (supplier) {
        await updateSupplier(
          token,
          supplier.id,
          payload,
        )
      } else {
        await createSupplier(token, payload)
      }

      await onSaved()
    } catch (err) {
      setError(
        err.message || "Unable to save supplier.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {supplier
                ? "Edit Supplier"
                : "Add Supplier"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {supplier
                ? "Update supplier information."
                : "Add a new supplier to the system."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Supplier Name *
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              maxLength={150}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. Kerala Fabric Suppliers"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Contact Person
              </label>

              <input
                value={contactPerson}
                onChange={(event) =>
                  setContactPerson(event.target.value)
                }
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="e.g. Arun Kumar"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Phone
              </label>

              <input
                value={phone}
                onChange={(event) =>
                  setPhone(event.target.value)
                }
                maxLength={30}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="e.g. 9876543210"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              maxLength={150}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. supplier@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Address
            </label>

            <textarea
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              rows={3}
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Supplier address"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : supplier
                  ? "Save Changes"
                  : "Create Supplier"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function DeactivateModal({
  supplier,
  onClose,
  onConfirm,
  deleting,
}) {
  if (!supplier) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Deactivate Supplier
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            This supplier will be marked inactive and
            will remain in the database.
          </p>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-700">
            Are you sure you want to deactivate{" "}
            <span className="font-semibold">
              {supplier.name}
            </span>
            ?
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={deleting}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={deleting}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting
                ? "Deactivating..."
                : "Deactivate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function Suppliers() {
  const { token } = useAuth()

  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [editingSupplier, setEditingSupplier] =
    useState(null)

  const [deleteTarget, setDeleteTarget] =
    useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadSuppliers() {
    setLoading(true)
    setError("")

    try {
      const data = await getSuppliers(token)
      setSuppliers(data)
    } catch (err) {
      setError(
        err.message || "Unable to load suppliers.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSuppliers()
  }, [token])

  const filteredSuppliers = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return suppliers
    }

    return suppliers.filter((supplier) => {
      return [
        supplier.name,
        supplier.contact_person,
        supplier.phone,
        supplier.email,
        supplier.address,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        )
    })
  }, [suppliers, search])

  function openCreate() {
    setEditingSupplier(null)
    setShowModal(true)
  }

  function openEdit(supplier) {
    setEditingSupplier(supplier)
    setShowModal(true)
  }

  async function handleSaved() {
    setShowModal(false)
    setEditingSupplier(null)
    await loadSuppliers()
  }

  async function handleDeactivate() {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setError("")

    try {
      await deleteSupplier(
        token,
        deleteTarget.id,
      )

      setDeleteTarget(null)
      await loadSuppliers()
    } catch (err) {
      setError(
        err.message ||
          "Unable to deactivate supplier.",
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Suppliers
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage supplier information and status.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Supplier
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <input
            type="search"
            placeholder="Search suppliers..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading suppliers...
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-900">
              No suppliers found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first supplier to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Supplier
                  </th>

                  <th className="px-4 py-3">
                    Contact Person
                  </th>

                  <th className="px-4 py-3">
                    Phone
                  </th>

                  <th className="px-4 py-3">
                    Email
                  </th>

                  <th className="px-4 py-3">
                    Address
                  </th>

                  <th className="px-4 py-3">
                    Status
                  </th>

                  <th className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredSuppliers.map(
                  (supplier) => (
                    <tr
                      key={supplier.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {supplier.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          ID: {supplier.id}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {supplier.contact_person ||
                          "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {supplier.phone || "—"}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {supplier.email || "—"}
                      </td>

                      <td className="max-w-xs px-4 py-4 text-slate-600">
                        <div className="truncate">
                          {supplier.address || "—"}
                        </div>
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            supplier.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {supplier.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(supplier)
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          {supplier.is_active && (
                            <button
                              type="button"
                              onClick={() =>
                                setDeleteTarget(
                                  supplier,
                                )
                              }
                              className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {filteredSuppliers.length} of{" "}
            {suppliers.length} suppliers
          </div>
        )}
      </div>

      {showModal && (
        <SupplierModal
          supplier={editingSupplier}
          onClose={() => {
            setShowModal(false)
            setEditingSupplier(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeactivateModal
          supplier={deleteTarget}
          onClose={() => {
            if (!deleting) {
              setDeleteTarget(null)
            }
          }}
          onConfirm={handleDeactivate}
          deleting={deleting}
        />
      )}
    </div>
  )
}
