import { useEffect, useMemo, useState } from "react"

import {
  createStaff,
  getStaff,
  resetStaffPassword,
  updateStaff,
  updateStaffStatus,
} from "../../api/client"

import { useAuth } from "../../auth/AuthContext"


function StaffModal({
  staff,
  onClose,
  onSaved,
}) {
  const { token } = useAuth()

  const [username, setUsername] = useState(
    staff?.username || "",
  )
  const [fullName, setFullName] = useState(
    staff?.full_name || "",
  )
  const [password, setPassword] = useState("")

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSaving(true)

    try {
      if (staff) {
        await updateStaff(token, staff.id, {
          username: username.trim(),
          full_name: fullName.trim(),
        })
      } else {
        await createStaff(token, {
          username: username.trim(),
          full_name: fullName.trim(),
          password,
        })
      }

      await onSaved()
    } catch (err) {
      setError(
        err.message || "Unable to save staff member.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {staff ? "Edit Staff" : "Add Staff"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {staff
                ? "Update staff account information."
                : "Create a new staff account."}
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
              Username *
            </label>

            <input
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
              minLength={3}
              maxLength={50}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. cashier1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Full Name *
            </label>

            <input
              value={fullName}
              onChange={(event) =>
                setFullName(event.target.value)
              }
              required
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. Arun Kumar"
            />
          </div>

          {!staff && (
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Password *
              </label>

              <input
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                minLength={6}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                placeholder="Minimum 6 characters"
              />
            </div>
          )}

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
                : staff
                  ? "Save Changes"
                  : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function PasswordModal({
  staff,
  onClose,
  onSaved,
}) {
  const { token } = useAuth()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] =
    useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setSaving(true)

    try {
      await resetStaffPassword(
        token,
        staff.id,
        password,
      )

      await onSaved()
    } catch (err) {
      setError(
        err.message ||
          "Unable to reset staff password.",
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            Reset Password
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Set a new password for{" "}
            <span className="font-medium">
              {staff.full_name}
            </span>
            .
          </p>
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
              New Password *
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Minimum 6 characters"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Confirm Password *
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Repeat new password"
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
                ? "Resetting..."
                : "Reset Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function StatusModal({
  staff,
  onClose,
  onConfirm,
  updating,
}) {
  if (!staff) {
    return null
  }

  const activate = !staff.is_active

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {activate
              ? "Activate Staff"
              : "Deactivate Staff"}
          </h2>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-700">
            Are you sure you want to{" "}
            {activate ? "activate" : "deactivate"}{" "}
            <span className="font-semibold">
              {staff.full_name}
            </span>
            ?
          </p>

          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={updating}
              className={[
                "rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
                activate
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700",
              ].join(" ")}
            >
              {updating
                ? "Updating..."
                : activate
                  ? "Activate"
                  : "Deactivate"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


export default function Staff() {
  const { token } = useAuth()

  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [editingStaff, setEditingStaff] =
    useState(null)

  const [passwordTarget, setPasswordTarget] =
    useState(null)

  const [statusTarget, setStatusTarget] =
    useState(null)
  const [updatingStatus, setUpdatingStatus] =
    useState(false)

  async function loadStaff() {
    setLoading(true)
    setError("")

    try {
      const data = await getStaff(token)
      setStaff(data)
    } catch (err) {
      setError(
        err.message || "Unable to load staff.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStaff()
  }, [token])

  const filteredStaff = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return staff
    }

    return staff.filter((member) =>
      [
        member.username,
        member.full_name,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        ),
    )
  }, [staff, search])

  function openCreate() {
    setEditingStaff(null)
    setShowModal(true)
  }

  function openEdit(member) {
    setEditingStaff(member)
    setShowModal(true)
  }

  async function handleSaved() {
    setShowModal(false)
    setEditingStaff(null)
    await loadStaff()
  }

  async function handlePasswordSaved() {
    setPasswordTarget(null)
    await loadStaff()
  }

  async function handleStatusChange() {
    if (!statusTarget) {
      return
    }

    setUpdatingStatus(true)
    setError("")

    try {
      await updateStaffStatus(
        token,
        statusTarget.id,
        !statusTarget.is_active,
      )

      setStatusTarget(null)
      await loadStaff()
    } catch (err) {
      setError(
        err.message ||
          "Unable to update staff status.",
      )
    } finally {
      setUpdatingStatus(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Staff
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage staff accounts and access.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Staff
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
            placeholder="Search by username or name..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading staff...
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-900">
              No staff found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first staff account to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Staff
                  </th>

                  <th className="px-4 py-3">
                    Username
                  </th>

                  <th className="px-4 py-3">
                    Role
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
                {filteredStaff.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {member.full_name}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        ID: {member.id}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-600">
                      {member.username}
                    </td>

                    <td className="px-4 py-4">
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                        {member.role}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={[
                          "rounded-full px-2.5 py-1 text-xs font-medium",
                          member.is_active
                            ? "bg-green-100 text-green-700"
                            : "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {member.is_active
                          ? "Active"
                          : "Inactive"}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            openEdit(member)
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setPasswordTarget(
                              member,
                            )
                          }
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Reset Password
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setStatusTarget(member)
                          }
                          className={[
                            "rounded-lg border px-3 py-1.5 text-xs font-medium",
                            member.is_active
                              ? "border-red-200 text-red-600 hover:bg-red-50"
                              : "border-green-200 text-green-700 hover:bg-green-50",
                          ].join(" ")}
                        >
                          {member.is_active
                            ? "Deactivate"
                            : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {filteredStaff.length} of{" "}
            {staff.length} staff members
          </div>
        )}
      </div>

      {showModal && (
        <StaffModal
          staff={editingStaff}
          onClose={() => {
            setShowModal(false)
            setEditingStaff(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {passwordTarget && (
        <PasswordModal
          staff={passwordTarget}
          onClose={() => {
            setPasswordTarget(null)
          }}
          onSaved={handlePasswordSaved}
        />
      )}

      {statusTarget && (
        <StatusModal
          staff={statusTarget}
          onClose={() => {
            if (!updatingStatus) {
              setStatusTarget(null)
            }
          }}
          onConfirm={handleStatusChange}
          updating={updatingStatus}
        />
      )}
    </div>
  )
}
