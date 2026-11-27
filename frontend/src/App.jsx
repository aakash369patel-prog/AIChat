import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ChatDashboard from './pages/ChatDashboard'
import LoginPage from './pages/LoginPage'
import AdminRoute from './components/AdminRoute'
import AdminPanelPage from './pages/AdminPanelPage'
import PaymentPlansPage from './pages/PaymentPlansPage'
import RegisterPage from './pages/RegisterPage'
import PageSeo from './components/PageSeo'

function PublicOnly({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-full bg-[var(--chat-bg)] p-8 text-[var(--chat-text-muted)]">Loading...</div>
    )
  }
  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <BrowserRouter>
        <PageSeo />
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
    </ThemeProvider>
  )
}