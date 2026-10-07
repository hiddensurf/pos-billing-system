import test from "node:test"
import assert from "node:assert/strict"
import { loadDashboardData } from "../src/pages/admin/dashboardData.js"

test("dashboard preserves products and sales if dues fail", async () => {
  const result = await loadDashboardData([
    Promise.resolve([{ id: 1 }]),
    Promise.resolve({ total_sales: "900" }),
    Promise.reject(new Error("dues unavailable")),
  ])
  assert.equal(result.products.length, 1)
  assert.equal(result.sales.total_sales, "900")
  assert.equal(result.dues, null)
  assert.equal(result.hasErrors, true)
})

test("dashboard uses aggregate dues when all requests succeed", async () => {
  const result = await loadDashboardData([
    Promise.resolve([]), Promise.resolve({ total_sales: "0" }),
    Promise.resolve({ outstanding_amount: "200", supplier_count: 2 }),
  ])
  assert.equal(result.dues.outstanding_amount, "200")
  assert.equal(result.hasErrors, false)
})
