import { useEffect, useState } from 'react'
import { CheckCircle, QrCode, BarChart2, ArrowRight } from 'lucide-react'
import { billingAPI } from '../api/client'
import Button from '../components/ui/Button'
import { Card, CardBody } from '../components/ui/Card'
import { planLabels } from '../lib/format'

export default function BillingSuccess() {
  const [subscription, setSubscription] = useState(null)

  useEffect(() => {
    billingAPI.status().then(({ data }) => setSubscription(data)).catch(() => {})
  }, [])

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-green-50 text-green-600 ring-1 ring-green-200">
        <CheckCircle size={42} />
      </div>
      <h1 className="text-4xl font-black tracking-tight text-ink-950">Pago exitoso</h1>
      <p className="mt-3 text-ink-500">
        Tu plan <strong className="capitalize text-green-700">{planLabels[subscription?.plan] || subscription?.plan || 'pago'}</strong> está activo.
      </p>

      <Card className="mt-8 w-full">
        <CardBody>
          <p className="mb-4 text-sm font-black text-ink-700">Ahora puedes:</p>
          <div className="grid gap-3 text-left">
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm font-bold text-brand-800">
              <QrCode size={18} /> Crear hasta {subscription?.qr_quota || 'más'} QR permanentes
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-brand-50 p-4 text-sm font-bold text-brand-800">
              <BarChart2 size={18} /> Consultar analytics de tus escaneos
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="mt-8 flex w-full flex-col gap-3 sm:flex-row">
        <Button to="/create" className="flex-1">Crear QR <ArrowRight size={17} /></Button>
        <Button to="/dashboard" variant="secondary" className="flex-1">Ir al dashboard</Button>
      </div>
    </div>
  )
}
