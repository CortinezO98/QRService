import { XCircle } from 'lucide-react'
import Button from '../components/ui/Button'

export default function BillingCancel() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-ink-100 text-ink-400">
        <XCircle size={42} />
      </div>
      <h1 className="text-4xl font-black tracking-tight text-ink-950">Pago cancelado</h1>
      <p className="mt-3 leading-7 text-ink-500">
        No se realizó ningún cargo. Puedes volver a intentarlo cuando quieras.
      </p>
      <div className="mt-8 grid w-full gap-3">
        <Button to="/billing">Ver planes de nuevo</Button>
        <Button to="/dashboard" variant="secondary">Volver al dashboard</Button>
      </div>
    </div>
  )
}
