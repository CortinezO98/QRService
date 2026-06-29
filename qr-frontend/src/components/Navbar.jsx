import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  QrCode, LayoutDashboard, CreditCard, Folder,
  LogOut, Menu, X, Plus, User,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth.jsx'
import { cx } from '../lib/format'
import Button from './ui/Button'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/campaigns', label: 'Campañas', icon: Folder },
    { to: '/billing', label: 'Planes', icon: CreditCard },
  ]

  const navItem = ({ to, label, icon: Icon }) => (
    <NavLink
      key={to}
      to={to}
      onClick={() => setOpen(false)}
      className={({ isActive }) =>
        cx(
          'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-150',
          isActive
            ? 'bg-brand-600 text-white shadow-glow-sm'
            : 'text-ink-500 hover:bg-ink-100 hover:text-ink-900'
        )
      }
    >
      <Icon size={16} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200/60 bg-white/90 backdrop-blur-xl">
      <div className="container">
        <div className="flex h-15 items-center justify-between gap-4 py-3">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2.5 font-black tracking-tight text-brand-700">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-glow-sm">
              <QrCode size={19} />
            </span>
            <span className="hidden text-base sm:inline">QR Service</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 lg:flex">
            {links.map(navItem)}
          </nav>

          {/* Desktop right */}
          <div className="hidden items-center gap-2 lg:flex">
            <Button to="/create" size="sm">
              <Plus size={15} /> Nuevo QR
            </Button>

            <div className="flex max-w-[200px] items-center gap-2 rounded-xl border border-ink-200 bg-ink-50 px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-700">
                <User size={14} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink-800">{user?.full_name || 'Usuario'}</p>
                <p className="truncate text-[11px] font-medium text-ink-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-xl p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
              title="Cerrar sesión"
            >
              <LogOut size={17} />
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-xl p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>

        {/* Mobile dropdown */}
        {open && (
          <div className="border-t border-ink-100 py-4 lg:hidden">
            <div className="grid gap-1">
              {links.map(navItem)}
            </div>
            <div className="mt-3 grid gap-2 border-t border-ink-100 pt-3">
              <Button to="/create" onClick={() => setOpen(false)} className="w-full">
                <Plus size={15} /> Nuevo QR
              </Button>
              <button
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <LogOut size={15} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-1.5 rounded-2xl border border-ink-200/70 bg-white/95 p-1.5 shadow-soft backdrop-blur-xl lg:hidden">
        {[...links, { to: '/create', label: 'Crear', icon: Plus }].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] font-bold transition',
                isActive ? 'bg-brand-700 text-white' : 'text-ink-500 hover:bg-ink-100'
              )
            }
          >
            <Icon size={17} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
