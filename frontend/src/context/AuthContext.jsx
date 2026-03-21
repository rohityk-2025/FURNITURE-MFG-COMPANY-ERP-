import { createContext, useContext, useState } from 'react'
import api from '../utils/api'
const AuthContext = createContext(null)
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem('erp_user')) } catch { return null } })
  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password })
    const { token, user: u } = res.data
    localStorage.setItem('erp_token', token)
    localStorage.setItem('erp_user', JSON.stringify(u))
    setUser(u); return u
  }
  const logout = () => {
    localStorage.removeItem('erp_token'); localStorage.removeItem('erp_user')
    setUser(null); window.location.href = '/login'
  }
  const refreshUser = (u) => { const m = {...user,...u}; localStorage.setItem('erp_user', JSON.stringify(m)); setUser(m) }
  return <AuthContext.Provider value={{ user, login, logout, refreshUser }}>{children}</AuthContext.Provider>
}
export const useAuth = () => useContext(AuthContext)
