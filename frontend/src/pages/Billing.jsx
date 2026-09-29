import { useEffect, useMemo, useState } from "react"
import {
  createSale,
  getBillingProducts,
  getSales,
} from "../api/client"
import { useAuth } from "../auth/AuthContext"

export default function Billing() {
  const { token } = useAuth()

  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [search, setSearch] = useState("")
  const [discount, setDiscount] = useState("0")
  const [paymentMethod, setPaymentMethod] = useState("cash")
  const [cashTendered, setCashTendered] = useState("")
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState("")
  const [paymentError, setPaymentError] = useState("")
  const [completedSale, setCompletedSale] = useState(null)
  const [todaySales, setTodaySales] = useState([])

  useEffect(() => {
    async function loadProducts() {
      try {
        setLoading(true)
        setError("")

        const data = await getBillingProducts(token)
        setProducts(data)
      } catch (err) {
        setError(err.message || "Failed to load products")
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      loadProducts()
    }
  }, [token])

  useEffect(() => {
  async function loadTodaySales() {
    try {
      const data = await getSales(token)

      const today = new Date().toLocaleDateString()

      const salesToday = data.filter((sale) => {
        return (
          new Date(sale.created_at).toLocaleDateString() ===
          today
        )
      })

      setTodaySales(salesToday)
    } catch (err) {
      console.error("Failed to load today's bills:", err)
    }
  }

  if (token) {
    loadTodaySales()
  }
}, [token])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()

    if (!query) {
      return products
    }

    return products.filter((product) =>
      [
        product.name,
        product.sku,
        product.barcode,
      ].some((value) =>
        value?.toLowerCase().includes(query),
      ),
    )
  }, [products, search])

  function addToCart(product) {
    setPaymentError("")

    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === product.id,
      )

      if (existingItem) {
        if (
          existingItem.quantity >=
          product.stock_quantity
        ) {
          return currentCart
        }

        return currentCart.map((item) =>
          item.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item,
        )
      }

      return [
        ...currentCart,
        {
          ...product,
          quantity: 1,
        },
      ]
    })
  }

  function increaseQuantity(productId) {
    setPaymentError("")

    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) {
          return item
        }

        if (item.quantity >= item.stock_quantity) {
          return item
        }

        return {
          ...item,
          quantity: item.quantity + 1,
        }
      }),
    )
  }

  function decreaseQuantity(productId) {
    setPaymentError("")

    setCart((currentCart) =>
      currentCart
        .map((item) => {
          if (item.id !== productId) {
            return item
          }

          return {
            ...item,
            quantity: item.quantity - 1,
          }
        })
        .filter((item) => item.quantity > 0),
    )
  }

  function removeFromCart(productId) {
    setPaymentError("")

    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.id !== productId,
      ),
    )
  }

  const subtotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        Number(item.selling_price) * item.quantity,
      0,
    )
  }, [cart])

  const discountAmount = Math.max(
    0,
    Number(discount) || 0,
  )

  const total = Math.max(
    0,
    subtotal - discountAmount,
  )

  const cashAmount = Number(cashTendered) || 0

  const changeDue =
    paymentMethod === "cash"
      ? Math.max(0, cashAmount - total)
      : 0

  const cartItemCount = useMemo(() => {
    return cart.reduce(
      (count, item) => count + item.quantity,
      0,
    )
  }, [cart])

  async function handlePay() {
    setPaymentError("")

    if (cart.length === 0) {
      setPaymentError(
        "Add at least one product to the cart.",
      )
      return
    }

    if (discountAmount > subtotal) {
      setPaymentError(
        "Discount cannot be greater than the subtotal.",
      )
      return
    }

    if (
      paymentMethod === "cash" &&
      cashAmount < total
    ) {
      setPaymentError(
        `Cash tendered must be at least ₹${total.toFixed(
          2,
        )}.`,
      )
      return
    }

    const saleData = {
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        discount: "0.00",
      })),
      discount: discountAmount.toFixed(2),
      payment_method: paymentMethod,
      cash_tendered:
        paymentMethod === "cash"
          ? cashAmount.toFixed(2)
          : "0.00",
    }

    try {
      setPaying(true)

      const sale = await createSale(
        token,
        saleData,
      )

      setCompletedSale(sale)
      setCart([])
      setDiscount("0")
      setCashTendered("")

      const refreshedProducts =
        await getBillingProducts(token)

      setProducts(refreshedProducts)
      const updatedSales = await getSales(token)

      const today = new Date().toLocaleDateString()

      setTodaySales(
        updatedSales.filter(
          (sale) =>
            new Date(sale.created_at).toLocaleDateString() ===
            today,
        ),
      )
    } catch (err) {
      if (err.status === 409) {
        setPaymentError(
          err.message ||
            "The sale could not be completed because of a stock conflict.",
        )
      } else {
        setPaymentError(
          err.message ||
            "Failed to complete the sale.",
        )
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="border-b bg-white px-6 py-4">
        <div className="mx-auto max-w-7xl">
          <h1 className="text-2xl font-bold text-slate-900">
            Billing Portal
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Create and complete customer bills
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Products */}
          <section className="lg:col-span-2">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search by product name, SKU or barcode..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-slate-500"
              />
            </div>

            {loading && (
              <div className="rounded-lg bg-white p-6 text-slate-500">
                Loading products...
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
                {error}
              </div>
            )}

            {!loading && !error && (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredProducts.map((product) => {
                  const cartItem = cart.find(
                    (item) => item.id === product.id,
                  )

                  const cartQuantity =
                    cartItem?.quantity || 0

                  const canAdd =
                    product.stock_quantity >
                    cartQuantity

                  return (
                    <div
                      key={product.id}
                      className="rounded-xl bg-white p-5 shadow-sm"
                    >
                      <h2 className="font-semibold text-slate-900">
                        {product.name}
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        SKU: {product.sku}
                      </p>

                      {product.barcode && (
                        <p className="text-sm text-slate-500">
                          Barcode: {product.barcode}
                        </p>
                      )}

                      <div className="mt-4 flex items-end justify-between">
                        <div>
                          <p className="text-lg font-bold text-slate-900">
                            ₹
                            {Number(
                              product.selling_price,
                            ).toFixed(2)}
                          </p>

                          <p className="text-sm text-slate-500">
                            Stock:{" "}
                            {product.stock_quantity}{" "}
                            {product.unit}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            addToCart(product)
                          }
                          disabled={!canAdd}
                          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {cartQuantity > 0
                            ? `Add (${cartQuantity})`
                            : "Add"}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!loading &&
              !error &&
              filteredProducts.length === 0 && (
                <div className="rounded-lg bg-white p-8 text-center text-slate-500">
                  No products found.
                </div>
              )}
          </section>

          {/* Cart */}
          <section className="h-fit rounded-xl bg-white shadow-sm">
            <div className="border-b px-5 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Cart
                </h2>

                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
                  {cartItemCount}{" "}
                  {cartItemCount === 1
                    ? "item"
                    : "items"}
                </span>
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                Cart is empty.
                <br />
                Add products to begin billing.
              </div>
            ) : (
              <>
                <div className="divide-y">
                  {cart.map((item) => {
                    const itemTotal =
                      Number(item.selling_price) *
                      item.quantity

                    return (
                      <div
                        key={item.id}
                        className="p-5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-medium text-slate-900">
                              {item.name}
                            </h3>

                            <p className="mt-1 text-sm text-slate-500">
                              ₹
                              {Number(
                                item.selling_price,
                              ).toFixed(2)}{" "}
                              × {item.quantity}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              removeFromCart(item.id)
                            }
                            className="text-sm font-medium text-red-600 hover:text-red-700"
                          >
                            Remove
                          </button>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center rounded-lg border border-slate-300">
                            <button
                              type="button"
                              onClick={() =>
                                decreaseQuantity(
                                  item.id,
                                )
                              }
                              className="px-3 py-2 text-lg font-medium text-slate-700 hover:bg-slate-100"
                            >
                              −
                            </button>

                            <span className="min-w-10 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() =>
                                increaseQuantity(
                                  item.id,
                                )
                              }
                              disabled={
                                item.quantity >=
                                item.stock_quantity
                              }
                              className="px-3 py-2 text-lg font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
                            >
                              +
                            </button>
                          </div>

                          <p className="font-semibold text-slate-900">
                            ₹
                            {itemTotal.toFixed(2)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Payment */}
                <div className="space-y-4 border-t p-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={discount}
                      onChange={(event) =>
                        setDiscount(
                          event.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-700">
                      Payment Method
                    </label>

                    <select
                      value={paymentMethod}
                      onChange={(event) => {
                        setPaymentMethod(
                          event.target.value,
                        )

                        if (
                          event.target.value !==
                          "cash"
                        ) {
                          setCashTendered("")
                        }
                      }}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-slate-500"
                    >
                      <option value="cash">
                        Cash
                      </option>
                      <option value="card">
                        Card
                      </option>
                      <option value="upi">
                        UPI
                      </option>
                    </select>
                  </div>

                  {paymentMethod === "cash" && (
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        Cash Tendered
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={cashTendered}
                        onChange={(event) =>
                          setCashTendered(
                            event.target.value,
                          )
                        }
                        placeholder="0.00"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                      />
                    </div>
                  )}

                  {paymentError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {paymentError}
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span>
                        ₹{subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Discount</span>
                      <span>
                        -₹{discountAmount.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-lg font-bold text-slate-900">
                      <span>Total</span>
                      <span>
                        ₹{total.toFixed(2)}
                      </span>
                    </div>

                    {paymentMethod === "cash" && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Change Due</span>
                        <span>
                          ₹{changeDue.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handlePay}
                    disabled={paying}
                    className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                  >
                    {paying
                      ? "Processing..."
                      : "Pay"}
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* My Bills Today */}
      <section className="mx-auto mt-6 max-w-7xl rounded-xl bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                My Bills Today
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Bills created by you today
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600">
              {todaySales.length}{" "}
              {todaySales.length === 1
                ? "bill"
                : "bills"}
            </span>
          </div>
        </div>

        {todaySales.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            No bills created today.
          </div>
        ) : (
          <div className="divide-y">
            {todaySales.map((sale) => (
              <div
                key={sale.id}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {sale.bill_number}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {new Date(
                      sale.created_at,
                    ).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-xs text-slate-500">
                      Payment
                    </p>

                    <p className="text-sm font-medium capitalize text-slate-900">
                      {sale.payment_method}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-500">
                      Total
                    </p>

                    <p className="font-bold text-slate-900">
                      ₹
                      {Number(
                        sale.total_amount,
                      ).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Receipt Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 print:bg-white print:p-0">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl print:max-w-none print:w-[80mm] print:shadow-none">
            <div className="border-b px-6 py-4 print:border-b print:px-2 print:py-2">
              <h2 className="text-xl font-bold text-slate-900">
                Payment Successful
              </h2>
            </div>

            <div className="space-y-4 p-6 print:space-y-2 print:p-2">
              <div className="text-center">
                <p className="text-sm text-slate-500">
                  Bill Number
                </p>

                <p className="text-xl font-bold text-slate-900">
                  {completedSale.bill_number}
                </p>
              </div>

              <div className="divide-y border-y">
                {completedSale.items.map(
                  (item) => {
                    const product =
                      products.find(
                        (p) =>
                          p.id ===
                          item.product_id,
                      )

                    return (
                      <div
                        key={item.id}
                        className="flex justify-between py-3 text-sm"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {product?.name ||
                              `Product #${item.product_id}`}
                          </p>

                          <p className="text-slate-500">
                            {item.quantity} × ₹
                            {Number(
                              item.unit_price,
                            ).toFixed(2)}
                          </p>
                        </div>

                        <p className="font-medium">
                          ₹
                          {Number(
                            item.total_amount,
                          ).toFixed(2)}
                        </p>
                      </div>
                    )
                  },
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>
                    ₹
                    {Number(
                      completedSale.subtotal,
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Discount</span>
                  <span>
                    -₹
                    {Number(
                      completedSale.discount,
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>
                    ₹
                    {Number(
                      completedSale.total_amount,
                    ).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span>Payment</span>
                  <span className="capitalize">
                    {completedSale.payment_method}
                  </span>
                </div>

                {completedSale.payment_method ===
                  "cash" && (
                  <div className="flex justify-between text-sm">
                    <span>Change</span>
                    <span>
                      ₹
                      {Number(
                        completedSale.change_due,
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 border-t p-6 print:hidden">
              <button
                type="button"
                onClick={() =>
                  setCompletedSale(null)
                }
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700"
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white"
              >
                Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}