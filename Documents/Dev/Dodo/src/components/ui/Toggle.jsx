export default function Toggle({
  pressed,
  onPressedChange,
  children,
  disabled = false,
  size = 'md',
  variant = 'default',
}) {
  const sizes = {
    sm: 'toggle-sm',
    md: 'toggle-md',
    lg: 'toggle-lg',
  }

  const variants = {
    default: pressed ? 'bg-slate-200' : 'bg-transparent',
    outline: pressed ? 'bg-slate-200 border-slate-300' : 'border border-slate-200',
    primary: pressed ? 'bg-burgundy text-white' : 'bg-transparent text-burgundy',
  }

  return (
    <button
      className={`toggle ${sizes[size]} ${variants[variant]} ${disabled ? 'disabled' : ''} ${pressed ? 'pressed' : ''}`}
      onClick={() => onPressedChange?.(!pressed)}
      disabled={disabled}
      aria-pressed={pressed}
    >
      {children}
    </button>
  )
}