import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireSession, SessionGate } from './auth/routes'
import { AppShell } from './components/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Login } from './pages/Login'
import { Logout } from './pages/Logout'
import { Menu } from './pages/Menu'
import { Register } from './pages/Register'
import { UnderConstruction } from './pages/UnderConstruction'

export default function App() {
  return (
    <Routes>
      <Route element={<SessionGate />}>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="/logout" element={<Logout />} />
        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="*" element={<UnderConstruction />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
