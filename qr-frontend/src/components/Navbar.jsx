import { Link, useLocation } from 'react-router-dom'
import { QrCode, LayoutDashboard, CreditCard, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()

  const nav = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/create', icon: QrCode, label: 'Crear QR' },
    { to: '/billing', icon: CreditCard, label: 'Plan' },
  ]

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-violet-600 text-lg">
          <QrCode size={22} /> QR Service
        </Link>
        <div className="flex items-center gap-1">
          {nav.map(({ to, icon: Icon, label }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${pathname === to
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
            >
              <Icon size={16} /> {label}
            </Link>
          ))}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors ml-2"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>
    </nav>
  )
}
