import { Navigate, Outlet } from "react-router-dom"

import { useAuth } from "./AuthContext"

export default function ProtectedRoute({ allowedRoles }) {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-600">
          Loading...
        </p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (
    allowedRoles &&
    !allowedRoles.includes(user.role)
  ) {
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
