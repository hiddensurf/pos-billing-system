import { useEffect, useMemo, useState } from "react"

import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory,
} from "../../api/client"

import { useAuth } from "../../auth/AuthContext"

function CategoryModal({
  category,
  onClose,
  onSaved,
}) {
  const { token } = useAuth()

  const [name, setName] = useState(category?.name || "")
  const [description, setDescription] = useState(
    category?.description || "",
  )

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSaving(true)

    try {
      const payload = {
        name,
        description: description || null,
      }

      if (category) {
        await updateCategory(
          token,
          category.id,
          payload,
        )
      } else {
        await createCategory(token, payload)
      }

      await onSaved()
    } catch (err) {
      setError(
        err.message || "Unable to save category.",
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
              {category
                ? "Edit Category"
                : "Add Category"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {category
                ? "Update category information."
                : "Create a new product category."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
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
              Category Name *
            </label>

            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              maxLength={100}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="e.g. Shirts"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={4}
              className="mt-1 w-full resize-none rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              placeholder="Optional category description"
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
                : category
                  ? "Save Changes"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Categories() {
  const { token } = useAuth()

  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [showModal, setShowModal] = useState(false)
  const [editingCategory, setEditingCategory] =
    useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadCategories() {
    setLoading(true)
    setError("")

    try {
      const data = await getCategories(token)
      setCategories(data)
    } catch (err) {
      setError(
        err.message || "Unable to load categories.",
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCategories()
  }, [token])

  const filteredCategories = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return categories
    }

    return categories.filter((category) => {
      return [
        category.name,
        category.description,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query),
        )
    })
  }, [categories, search])

  function openCreate() {
    setEditingCategory(null)
    setShowModal(true)
  }

  function openEdit(category) {
    setEditingCategory(category)
    setShowModal(true)
  }

  async function handleSaved() {
    setShowModal(false)
    setEditingCategory(null)
    await loadCategories()
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setError("")

    try {
      await deleteCategory(
        token,
        deleteTarget.id,
      )

      setDeleteTarget(null)
      await loadCategories()
    } catch (err) {
      setError(
        err.message || "Unable to delete category.",
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
            Categories
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Organize products into categories.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Category
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
            placeholder="Search categories..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading categories...
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-900">
              No categories found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first category to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">
                    Name
                  </th>

                  <th className="px-4 py-3">
                    Description
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
                {filteredCategories.map(
                  (category) => (
                    <tr
                      key={category.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {category.name}
                        </div>

                        <div className="mt-1 text-xs text-slate-500">
                          ID: {category.id}
                        </div>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {category.description ||
                          "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            category.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-slate-100 text-slate-600",
                          ].join(" ")}
                        >
                          {category.is_active
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              openEdit(category)
                            }
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(
                                category,
                              )
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
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
            Showing {filteredCategories.length} of{" "}
            {categories.length} categories
          </div>
        )}
      </div>

      {showModal && (
        <CategoryModal
          category={editingCategory}
          onClose={() => {
            setShowModal(false)
            setEditingCategory(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete Category
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <strong>
                {deleteTarget.name}
              </strong>
              ?
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Categories that are currently used by
              products cannot be deleted.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleting
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
