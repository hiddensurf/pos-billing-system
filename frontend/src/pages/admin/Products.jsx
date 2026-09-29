import { useEffect, useMemo, useState } from "react"

import {
  createProduct,
  deleteProduct,
  getCategories,
  getProducts,
  getSuppliers,
  updateProduct,
} from "../../api/client"

import { useAuth } from "../../auth/AuthContext"

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  category_id: "",
  supplier_id: "",
  cost_price: "",
  selling_price: "",
  stock_quantity: "0",
  reorder_level: "5",
  unit: "piece",
}

function formatCurrency(value) {
  return `₹${Number(value).toFixed(2)}`
}

function ProductModal({
  product,
  categories,
  suppliers,
  onClose,
  onSaved,
}) {
  const { token } = useAuth()

  const [form, setForm] = useState(
    product
      ? {
          name: product.name,
          sku: product.sku,
          barcode: product.barcode || "",
          category_id: String(product.category_id),
          supplier_id: product.supplier_id
            ? String(product.supplier_id)
            : "",
          cost_price: String(product.cost_price),
          selling_price: String(product.selling_price),
          stock_quantity: String(product.stock_quantity),
          reorder_level: String(product.reorder_level),
          unit: product.unit,
        }
      : emptyForm,
  )

  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function handleChange(event) {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSaving(true)

    const payload = {
      name: form.name,
      sku: form.sku,
      barcode: form.barcode || null,
      category_id: Number(form.category_id),
      supplier_id: form.supplier_id
        ? Number(form.supplier_id)
        : null,
      cost_price: form.cost_price,
      selling_price: form.selling_price,
      stock_quantity: Number(form.stock_quantity),
      reorder_level: Number(form.reorder_level),
      unit: form.unit,
    }

    try {
      if (product) {
        await updateProduct(token, product.id, payload)
      } else {
        await createProduct(token, payload)
      }

      await onSaved()
    } catch (err) {
      setError(err.message || "Unable to save product.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {product ? "Edit Product" : "Add Product"}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {product
                ? "Update the product information."
                : "Create a new product."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700">
                Product Name *
              </label>

              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                maxLength={150}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                SKU *
              </label>

              <input
                name="sku"
                value={form.sku}
                onChange={handleChange}
                required
                maxLength={50}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Barcode
              </label>

              <input
                name="barcode"
                value={form.barcode}
                onChange={handleChange}
                maxLength={100}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Category *
              </label>

              <select
                name="category_id"
                value={form.category_id}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              >
                <option value="">Select category</option>

                {categories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Supplier
              </label>

              <select
                name="supplier_id"
                value={form.supplier_id}
                onChange={handleChange}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
              >
                <option value="">No supplier</option>

                {suppliers.map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Cost Price *
              </label>

              <input
                name="cost_price"
                type="number"
                min="0"
                step="0.01"
                value={form.cost_price}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Selling Price *
              </label>

              <input
                name="selling_price"
                type="number"
                min="0"
                step="0.01"
                value={form.selling_price}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Stock Quantity
              </label>

              <input
                name="stock_quantity"
                type="number"
                min="0"
                step="1"
                value={form.stock_quantity}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Reorder Level
              </label>

              <input
                name="reorder_level"
                type="number"
                min="0"
                step="1"
                value={form.reorder_level}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">
                Unit
              </label>

              <input
                name="unit"
                value={form.unit}
                onChange={handleChange}
                maxLength={20}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : product ? "Save Changes" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Products() {
  const { token } = useAuth()

  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [suppliers, setSuppliers] = useState([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [modalProduct, setModalProduct] = useState(null)
  const [showModal, setShowModal] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function loadData() {
    setLoading(true)
    setError("")

    try {
      const [productData, categoryData, supplierData] =
        await Promise.all([
          getProducts(token),
          getCategories(token),
          getSuppliers(token),
        ])

      setProducts(productData)
      setCategories(categoryData)
      setSuppliers(supplierData)
    } catch (err) {
      setError(err.message || "Unable to load products.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [token])

  const categoryMap = useMemo(() => {
    return Object.fromEntries(
      categories.map((category) => [
        category.id,
        category.name,
      ]),
    )
  }, [categories])

  const supplierMap = useMemo(() => {
    return Object.fromEntries(
      suppliers.map((supplier) => [
        supplier.id,
        supplier.name,
      ]),
    )
  }, [suppliers])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return products
    }

    return products.filter((product) => {
      return [
        product.name,
        product.sku,
        product.barcode,
        categoryMap[product.category_id],
        supplierMap[product.supplier_id],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(query),
        )
    })
  }, [
    products,
    search,
    categoryMap,
    supplierMap,
  ])

  function openCreate() {
    setModalProduct(null)
    setShowModal(true)
  }

  function openEdit(product) {
    setModalProduct(product)
    setShowModal(true)
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return
    }

    setDeleting(true)
    setError("")

    try {
      await deleteProduct(token, deleteTarget.id)

      setDeleteTarget(null)
      await loadData()
    } catch (err) {
      setError(err.message || "Unable to delete product.")
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaved() {
    setShowModal(false)
    setModalProduct(null)
    await loadData()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Products
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage products, pricing, stock and product details.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Add Product
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
            placeholder="Search by name, SKU, barcode, category or supplier..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-medium text-slate-900">
              No products found
            </p>

            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Create your first product to get started."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1050px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Cost</th>
                  <th className="px-4 py-3">Selling Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((product) => {
                  const lowStock =
                    product.stock_quantity <=
                    product.reorder_level

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">
                          {product.name}
                        </div>

                        {product.barcode && (
                          <div className="mt-1 text-xs text-slate-500">
                            Barcode: {product.barcode}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4 font-mono text-xs text-slate-600">
                        {product.sku}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {categoryMap[product.category_id] ||
                          `Category #${product.category_id}`}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {product.supplier_id
                          ? supplierMap[product.supplier_id] ||
                            `Supplier #${product.supplier_id}`
                          : "—"}
                      </td>

                      <td className="px-4 py-4">
                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-medium",
                            lowStock
                              ? "bg-red-100 text-red-700"
                              : "bg-green-100 text-green-700",
                          ].join(" ")}
                        >
                          {product.stock_quantity}{" "}
                          {product.unit}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatCurrency(product.cost_price)}
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-900">
                        {formatCurrency(product.selling_price)}
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(product)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setDeleteTarget(product)
                            }
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && (
          <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
            Showing {filteredProducts.length} of{" "}
            {products.length} products
          </div>
        )}
      </div>

      {showModal && (
        <ProductModal
          product={modalProduct}
          categories={categories}
          suppliers={suppliers}
          onClose={() => {
            setShowModal(false)
            setModalProduct(null)
          }}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">
              Delete Product
            </h2>

            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.name}</strong>?
            </p>

            <p className="mt-2 text-xs text-slate-500">
              This action will be handled by the backend and
              may fail if the product is referenced by other
              records.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
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
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
