import { Link } from 'react-router-dom'
import { cx } from '../../lib/format'

const variants = {
  primary: 'bg-brand-700 text-white shadow-glow hover:bg-brand-800',
  secondary: 'border border-ink-200 bg-white text-ink-700 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700',
  ghost: 'text-ink-600 hover:bg-ink-100 hover:text-ink-950',
  danger: 'bg-red-50 text-red-700 hover:bg-red-100',
  lime: 'bg-limebrand-400 text-ink-950 shadow-lg shadow-lime-200/70 hover:bg-limebrand-500',
}

const sizes = {
  sm: 'px-3 py-2 text-xs rounded-xl',
  md: 'px-4 py-2.5 text-sm rounded-2xl',
  lg: 'px-5 py-3 text-base rounded-2xl',
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
    'inline-flex items-center justify-center gap-2 font-bold transition disabled:pointer-events-none disabled:opacity-60',
    variants[variant],
    sizes[size],
    className
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} {...props}>
        {children}
      </a>
    )
  }

  return (
    <Component className={classes} {...props}>
      {children}
    </Component>
  )
}
