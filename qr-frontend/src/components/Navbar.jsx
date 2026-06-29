import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import {
  QrCode,
  LayoutDashboard,
  CreditCard,
  Folder,
  LogOut,
  Menu,
  X,
  Plus,
  User,
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
          'flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-bold transition',
          isActive
            ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
            : 'text-ink-500 hover:bg-ink-100 hover:text-ink-950'
        )
      }
    >
      <Icon size={17} />
      <span>{label}</span>
    </NavLink>
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-white/80 backdrop-blur-xl">
      <div className="container">
        <div className="flex h-16 items-center justify-between gap-3">
          <Link to="/dashboard" className="flex items-center gap-2 font-black tracking-tight text-brand-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
              <QrCode size={22} />
            </span>
            <span className="hidden text-lg sm:inline">QR Service</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {links.map(navItem)}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button to="/create" size="sm">
              <Plus size={16} /> Nuevo QR
            </Button>

            <div className="flex max-w-[210px] items-center gap-2 rounded-2xl border border-ink-200 bg-white px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ink-100 text-ink-600">
                <User size={15} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-bold text-ink-800">{user?.full_name || 'Usuario'}</p>
                <p className="truncate text-[11px] text-ink-400">{user?.email}</p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="rounded-2xl p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-600"
              title="Cerrar sesión"
            >
              <LogOut size={19} />
            </button>
          </div>

          <button
            className="rounded-2xl p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="border-t border-ink-100 py-4 lg:hidden">
            <div className="grid gap-2">
              {links.map(navItem)}
              <Button to="/create" onClick={() => setOpen(false)} className="mt-2 w-full">
                <Plus size={16} /> Nuevo QR
              </Button>
              <button
                onClick={handleLogout}
                className="mt-1 flex items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700"
              >
                <LogOut size={16} /> Cerrar sesión
              </button>
            </div>
          </div>
        )}
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-50 grid grid-cols-4 gap-2 rounded-3xl border border-white/70 bg-white/90 p-2 shadow-soft backdrop-blur-xl lg:hidden">
        {[
          ...links,
          { to: '/create', label: 'Crear', icon: Plus },
        ].map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cx(
                'flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition',
                isActive ? 'bg-brand-700 text-white' : 'text-ink-500 hover:bg-ink-100'
              )
            }
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </header>
  )
}
