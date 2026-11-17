import { Navigate, Route, Routes } from 'react-router-dom'
import { GuestOnly, RequireSession, SessionGate } from './auth/routes'
import { AppShell } from './components/AppShell'
import { AccountCreate } from './pages/AccountCreate'
import { AccountDelete } from './pages/AccountDelete'
import { AccountEdit } from './pages/AccountEdit'
import { Accounts } from './pages/Accounts'
import { ChangePassword } from './pages/ChangePassword'
import { Dashboard } from './pages/Dashboard'
import { ExpenseCreate } from './pages/ExpenseCreate'
import { ExpenseDelete } from './pages/ExpenseDelete'
import { ExpenseEdit } from './pages/ExpenseEdit'
import { Expenses } from './pages/Expenses'
import { IncomeCreate } from './pages/IncomeCreate'
import { IncomeDelete } from './pages/IncomeDelete'
import { IncomeEdit } from './pages/IncomeEdit'
import { Incomes } from './pages/Incomes'
import { ForgotPassword } from './pages/ForgotPassword'
import { Login } from './pages/Login'
import { Logout } from './pages/Logout'
import { Menu } from './pages/Menu'
import { Register } from './pages/Register'
import { ResetPassword } from './pages/ResetPassword'
import { UnderConstruction } from './pages/UnderConstruction'
import { UserDelete } from './pages/UserDelete'

export default function App() {
  return (
    <Routes>
      <Route element={<SessionGate />}>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="/logout" element={<Logout />} />
        {/* Open with or without a session: a mailed link must work on any browser. */}
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route element={<RequireSession />}>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/accounts/create" element={<AccountCreate />} />
            <Route path="/accounts/:id/edit" element={<AccountEdit />} />
            <Route path="/accounts/:id/delete" element={<AccountDelete />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/create" element={<ExpenseCreate />} />
            <Route path="/expenses/:id/edit" element={<ExpenseEdit />} />
            <Route path="/expenses/:id/delete" element={<ExpenseDelete />} />
            <Route path="/incomes" element={<Incomes />} />
            <Route path="/incomes/create" element={<IncomeCreate />} />
            <Route path="/incomes/:id/edit" element={<IncomeEdit />} />
            <Route path="/incomes/:id/delete" element={<IncomeDelete />} />
            <Route path="/profile/change-password" element={<ChangePassword />} />
            <Route path="/profile/delete" element={<UserDelete />} />
            <Route path="*" element={<UnderConstruction />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}
