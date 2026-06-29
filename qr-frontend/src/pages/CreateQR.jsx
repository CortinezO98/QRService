import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronUp,
  Link as LinkIcon,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Type,
  UserRound,
  Wifi,
  Palette,
  Sparkles,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { qrAPI } from '../api/client'
import Button from '../components/ui/Button'
import PageHeader from '../components/ui/PageHeader'
import { Card, CardBody } from '../components/ui/Card'
import Badge from '../components/ui/Badge'
import { cx } from '../lib/format'

const QR_TYPES = [
  {
    type: 'url',
    label: 'Enlace / URL',
    icon: LinkIcon,
    emoji: '🔗',
    category: 'Esenciales',
    description: 'Web, landing, menú digital o documento público.',
    fields: [{ name: 'url', label: 'URL', type: 'url', placeholder: 'https://tu-sitio.com', required: true }],
  },
  {
    type: 'whatsapp',
    label: 'WhatsApp',
    icon: MessageCircle,
    emoji: '💬',
    category: 'Esenciales',
    description: 'Abre una conversación con mensaje predeterminado.',
    fields: [
      { name: 'phone', label: 'Número con código país', type: 'tel', placeholder: '+57 300 123 4567', required: true },
      { name: 'message', label: 'Mensaje predeterminado', type: 'textarea', placeholder: 'Hola, me contacto desde tu QR' },
    ],
  },
  {
    type: 'vcard',
    label: 'vCard / contacto',
    icon: UserRound,
    emoji: '👤',
    category: 'Negocios',
    description: 'Comparte datos de contacto profesionales.',
    fields: [
      { name: 'first_name', label: 'Nombre', type: 'text', required: true },
      { name: 'last_name', label: 'Apellido', type: 'text' },
      { name: 'org', label: 'Empresa', type: 'text' },
      { name: 'title', label: 'Cargo', type: 'text' },
      { name: 'phone', label: 'Teléfono', type: 'tel' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'website', label: 'Sitio web', type: 'url' },
    ],
  },
  {
    type: 'maps',
    label: 'Google Maps',
    icon: MapPin,
    emoji: '📍',
    category: 'Negocios',
    description: 'Ubicación de tienda, evento u oficina.',
    fields: [{ name: 'address', label: 'Dirección o lugar', type: 'text', placeholder: 'Calle 93 #13-24, Bogotá', required: true }],
  },
  {
    type: 'wifi',
    label: 'Wi-Fi',
    icon: Wifi,
    emoji: '📶',
    category: 'Negocios',
    description: 'Conecta visitantes a tu red en segundos.',
    fields: [
      { name: 'ssid', label: 'Nombre de la red', type: 'text', required: true },
      { name: 'password', label: 'Contraseña', type: 'password' },
      { name: 'security', label: 'Seguridad', type: 'select', options: ['WPA', 'WEP', 'nopass'] },
    ],
  },
  {
    type: 'email',
    label: 'Correo electrónico',
    icon: Mail,
    emoji: '📧',
    category: 'Esenciales',
    description: 'Prepara un correo con asunto y mensaje.',
    fields: [
      { name: 'email', label: 'Email', type: 'email', placeholder: 'contacto@empresa.com', required: true },
      { name: 'subject', label: 'Asunto', type: 'text' },
      { name: 'body', label: 'Mensaje', type: 'textarea' },
    ],
  },
  {
    type: 'phone',
    label: 'Llamada',
    icon: Phone,
    emoji: '📞',
    category: 'Esenciales',
    description: 'Inicia una llamada al escanear.',
    fields: [{ name: 'phone', label: 'Número', type: 'tel', placeholder: '+57 300 123 4567', required: true }],
  },
  {
    type: 'text',
    label: 'Texto',
    icon: Type,
    emoji: '📝',
    category: 'Esenciales',
    description: 'Guarda un texto corto o instrucción.',
    fields: [{ name: 'text', label: 'Texto', type: 'textarea', placeholder: 'Escribe tu texto aquí', required: true }],
  },
  ...[
    ['pdf', 'PDF', '📄', 'Documentos', 'URL pública de un PDF'],
    ['googleforms', 'Google Forms', '📋', 'Documentos', 'Formulario de registro o encuesta'],
    ['instagram', 'Instagram', '📸', 'Redes Sociales', 'Perfil o usuario de Instagram'],
    ['tiktok', 'TikTok', '🎵', 'Redes Sociales', 'Perfil de TikTok'],
    ['linkedin', 'LinkedIn', '💼', 'Redes Sociales', 'Perfil profesional'],
    ['youtube', 'YouTube', '▶️', 'Redes Sociales', 'Canal o video'],
    ['booking', 'Reserva online', '🗓️', 'Negocios', 'Página de reservas'],
    ['googlereview', 'Google Review', '⭐', 'Negocios', 'Página para reseñas'],
    ['video', 'Video', '🎬', 'Documentos', 'Enlace a video'],
  ].map(([type, label, emoji, category, description]) => ({
    type,
    label,
    emoji,
    icon: LinkIcon,
    category,
    description,
    fields: [{ name: type === 'instagram' || type === 'tiktok' ? 'username' : 'url', label: type === 'instagram' || type === 'tiktok' ? 'Usuario' : 'URL', type: type === 'instagram' || type === 'tiktok' ? 'text' : 'url', required: true }],
  })),
]

const STYLES = [
  { value: 'square', label: 'Cuadrado' },
  { value: 'rounded', label: 'Redondeado' },
  { value: 'circle', label: 'Círculo' },
]

function getPreviewContent(type, payload) {
  if (type === 'url') return payload.url || 'https://qrservice.com'
  if (type === 'whatsapp') return `https://wa.me/${(payload.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(payload.message || '')}`
  if (type === 'email') return `mailto:${payload.email || 'contacto@empresa.com'}?subject=${encodeURIComponent(payload.subject || '')}`
  if (type === 'phone') return `tel:${payload.phone || '+573001234567'}`
  if (type === 'wifi') return `WIFI:T:${payload.security || 'WPA'};S:${payload.ssid || 'MiWiFi'};P:${payload.password || ''};;`
  if (type === 'maps') return `https://maps.google.com/?q=${encodeURIComponent(payload.address || '')}`
  if (type === 'vcard') return `BEGIN:VCARD\nVERSION:3.0\nFN:${payload.first_name || ''} ${payload.last_name || ''}\nORG:${payload.org || ''}\nTEL:${payload.phone || ''}\nEMAIL:${payload.email || ''}\nEND:VCARD`
  if (type === 'instagram') return `https://instagram.com/${String(payload.username || '').replace('@', '')}`
  if (type === 'tiktok') return `https://tiktok.com/@${String(payload.username || '').replace('@', '')}`
  if (type === 'text') return payload.text || 'Texto de ejemplo'
  return payload.url || payload.username || payload.text || 'https://qrservice.com'
}

function DynamicField({ field, value, onChange }) {
  return (
    <div>
      <label className="label">
        {field.label}
        {field.required && <span className="text-red-500"> *</span>}
      </label>

      {field.type === 'textarea' ? (
        <textarea
          value={value || ''}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          rows={4}
          className="input-field resize-y"
        />
      ) : field.type === 'select' ? (
        <select value={value || field.options?.[0] || ''} onChange={(event) => onChange(field.name, event.target.value)} className="input-field">
          {field.options?.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          type={field.type}
          value={value || ''}
          onChange={(event) => onChange(field.name, event.target.value)}
          placeholder={field.placeholder}
          required={field.required}
          className="input-field"
        />
      )}
    </div>
  )
}

export default function CreateQR() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedCampaignId = searchParams.get('campaign_id')

  const [step, setStep] = useState(1)
  const [search, setSearch] = useState('')
  const [showMore, setShowMore] = useState(false)
  const [selectedType, setSelectedType] = useState(QR_TYPES[0])
  const [payload, setPayload] = useState({})
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [style, setStyle] = useState({
    foreground_color: '#111827',
    background_color: '#ffffff',
    module_style: 'rounded',
    error_correction: 'M',
    box_size: 10,
    border: 4,
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return QR_TYPES.filter((item) => !q || [item.label, item.category, item.description].some((value) => value.toLowerCase().includes(q)))
  }, [search])

  const visible = showMore ? filtered : filtered.slice(0, 12)
  const previewContent = getPreviewContent(selectedType.type, payload)

  const setField = (name, value) => setPayload((prev) => ({ ...prev, [name]: value }))

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)

    try {
      const body = {
        qr_type: selectedType.type,
        title: title || `QR de ${selectedType.label}`,
        payload,
        style,
      }

      if (preselectedCampaignId) body.campaign_id = preselectedCampaignId

      const { data } = await qrAPI.create(body)
      toast.success('QR creado exitosamente')
      navigate(data?.id ? `/qr/${data.id}` : '/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail?.message || err.response?.data?.detail || 'Error al crear el QR'
      toast.error(typeof msg === 'string' ? msg : 'Error al crear el QR')
      if (err.response?.status === 403) setTimeout(() => navigate('/billing'), 1200)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PageHeader
        backTo="/dashboard"
        backLabel="Dashboard"
        eyebrow={<><Sparkles size={13} /> Constructor inteligente</>}
        title="Crea un QR profesional"
        description="Elige el tipo, personaliza el diseño y revisa la vista previa antes de publicarlo."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        {['Elige el tipo', 'Configura y publica'].map((label, index) => {
          const active = step === index + 1
          const done = step > index + 1
          return (
            <div key={label} className={cx('rounded-2xl border p-4', active ? 'border-brand-300 bg-brand-50 text-brand-800' : done ? 'border-green-200 bg-green-50 text-green-700' : 'border-ink-200 bg-white text-ink-400')}>
              <div className="flex items-center gap-3">
                <span className={cx('flex h-8 w-8 items-center justify-center rounded-xl text-sm font-black', active ? 'bg-brand-700 text-white' : done ? 'bg-green-600 text-white' : 'bg-ink-100 text-ink-400')}>
                  {done ? <Check size={16} /> : index + 1}
                </span>
                <span className="font-black">{label}</span>
              </div>
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <Card>
          <CardBody>
            <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-black text-ink-950">¿Qué tipo de QR necesitas?</h2>
                <p className="mt-1 text-sm text-ink-500">Mostramos los más usados primero para que no pierdas tiempo.</p>
              </div>
              <div className="relative w-full lg:max-w-sm">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-400" size={18} />
                <input className="input-field pl-11" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar tipo, categoría..." />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((item) => {
                const Icon = item.icon || LinkIcon
                return (
                  <button
                    key={item.type}
                    onClick={() => {
                      setSelectedType(item)
                      setPayload({})
                      setTitle('')
                      setStep(2)
                    }}
                    className="group rounded-3xl border border-ink-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                          <Icon size={22} />
                        </div>
                        <div>
                          <h3 className="font-black text-ink-950">{item.label}</h3>
                          <p className="mt-1 text-xs leading-5 text-ink-500">{item.description}</p>
                        </div>
                      </div>
                      <ArrowRight className="text-ink-300 transition group-hover:translate-x-1 group-hover:text-brand-600" size={18} />
                    </div>
                    <Badge variant="brand" className="mt-4">{item.category}</Badge>
                  </button>
                )
              })}
            </div>

            {filtered.length > 12 && (
              <div className="mt-6 text-center">
                <Button variant="secondary" onClick={() => setShowMore((value) => !value)}>
                  {showMore ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showMore ? 'Ver menos' : 'Ver más tipos'}
                </Button>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {step === 2 && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">
          <form onSubmit={handleSubmit} className="grid gap-6">
            <Card>
              <CardBody>
                <div className="mb-6 flex items-center gap-4 rounded-3xl bg-brand-50 p-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                    {selectedType.emoji}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-ink-950">{selectedType.label}</h2>
                    <p className="text-sm font-semibold text-brand-700">{selectedType.category}</p>
                  </div>
                  <Button type="button" variant="secondary" size="sm" className="ml-auto" onClick={() => setStep(1)}>
                    Cambiar
                  </Button>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="label">Título del QR</label>
                    <input
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      maxLength={255}
                      placeholder={`Mi ${selectedType.label}`}
                      className="input-field"
                    />
                  </div>

                  {selectedType.fields.map((field) => (
                    <DynamicField key={field.name} field={field} value={payload[field.name]} onChange={setField} />
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="mb-5 flex items-center gap-2">
                  <Palette size={18} className="text-brand-700" />
                  <h3 className="font-black text-ink-950">Personalización visual</h3>
                </div>

                <div className="grid gap-5">
                  <div>
                    <label className="label">Estilo de módulos</label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {STYLES.map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => setStyle((prev) => ({ ...prev, module_style: item.value }))}
                          className={cx('rounded-2xl border px-4 py-3 text-sm font-black transition', style.module_style === item.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-ink-200 bg-white text-ink-500 hover:border-brand-200')}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="label">Color del QR</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={style.foreground_color} onChange={(event) => setStyle((prev) => ({ ...prev, foreground_color: event.target.value }))} className="h-12 w-14 cursor-pointer rounded-2xl border border-ink-200 bg-white p-1" />
                        <span className="font-mono text-sm font-bold text-ink-500">{style.foreground_color}</span>
                      </div>
                    </div>
                    <div>
                      <label className="label">Color de fondo</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={style.background_color} onChange={(event) => setStyle((prev) => ({ ...prev, background_color: event.target.value }))} className="h-12 w-14 cursor-pointer rounded-2xl border border-ink-200 bg-white p-1" />
                        <span className="font-mono text-sm font-bold text-ink-500">{style.background_color}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="secondary" onClick={() => setStep(1)}>Volver</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando QR...' : 'Crear QR profesional'}
                {!loading && <ArrowRight size={17} />}
              </Button>
            </div>
          </form>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <Card className="overflow-hidden">
              <div className="border-b border-ink-100 bg-gradient-to-br from-brand-50 to-white p-5">
                <p className="text-sm font-black text-ink-950">Vista previa</p>
                <p className="text-xs text-ink-500">Así se verá tu QR antes de guardarlo.</p>
              </div>
              <CardBody>
                <div className="mx-auto flex max-w-xs flex-col items-center">
                  <div className="rounded-[2rem] border border-ink-100 bg-white p-5 shadow-card">
                    <QRCodeSVG
                      value={previewContent}
                      size={230}
                      fgColor={style.foreground_color}
                      bgColor={style.background_color}
                      level={style.error_correction}
                    />
                  </div>
                  <Badge variant="brand" className="mt-5">{selectedType.emoji} {selectedType.label}</Badge>
                  <p className="mt-4 max-w-full break-words text-center text-xs leading-5 text-ink-400">
                    {previewContent.length > 120 ? `${previewContent.slice(0, 120)}...` : previewContent}
                  </p>
                </div>
              </CardBody>
            </Card>
          </aside>
        </div>
      )}
    </>
  )
}
