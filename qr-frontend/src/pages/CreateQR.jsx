import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { ArrowLeft, Search, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI } from '../api/client'

// ── Tipos con iconos y categorías ─────────────────────────────
const QR_TYPES = [
  // Básico
  { type: "url",          label: "Enlace / URL",        icon: "🔗", category: "Básico",
    fields: [{ name: "url", label: "URL", type: "url", placeholder: "https://tu-sitio.com", required: true }] },
  { type: "text",         label: "Texto",               icon: "📝", category: "Básico",
    fields: [{ name: "text", label: "Texto", type: "textarea", placeholder: "Escribe tu texto aquí", required: true }] },
  { type: "whatsapp",     label: "WhatsApp",            icon: "💬", category: "Básico",
    fields: [
      { name: "phone",   label: "Número (con código país)", type: "tel", placeholder: "+57 300 123 4567", required: true },
      { name: "message", label: "Mensaje predeterminado",   type: "textarea", placeholder: "Hola, me contacto desde tu QR" },
    ] },
  { type: "email",        label: "Correo electrónico",  icon: "📧", category: "Básico",
    fields: [
      { name: "email",   label: "Email",   type: "email", placeholder: "contacto@empresa.com", required: true },
      { name: "subject", label: "Asunto",  type: "text",  placeholder: "Hola desde tu QR" },
      { name: "body",    label: "Mensaje", type: "textarea" },
    ] },
  { type: "phone",        label: "Llamada telefónica",  icon: "📞", category: "Básico",
    fields: [{ name: "phone", label: "Número", type: "tel", placeholder: "+57 300 123 4567", required: true }] },
  { type: "sms",          label: "SMS",                 icon: "✉️", category: "Básico",
    fields: [
      { name: "phone",   label: "Número", type: "tel", required: true },
      { name: "message", label: "Mensaje", type: "textarea" },
    ] },

  // Negocios
  { type: "vcard",        label: "vCard (Contacto)",    icon: "👤", category: "Negocios",
    fields: [
      { name: "first_name", label: "Nombre",    type: "text", required: true },
      { name: "last_name",  label: "Apellido",  type: "text" },
      { name: "org",        label: "Empresa",   type: "text" },
      { name: "title",      label: "Cargo",     type: "text" },
      { name: "phone",      label: "Teléfono",  type: "tel" },
      { name: "email",      label: "Email",     type: "email" },
      { name: "website",    label: "Sitio web", type: "url" },
      { name: "address",    label: "Dirección", type: "text" },
    ] },
  { type: "maps",         label: "Google Maps",         icon: "📍", category: "Negocios",
    fields: [{ name: "address", label: "Dirección o lugar", type: "text", placeholder: "Calle 93 #13-24, Bogotá", required: true }] },
  { type: "wifi",         label: "Wi-Fi",               icon: "📶", category: "Negocios",
    fields: [
      { name: "ssid",     label: "Nombre de la red", type: "text", required: true },
      { name: "password", label: "Contraseña",       type: "password" },
      { name: "security", label: "Seguridad",        type: "select", options: ["WPA", "WEP", "nopass"] },
    ] },
  { type: "pdf",          label: "PDF",                 icon: "📄", category: "Negocios",
    fields: [{ name: "url", label: "URL del PDF", type: "url", required: true }] },
  { type: "booking",      label: "Reserva en línea",    icon: "🗓️", category: "Negocios",
    fields: [{ name: "url", label: "URL de reserva", type: "url", required: true }] },
  { type: "googlereview", label: "Google Review",       icon: "⭐", category: "Negocios",
    fields: [{ name: "url", label: "URL de reseñas Google", type: "url", required: true }] },
  { type: "paypal",       label: "PayPal",              icon: "💳", category: "Negocios",
    fields: [
      { name: "email",    label: "Email PayPal", type: "email", required: true },
      { name: "amount",   label: "Monto",        type: "number" },
      { name: "currency", label: "Moneda",       type: "text", placeholder: "USD" },
    ] },
  { type: "etsy",         label: "Etsy",                icon: "🛍️", category: "Negocios",
    fields: [{ name: "url", label: "URL de tu tienda Etsy", type: "url", required: true }] },

  // Redes Sociales
  { type: "instagram",    label: "Instagram",           icon: "📸", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario (@)", type: "text", placeholder: "miusuario", required: true }] },
  { type: "facebook",     label: "Facebook",            icon: "👍", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL de perfil/página", type: "url", required: true }] },
  { type: "tiktok",       label: "TikTok",              icon: "🎵", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario (@)", type: "text", required: true }] },
  { type: "twitter",      label: "X (Twitter)",         icon: "🐦", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario (@)", type: "text", required: true }] },
  { type: "linkedin",     label: "LinkedIn",            icon: "💼", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario de LinkedIn", type: "text", required: true }] },
  { type: "telegram",     label: "Telegram",            icon: "✈️", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario (@)", type: "text", required: true }] },
  { type: "snapchat",     label: "Snapchat",            icon: "👻", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario", type: "text", required: true }] },
  { type: "reddit",       label: "Reddit",              icon: "🤖", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario u/", type: "text", required: true }] },
  { type: "youtube",      label: "YouTube",             icon: "▶️", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL del canal o video", type: "url", required: true }] },
  { type: "spotify",      label: "Spotify",             icon: "🎵", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL de Spotify", type: "url", required: true }] },
  { type: "linktree",     label: "Linktree",            icon: "🌳", category: "Redes Sociales",
    fields: [{ name: "username", label: "Usuario", type: "text", required: true }] },
  { type: "wechat",       label: "WeChat",              icon: "💬", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL de WeChat", type: "url", required: true }] },
  { type: "line",         label: "Line",                icon: "💬", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL de Line", type: "url", required: true }] },
  { type: "kakaotalk",    label: "KakaoTalk",           icon: "💛", category: "Redes Sociales",
    fields: [{ name: "url", label: "URL de KakaoTalk", type: "url", required: true }] },

  // Pagos
  { type: "crypto",       label: "Pago criptográfico",  icon: "₿", category: "Pagos",
    fields: [
      { name: "coin",    label: "Moneda", type: "select", options: ["bitcoin", "ethereum", "litecoin"] },
      { name: "address", label: "Dirección", type: "text", required: true },
      { name: "amount",  label: "Monto", type: "number" },
    ] },
  { type: "upi",          label: "UPI",                 icon: "💳", category: "Pagos",
    fields: [
      { name: "vpa",    label: "UPI VPA", type: "text", required: true },
      { name: "name",   label: "Nombre",  type: "text" },
      { name: "amount", label: "Monto",   type: "number" },
    ] },
  { type: "venmo",        label: "Venmo",               icon: "💸", category: "Pagos",
    fields: [{ name: "username", label: "Usuario Venmo", type: "text", required: true }] },

  // Documentos
  { type: "googledoc",    label: "Google Doc",          icon: "📃", category: "Documentos",
    fields: [{ name: "url", label: "URL del documento", type: "url", required: true }] },
  { type: "googleforms",  label: "Google Forms",        icon: "📋", category: "Documentos",
    fields: [{ name: "url", label: "URL del formulario", type: "url", required: true }] },
  { type: "googlesheets", label: "Google Sheets",       icon: "📊", category: "Documentos",
    fields: [{ name: "url", label: "URL de la hoja", type: "url", required: true }] },
  { type: "office365",    label: "Office 365",          icon: "📎", category: "Documentos",
    fields: [{ name: "url", label: "URL de Office 365", type: "url", required: true }] },
  { type: "pptx",         label: "Presentación",        icon: "📊", category: "Documentos",
    fields: [{ name: "url", label: "URL de la presentación", type: "url", required: true }] },
  { type: "excel",        label: "Excel",               icon: "📈", category: "Documentos",
    fields: [{ name: "url", label: "URL del Excel", type: "url", required: true }] },
  { type: "archivo",      label: "Archivo",             icon: "📁", category: "Documentos",
    fields: [{ name: "url", label: "URL del archivo", type: "url", required: true }] },
  { type: "png",          label: "PNG / Imagen",        icon: "🖼️", category: "Documentos",
    fields: [{ name: "url", label: "URL de la imagen", type: "url", required: true }] },
  { type: "video",        label: "Video",               icon: "🎬", category: "Documentos",
    fields: [{ name: "url", label: "URL del video", type: "url", required: true }] },

  // Eventos
  { type: "calendar",     label: "Evento / Calendar",   icon: "📅", category: "Eventos",
    fields: [
      { name: "title",       label: "Título", type: "text", required: true },
      { name: "start",       label: "Inicio", type: "datetime-local", required: true },
      { name: "end",         label: "Fin",    type: "datetime-local" },
      { name: "location",    label: "Lugar",  type: "text" },
      { name: "description", label: "Notas",  type: "textarea" },
    ] },

  // Otros
  { type: "amazon",       label: "Amazon",              icon: "📦", category: "Otros",
    fields: [{ name: "url", label: "URL del producto", type: "url", required: true }] },
  { type: "pcr",          label: "PCR",                 icon: "🔲", category: "Otros",
    fields: [{ name: "data", label: "Datos del código", type: "text", required: true }] },
  { type: "barcode2d",    label: "Código de barras 2D", icon: "⬛", category: "Otros",
    fields: [{ name: "data", label: "Datos", type: "text", required: true }] },
]

const CATEGORIES = [...new Set(QR_TYPES.map(t => t.category))]

const STYLES = [
  { value: 'square',  label: '■ Cuadrado' },
  { value: 'rounded', label: '⬛ Redondeado' },
  { value: 'circle',  label: '● Círculo' },
]

// ── Preview content generator (client-side) ───────────────────
function getPreviewContent(type, payload) {
  try {
    if (type === 'url')       return payload.url || 'https://qrservice.com'
    if (type === 'whatsapp')  return `https://wa.me/${(payload.phone||'').replace(/\D/g,'')}`
    if (type === 'email')     return `mailto:${payload.email || 'ejemplo@email.com'}`
    if (type === 'phone')     return `tel:${payload.phone || '+1234567890'}`
    if (type === 'sms')       return `sms:${payload.phone || ''}`
    if (type === 'wifi')      return `WIFI:T:${payload.security||'WPA'};S:${payload.ssid||'MiWiFi'};P:${payload.password||''};;`
    if (type === 'vcard')     return `BEGIN:VCARD\nFN:${payload.first_name||''} ${payload.last_name||''}\nEND:VCARD`
    if (type === 'maps')      return `https://maps.google.com/?q=${encodeURIComponent(payload.address||'')}`
    if (type === 'instagram') return `https://instagram.com/${payload.username||''}`
    if (type === 'twitter')   return `https://x.com/${payload.username||''}`
    if (type === 'tiktok')    return `https://tiktok.com/@${payload.username||''}`
    if (type === 'telegram')  return `https://t.me/${payload.username||''}`
    if (type === 'crypto')    return `${payload.coin||'bitcoin'}:${payload.address||''}`
    if (type === 'calendar')  return `BEGIN:VCALENDAR\nSUMMARY:${payload.title||''}\nEND:VCALENDAR`
    return payload.url || payload.text || payload.data || `https://qrservice.com/${type}`
  } catch { return 'https://qrservice.com' }
}

export default function CreateQR() {
  const navigate = useNavigate()
  const [step, setStep]             = useState(1) // 1=selector, 2=formulario
  const [search, setSearch]         = useState('')
  const [selectedType, setSelectedType] = useState(null)
  const [showMore, setShowMore]     = useState(false)
  const [payload, setPayload]       = useState({})
  const [title, setTitle]           = useState('')
  const [style, setStyle]           = useState({
    foreground_color: '#000000',
    background_color: '#FFFFFF',
    module_style: 'square',
    error_correction: 'M',
    box_size: 10,
    border: 4,
  })
  const [loading, setLoading]       = useState(false)

  const filtered = QR_TYPES.filter(t =>
    t.label.toLowerCase().includes(search.toLowerCase()) ||
    t.category.toLowerCase().includes(search.toLowerCase())
  )

  const visible = showMore ? filtered : filtered.slice(0, 24)

  const setField = (name, val) => setPayload(p => ({ ...p, [name]: val }))

  const previewContent = selectedType
    ? getPreviewContent(selectedType.type, payload)
    : 'https://qrservice.com'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await qrAPI.create({
        qr_type: selectedType.type,
        title: title || undefined,
        payload,
        style,
      })
      toast.success('¡QR creado exitosamente!')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail?.message || 'Error al crear el QR'
      toast.error(msg)
      if (err.response?.status === 403) setTimeout(() => navigate('/billing'), 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      <button
        onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280',
                 background: 'none', border: 'none', cursor: 'pointer', marginBottom: 24,
                 fontSize: 14, fontWeight: 500 }}
      >
        <ArrowLeft size={18} /> {step === 1 ? 'Volver al dashboard' : 'Cambiar tipo'}
      </button>

      {/* ── Stepper ───────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32 }}>
        {['Elige el tipo', 'Configura tu QR'].map((label, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i === 0 ? 'none' : 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700,
                background: step > i ? '#5B21B6' : step === i + 1 ? '#5B21B6' : '#e5e7eb',
                color: step >= i + 1 ? 'white' : '#9ca3af',
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 14, fontWeight: 600,
                color: step === i + 1 ? '#5B21B6' : step > i + 1 ? '#374151' : '#9ca3af' }}>
                {label}
              </span>
            </div>
            {i === 0 && (
              <div style={{ flex: 1, height: 2, background: step > 1 ? '#5B21B6' : '#e5e7eb',
                           margin: '0 16px', borderRadius: 2 }} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Selector de tipo ──────────────────────── */}
      {step === 1 && (
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 6 }}>
            Todo tipo de códigos QR
          </h1>
          <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24 }}>
            Selecciona el tipo de QR que quieres crear
          </p>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: 24, maxWidth: 380 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%',
              transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type="text" placeholder="Tipo de búsqueda"
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 36px',
                border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14,
                outline: 'none', color: '#374151' }}
            />
          </div>

          {/* Grid de tipos */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 10,
          }}>
            {visible.map(t => (
              <button
                key={t.type}
                onClick={() => { setSelectedType(t); setPayload({}); setStep(2) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '14px 16px', background: 'white',
                  border: '1px solid #e5e7eb', borderRadius: 12, cursor: 'pointer',
                  textAlign: 'left', transition: 'border-color .15s, box-shadow .15s',
                  gap: 8,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#7C3AED'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(124,58,237,.1)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.boxShadow = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{t.label}</span>
                </div>
                <span style={{ color: '#7C3AED', fontWeight: 700, fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>

          {filtered.length > 24 && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <button
                onClick={() => setShowMore(v => !v)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                         background: 'none', border: 'none', color: '#7C3AED',
                         fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {showMore ? <><ChevronUp size={16} /> Ver menos</> : <><ChevronDown size={16} /> Ver más</>}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Formulario + Preview ─────────────────── */}
      {step === 2 && selectedType && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 32, alignItems: 'start' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header del tipo seleccionado */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12,
                         background: '#F5F3FF', borderRadius: 14, padding: '14px 18px' }}>
              <span style={{ fontSize: 28 }}>{selectedType.icon}</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 18 }}>{selectedType.label}</div>
                <div style={{ fontSize: 12, color: '#7C3AED', fontWeight: 600 }}>{selectedType.category}</div>
              </div>
            </div>

            {/* Título */}
            <div>
              <label style={labelStyle}>Título (opcional)</label>
              <input
                type="text" value={title}
                onChange={e => setTitle(e.target.value)} maxLength={255}
                placeholder={`Mi QR de ${selectedType.label}`}
                style={inputStyle}
              />
            </div>

            {/* Campos dinámicos por tipo */}
            {selectedType.fields.map(field => (
              <div key={field.name}>
                <label style={labelStyle}>
                  {field.label}
                  {field.required && <span style={{ color: '#ef4444' }}> *</span>}
                </label>
                {field.type === 'textarea' ? (
                  <textarea
                    value={payload[field.name] || ''}
                    onChange={e => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    rows={3}
                    style={{ ...inputStyle, resize: 'vertical', height: 80 }}
                  />
                ) : field.type === 'select' ? (
                  <select
                    value={payload[field.name] || field.options?.[0] || ''}
                    onChange={e => setField(field.name, e.target.value)}
                    style={inputStyle}
                  >
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    value={payload[field.name] || ''}
                    onChange={e => setField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    required={field.required}
                    style={inputStyle}
                  />
                )}
              </div>
            ))}

            {/* Estilo */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Personalización</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                {STYLES.map(s => (
                  <button
                    key={s.value} type="button"
                    onClick={() => setStyle(st => ({ ...st, module_style: s.value }))}
                    style={{
                      padding: '9px 4px', borderRadius: 10, border: '1.5px solid',
                      fontWeight: 600, fontSize: 12, cursor: 'pointer', transition: 'all .15s',
                      borderColor: style.module_style === s.value ? '#5B21B6' : '#e5e7eb',
                      background: style.module_style === s.value ? '#F5F3FF' : 'white',
                      color: style.module_style === s.value ? '#5B21B6' : '#6b7280',
                    }}
                  >{s.label}</button>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
                <div>
                  <label style={labelStyle}>Color QR</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={style.foreground_color}
                      onChange={e => setStyle(s => ({ ...s, foreground_color: e.target.value }))}
                      style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{style.foreground_color}</span>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Fondo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input type="color" value={style.background_color}
                      onChange={e => setStyle(s => ({ ...s, background_color: e.target.value }))}
                      style={{ width: 40, height: 40, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} />
                    <span style={{ fontSize: 12, color: '#6b7280' }}>{style.background_color}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                padding: '14px', borderRadius: 14, background: '#5B21B6', color: 'white',
                fontWeight: 700, fontSize: 16, border: 'none', cursor: 'pointer',
                opacity: loading ? .6 : 1, transition: 'background .15s',
              }}
            >
              {loading ? 'Creando QR...' : `Crear QR de ${selectedType.label}`}
            </button>
          </form>

          {/* Preview sticky */}
          <div style={{ position: 'sticky', top: 80, background: 'white',
                       border: '1px solid #f3f4f6', borderRadius: 20, padding: 28,
                       display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#9ca3af' }}>Vista previa</div>
            <div style={{ padding: 16, background: '#fafafa', borderRadius: 16 }}>
              <QRCodeSVG
                value={previewContent}
                size={200}
                fgColor={style.foreground_color}
                bgColor={style.background_color}
                level={style.error_correction}
              />
            </div>
            <div style={{ textAlign: 'center', fontSize: 12, color: '#9ca3af',
                         wordBreak: 'break-all', maxWidth: 280 }}>
              {previewContent.length > 80 ? previewContent.slice(0, 80) + '...' : previewContent}
            </div>
            <div style={{ background: '#F5F3FF', borderRadius: 10, padding: '8px 14px',
                         fontSize: 12, color: '#5B21B6', fontWeight: 600, display: 'flex',
                         alignItems: 'center', gap: 6 }}>
              <span>{selectedType.icon}</span> {selectedType.label}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
}

const inputStyle = {
  width: '100%', padding: '10px 14px',
  border: '1px solid #e5e7eb', borderRadius: 10, fontSize: 14,
  outline: 'none', color: '#374151', background: 'white',
  transition: 'border-color .15s',
}