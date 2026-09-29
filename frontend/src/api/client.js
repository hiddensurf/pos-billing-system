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
}
