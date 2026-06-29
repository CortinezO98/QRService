import { QrCode } from 'lucide-react'

export default function LoadingScreen({ label = 'Cargando...' }) {
  return (
    <div className="app-bg flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-ink-200/70 bg-white p-10 shadow-soft text-center">
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-700 text-white shadow-glow-sm">
          <QrCode size={26} />
          <span className="absolute inset-0 animate-ping rounded-2xl bg-brand-500/20" />
        </div>
        <p className="text-sm font-semibold text-ink-500">{label}</p>
      </div>
    </div>
  )
}
