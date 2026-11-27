import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import ChatDashboard from './pages/ChatDashboard'
import LoginPage from './pages/LoginPage'
import AdminRoute from './components/AdminRoute'
import AdminPanelPage from './pages/AdminPanelPage'
import PaymentPlansPage from './pages/PaymentPlansPage'
import RegisterPage from './pages/RegisterPage'
import UsageDashboardPage from './pages/UsageDashboardPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import EmailVerifiedPage from './pages/EmailVerifiedPage'

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return <div className="min-h-full bg-slate-950 text-slate-300 p-8">Loading...</div>
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <LoginPage />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <RegisterPage />
              </PublicOnly>
            }
          />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/email-verified" element={<EmailVerifiedPage />} />
          <Route path="/" element={<ChatDashboard />} />
          <Route
            path="/plans"
            element={
              <ProtectedRoute>
                <PaymentPlansPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usage"
            element={
              <ProtectedRoute>
                <UsageDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPanelPage />
              </AdminRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}