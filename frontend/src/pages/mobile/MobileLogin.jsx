import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"

import { useAuth } from "../../auth/AuthContext"

export default function MobileLogin() {
  const {
    login,
    user,
    isAuthenticated,
    loading: authLoading,
  } = useAuth()

  const navigate = useNavigate()

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
      if (user.role === "admin") {
        navigate("/m", { replace: true })
      } else {
        navigate("/unauthorized", { replace: true })
      }
    }
  }, [
    authLoading,
    isAuthenticated,
    user,
    navigate,
  ])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <p className="text-slate-600">
          Loading...
        </p>
      </div>
    )
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSubmitting(true)

    try {
      const currentUser = await login(
        username,
        password,
      )

      if (currentUser.role !== "admin") {
        setError(
          "The mobile Admin Portal is available only to admin users.",
        )
        return
      }

      navigate("/m", { replace: true })
    } catch (err) {
      setError(
        err.message ||
          "Unable to sign in. Please check your credentials.",
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 px-4">
      <div className="mx-auto flex min-h-screen max-w-md items-center">
        <div className="w-full rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-bold text-white">
              POS
            </div>

            <h1 className="mt-5 text-2xl font-bold text-slate-900">
              Admin Portal
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Mobile sign in
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label
                htmlFor="mobile-username"
                className="block text-sm font-medium text-slate-700"
              >
                Username
              </label>

              <input
                id="mobile-username"
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                required
                autoComplete="username"
                className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label
                htmlFor="mobile-password"
                className="block text-sm font-medium text-slate-700"
              >
                Password
              </label>

              <input
                id="mobile-password"
                type="password"
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                required
                autoComplete="current-password"
                className="mt-1 h-12 w-full rounded-xl border border-slate-300 px-4 outline-none focus:border-slate-500"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-12 w-full rounded-xl bg-slate-900 px-4 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? "Signing in..."
                : "Sign in"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500">
            Admin account required
          </div>
        </div>
      </div>
    </div>
  )
}
