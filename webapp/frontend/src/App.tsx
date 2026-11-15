import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { UnderConstruction } from './pages/UnderConstruction'
import { Menu } from './pages/Menu'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="*" element={<UnderConstruction />} />
      </Route>
    </Routes>
  )
}
