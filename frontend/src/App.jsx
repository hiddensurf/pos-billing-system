import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom"

import { AuthProvider } from "./auth/AuthContext"
import ProtectedRoute from "./auth/ProtectedRoute"
import Login from "./pages/Login"
import Products from "./pages/admin/Products"
import AdminLayout from "./pages/admin/AdminLayout"
import AdminDashboard from "./pages/admin/AdminDashboard"
import Categories from "./pages/admin/Categories"
import Suppliers from "./pages/admin/Suppliers"
import Staff from "./pages/admin/Staff"
import Purchases from "./pages/admin/Purchases"
import SupplierPayments from "./pages/admin/SupplierPayments"
import Sales from "./pages/admin/Sales"
import Returns from "./pages/admin/Returns"
import Ledger from "./pages/admin/Ledger"
import Billing from "./pages/Billing"
import Reports from "./pages/admin/Reports"
import MobileAdminLayout from "./pages/mobile/MobileAdminLayout"
import MobileLogin from "./pages/mobile/MobileLogin"

function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-slate-900">
          403
        </h1>

        <p className="mt-2 text-slate-600">
          You do not have permission to access this page.
        </p>
      </div>
    </div>
  )
}

function AdminRoutes() {
  return (
    <ProtectedRoute allowedRoles={["admin"]} />
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Desktop Login */}
      <Route
        path="/login"
        element={<Login />}
      />

      {/* Mobile Admin Login */}
      <Route
        path="/m/login"
        element={<MobileLogin />}
      />

      {/* Desktop Admin Portal */}
      <Route element={<AdminRoutes />}>
        <Route
          path="/admin"
          element={<AdminLayout />}
        >
          <Route
            index
            element={<AdminDashboard />}
          />

          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="categories"
            element={<Categories />}
          />

          <Route
            path="suppliers"
            element={<Suppliers />}
          />

          <Route
            path="staff"
            element={<Staff />}
          />

          <Route
            path="purchases"
            element={<Purchases />}
          />

          <Route
            path="supplier-payments"
            element={<SupplierPayments />}
          />

          <Route
            path="sales"
            element={<Sales />}
          />

          <Route
            path="returns"
            element={<Returns />}
          />

          <Route
            path="ledger"
            element={<Ledger />}
          />

          <Route
            path="reports"
            element={<Reports />}
          />
        </Route>
      </Route>

      {/* Mobile Admin Portal */}
      <Route element={<AdminRoutes />}>
        <Route
          path="/m"
          element={<MobileAdminLayout />}
        >
          <Route
            index
            element={<AdminDashboard />}
          />

          <Route
            path="products"
            element={<Products />}
          />

          <Route
            path="categories"
            element={<Categories />}
          />

          <Route
            path="suppliers"
            element={<Suppliers />}
          />

          <Route
            path="staff"
            element={<Staff />}
          />

          <Route
            path="purchases"
            element={<Purchases />}
          />

          <Route
            path="supplier-payments"
            element={<SupplierPayments />}
          />

          <Route
            path="sales"
            element={<Sales />}
          />

          <Route
            path="returns"
            element={<Returns />}
          />

          <Route
            path="ledger"
            element={<Ledger />}
          />

          <Route
            path="reports"
            element={<Reports />}
          />
        </Route>
      </Route>

      {/* Billing Portal */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["staff"]}
          />
        }
      >
        <Route
          path="/billing"
          element={<Billing />}
        />
      </Route>

      {/* Unauthorized */}
      <Route
        path="/unauthorized"
        element={<Unauthorized />}
      />

      {/* Catch-all */}
      <Route
        path="*"
        element={<Navigate to="/login" replace />}
      />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}