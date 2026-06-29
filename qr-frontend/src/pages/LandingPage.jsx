import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { QrCode, Zap, BarChart2, Shield, RefreshCw, Check, ArrowRight, Star, Crown, Menu, X } from 'lucide-react'

// ── Animated QR visual ────────────────────────────────────────
function QRVisual() {
  const [filled, setFilled] = useState([])
  const size = 9

  // Pattern that looks like a real QR code
  const pattern = [
    [1,1,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0],
    [1,0,1,1,1,0,1,0,1],
    [1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0],
    [1,1,1,1,1,1,1,0,1],
    [0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,0,1,0],
    [1,1,0,1,0,1,1,0,1],
  ]

  const cells = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (pattern[r][c]) cells.push(r * size + c)

  useEffect(() => {
    let i = 0
    const interval = setInterval(() => {
      if (i >= cells.length) { clearInterval(interval); return }
      setFilled(prev => [...prev, cells[i]])
      i++
    }, 30)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="qr-grid">
      {Array.from({ length: size * size }).map((_, idx) => {
        const r = Math.floor(idx / size)
        const c = idx % size
        const isActive = pattern[r]?.[c] === 1
        const isVisible = filled.includes(idx)
        return (
          <div
            key={idx}
            className={`qr-cell ${isActive && isVisible ? 'filled' : ''}`}
          />
        )
      })}
    </div>
  )
}

// ── Plan card ─────────────────────────────────────────────────
function PlanCard({ plan, price, qr, features, accent, badge, cta, ctaLink }) {
  return (
    <div className={`plan-card ${accent ? 'plan-card--accent' : ''}`}>
      {badge && <div className="plan-badge">{badge}</div>}
      <div className="plan-name">{plan}</div>
      <div className="plan-price">
        <span className="plan-amount">${price}</span>
        <span className="plan-period">{price === 0 ? 'gratis' : '/año'}</span>
      </div>
      {price > 0 && qr && (
        <div className="plan-per-qr">${(price / qr).toFixed(2)} por QR</div>
      )}
      <ul className="plan-features">
        {features.map((f, i) => (
          <li key={i} className={f.disabled ? 'disabled' : ''}>
            <Check size={14} />
            {f.text}
          </li>
        ))}
      </ul>
      <Link to={ctaLink} className={`plan-cta ${accent ? 'plan-cta--accent' : ''}`}>
        {cta} <ArrowRight size={14} />
      </Link>
    </div>
  )
}

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  const plans = [
    {
      plan: 'Free',
      price: 0,
      qr: null,
      cta: 'Empezar gratis',
      ctaLink: '/register',
      features: [
        { text: '1 QR activo por mes' },
        { text: 'Renovación mensual gratuita' },
        { text: 'Colores personalizados' },
        { text: 'Analytics', disabled: true },
        { text: 'Soporte', disabled: true },
      ]
    },
    {
      plan: 'Starter',
      price: 10,
      qr: 5,
      cta: 'Elegir Starter',
      ctaLink: '/register',
      features: [
        { text: '5 QR permanentes' },
        { text: 'Sin renovaciones' },
        { text: 'Colores personalizados' },
        { text: 'Analytics básico' },
        { text: 'Soporte por email', disabled: true },
      ]
    },
    {
      plan: 'Pro',
      price: 20,
      qr: 15,
      cta: 'Elegir Pro',
      ctaLink: '/register',
      features: [
        { text: '15 QR permanentes' },
        { text: 'Sin renovaciones' },
        { text: 'Logo personalizado' },
        { text: 'Analytics completo' },
        { text: 'Soporte por email' },
      ]
    },
    {
      plan: 'Business',
      price: 30,
      qr: 30,
      cta: 'Elegir Business',
      ctaLink: '/register',
      accent: true,
      badge: '💼 $1 por QR',
      features: [
        { text: '30 QR permanentes' },
        { text: 'Sin renovaciones' },
        { text: 'Logo personalizado' },
        { text: 'Analytics completo' },
        { text: 'Soporte prioritario' },
      ]
    },
  ]

  return (
    <div className="landing">
      <style>{`
        /* ── Reset & Base ─────────────────────────────────── */
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        .landing {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          color: #111827;
          background: #fff;
          min-height: 100vh;
        }
        a { text-decoration: none; color: inherit; }

        /* ── Nav ─────────────────────────────────────────── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.92);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #f3f4f6;
          padding: 0 24px;
        }
        .nav-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          height: 60px;
        }
        .nav-logo {
          display: flex; align-items: center; gap: 8px;
          font-weight: 800; font-size: 18px; color: #5B21B6;
        }
        .nav-links { display: flex; align-items: center; gap: 8px; }
        .nav-link {
          padding: 6px 14px; border-radius: 8px;
          font-size: 14px; font-weight: 500; color: #6b7280;
          transition: color .15s, background .15s;
        }
        .nav-link:hover { color: #111827; background: #f9fafb; }
        .nav-cta {
          padding: 8px 18px; border-radius: 10px;
          background: #5B21B6; color: white;
          font-size: 14px; font-weight: 600;
          transition: background .15s;
        }
        .nav-cta:hover { background: #4C1D95; }
        .nav-menu-btn { display: none; background: none; border: none; cursor: pointer; color: #374151; }
        @media (max-width: 640px) {
          .nav-links { display: none; }
          .nav-menu-btn { display: flex; }
          .nav-links.open {
            display: flex; flex-direction: column; align-items: flex-start;
            position: absolute; top: 60px; left: 0; right: 0;
            background: white; border-bottom: 1px solid #f3f4f6;
            padding: 12px 24px 16px; gap: 4px;
          }
        }

        /* ── Hero ─────────────────────────────────────────── */
        .hero {
          max-width: 1100px; margin: 0 auto;
          padding: 80px 24px 60px;
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 48px; align-items: center;
        }
        @media (max-width: 768px) {
          .hero { grid-template-columns: 1fr; padding: 48px 24px 40px; }
          .hero-visual { order: -1; display: flex; justify-content: center; }
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 6px;
          background: #F5F3FF; color: #5B21B6;
          font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          padding: 5px 12px; border-radius: 100px; margin-bottom: 20px;
        }
        .hero-title {
          font-size: clamp(36px, 5vw, 58px);
          font-weight: 900; line-height: 1.05;
          letter-spacing: -0.03em; margin-bottom: 20px;
        }
        .hero-title em {
          font-style: normal; color: #5B21B6;
          background: linear-gradient(135deg, #5B21B6, #7C3AED);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .hero-sub {
          font-size: 17px; color: #6b7280; line-height: 1.65;
          margin-bottom: 32px; max-width: 480px;
        }
        .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #A3E635; color: #1a1a1a;
          font-weight: 700; font-size: 15px;
          padding: 13px 24px; border-radius: 12px;
          transition: transform .15s, box-shadow .15s;
          box-shadow: 0 4px 14px rgba(163,230,53,.4);
        }
        .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(163,230,53,.5); }
        .btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          border: 1.5px solid #e5e7eb; color: #374151;
          font-weight: 600; font-size: 15px;
          padding: 13px 24px; border-radius: 12px;
          transition: border-color .15s, background .15s;
        }
        .btn-secondary:hover { border-color: #5B21B6; color: #5B21B6; background: #F5F3FF; }
        .hero-trust {
          display: flex; align-items: center; gap: 8px;
          margin-top: 24px; font-size: 13px; color: #9ca3af;
        }
        .hero-trust span { display: flex; align-items: center; gap: 4px; }

        /* ── QR Visual ────────────────────────────────────── */
        .hero-visual-wrapper {
          position: relative; display: flex; justify-content: center; align-items: center;
        }
        .hero-visual-bg {
          width: 320px; height: 320px;
          background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
          border-radius: 32px;
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }
        .hero-visual-bg::before {
          content: '';
          position: absolute; inset: -40px;
          background: radial-gradient(circle at 30% 30%, rgba(163,230,53,.15) 0%, transparent 60%);
        }
        .qr-grid {
          display: grid; grid-template-columns: repeat(9, 28px);
          gap: 3px; position: relative; z-index: 1;
        }
        .qr-cell {
          width: 28px; height: 28px; border-radius: 4px;
          background: #e5e7eb;
          transition: background .1s, transform .1s;
        }
        .qr-cell.filled {
          background: #5B21B6;
          transform: scale(1.05);
        }
        .hero-visual-badge {
          position: absolute; bottom: -16px; right: -16px;
          background: white; border-radius: 16px;
          padding: 10px 16px; font-size: 13px; font-weight: 600;
          box-shadow: 0 8px 24px rgba(0,0,0,.1);
          display: flex; align-items: center; gap: 6px;
        }
        .badge-dot { width: 8px; height: 8px; background: #22c55e; border-radius: 50%; animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

        /* ── How it works ─────────────────────────────────── */
        .section { max-width: 1100px; margin: 0 auto; padding: 80px 24px; }
        .section-label {
          font-size: 12px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: #5B21B6; margin-bottom: 12px;
        }
        .section-title {
          font-size: clamp(28px, 4vw, 42px); font-weight: 800;
          letter-spacing: -0.02em; margin-bottom: 16px;
        }
        .section-sub { font-size: 16px; color: #6b7280; max-width: 520px; line-height: 1.65; }
        .steps {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; margin-top: 56px;
        }
        @media (max-width: 768px) { .steps { grid-template-columns: 1fr; } }
        .step { display: flex; flex-direction: column; gap: 16px; }
        .step-icon {
          width: 52px; height: 52px; border-radius: 16px;
          background: #F5F3FF; display: flex; align-items: center; justify-content: center;
          color: #5B21B6;
        }
        .step-num { font-size: 11px; font-weight: 700; color: #9ca3af; letter-spacing: .05em; }
        .step-title { font-size: 18px; font-weight: 700; }
        .step-desc { font-size: 14px; color: #6b7280; line-height: 1.65; }

        /* ── Features ─────────────────────────────────────── */
        .features-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-top: 56px;
        }
        @media (max-width: 640px) { .features-grid { grid-template-columns: 1fr; } }
        .feature-card {
          background: #fafafa; border: 1px solid #f3f4f6; border-radius: 20px;
          padding: 28px; display: flex; flex-direction: column; gap: 12px;
          transition: border-color .15s, box-shadow .15s;
        }
        .feature-card:hover { border-color: #DDD6FE; box-shadow: 0 4px 20px rgba(91,33,182,.08); }
        .feature-icon {
          width: 44px; height: 44px; border-radius: 12px;
          background: #EDE9FE; display: flex; align-items: center; justify-content: center;
          color: #5B21B6;
        }
        .feature-title { font-size: 16px; font-weight: 700; }
        .feature-desc { font-size: 14px; color: #6b7280; line-height: 1.6; }

        /* ── Divider ──────────────────────────────────────── */
        .divider { border: none; border-top: 1px solid #f3f4f6; margin: 0 24px; }

        /* ── Pricing ──────────────────────────────────────── */
        .plans-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-top: 56px;
        }
        @media (max-width: 900px) { .plans-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 540px) { .plans-grid { grid-template-columns: 1fr; } }
        .plan-card {
          border: 1.5px solid #e5e7eb; border-radius: 20px;
          padding: 24px; display: flex; flex-direction: column; gap: 0;
          position: relative; transition: border-color .15s, box-shadow .15s;
        }
        .plan-card:hover { border-color: #DDD6FE; box-shadow: 0 4px 20px rgba(91,33,182,.08); }
        .plan-card--accent {
          border-color: #5B21B6;
          box-shadow: 0 0 0 3px rgba(91,33,182,.1);
        }
        .plan-badge {
          position: absolute; top: -13px; left: 50%; transform: translateX(-50%);
          background: #5B21B6; color: white; white-space: nowrap;
          font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 100px;
        }
        .plan-name { font-size: 13px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 16px; }
        .plan-price { display: flex; align-items: baseline; gap: 4px; margin-bottom: 4px; }
        .plan-amount { font-size: 36px; font-weight: 900; letter-spacing: -0.03em; }
        .plan-period { font-size: 14px; color: #9ca3af; }
        .plan-per-qr { font-size: 12px; color: #A3E635; font-weight: 600; margin-bottom: 20px; }
        .plan-features {
          list-style: none; display: flex; flex-direction: column; gap: 10px;
          margin-bottom: 24px; flex: 1; margin-top: 20px;
        }
        .plan-features li {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: #374151;
        }
        .plan-features li svg { color: #5B21B6; flex-shrink: 0; }
        .plan-features li.disabled { color: #d1d5db; }
        .plan-features li.disabled svg { color: #d1d5db; }
        .plan-cta {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          padding: 11px; border-radius: 12px; font-size: 14px; font-weight: 600;
          border: 1.5px solid #5B21B6; color: #5B21B6;
          transition: background .15s, color .15s;
        }
        .plan-cta:hover { background: #5B21B6; color: white; }
        .plan-cta--accent { background: #5B21B6; color: white; border-color: #5B21B6; }
        .plan-cta--accent:hover { background: #4C1D95; }

        /* ── CTA Banner ───────────────────────────────────── */
        .cta-banner {
          margin: 0 24px 80px;
          background: linear-gradient(135deg, #5B21B6 0%, #7C3AED 100%);
          border-radius: 28px; padding: 64px 48px;
          text-align: center; color: white;
          position: relative; overflow: hidden;
        }
        .cta-banner::before {
          content: '';
          position: absolute; top: -60px; right: -60px;
          width: 240px; height: 240px; border-radius: 50%;
          background: rgba(255,255,255,.06);
        }
        .cta-banner::after {
          content: '';
          position: absolute; bottom: -80px; left: -40px;
          width: 280px; height: 280px; border-radius: 50%;
          background: rgba(163,230,53,.08);
        }
        .cta-banner h2 {
          font-size: clamp(28px, 4vw, 44px); font-weight: 900;
          letter-spacing: -0.02em; margin-bottom: 12px; position: relative; z-index: 1;
        }
        .cta-banner p { font-size: 16px; opacity: .8; margin-bottom: 32px; position: relative; z-index: 1; }
        .cta-banner .btn-primary { margin: 0 auto; position: relative; z-index: 1; }

        /* ── Footer ───────────────────────────────────────── */
        .footer {
          border-top: 1px solid #f3f4f6;
          padding: 32px 24px;
          display: flex; align-items: center; justify-content: space-between;
          max-width: 1100px; margin: 0 auto;
          font-size: 13px; color: #9ca3af;
        }
        .footer-logo { display: flex; align-items: center; gap: 6px; font-weight: 700; color: #5B21B6; }
        @media (max-width: 540px) { .footer { flex-direction: column; gap: 12px; text-align: center; } }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <nav className="nav">
        <div className="nav-inner">
          <Link to="/" className="nav-logo">
            <QrCode size={20} /> QR Service
          </Link>
          <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
            <a href="#como-funciona" className="nav-link" onClick={() => setMenuOpen(false)}>Cómo funciona</a>
            <a href="#precios" className="nav-link" onClick={() => setMenuOpen(false)}>Precios</a>
            <Link to="/login" className="nav-link" onClick={() => setMenuOpen(false)}>Iniciar sesión</Link>
            <Link to="/register" className="nav-cta" onClick={() => setMenuOpen(false)}>Comenzar gratis</Link>
          </div>
          <button className="nav-menu-btn" onClick={() => setMenuOpen(o => !o)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section style={{ background: 'white' }}>
        <div className="hero">
          <div>
            <div className="hero-eyebrow">
              <Zap size={12} /> La forma más simple de crear QR codes
            </div>
            <h1 className="hero-title">
              Crea tu QR.<br />
              <em>Mide cada</em><br />
              escaneo.
            </h1>
            <p className="hero-sub">
              Genera códigos QR personalizados en segundos, con analytics en tiempo real
              y planes desde $0. Sin complicaciones.
            </p>
            <div className="hero-actions">
              <Link to="/register" className="btn-primary">
                Crear mi primer QR gratis <ArrowRight size={16} />
              </Link>
              <a href="#precios" className="btn-secondary">
                Ver planes
              </a>
            </div>
            <div className="hero-trust">
              <span><Check size={13} style={{color:'#22c55e'}} /> Sin tarjeta de crédito</span>
              <span style={{margin:'0 4px'}}>·</span>
              <span><Check size={13} style={{color:'#22c55e'}} /> 30 días gratis</span>
              <span style={{margin:'0 4px'}}>·</span>
              <span><Check size={13} style={{color:'#22c55e'}} /> Cancela cuando quieras</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="hero-visual-wrapper">
              <div className="hero-visual-bg">
                <QRVisual />
              </div>
              <div className="hero-visual-badge">
                <div className="badge-dot" />
                247 escaneos hoy
              </div>
            </div>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Cómo funciona ─────────────────────────────────────── */}
      <section className="section" id="como-funciona">
        <div className="section-label">Cómo funciona</div>
        <h2 className="section-title">En 3 pasos, listo.</h2>
        <p className="section-sub">
          No necesitas experiencia técnica. Si puedes copiar un enlace, puedes crear un QR.
        </p>
        <div className="steps">
          <div className="step">
            <div className="step-icon"><QrCode size={22} /></div>
            <div className="step-num">PASO 1</div>
            <div className="step-title">Pega tu enlace</div>
            <p className="step-desc">
              Cualquier URL funciona — tu web, WhatsApp, menú digital, perfil de Instagram, lo que quieras.
            </p>
          </div>
          <div className="step">
            <div className="step-icon"><Zap size={22} /></div>
            <div className="step-num">PASO 2</div>
            <div className="step-title">Personaliza</div>
            <p className="step-desc">
              Elige colores, estilo y agrega tu logo. Tu QR reflejará la identidad de tu marca.
            </p>
          </div>
          <div className="step">
            <div className="step-icon"><BarChart2 size={22} /></div>
            <div className="step-num">PASO 3</div>
            <div className="step-title">Mide y optimiza</div>
            <p className="step-desc">
              Ve cuántas personas escanean tu QR, desde dónde y cuándo. Datos reales para decisiones reales.
            </p>
          </div>
        </div>
      </section>

      <hr className="divider" />

      {/* ── Features ──────────────────────────────────────────── */}
      <section className="section">
        <div className="section-label">Por qué elegirnos</div>
        <h2 className="section-title">Todo lo que necesitas.<br />Nada de lo que no.</h2>
        <div className="features-grid">
          {[
            { icon: <QrCode size={20} />, title: 'QR permanentes', desc: 'En planes de pago, tus QR no expiran nunca. Imprímelos en tarjetas, menús o flyers sin preocupaciones.' },
            { icon: <BarChart2 size={20} />, title: 'Analytics en tiempo real', desc: 'Escaneos por día, hora y ubicación. Sabe exactamente cuándo tu campaña está funcionando.' },
            { icon: <Shield size={20} />, title: 'Seguro y confiable', desc: 'HTTPS en todos los redirects. Tus datos y los de tus usuarios siempre protegidos.' },
            { icon: <RefreshCw size={20} />, title: 'URL editable', desc: 'Cambia el destino de tu QR sin necesidad de imprimir uno nuevo. El código físico siempre funciona.' },
          ].map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <hr className="divider" />

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section className="section" id="precios">
        <div className="section-label">Precios</div>
        <h2 className="section-title">Simple y transparente.</h2>
        <p className="section-sub">
          Empieza gratis. Paga solo cuando necesites más. Sin sorpresas.
        </p>
        <div className="plans-grid">
          {plans.map((p, i) => <PlanCard key={i} {...p} />)}
        </div>
        <p style={{ textAlign: 'center', marginTop: 32, fontSize: 13, color: '#9ca3af' }}>
          Pagos procesados por Stripe · Cancela cuando quieras · IVA incluido
        </p>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────── */}
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="cta-banner">
          <h2>Tu primer QR en menos de un minuto.</h2>
          <p>Sin tarjeta de crédito. Sin contratos. Solo resultados.</p>
          <Link to="/register" className="btn-primary" style={{ display: 'inline-flex' }}>
            Crear cuenta gratis <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', borderTop: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13, color: '#9ca3af', flexWrap: 'wrap', gap: 12 }}>
        <div className="footer-logo">
          <QrCode size={16} /> QR Service
        </div>
        <div>© {new Date().getFullYear()} QR Service. Todos los derechos reservados.</div>
        <div style={{ display: 'flex', gap: 16 }}>
          <Link to="/login" style={{ color: '#9ca3af' }}>Iniciar sesión</Link>
          <Link to="/register" style={{ color: '#5B21B6', fontWeight: 600 }}>Registrarse</Link>
        </div>
      </footer>
    </div>
  )
}