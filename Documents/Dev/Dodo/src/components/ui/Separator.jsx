export default function Separator({
  orientation = 'horizontal',
  className = '',
}) {
  return (
    <div
      className={`separator ${orientation} ${className}`}
      role="separator"
    />
  )
}