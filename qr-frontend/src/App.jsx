/**
 * App.jsx — Sprint 3: rutas de campañas.
 */
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
import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
      </div>
    )
  }
  return user ? children : <Navigate to="/" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      {user && <Navbar />}
      <Routes>
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        <Route path="/"         element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

        <Route path="/dashboard"          element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/create"             element={<PrivateRoute><CreateQR /></PrivateRoute>} />
        <Route path="/qr/:id"             element={<PrivateRoute><QRDetail /></PrivateRoute>} />
        <Route path="/campaigns"          element={<PrivateRoute><Campaigns /></PrivateRoute>} />
        <Route path="/campaigns/:id"      element={<PrivateRoute><CampaignDetail /></PrivateRoute>} />
        <Route path="/billing"            element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="/billing/success"    element={<PrivateRoute><BillingSuccess /></PrivateRoute>} />
        <Route path="/billing/cancel"     element={<PrivateRoute><BillingCancel /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
