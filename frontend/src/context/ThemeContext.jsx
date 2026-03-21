import { createContext, useContext, useState, useEffect } from 'react'
const ThemeCtx = createContext(null)
export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem('erp_theme') === 'dark')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('erp_theme', dark ? 'dark' : 'light')
  }, [dark])
  return <ThemeCtx.Provider value={{ dark, toggle: () => setDark(p => !p) }}>{children}</ThemeCtx.Provider>
}
export const useTheme = () => useContext(ThemeCtx)
