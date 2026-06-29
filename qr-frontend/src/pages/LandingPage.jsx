import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart2,
  Check,
  Crown,
  Menu,
  QrCode,
  RefreshCw,
  Shield,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'
import Button from '../components/ui/Button'

const plans = [
  { plan: 'Free', price: 0, qr: '1 QR mensual', cta: 'Empezar gratis', accent: false },
  { plan: 'Starter', price: 10, qr: '5 QR permanentes', cta: 'Elegir Starter', accent: false },
  { plan: 'Pro', price: 20, qr: '15 QR permanentes', cta: 'Elegir Pro', accent: false },
  { plan: 'Business', price: 30, qr: '30 QR permanentes', cta: 'Elegir Business', accent: true },
]

export default function LandingPage() {
  const [open, setOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white text-ink-950">
      <header className="sticky top-0 z-50 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-black text-brand-700">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
              <QrCode size={22} />
            </span>
            QR Service
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <a href="#funciona" className="btn-ghost">Cómo funciona</a>
            <a href="#precios" className="btn-ghost">Precios</a>
            <Link to="/login" className="btn-ghost">Iniciar sesión</Link>
            <Button to="/register">Comenzar gratis</Button>
          </nav>

          <button className="rounded-2xl p-2 hover:bg-ink-100 md:hidden" onClick={() => setOpen((value) => !value)}>
            {open ? <X /> : <Menu />}
          </button>
        </div>

        {open && (
          <div className="container grid gap-2 border-t border-ink-100 py-4 md:hidden">
            <a href="#funciona" onClick={() => setOpen(false)} className="btn-ghost justify-start">Cómo funciona</a>
            <a href="#precios" onClick={() => setOpen(false)} className="btn-ghost justify-start">Precios</a>
            <Button to="/login" variant="secondary">Iniciar sesión</Button>
            <Button to="/register">Comenzar gratis</Button>
          </div>
        )}
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,.16),transparent_34rem),radial-gradient(circle_at_top_right,rgba(163,230,53,.18),transparent_30rem)]" />
          <div className="container grid min-h-[calc(100vh-4rem)] items-center gap-12 py-16 lg:grid-cols-[1fr_.85fr] lg:py-20">
            <div>
              <div className="eyebrow mb-6"><Zap size={13} /> QR dinámicos para negocios</div>
              <h1 className="text-balance text-5xl font-black leading-[0.95] tracking-[-0.055em] text-ink-950 sm:text-6xl lg:text-7xl">
                Crea tu QR. Edita el destino. Mide cada escaneo.
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-500">
                Una plataforma profesional para crear QR dinámicos, descargarlos en alta calidad y analizar el rendimiento de tus campañas.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button to="/register" variant="lime" size="lg">
                  Crear mi primer QR gratis <ArrowRight size={18} />
                </Button>
                <Button href="#precios" variant="secondary" size="lg">Ver planes</Button>
              </div>
              <div className="mt-6 flex flex-wrap gap-3 text-sm font-bold text-ink-500">
                {['Sin tarjeta', '30 días gratis', 'Pagos con Stripe'].map((item) => (
                  <span key={item} className="flex items-center gap-1"><Check size={15} className="text-green-600" /> {item}</span>
                ))}
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="absolute -inset-6 rounded-[3rem] bg-brand-200/40 blur-3xl" />
              <div className="relative rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-soft backdrop-blur-xl">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-black text-ink-950">Campaña Restaurante</p>
                    <p className="text-xs font-semibold text-ink-400">QR menú digital</p>
                  </div>
                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700">Activo</span>
                </div>
                <div className="grid place-items-center rounded-[1.5rem] bg-brand-50 p-8">
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: 49 }).map((_, i) => (
                      <div key={i} className={`h-6 w-6 rounded ${[0,1,2,7,14,15,16,4,5,6,11,13,18,19,20,24,25,28,30,32,34,36,38,40,42,43,45,48].includes(i) ? 'bg-brand-800' : 'bg-white'}`} />
                    ))}
                  </div>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-ink-50 p-3 text-center">
                    <p className="text-2xl font-black">247</p><p className="text-xs font-bold text-ink-400">Hoy</p>
                  </div>
                  <div className="rounded-2xl bg-ink-50 p-3 text-center">
                    <p className="text-2xl font-black">8.2k</p><p className="text-xs font-bold text-ink-400">Total</p>
                  </div>
                  <div className="rounded-2xl bg-ink-50 p-3 text-center">
                    <p className="text-2xl font-black">94%</p><p className="text-xs font-bold text-ink-400">Activo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="funciona" className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow mb-4">Cómo funciona</div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">De enlace a campaña en 3 pasos</h2>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { icon: QrCode, title: 'Crea', desc: 'Elige URL, WhatsApp, PDF, vCard, Wi-Fi, Maps y más.' },
              { icon: RefreshCw, title: 'Edita', desc: 'Cambia el destino sin reimprimir el código físico.' },
              { icon: BarChart2, title: 'Mide', desc: 'Analiza escaneos, rendimiento y evolución por campaña.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="surface-card p-6">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700"><Icon size={23} /></div>
                <h3 className="text-xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-ink-500">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-ink-100 bg-ink-50/70 py-20">
          <div className="container">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { icon: Shield, title: 'Seguridad desde el diseño', desc: 'Cookies HttpOnly, validación de URL, rate limit y protección contra abuso.' },
                { icon: Sparkles, title: 'Experiencia profesional', desc: 'Flujos limpios, responsive completo y acciones rápidas para usuarios reales.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="rounded-4xl border border-white bg-white p-8 shadow-card">
                  <Icon className="text-brand-700" size={28} />
                  <h3 className="mt-5 text-2xl font-black">{title}</h3>
                  <p className="mt-3 leading-7 text-ink-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="precios" className="container py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="eyebrow mb-4">Precios</div>
            <h2 className="text-4xl font-black tracking-tight sm:text-5xl">Simple y transparente</h2>
            <p className="mt-4 text-ink-500">Empieza gratis y sube de plan cuando necesites más capacidad.</p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <div key={plan.plan} className={`surface-card relative p-6 ${plan.accent ? 'ring-2 ring-brand-700' : ''}`}>
                {plan.accent && <div className="absolute right-5 top-5 rounded-full bg-brand-700 px-3 py-1 text-xs font-black text-white">Mejor valor</div>}
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  {plan.plan === 'Business' ? <Crown /> : <QrCode />}
                </div>
                <h3 className="text-xl font-black">{plan.plan}</h3>
                <div className="my-5">
                  <span className="text-4xl font-black">${plan.price}</span>
                  <span className="text-sm font-bold text-ink-400">{plan.price ? '/año' : ' gratis'}</span>
                </div>
                <ul className="mb-6 grid gap-3 text-sm font-semibold text-ink-600">
                  <li className="flex items-center gap-2"><Check size={15} className="text-green-600" /> {plan.qr}</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-green-600" /> QR dinámicos</li>
                  <li className="flex items-center gap-2"><Check size={15} className="text-green-600" /> Descarga PNG</li>
                </ul>
                <Button to="/register" variant={plan.accent ? 'primary' : 'secondary'} className="w-full">
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="container pb-20">
          <div className="rounded-[2rem] bg-gradient-to-br from-brand-800 to-brand-600 p-8 text-center text-white shadow-glow sm:p-14">
            <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">Tu primer QR en menos de un minuto</h2>
            <p className="mx-auto mt-4 max-w-xl text-white/75">Sin tarjeta, sin contratos y con una experiencia diseñada para vender.</p>
            <Button to="/register" variant="lime" size="lg" className="mt-8">Crear cuenta gratis <ArrowRight size={18} /></Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-ink-100 py-8">
        <div className="container flex flex-col items-center justify-between gap-4 text-sm font-semibold text-ink-400 sm:flex-row">
          <Link to="/" className="flex items-center gap-2 font-black text-brand-700"><QrCode size={18} /> QR Service</Link>
          <p>© {new Date().getFullYear()} QR Service. Todos los derechos reservados.</p>
          <div className="flex gap-4">
            <Link to="/login" className="hover:text-ink-700">Login</Link>
            <Link to="/register" className="text-brand-700">Registro</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
