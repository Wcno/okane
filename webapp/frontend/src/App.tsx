import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { EnConstruccion } from './pages/EnConstruccion'
import { Menu } from './pages/Menu'
import { Panel } from './pages/Panel'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Panel />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="*" element={<EnConstruccion />} />
      </Route>
    </Routes>
  )
}
