import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'

import Login          from './pages/Login'
import AdminLayout    from './components/AdminLayout'
import ManagerLayout  from './components/ManagerLayout'

// Admin pages
import AdminDashboard  from './pages/admin/Dashboard'
import AdminWorkers    from './pages/admin/Workers'
import AdminManagers   from './pages/admin/Managers'
import AdminProducts   from './pages/admin/Products'
import AdminInventory  from './pages/admin/Inventory'
import AdminOrders     from './pages/admin/Orders'
import AdminFinance    from './pages/admin/Finance'
import AdminReports    from './pages/admin/Reports'
import AdminCompany    from './pages/admin/Company'
import AdminAttendance from './pages/admin/Attendance'
import AdminCalendar   from './pages/admin/CalendarPage'
import AdminExpenses   from './pages/admin/Expenses'
import AdminCustomers  from './pages/admin/Customers'

// Manager pages
import ManagerDashboard  from './pages/manager/Dashboard'
import ManagerAssign     from './pages/manager/AssignWork'
import ManagerOrders     from './pages/manager/Orders'
import ManagerInventory  from './pages/manager/Inventory'
import ManagerWorkers    from './pages/manager/Workers'
import ManagerReports    from './pages/manager/Reports'
import ManagerAttendance from './pages/manager/Attendance'
import ManagerCalendar   from './pages/manager/CalendarPage'
import ManagerExpenses   from './pages/manager/Expenses'
import ManagerCustomers  from './pages/manager/Customers'

function Guard({ adminOnly, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'ADMIN') return <Navigate to="/manager" replace />
  return children
}

function AppRoutes() {
  const { user } = useAuth()
  const home = user ? (user.role === 'ADMIN' ? '/admin' : '/manager') : '/login'
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={home} replace /> : <Login />} />

      <Route path="/admin" element={<Guard adminOnly><AdminLayout /></Guard>}>
        <Route index              element={<AdminDashboard />} />
        <Route path="workers"     element={<AdminWorkers />} />
        <Route path="managers"    element={<AdminManagers />} />
        <Route path="products"    element={<AdminProducts />} />
        <Route path="inventory"   element={<AdminInventory />} />
        <Route path="orders"      element={<AdminOrders />} />
        <Route path="finance"     element={<AdminFinance />} />
        <Route path="reports"     element={<AdminReports />} />
        <Route path="company"     element={<AdminCompany />} />
        <Route path="attendance"  element={<AdminAttendance />} />
        <Route path="calendar"    element={<AdminCalendar />} />
        <Route path="expenses"    element={<AdminExpenses />} />
        <Route path="customers"   element={<AdminCustomers />} />
      </Route>

      <Route path="/manager" element={<Guard><ManagerLayout /></Guard>}>
        <Route index              element={<ManagerDashboard />} />
        <Route path="assign-work" element={<ManagerAssign />} />
        <Route path="orders"      element={<ManagerOrders />} />
        <Route path="inventory"   element={<ManagerInventory />} />
        <Route path="workers"     element={<ManagerWorkers />} />
        <Route path="reports"     element={<ManagerReports />} />
        <Route path="attendance"  element={<ManagerAttendance />} />
        <Route path="calendar"    element={<ManagerCalendar />} />
        <Route path="expenses"    element={<ManagerExpenses />} />
        <Route path="customers"   element={<ManagerCustomers />} />
      </Route>

      <Route path="*" element={<Navigate to={home} replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
