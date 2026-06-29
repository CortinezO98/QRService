import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, BarChart2, Check, Menu, QrCode,
  RefreshCw, Shield, Sparkles, X, Zap, Globe,
  Smartphone, Star, ChevronRight,
} from 'lucide-react'
import Button from '../components/ui/Button'

const plans = [
  { plan: 'Free',     price: 0,  qr: '1 QR / mes',         cta: 'Empezar gratis', accent: false },
  { plan: 'Starter',  price: 10, qr: '5 QR permanentes',   cta: 'Elegir Starter', accent: false },
  { plan: 'Pro',      price: 20, qr: '15 QR permanentes',  cta: 'Elegir Pro',     accent: true  },
  { plan: 'Business', price: 30, qr: '30 QR permanentes',  cta: 'Elegir Business',accent: false },
]

const features = [
  {
    icon: QrCode,
    title: 'Crea',
    desc: 'URL, WhatsApp, PDF, vCard, Wi-Fi, Maps y 40+ tipos más.',
    color: 'bg-brand-50 text-brand-700',
  },
  {
    icon: RefreshCw,
    title: 'Edita en vivo',
    desc: 'Cambia el destino sin reimprimir. El QR físico nunca cambia.',
    color: 'bg-purple-50 text-purple-700',
  },
  {
    icon: BarChart2,
    title: 'Mide',
    desc: 'Analytics por fecha, campaña y tipo de dispositivo.',
    color: 'bg-emerald-50 text-emerald-700',
  },
]

const stats = [
  { value: '44+', label: 'Tipos de QR' },
  { value: '30s', label: 'Para crear uno' },
  { value: '100%', label: 'Dinámicos' },
]

export default function LandingPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-ink-950">

      {/* ── Navbar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-ink-100/80 bg-white/90 backdrop-blur-xl">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 font-black tracking-tight text-brand-700">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-700 text-white shadow-glow-sm">
                <QrCode size={19} />
              </span>
              <span className="text-base">QR Service</span>
            </Link>

            <nav className="hidden items-center gap-1 md:flex">
              <a href="#funciona" className="btn-ghost text-sm">Cómo funciona</a>
              <a href="#precios" className="btn-ghost text-sm">Precios</a>
              <Link to="/login" className="btn-ghost text-sm">Iniciar sesión</Link>
              <Button to="/register" size="sm">Comenzar gratis</Button>
            </nav>

            <button
              className="rounded-xl p-2 hover:bg-ink-100 md:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-label="Menú"
            >
              {open ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>

          {open && (
            <div className="grid gap-2 border-t border-ink-100 py-4 md:hidden">
              <a href="#funciona" onClick={() => setOpen(false)} className="btn-ghost justify-start">Cómo funciona</a>
              <a href="#precios"  onClick={() => setOpen(false)} className="btn-ghost justify-start">Precios</a>
              <Button to="/login"    variant="secondary" className="w-full">Iniciar sesión</Button>
              <Button to="/register" className="w-full">Comenzar gratis</Button>
            </div>
          )}
        </div>
      </header>

      <main>

        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="relative overflow-hidden">
          {/* Background blobs */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full bg-brand-600/10 blur-3xl" />
            <div className="absolute -right-32 top-0 h-[500px] w-[500px] rounded-full bg-accent-400/10 blur-3xl" />
          </div>

          <div className="container grid min-h-[calc(100vh-4rem)] items-center gap-14 py-20 lg:grid-cols-2 lg:gap-20 lg:py-28">

            {/* Left — copy */}
            <div className="animate-fade-up">
              <div className="eyebrow mb-6">
                <Zap size={12} className="shrink-0" />
                QR dinámicos para negocios
              </div>

              <h1 className="text-balance text-5xl font-black leading-[0.92] tracking-[-0.04em] text-ink-950 sm:text-6xl lg:text-7xl">
                Crea tu QR.{' '}
                <span className="gradient-text">Edita el destino.</span>{' '}
                Mide cada escaneo.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-500">
                Una plataforma profesional para crear QR dinámicos, descargarlos en alta calidad y analizar el rendimiento de tus campañas.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button to="/register" size="lg" className="btn-lime gap-2.5">
                  Crear mi primer QR gratis <ArrowRight size={18} />
                </Button>
                <Button href="#precios" variant="secondary" size="lg">
                  Ver precios
                </Button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm font-semibold text-ink-500">
                {['Sin tarjeta de crédito', '30 días gratis', 'Pagos con Stripe'].map((item) => (
                  <span key={item} className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check size={11} strokeWidth={3} />
                    </span>
                    {item}
                  </span>
                ))}
              </div>

              {/* Mini stats */}
              <div className="mt-10 flex gap-6 border-t border-ink-100 pt-8">
                {stats.map(({ value, label }) => (
                  <div key={label}>
                    <p className="text-2xl font-black text-brand-700">{value}</p>
                    <p className="text-xs font-semibold text-ink-400">{label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — mock app card */}
            <div className="relative mx-auto w-full max-w-[420px] animate-fade-up lg:mx-0">
              {/* Glow */}
              <div className="absolute -inset-8 rounded-[3rem] bg-brand-600/15 blur-3xl" />

              <div className="relative rounded-4xl border border-white/70 bg-white/90 p-6 shadow-soft backdrop-blur-xl">
                {/* Card header */}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-700 text-white shadow-glow-sm">
                      <QrCode size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-ink-950">Menú restaurante</p>
                      <p className="text-xs font-medium text-ink-400">qrservice.com/r/m3nu</p>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200">
                    Activo
                  </span>
                </div>

                {/* Fake QR */}
                <div className="grid place-items-center rounded-3xl bg-gradient-to-br from-brand-50 to-white p-8">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 49 }).map((_, i) => {
                      const filled = [0,1,2,3,4,5,6,7,13,14,20,21,27,28,34,35,41,42,43,44,45,46,48,24,25,11,12,18,19,30,37].includes(i)
                      return (
                        <div
                          key={i}
                          className={`h-6 w-6 rounded-sm transition-colors ${filled ? 'bg-brand-800' : 'bg-white'}`}
                        />
                      )
                    })}
                  </div>
                </div>

                {/* Stats row */}
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {[
                    { v: '247', l: 'Hoy', color: 'text-brand-700' },
                    { v: '8.2k', l: 'Total', color: 'text-ink-950' },
                    { v: '94%', l: 'Uptime', color: 'text-emerald-700' },
                  ].map(({ v, l, color }) => (
                    <div key={l} className="rounded-2xl bg-ink-50 p-3 text-center">
                      <p className={`text-xl font-black ${color}`}>{v}</p>
                      <p className="text-xs font-semibold text-ink-400">{l}</p>
                    </div>
                  ))}
                </div>

                {/* Action bar */}
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-brand-50 px-4 py-3">
                  <Globe size={14} className="text-brand-600" />
                  <span className="flex-1 truncate text-xs font-semibold text-brand-700">
                    https://restaurante.com/menu-digital-2025
                  </span>
                  <ChevronRight size={14} className="text-brand-400" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FEATURES ───────────────────────────────────────── */}
        <section id="funciona" className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="eyebrow mb-4">Cómo funciona</div>
              <h2 className="section-title">De enlace a campaña en 3 pasos</h2>
              <p className="mt-4 text-base leading-7 text-ink-500">
                Sin configuración técnica. Sin tarjeta. Solo crea, comparte y mide.
              </p>
            </div>

            <div className="mt-14 grid gap-5 md:grid-cols-3">
              {features.map(({ icon: Icon, title, desc, color }, idx) => (
                <div key={title} className="surface-card relative overflow-hidden p-7">
                  <div className="absolute right-5 top-5 text-5xl font-black text-ink-100 select-none">
                    {idx + 1}
                  </div>
                  <div className={`relative mb-5 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl font-black text-ink-950">{title}</h3>
                  <p className="mt-2 leading-7 text-ink-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPS ────────────────────────────────────── */}
        <section className="py-24">
          <div className="container">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-4xl bg-gradient-to-br from-brand-700 to-brand-900 p-8 text-white sm:p-10">
                <Shield size={30} className="mb-6 opacity-80" />
                <h3 className="text-2xl font-black">Seguridad desde el diseño</h3>
                <p className="mt-3 leading-7 text-white/70">
                  Cookies HttpOnly, HTTPS forzado, validación de URLs, protección SSRF y rate limiting en todos los endpoints.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {['OAuth Google', 'Stripe seguro', 'OWASP top 10'].map((tag) => (
                    <span key={tag} className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-4xl border border-ink-100 bg-white p-8 shadow-card sm:p-10">
                <Sparkles size={30} className="mb-6 text-brand-600" />
                <h3 className="text-2xl font-black text-ink-950">Experiencia profesional</h3>
                <p className="mt-3 leading-7 text-ink-500">
                  Flujos limpios, responsive completo, descarga PNG en alta resolución y portal de cliente integrado con Stripe.
                </p>
                <div className="mt-6 flex flex-wrap gap-2">
                  {['44 tipos de QR', 'Analytics', 'Campañas'].map((tag) => (
                    <span key={tag} className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── PRICING ────────────────────────────────────────── */}
        <section id="precios" className="border-t border-ink-100 bg-ink-50/60 py-24">
          <div className="container">
            <div className="mx-auto max-w-2xl text-center">
              <div className="eyebrow mb-4">Precios</div>
              <h2 className="section-title">Simple y transparente</h2>
              <p className="mt-4 text-ink-500">
                Precios LATAM-friendly. Paga una vez al año y olvídate.
              </p>
            </div>

            <div className="mt-14 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {plans.map((plan) => (
                <div
                  key={plan.plan}
                  className={`surface-card relative flex flex-col p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-soft
                    ${plan.accent ? 'ring-2 ring-brand-600 shadow-glow-sm' : ''}`}
                >
                  {plan.accent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-700 px-4 py-1 text-xs font-black text-white shadow-glow-sm">
                      Más popular
                    </div>
                  )}

                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                    {plan.plan === 'Free' && <Zap size={20} />}
                    {plan.plan === 'Starter' && <Star size={20} />}
                    {plan.plan === 'Pro' && <Sparkles size={20} />}
                    {plan.plan === 'Business' && <Shield size={20} />}
                  </div>

                  <p className="text-lg font-black text-ink-950">{plan.plan}</p>

                  <div className="mt-3 mb-5">
                    {plan.price === 0 ? (
                      <p className="text-4xl font-black text-ink-950">Gratis</p>
                    ) : (
                      <p className="text-4xl font-black text-ink-950">
                        ${plan.price}
                        <span className="text-base font-bold text-ink-400">/año</span>
                      </p>
                    )}
                  </div>

                  <ul className="mb-6 flex-1 grid gap-2.5 text-sm">
                    {[plan.qr, 'QR dinámicos', 'Descarga PNG', '44 tipos de QR'].map((item) => (
                      <li key={item} className="flex items-center gap-2.5 font-medium text-ink-600">
                        <Check size={14} className="shrink-0 text-emerald-600" strokeWidth={2.5} />
                        {item}
                      </li>
                    ))}
                  </ul>

                  <Button
                    to="/register"
                    variant={plan.accent ? 'primary' : 'secondary'}
                    className="w-full"
                  >
                    {plan.cta}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FINAL ──────────────────────────────────────── */}
        <section className="py-24">
          <div className="container">
            <div className="relative overflow-hidden rounded-5xl bg-gradient-to-br from-brand-800 via-brand-700 to-brand-600 px-8 py-16 text-center text-white shadow-glow sm:px-16 sm:py-20">
              {/* Subtle noise overlay */}
              <div className="pointer-events-none absolute inset-0 opacity-5"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E\")" }}
              />
              <div className="relative">
                <div className="eyebrow mx-auto mb-6 border-white/30 bg-white/10 text-white">
                  <Smartphone size={12} /> Disponible en cualquier dispositivo
                </div>
                <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Tu primer QR en menos de un minuto
                </h2>
                <p className="mx-auto mt-5 max-w-xl text-lg text-white/70">
                  Sin tarjeta de crédito. Sin contratos. Solo resultados.
                </p>
                <Button to="/register" size="lg" className="btn-lime mt-8">
                  Crear cuenta gratis <ArrowRight size={18} />
                </Button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="border-t border-ink-100 bg-white py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm font-medium text-ink-400 sm:flex-row">
          <Link to="/" className="flex items-center gap-2 font-black text-brand-700">
            <QrCode size={17} /> QR Service
          </Link>
          <p>© {new Date().getFullYear()} QR Service. Todos los derechos reservados.</p>
          <div className="flex gap-5">
            <Link to="/login"    className="hover:text-ink-700 transition-colors">Iniciar sesión</Link>
            <Link to="/register" className="font-bold text-brand-700 hover:text-brand-800 transition-colors">Registro gratis</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
