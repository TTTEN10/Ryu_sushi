export default function Switch({
  checked,
  onChange,
  disabled = false,
  label,
  size = 'md',
}) {
  const sizes = {
    sm: 'switch-sm',
    md: 'switch-md',
    lg: 'switch-lg',
  }

  return (
    <label className={`switch ${sizes[size]} ${disabled ? 'disabled' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
        className="switch-input"
      />
      <span className="switch-slider">
        <span className="switch-thumb" />
      </span>
      {label && <span className="switch-label">{label}</span>}
    </label>
  )
}