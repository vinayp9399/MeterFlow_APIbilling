import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PaymentModalProvider } from './context/PaymentModalContext'
import Layout from './components/layout/Layout'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import AdminApis from './pages/admin/AdminApis'

// Provider pages
import ProviderDashboard from './pages/provider/ProviderDashboard'
import ApisPage from './pages/provider/ApisPage'
import ApiDetailPage from './pages/provider/ApiDetailPage'
import UsagePage from './pages/provider/UsagePage'

// Consumer pages
import ConsumerDashboard from './pages/consumer/ConsumerDashboard'
import BrowseApis from './pages/consumer/BrowseApis'
import MySubscriptions from './pages/consumer/MySubscriptions'
import ConsumerBillingPage from './pages/consumer/BillingPage'

// Shared
import GatewayPage from './pages/GatewayPage'

const Spinner = () => (
  <div className="min-h-screen bg-surface-900 flex items-center justify-center">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-400 text-sm">Loading MeterFlow...</p>
    </div>
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return user ? children : <Navigate to="/login" replace />
}

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  return !user ? children : <Navigate to="/dashboard" replace />
}

const RoleDashboard = () => {
  const { user } = useAuth()
  if (user?.role === 'admin')    return <Navigate to="/admin/dashboard"    replace />
  if (user?.role === 'provider') return <Navigate to="/provider/dashboard" replace />
  return <Navigate to="/consumer/dashboard" replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="dashboard" element={<RoleDashboard />} />

        {/* Admin */}
        <Route path="admin/dashboard" element={<AdminDashboard />} />
        <Route path="admin/users"     element={<AdminUsers />} />
        <Route path="admin/apis"      element={<AdminApis />} />

        {/* Provider — no billing */}
        <Route path="provider/dashboard" element={<ProviderDashboard />} />
        <Route path="provider/apis"      element={<ApisPage />} />
        <Route path="provider/apis/:id"  element={<ApiDetailPage />} />
        <Route path="provider/usage"     element={<UsagePage />} />

        {/* Consumer — billing lives here */}
        <Route path="consumer/dashboard"     element={<ConsumerDashboard />} />
        <Route path="consumer/browse"        element={<BrowseApis />} />
        <Route path="consumer/subscriptions" element={<MySubscriptions />} />
        <Route path="consumer/billing"       element={<ConsumerBillingPage />} />

        {/* Shared */}
        <Route path="gateway" element={<GatewayPage />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PaymentModalProvider>
          <AppRoutes />
        </PaymentModalProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
