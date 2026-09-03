import { useState } from 'react'

export default function Image({
  src,
  alt = '',
  width,
  height,
  className = '',
  objectFit = 'cover',
  lazy = true,
  fallback,
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  const objectFits = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
    scaleDown: 'object-scale-down',
  }

  return (
    <div
      className={`image-wrapper ${className}`}
      style={{ width, height }}
    >
      {isLoading && <div className="image-skeleton" />}
      {!hasError ? (
        <img
          src={src}
          alt={alt}
          className={`image ${objectFits[objectFit]} ${isLoading ? 'opacity-0' : 'opacity-100'}`}
          loading={lazy ? 'lazy' : 'eager'}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setHasError(true)
          }}
        />
      ) : (
        fallback && (
          <div className="image-fallback">{fallback}</div>
        )
      )}
    </div>
  )
}