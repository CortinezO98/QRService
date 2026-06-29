import Button from './Button'

export default function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  actionOnClick,
}) {
  return (
    <div className="surface-card flex flex-col items-center justify-center px-8 py-16 text-center">
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-50 text-brand-600">
          <Icon size={28} />
        </div>
      )}
      <h3 className="text-lg font-black text-ink-900">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-ink-500">{description}</p>
      {actionLabel && (actionTo || actionOnClick) && (
        <Button to={actionTo} onClick={actionOnClick} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
