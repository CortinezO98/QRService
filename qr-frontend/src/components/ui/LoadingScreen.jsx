import { QrCode } from 'lucide-react'

export default function LoadingScreen({ label = 'Cargando...' }) {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass-card flex flex-col items-center rounded-3xl p-8 text-center">
        <div className="relative mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow">
          <QrCode size={30} />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/30" />
        </div>
        <p className="text-sm font-semibold text-ink-600">{label}</p>
      </div>
    </div>
  )
}
