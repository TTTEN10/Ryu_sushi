export default function Avatar({
  src,
  alt = '',
  fallback,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  }

  const [hasError, setHasError] = useState(false)

  return (
    <div
      className={`avatar ${sizes[size]} ${className}`}
      role="img"
      aria-label={alt || fallback}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt}
          className="avatar-image"
          onError={() => setHasError(true)}
        />
      ) : (
        <span className="avatar-fallback">{fallback}</span>
      )}
    </div>
  )
}