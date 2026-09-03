export default function Label({
  children,
  htmlFor,
  required = false,
  className = '',
  ...props
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`label ${className}`}
      {...props}
    >
      {children}
      {required && <span className="label-required">*</span>}
    </label>
  )
}