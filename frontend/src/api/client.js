const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:8000"

async function request(path, options = {}) {
  const {
    method = "GET",
    body,
    token,
    headers = {},
  } = options

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...headers,
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
    },
    body,
  })

  let data = null

  if (response.status !== 204) {
    const contentType = response.headers.get("content-type")

    if (contentType?.includes("application/json")) {
      data = await response.json()
    } else {
      data = await response.text()
    }
  }

  if (!response.ok) {
    const error = new Error(
      typeof data === "object" && data?.detail
        ? data.detail
        : `Request failed with status ${response.status}`,
    )

    error.status = response.status
    error.data = data

    throw error
  }

  return data
}


export async function login(username, password) {
  const formData = new URLSearchParams()

  formData.append("username", username)
  formData.append("password", password)

  return request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData,
  })
}


export async function getCurrentUser(token) {
  return request("/auth/me", {
    token,
  })
}

export async function getProducts(token) {
  return request("/admin/products", { token })
}

export async function createProduct(token, product) {
  return request("/admin/products", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  })
}

export async function updateProduct(token, productId, product) {
  return request(`/admin/products/${productId}`, {
    method: "PUT",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(product),
  })
}

export async function deleteProduct(token, productId) {
  return request(`/admin/products/${productId}`, {
    method: "DELETE",
    token,
  })
}

export async function getCategories(token) {
  return request("/admin/categories", { token })
}

export async function getSuppliers(token) {
  return request("/admin/suppliers", { token })
}
export async function getPurchases(token) {
  return request("/admin/purchases", { token })
}

export async function createPurchase(token, purchase) {
  return request("/admin/purchases", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(purchase),
  })
}
export async function getStaff(token) {
  return request("/admin/staff", { token })
}

export async function createStaff(token, staff) {
  return request("/admin/staff", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(staff),
  })
}

export async function updateStaff(token, staffId, staff) {
  return request(`/admin/staff/${staffId}`, {
    method: "PUT",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(staff),
  })
}

export async function updateStaffStatus(
  token,
  staffId,
  isActive,
) {
  return request(`/admin/staff/${staffId}/status?is_active=${isActive}`, {
    method: "PATCH",
    token,
  })
}

export async function resetStaffPassword(
  token,
  staffId,
  newPassword,
) {
  return request(`/admin/staff/${staffId}/password`, {
    method: "PATCH",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      new_password: newPassword,
    }),
  })
}

export async function createSupplier(token, supplier) {
  return request("/admin/suppliers", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(supplier),
  })
}

export async function updateSupplier(token, supplierId, supplier) {
  return request(`/admin/suppliers/${supplierId}`, {
    method: "PUT",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(supplier),
  })
}

export async function deleteSupplier(token, supplierId) {
  return request(`/admin/suppliers/${supplierId}`, {
    method: "DELETE",
    token,
  })
}
export async function createCategory(token, category) {
  return request("/admin/categories", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  })
}

export async function updateCategory(token, categoryId, category) {
  return request(`/admin/categories/${categoryId}`, {
    method: "PUT",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(category),
  })
}

export async function deleteCategory(token, categoryId) {
  return request(`/admin/categories/${categoryId}`, {
    method: "DELETE",
    token,
  })
}
export async function getSupplierPayments(token) {
  return request("/admin/supplier-payments", { token })
}

export async function createSupplierPayment(token, payment) {
  return request("/admin/supplier-payments", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payment),
  })
}

export async function getSupplierPayment(token, paymentId) {
  return request(`/admin/supplier-payments/${paymentId}`, { token })
}

export async function getSupplierDues(token, supplierId) {
  return request(`/admin/supplier-payments/supplier/${supplierId}/dues`, {
    token,
  })
}
export async function getSales(token) {
  return request("/sales", { token })
}

export async function getSale(token, saleId) {
  return request(`/sales/${saleId}`, { token })
}
export async function getBillingProducts(token) {
  return request("/sales/products", {
    token,
  })
}

export async function createSale(token, saleData) {
  return request("/sales", {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(saleData),
  })
}
export async function getLedger(token, params = {}) {
  const search = new URLSearchParams()

  if (params.entry_type) {
    search.set("entry_type", params.entry_type)
  }

  if (params.direction) {
    search.set("direction", params.direction)
  }

  if (params.from_date) {
    search.set("from_date", params.from_date)
  }

  if (params.to_date) {
    search.set("to_date", params.to_date)
  }

  const query = search.toString()

  return request(`/admin/ledger${query ? `?${query}` : ""}`, {
    token,
  })
}

export async function getLedgerSummary(token, params = {}) {
  const search = new URLSearchParams()

  if (params.from_date) {
    search.set("from_date", params.from_date)
  }

  if (params.to_date) {
    search.set("to_date", params.to_date)
  }

  const query = search.toString()

  return request(
    `/admin/ledger/summary${query ? `?${query}` : ""}`,
    {
      token,
    },
  )
}

export async function getLedgerEntry(token, entryId) {
  return request(`/admin/ledger/${entryId}`, {
    token,
  })
}
export async function createSaleReturn(token, saleId, returnData) {
  return request(`/sales/${saleId}/returns`, {
    method: "POST",
    token,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(returnData),
  })
}
export async function getSalesReport(token, params = {}) {
  const search = new URLSearchParams()

  if (params.from_date) {
    search.set("from_date", params.from_date)
  }

  if (params.to_date) {
    search.set("to_date", params.to_date)
  }

  const query = search.toString()

  return request(
    `/admin/reports/sales${query ? `?${query}` : ""}`,
    {
      token,
    },
  )
}

export async function getStockReport(token) {
  return request("/admin/reports/stock", {
    token,
  })
}
export default {
  request,
  login,
  getCurrentUser,
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getSuppliers,
  getStaff,
  createStaff,
  updateStaff,
  updateStaffStatus,
  resetStaffPassword,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getPurchases,
  createPurchase,
  getSupplierPayments,
  createSupplierPayment,
  getSupplierPayment,
  getSupplierDues,
  getSales,
  getSale,
  getBillingProducts,
  createSale,
  createSaleReturn,
  getLedger,
  getLedgerSummary,
  getLedgerEntry,
  getSalesReport,
  getStockReport,
}
