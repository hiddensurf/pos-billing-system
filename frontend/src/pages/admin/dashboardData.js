// Keep successful cards when another independent data request fails.
export async function loadDashboardData(requests) {
  const results = await Promise.allSettled(requests)
  return {
    products: results[0].status === "fulfilled" ? results[0].value : null,
    sales: results[1].status === "fulfilled" ? results[1].value : null,
    dues: results[2].status === "fulfilled" ? results[2].value : null,
    hasErrors: results.some((result) => result.status === "rejected"),
  }
}
