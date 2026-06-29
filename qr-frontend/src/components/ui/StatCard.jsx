import { cx, formatNumber } from '../../lib/format'

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', className = '' }) {
  const tones = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-green-50 text-green-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-ink-100 text-ink-700',
  }

  return (
    <div className={cx('surface-card p-5', className)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-ink-950">
            {typeof value === 'number' ? formatNumber(value) : value}
          </p>
          {hint && <p className="mt-1 text-xs font-medium text-ink-400">{hint}</p>}
        </div>
        {Icon && (
          <div className={cx('flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl', tones[tone])}>
            <Icon size={21} />
          </div>
        )}
      </div>
    </div>
  )
}
