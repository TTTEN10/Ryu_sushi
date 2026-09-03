export default function OverCard({
  image,
  title,
  subtitle,
  description,
  children,
  variant = 'default',
  className = '',
}) {
  const variants = {
    default: 'bg-white',
    elevated: 'bg-white shadow-lg',
    outlined: 'bg-white border',
    filled: 'bg-slate-50',
  }

  return (
    <div className={`overcard ${variants[variant]} ${className}`}>
      {image && <div className="overcard-image">{image}</div>}
      <div className="overcard-content">
        {subtitle && <span className="overcard-subtitle">{subtitle}</span>}
        {title && <h3 className="overcard-title">{title}</h3>}
        {description && <p className="overcard-description">{description}</p>}
        {children && <div className="overcard-body">{children}</div>}
      </div>
    </div>
  )
}