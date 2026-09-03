export default function Cap({ children, as = 'span', className = '' }) {
  const Component = as

  return (
    <Component className={`cap ${className}`}>
      {children}
    </Component>
  )
}