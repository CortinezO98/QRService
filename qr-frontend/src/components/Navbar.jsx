/**
 * Navbar.jsx — Sprint 3: agrega enlace a Campañas.
 */
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { QrCode, LayoutDashboard, CreditCard, Folder, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const links = [
    { to: '/dashboard',  label: 'Dashboard',  icon: LayoutDashboard },
    { to: '/campaigns',  label: 'Campañas',   icon: Folder },
    { to: '/billing',    label: 'Planes',      icon: CreditCard },
  ]

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 font-bold text-violet-600">
          <QrCode size={22} />
          <span className="hidden sm:inline">QR Service</span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => {
            const active = location.pathname.startsWith(to)
            return (
              <Link
                key={to}
                to={to}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                  ${active
                    ? 'bg-violet-50 text-violet-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
              >
                <Icon size={16} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            )
          })}
        </div>

        {/* User + logout */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 hidden md:inline truncate max-w-[120px]">
            {user?.full_name || user?.email}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
            <span className="hidden sm:inline">Salir</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
