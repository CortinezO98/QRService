import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CreateQR from './pages/CreateQR'
import Billing from './pages/Billing'
import LandingPage from './pages/LandingPage'
import OAuthCallback from './pages/OAuthCallback'
import Navbar from './components/Navbar'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600" />
    </div>
  )
  return user ? children : <Navigate to="/" />
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <>
      {user && <Navbar />}
      <Routes>
        {/* OAuth callback — SIEMPRE accesible, sin importar si hay sesión */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Públicas — redirigen al dashboard si ya hay sesión */}
        <Route path="/"         element={user ? <Navigate to="/dashboard" /> : <LandingPage />} />
        <Route path="/login"    element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />

        {/* Protegidas */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/create"    element={<PrivateRoute><CreateQR /></PrivateRoute>} />
        <Route path="/billing"   element={<PrivateRoute><Billing /></PrivateRoute>} />
        <Route path="*"          element={<Navigate to="/" />} />
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
