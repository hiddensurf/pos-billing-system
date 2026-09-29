import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"

import {
  getCurrentUser,
  login as loginRequest,
} from "../api/client"

const AuthContext = createContext(null)

const TOKEN_KEY = "pos_access_token"

export function AuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY),
  )

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function restoreSession() {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const currentUser = await getCurrentUser(token)
        setUser(currentUser)
      } catch {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [token])

  async function login(username, password) {
    const data = await loginRequest(username, password)

    localStorage.setItem(TOKEN_KEY, data.access_token)
    setToken(data.access_token)

    const currentUser = await getCurrentUser(data.access_token)
    setUser(currentUser)

    return currentUser
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }

  const value = {
    token,
    user,
    loading,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error(
      "useAuth must be used inside an AuthProvider",
    )
  }

  return context
}

