import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cx } from '../../lib/format'

export default function PageHeader({
  eyebrow,
  title,
  description,
  backTo,
  backLabel = 'Volver',
  actions,
  className = '',
}) {
  return (
    <div className={cx('mb-6 sm:mb-8', className)}>
      {backTo && (
        <Link
          to={backTo}
          className="mb-5 inline-flex items-center gap-2 rounded-xl px-1 py-1 text-sm font-semibold text-ink-500 transition hover:text-ink-950"
        >
          <ArrowLeft size={16} /> {backLabel}
        </Link>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && <div className="eyebrow mb-3">{eyebrow}</div>}
          <h1 className="text-balance text-3xl font-black tracking-tight text-ink-950 sm:text-4xl">
            {title}
          </h1>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500 sm:text-base">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
