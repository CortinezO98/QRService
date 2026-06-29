/**
 * BillingCancel.jsx — /billing/cancel
 * El usuario canceló el proceso de pago en Stripe.
 */
import { Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function BillingCancel() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white px-4">
      <div className="max-w-sm w-full text-center space-y-6">

        <div className="flex justify-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
            <XCircle size={40} className="text-gray-400" />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pago cancelado</h1>
          <p className="text-gray-500 mt-2">
            No se realizó ningún cargo. Puedes intentarlo de nuevo cuando quieras.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to="/billing"
            className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-3 rounded-xl transition-colors text-center"
          >
            Ver planes de nuevo
          </Link>
          <Link
            to="/dashboard"
            className="w-full text-gray-500 hover:text-gray-700 py-2 transition-colors text-center text-sm"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
