import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'

const variants = {
  primary:   'bg-brand-700 text-white shadow-glow-sm hover:bg-brand-800 active:scale-[0.98]',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700',
  ghost:     'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
  danger:    'bg-red-50 text-red-700 hover:bg-red-100',
  lime:      'bg-accent-400 text-ink-950 shadow-lg shadow-accent-400/30 hover:bg-accent-500 active:scale-[0.98]',
}

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-xl gap-1.5',
  md: 'px-4 py-2.5 text-sm rounded-2xl gap-2',
  lg: 'px-6 py-3.5 text-base rounded-2xl gap-2.5',
}

export default function Button({
  as: Component = 'button',
  to,
  href,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) {
  const classes = cx(
    'inline-flex items-center justify-center font-bold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className
  )

  if (to) {
    return <Link to={to} className={classes} {...props}>{children}</Link>
  }

  if (href) {
    return <a href={href} className={classes} {...props}>{children}</a>
  }

  return <Component className={classes} {...props}>{children}</Component>
}
