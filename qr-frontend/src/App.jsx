import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateQR from './pages/CreateQR'
import QRDetail from './pages/QRDetail'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Billing from './pages/Billing'
import BillingSuccess from './pages/BillingSuccess'
import BillingCancel from './pages/BillingCancel'
import LandingPage from './pages/LandingPage'
import OAuthCallback from './pages/OAuthCallback'
import AppShell from './components/AppShell'
import LoadingScreen from './components/ui/LoadingScreen'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen label="Validando sesión..." />

  return user ? <AppShell>{children}</AppShell> : <Navigate to="/login" replace />
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <LoadingScreen label="Cargando portal..." />

  return user ? <Navigate to="/dashboard" replace /> : children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/oauth/callback" element={<OAuthCallback />} />

      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/create" element={<PrivateRoute><CreateQR /></PrivateRoute>} />
      <Route path="/qr/:id" element={<PrivateRoute><QRDetail /></PrivateRoute>} />
      <Route path="/campaigns" element={<PrivateRoute><Campaigns /></PrivateRoute>} />
      <Route path="/campaigns/:id" element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
      <Route path="/billing" element={<PrivateRoute><Billing /></PrivateRoute>} />
      <Route path="/billing/success" element={<PrivateRoute><BillingSuccess /></PrivateRoute>} />
      <Route path="/billing/cancel" element={<PrivateRoute><BillingCancel /></PrivateRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
