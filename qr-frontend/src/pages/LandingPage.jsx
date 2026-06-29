/**
 * LandingPage.jsx — QR Service
 * Landing page de alto impacto para conversión
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight, BarChart2, Check, ChevronDown, ChevronUp,
  Crown, Edit3, Globe, Link2, Lock, Menu, QrCode,
  RefreshCw, Shield, Smartphone, Sparkles, Star,
  Store, Users, Wifi, X, Zap, Coffee, GraduationCap,
  Briefcase, Calendar, AlertTriangle,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#casos',         label: 'Casos de uso' },
  { href: '#comparacion',   label: 'Comparación' },
  { href: '#precios',       label: 'Precios' },
  { href: '#faq',           label: 'FAQ' },
]

const STEPS = [
  {
    icon: QrCode,
    title: 'Elige el tipo de QR',
    desc: 'URL, WhatsApp, menú digital, Instagram, PDF, formulario, mapa, Wi-Fi, vCard y 40+ tipos más.',
  },
  {
    icon: Edit3,
    title: 'Personaliza y publica',
    desc: 'Define título, colores, estilo y destino. Tu QR queda listo para descargar e imprimir en segundos.',
  },
  {
    icon: BarChart2,
    title: 'Mide y mejora',
    desc: 'Consulta escaneos, edita el destino sin reimprimir y organiza tus QR por campañas.',
  },
]

const USE_CASES = [
  {
    icon: Coffee,
    title: 'Restaurantes',
    desc: 'Menús digitales, reservas, WhatsApp y reseñas de Google.',
    tags: ['Menú QR', 'Reservas', 'Google Review'],
    color: 'bg-orange-50 text-orange-600',
  },
  {
    icon: Calendar,
    title: 'Eventos',
    desc: 'Registro de asistentes, ubicación, agenda y pagos en línea.',
    tags: ['Registro', 'Agenda', 'Ubicación'],
    color: 'bg-purple-50 text-purple-600',
  },
  {
    icon: Smartphone,
    title: 'Emprendedores',
    desc: 'Instagram, TikTok, catálogo de productos y WhatsApp para ventas.',
    tags: ['Instagram', 'Catálogo', 'WhatsApp'],
    color: 'bg-pink-50 text-pink-600',
  },
  {
    icon: Briefcase,
    title: 'Empresas',
    desc: 'Campañas, formularios internos, documentos y analítica de uso.',
    tags: ['Campañas', 'Analytics', 'Documentos'],
    color: 'bg-brand-50 text-brand-700',
  },
  {
    icon: GraduationCap,
    title: 'Educación',
    desc: 'Materiales de clase, formularios, control de asistencia y recursos.',
    tags: ['Recursos', 'Formularios', 'Asistencia'],
    color: 'bg-emerald-50 text-emerald-600',
  },
  {
    icon: Users,
    title: 'Servicios profesionales',
    desc: 'vCard digital, portafolio, agenda de citas y ubicación de oficina.',
    tags: ['vCard', 'Portafolio', 'Agenda'],
    color: 'bg-sky-50 text-sky-600',
  },
]

const BENEFITS = [
  {
    icon: RefreshCw,
    title: 'URL editable',
    desc: 'Cambia el destino de tu QR en cualquier momento sin volver a imprimir.',
    color: 'bg-brand-50 text-brand-700',
  },
  {
    icon: BarChart2,
    title: 'Analytics',
    desc: 'Mide escaneos por día, tipo de dispositivo y campaña.',
    color: 'bg-emerald-50 text-emerald-700',
  },
  {
    icon: Globe,
    title: 'Campañas',
    desc: 'Agrupa QR por cliente, evento o negocio y ve métricas consolidadas.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: QrCode,
    title: 'Descarga profesional',
    desc: 'PNG en alta resolución listo para impresión en cualquier tamaño.',
    color: 'bg-amber-50 text-amber-700',
  },
  {
    icon: Shield,
    title: 'Seguro',
    desc: 'Validación de enlaces, cookies seguras y pagos con Stripe.',
    color: 'bg-red-50 text-red-700',
  },
  {
    icon: Wifi,
    title: 'Multiuso',
    desc: 'WhatsApp, Instagram, vCard, Wi-Fi, formularios, mapas y más.',
    color: 'bg-sky-50 text-sky-700',
  },
]

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    qr: '1 QR / mes',
    analytics: false,
    logo: false,
    support: 'Comunidad',
    cta: 'Empezar gratis',
    badge: null,
    highlight: false,
    icon: Zap,
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 10,
    period: '/año',
    qr: '5 QR permanentes',
    analytics: 'Básico',
    logo: false,
    support: 'Email',
    cta: 'Elegir Starter',
    badge: null,
    highlight: false,
    icon: Star,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    period: '/año',
    qr: '15 QR permanentes',
    analytics: 'Completo',
    logo: true,
    support: 'Email prioritario',
    cta: 'Elegir Pro',
    badge: 'Recomendado',
    highlight: true,
    icon: Sparkles,
  },
  {
    id: 'business',
    name: 'Business',
    price: 30,
    period: '/año',
    qr: '30 QR permanentes',
    analytics: 'Completo',
    logo: true,
    support: 'Soporte prioritario',
    cta: 'Elegir Business',
    badge: 'Mejor costo/QR',
    highlight: false,
    icon: Crown,
  },
]

const FAQS = [
  {
    q: '¿Puedo cambiar el enlace después de imprimir el QR?',
    a: 'Sí. Esa es la principal ventaja de los QR dinámicos. El código impreso nunca cambia, pero el destino sí. Puedes actualizarlo desde tu panel en cualquier momento.',
  },
  {
    q: '¿El plan gratis requiere tarjeta de crédito?',
    a: 'No. Puedes empezar sin ningún método de pago. El plan Free te da 1 QR mensual sin costo y sin compromisos.',
  },
  {
    q: '¿Qué pasa si mi QR vence?',
    a: 'Puedes renovarlo gratis cada 30 días desde tu panel. Si necesitas QR permanentes sin preocuparte por renovar, los planes de pago los incluyen.',
  },
  {
    q: '¿Puedo usar QR para WhatsApp, menús o Instagram?',
    a: 'Sí. Puedes crear QR para URLs, WhatsApp, Instagram, TikTok, Facebook, menús, formularios, PDF, mapas, Wi-Fi, llamadas, vCards y más de 44 tipos.',
  },
  {
    q: '¿Puedo ver estadísticas de escaneos?',
    a: 'Sí. Los planes Starter, Pro y Business incluyen analytics. Puedes ver escaneos por fecha y métricas de rendimiento de tus campañas.',
  },
  {
    q: '¿Puedo desactivar un QR?',
    a: 'Sí. Puedes pausar o eliminar tus QR cuando quieras desde tu panel de control.',
  },
  {
    q: '¿Los pagos son seguros?',
    a: 'Sí. Todos los pagos son procesados por Stripe, el estándar global en pagos seguros. Nosotros nunca almacenamos datos de tu tarjeta.',
  },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckItem({ children, positive = true }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${positive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-500'}`}>
        {positive
          ? <Check size={11} strokeWidth={3} />
          : <X size={11} strokeWidth={3} />
        }
      </span>
      <span className={`text-sm leading-6 ${positive ? 'text-ink-700' : 'text-ink-400 line-through'}`}>
        {children}
      </span>
    </li>
  )
}

function SectionBadge({ children }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
      {children}
    </span>
  )
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-ink-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left text-sm font-bold text-ink-900 hover:text-brand-700 transition-colors"
        aria-expanded={open}
      >
        <span>{q}</span>
        {open ? <ChevronUp size={18} className="shrink-0 text-brand-600" /> : <ChevronDown size={18} className="shrink-0 text-ink-400" />}
      </button>
      {open && (
        <p className="pb-5 text-sm leading-7 text-ink-500">{a}</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [demoUrl, setDemoUrl] = useState('')

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-ink-950">

      {/* ══════════════════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 border-b border-ink-100/80 bg-white/95 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex h-16 items-center justify-between">

            <Link to="/" className="flex items-center gap-2.5 font-black tracking-tight text-brand-700">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white" style={{ boxShadow: '0 4px 16px rgba(109,40,217,.3)' }}>
                <QrCode size={19} />
              </span>
              <span className="text-base">QR Service</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Navegación principal">
              {NAV_LINKS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  className="rounded-xl px-3 py-2 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
                >
                  {label}
                </a>
              ))}
            </nav>

            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-600 transition hover:text-ink-900"
              >
                Iniciar sesión
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800"
                style={{ boxShadow: '0 4px 16px rgba(109,40,217,.25)' }}
              >
                Comenzar gratis <ArrowRight size={15} />
              </Link>
            </div>

            <button
              className="rounded-xl p-2 text-ink-600 hover:bg-ink-100 lg:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="border-t border-ink-100 bg-white px-5 py-4 lg:hidden">
            <nav className="grid gap-1" aria-label="Navegación móvil">
              {NAV_LINKS.map(({ href, label }) => (
                <a
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                >
                  {label}
                </a>
              ))}
            </nav>
            <div className="mt-4 grid gap-2 border-t border-ink-100 pt-4">
              <Link to="/login" className="rounded-xl border border-ink-200 py-2.5 text-center text-sm font-semibold text-ink-700">
                Iniciar sesión
              </Link>
              <Link to="/register" className="rounded-xl bg-brand-700 py-2.5 text-center text-sm font-bold text-white">
                Comenzar gratis
              </Link>
            </div>
          </div>
        )}
      </header>

      <main>

        {/* ══════════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════════ */}
        <section className="relative overflow-hidden">
          {/* Background */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-brand-600/8 blur-3xl" />
            <div className="absolute -right-40 top-10 h-[500px] w-[500px] rounded-full bg-accent-400/8 blur-3xl" />
          </div>

          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">

              {/* Left */}
              <div>
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-brand-700">
                  <Zap size={12} /> QR dinámicos para negocios reales
                </div>

                <h1 className="text-balance text-5xl font-black leading-[0.9] tracking-tight text-ink-950 sm:text-6xl lg:text-[3.75rem] xl:text-7xl">
                  Cambia el destino de tu QR{' '}
                  <span className="bg-gradient-to-r from-brand-700 to-brand-400 bg-clip-text text-transparent">
                    aunque ya esté impreso
                  </span>
                </h1>

                <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
                  Crea QR dinámicos, edítalos cuando quieras y mide cada escaneo desde un solo panel. Sin reimprimir. Sin costos extra.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    to="/register"
                    aria-label="Crear mi primer QR gratis"
                    className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-6 py-3.5 text-base font-bold text-white transition hover:bg-brand-800 active:scale-[.98]"
                    style={{ boxShadow: '0 8px 30px rgba(109,40,217,.3)' }}
                  >
                    Crear mi primer QR gratis <ArrowRight size={18} />
                  </Link>
                  <a
                    href="#como-funciona"
                    className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-6 py-3.5 text-base font-bold text-ink-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
                  >
                    Ver cómo funciona
                  </a>
                </div>

                <div className="mt-7 flex flex-wrap items-center gap-5 text-sm font-medium text-ink-500">
                  {['Sin tarjeta de crédito', '30 días gratis', 'Pagos seguros con Stripe'].map((t) => (
                    <span key={t} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                        <Check size={11} strokeWidth={3} />
                      </span>
                      {t}
                    </span>
                  ))}
                </div>

                {/* Mini stats */}
                <div className="mt-10 flex flex-wrap gap-8 border-t border-ink-100 pt-8">
                  {[
                    { v: '44+', l: 'Tipos de QR' },
                    { v: '< 1 min', l: 'Para crear uno' },
                    { v: '100%', l: 'Dinámicos' },
                  ].map(({ v, l }) => (
                    <div key={l}>
                      <p className="text-2xl font-black text-brand-700">{v}</p>
                      <p className="text-xs font-semibold text-ink-400">{l}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — app mockup */}
              <div className="relative mx-auto w-full max-w-sm lg:mx-0 lg:max-w-none">
                <div className="absolute -inset-6 rounded-[3rem] bg-brand-600/10 blur-3xl" />
                <div className="relative rounded-3xl border border-ink-200/60 bg-white p-5 shadow-xl">

                  {/* Header */}
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white" style={{ boxShadow: '0 4px 12px rgba(109,40,217,.3)' }}>
                        <Store size={19} />
                      </div>
                      <div>
                        <p className="text-sm font-black text-ink-950">Menú restaurante</p>
                        <p className="text-xs text-ink-400">qrservice.com/r/m3nu</p>
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                      ● Activo
                    </span>
                  </div>

                  {/* QR visual */}
                  <div className="grid place-items-center rounded-2xl bg-gradient-to-br from-brand-50 to-white p-6">
                    <QRCodeSVG
                      value="https://qrservice.com/register"
                      size={160}
                      fgColor="#4c1d95"
                      level="M"
                    />
                    <p className="mt-3 text-center text-xs font-semibold text-ink-400">
                      Escanea para crear tu cuenta gratis
                    </p>
                  </div>

                  {/* Destination badge */}
                  <div className="mt-4 flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5">
                    <Link2 size={14} className="shrink-0 text-ink-400" />
                    <span className="flex-1 truncate text-xs font-medium text-ink-600">
                      restaurante.com/menu-2025
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                      Editar
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {[
                      { v: '247', l: 'Hoy', c: 'text-brand-700' },
                      { v: '8.2k', l: 'Total', c: 'text-ink-950' },
                      { v: '94%', l: 'Uptime', c: 'text-emerald-700' },
                    ].map(({ v, l, c }) => (
                      <div key={l} className="rounded-xl bg-ink-50 p-3 text-center">
                        <p className={`text-lg font-black ${c}`}>{v}</p>
                        <p className="text-[11px] font-medium text-ink-400">{l}</p>
                      </div>
                    ))}
                  </div>

                  {/* Updated badge */}
                  <div className="mt-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2">
                    <RefreshCw size={13} className="text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">Destino actualizado · hace 2 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            DEMO RÁPIDA
        ══════════════════════════════════════════════════════ */}
        <section id="demo" className="border-y border-ink-100 bg-ink-50/70 py-16">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="text-center">
              <SectionBadge><Sparkles size={11} /> Demo instantánea</SectionBadge>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
                Prueba cómo se vería tu QR
              </h2>
              <p className="mt-3 text-ink-500">
                Pega cualquier enlace y genera una vista previa. Gratis y al instante.
              </p>
            </div>

            <div className="mt-10 rounded-3xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={17} />
                  <input
                    type="url"
                    value={demoUrl}
                    onChange={(e) => setDemoUrl(e.target.value)}
                    placeholder="https://tu-sitio.com o wa.me/57..."
                    className="w-full rounded-2xl border border-ink-200 bg-white py-3.5 pl-11 pr-4 text-sm text-ink-800 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100"
                    aria-label="Ingresa tu URL para generar QR de demostración"
                  />
                </div>
              </div>

              {demoUrl.length > 3 && (
                <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-8">
                  <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
                    <QRCodeSVG
                      value={demoUrl}
                      size={160}
                      fgColor="#4c1d95"
                      level="M"
                    />
                  </div>
                  <div className="flex-1 text-center sm:text-left">
                    <p className="text-sm font-black text-ink-950">Tu QR de demostración</p>
                    <p className="mt-1 break-all text-xs text-ink-500">{demoUrl}</p>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold text-emerald-700">✓ QR dinámico — puedes cambiar el destino</p>
                      <p className="text-xs font-semibold text-emerald-700">✓ Analytics de escaneos incluido</p>
                      <p className="text-xs font-semibold text-emerald-700">✓ Descarga PNG en alta resolución</p>
                    </div>
                    <Link
                      to="/register"
                      className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800"
                      aria-label="Guardar este QR gratis"
                    >
                      Guardar este QR gratis <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              )}

              {!demoUrl && (
                <p className="mt-4 text-center text-xs text-ink-400">
                  Funciona con cualquier URL, wa.me, Instagram, PDF o formulario
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CÓMO FUNCIONA
        ══════════════════════════════════════════════════════ */}
        <section id="como-funciona" className="py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge>Cómo funciona</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                De enlace a campaña en 3 pasos
              </h2>
              <p className="mt-4 leading-7 text-ink-500">
                Sin configuración técnica. Sin tarjeta. Solo crea, comparte y mide.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map(({ icon: Icon, title, desc }, idx) => (
                <div key={title} className="relative rounded-3xl border border-ink-200/70 bg-white p-7 shadow-sm">
                  <div className="absolute right-6 top-6 text-6xl font-black text-ink-100 select-none leading-none">
                    {idx + 1}
                  </div>
                  <div className="relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl font-black text-ink-950">{title}</h3>
                  <p className="mt-2 leading-7 text-ink-500">{desc}</p>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-brand-700 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-brand-800"
                aria-label="Probar gratis ahora"
              >
                Probar gratis ahora <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CASOS DE USO
        ══════════════════════════════════════════════════════ */}
        <section id="casos" className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge>Casos de uso</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                Hecho para negocios reales
              </h2>
              <p className="mt-4 leading-7 text-ink-500">
                Desde restaurantes hasta empresas. QR Service se adapta a tu industria.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {USE_CASES.map(({ icon: Icon, title, desc, tags, color }) => (
                <div
                  key={title}
                  className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
                    <Icon size={21} />
                  </div>
                  <h3 className="text-lg font-black text-ink-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            COMPARACIÓN QR ESTÁTICO VS DINÁMICO
        ══════════════════════════════════════════════════════ */}
        <section id="comparacion" className="py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge><AlertTriangle size={11} /> Comparación</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                ¿QR estático o QR dinámico?
              </h2>
              <p className="mt-4 leading-7 text-ink-500">
                La diferencia puede ahorrarte tiempo y dinero en impresiones.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2">
              {/* QR Estático */}
              <div className="rounded-3xl border border-red-100 bg-red-50/50 p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-500">
                    <X size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-red-400">Problema</p>
                    <h3 className="text-xl font-black text-ink-950">QR Estático</h3>
                  </div>
                </div>
                <ul className="grid gap-3">
                  <CheckItem positive={false}>No se puede editar una vez impreso.</CheckItem>
                  <CheckItem positive={false}>Si cambia el enlace, hay que reimprimir.</CheckItem>
                  <CheckItem positive={false}>No mide cuántas personas lo escanearon.</CheckItem>
                  <CheckItem positive={false}>No se puede pausar ni desactivar.</CheckItem>
                  <CheckItem positive={false}>No permite organizar por campañas.</CheckItem>
                  <CheckItem positive={false}>Costo adicional por cada cambio de destino.</CheckItem>
                </ul>
              </div>

              {/* QR Dinámico */}
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                    <Check size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">Solución</p>
                    <h3 className="text-xl font-black text-ink-950">QR Dinámico con QR Service</h3>
                  </div>
                </div>
                <ul className="grid gap-3">
                  <CheckItem>Edita el destino en cualquier momento desde tu panel.</CheckItem>
                  <CheckItem>El código impreso nunca cambia. Ahorra en impresiones.</CheckItem>
                  <CheckItem>Analytics: ve escaneos por fecha y dispositivo.</CheckItem>
                  <CheckItem>Activa, pausa o elimina tus QR cuando quieras.</CheckItem>
                  <CheckItem>Organiza tus QR por campañas y clientes.</CheckItem>
                  <CheckItem>Un precio por año. Sin costos extra por editar.</CheckItem>
                </ul>
              </div>
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-emerald-700"
                aria-label="Probar QR dinámico gratis"
              >
                Probar QR dinámico gratis <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            BENEFICIOS
        ══════════════════════════════════════════════════════ */}
        <section className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge>Beneficios</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                Todo lo que necesitas en un solo lugar
              </h2>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ icon: Icon, title, desc, color }) => (
                <div key={title} className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-sm">
                  <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${color}`}>
                    <Icon size={21} />
                  </div>
                  <h3 className="font-black text-ink-950">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-ink-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CONFIANZA Y SEGURIDAD
        ══════════════════════════════════════════════════════ */}
        <section className="py-20">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-700 p-8 sm:p-12">
              <div className="grid gap-8 lg:grid-cols-2 lg:items-center lg:gap-16">
                <div>
                  <SectionBadge>
                    <span className="border-white/30 bg-white/10 text-white">
                      <Lock size={11} /> Seguridad
                    </span>
                  </SectionBadge>
                  <h2 className="mt-4 text-3xl font-black text-white sm:text-4xl">
                    Seguro desde el primer escaneo
                  </h2>
                  <p className="mt-4 leading-7 text-white/70">
                    Diseñado con estándares de seguridad modernos para que tú y tus clientes estén protegidos.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    'Pagos procesados con Stripe',
                    'Validación de enlaces destino',
                    'Sesiones con cookies HttpOnly',
                    'Puedes pausar o eliminar tus QR',
                    'Sin almacenamiento de IP cruda',
                    'Login con Google OAuth',
                  ].map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
                      <Check size={14} className="shrink-0 text-emerald-400" strokeWidth={2.5} />
                      <span className="text-sm font-semibold text-white/85">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            PRECIOS
        ══════════════════════════════════════════════════════ */}
        <section id="precios" className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <SectionBadge>Precios</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                Simple y transparente
              </h2>
              <p className="mt-4 leading-7 text-ink-500">
                Precios LATAM-friendly. Sin suscripciones mensuales. Paga una vez al año.
              </p>
            </div>

            <div className="mt-14 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {PLANS.map((plan) => {
                const Icon = plan.icon
                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md
                      ${plan.highlight
                        ? 'border-brand-500 shadow-brand-100'
                        : 'border-ink-200/70'
                      }`}
                  >
                    {plan.badge && (
                      <div className={`absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1 text-xs font-black text-white
                        ${plan.highlight ? 'bg-brand-700' : 'bg-ink-800'}`}
                        style={plan.highlight ? { boxShadow: '0 4px 12px rgba(109,40,217,.3)' } : {}}
                      >
                        {plan.badge}
                      </div>
                    )}

                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                      <Icon size={20} />
                    </div>

                    <p className="text-lg font-black text-ink-950">{plan.name}</p>

                    <div className="mt-3 mb-5">
                      {plan.price === 0
                        ? <p className="text-4xl font-black text-ink-950">Gratis</p>
                        : (
                          <p className="text-4xl font-black text-ink-950">
                            ${plan.price}
                            <span className="text-base font-bold text-ink-400">{plan.period}</span>
                          </p>
                        )
                      }
                    </div>

                    <ul className="mb-6 flex-1 grid gap-2.5">
                      {[
                        { label: plan.qr, ok: true },
                        { label: 'QR dinámicos', ok: true },
                        { label: 'Descarga PNG', ok: true },
                        { label: '44 tipos de QR', ok: true },
                        { label: plan.analytics ? `Analytics ${plan.analytics !== true ? plan.analytics : ''}`.trim() : 'Sin analytics', ok: !!plan.analytics },
                        { label: plan.logo ? 'Logo personalizado' : 'Sin logo personalizado', ok: plan.logo },
                        { label: `Soporte: ${plan.support}`, ok: true },
                      ].map(({ label, ok }) => (
                        <li key={label} className="flex items-start gap-2.5">
                          <span className={`mt-0.5 flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-emerald-100 text-emerald-700' : 'bg-ink-100 text-ink-300'}`}>
                            {ok ? <Check size={10} strokeWidth={3} /> : <X size={10} strokeWidth={3} />}
                          </span>
                          <span className={`text-sm ${ok ? 'text-ink-700 font-medium' : 'text-ink-400'}`}>{label}</span>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to="/register"
                      aria-label={`${plan.cta} — Plan ${plan.name}`}
                      className={`w-full rounded-2xl py-2.5 text-center text-sm font-bold transition
                        ${plan.highlight
                          ? 'bg-brand-700 text-white hover:bg-brand-800'
                          : 'border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700'
                        }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>
                )
              })}
            </div>

            <p className="mt-8 text-center text-sm font-medium text-ink-500">
              ¿No sabes cuál elegir?{' '}
              <Link to="/register" className="font-bold text-brand-700 hover:underline">
                Empieza gratis
              </Link>{' '}
              y mejora tu plan cuando lo necesites.
            </p>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════ */}
        <section id="faq" className="py-24">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <div className="text-center">
              <SectionBadge>Preguntas frecuentes</SectionBadge>
              <h2 className="mt-4 text-4xl font-black tracking-tight text-ink-950 sm:text-5xl">
                Resolvemos tus dudas
              </h2>
            </div>

            <div className="mt-12 rounded-3xl border border-ink-200/70 bg-white px-6 shadow-sm sm:px-8">
              {FAQS.map((item) => (
                <FaqItem key={item.q} {...item} />
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-2xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition hover:border-brand-200 hover:text-brand-700"
              >
                ¿Más preguntas? Prueba gratis y explora <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CTA FINAL
        ══════════════════════════════════════════════════════ */}
        <section className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-8 py-16 text-center text-white sm:px-16 sm:py-20">
              <div className="pointer-events-none absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/5 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-accent-400/10 blur-3xl" />

              <div className="relative">
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white backdrop-blur">
                  <Smartphone size={12} /> Disponible en cualquier dispositivo
                </div>
                <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Tu primer QR dinámico en menos de un minuto.
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
                  Sin tarjeta. Sin complicaciones. Listo para imprimir.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Link
                    to="/register"
                    aria-label="Crear cuenta gratis"
                    className="inline-flex items-center gap-2 rounded-2xl bg-accent-400 px-7 py-4 text-base font-black text-ink-950 transition hover:bg-accent-500 active:scale-[.98]"
                    style={{ boxShadow: '0 8px 24px rgba(163,230,53,.35)' }}
                  >
                    Crear cuenta gratis <ArrowRight size={18} />
                  </Link>
                  <a
                    href="#precios"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-7 py-4 text-base font-bold text-white backdrop-blur transition hover:bg-white/20"
                  >
                    Ver planes
                  </a>
                </div>
                <div className="mt-6 flex flex-wrap justify-center gap-5 text-sm font-medium text-white/60">
                  {['Sin tarjeta requerida', '30 días gratis', 'Cancela cuando quieras'].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <Check size={13} className="text-accent-400" /> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ══════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════ */}
      <footer className="border-t border-ink-100 bg-white py-10">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <Link to="/" className="flex items-center gap-2.5 font-black text-brand-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-700 text-white">
                <QrCode size={16} />
              </span>
              QR Service
            </Link>

            <nav className="flex flex-wrap justify-center gap-5 text-sm font-medium text-ink-400" aria-label="Footer">
              {NAV_LINKS.map(({ href, label }) => (
                <a key={href} href={href} className="transition hover:text-ink-700">{label}</a>
              ))}
            </nav>

            <div className="flex items-center gap-4 text-sm font-medium text-ink-400">
              <Link to="/login"    className="transition hover:text-ink-700">Login</Link>
              <Link to="/register" className="font-bold text-brand-700 transition hover:text-brand-800">Registro gratis</Link>
            </div>
          </div>

          <div className="mt-8 border-t border-ink-100 pt-6 text-center text-xs font-medium text-ink-400">
            © {new Date().getFullYear()} QR Service. Todos los derechos reservados. · Pagos seguros con Stripe.
          </div>
        </div>
      </footer>
    </div>
  )
}
