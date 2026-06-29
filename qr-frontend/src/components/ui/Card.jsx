import { cx } from '../../lib/format'

export function Card({ className = '', children, hover = false, ...props }) {
  return (
    <div
      className={cx(
        'rounded-3xl border border-ink-200/70 bg-white shadow-card',
        hover && 'transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-soft',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className = '', children }) {
  return <div className={cx('border-b border-ink-100 px-6 py-5', className)}>{children}</div>
}

export function CardBody({ className = '', children }) {
  return <div className={cx('p-5 sm:p-6', className)}>{children}</div>
}
