import { cx, formatNumber } from '../../lib/format'

const tones = {
  brand:  { bg: 'bg-brand-50',   icon: 'text-brand-600',   val: 'text-brand-700' },
  green:  { bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
  amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   val: 'text-amber-700' },
  slate:  { bg: 'bg-ink-100',    icon: 'text-ink-600',     val: 'text-ink-700' },
}

export default function StatCard({ icon: Icon, label, value, hint, tone = 'brand', className = '' }) {
  const t = tones[tone] || tones.brand
  const displayValue = typeof value === 'number' ? formatNumber(value) : value

  return (
    <div className={cx('surface-card p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-ink-400">{label}</p>
          <p className={cx('mt-2 truncate text-2xl font-black', t.val)}>{displayValue}</p>
          {hint && <p className="mt-1 text-xs font-medium text-ink-400">{hint}</p>}
        </div>
        {Icon && (
          <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', t.bg, t.icon)}>
            <Icon size={19} />
          </div>
        )}
      </div>
    </div>
  )
}
