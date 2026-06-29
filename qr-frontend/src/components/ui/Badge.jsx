import { cx } from '../../lib/format'

const variants = {
  default: 'bg-ink-100 text-ink-700',
  brand: 'bg-brand-50 text-brand-700 ring-1 ring-brand-200',
  green: 'bg-green-50 text-green-700 ring-1 ring-green-200',
  amber: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-1 ring-red-200',
  slate: 'bg-ink-900 text-white',
}

export default function Badge({ variant = 'default', className = '', children }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold', variants[variant], className)}>
      {children}
    </span>
  )
}
