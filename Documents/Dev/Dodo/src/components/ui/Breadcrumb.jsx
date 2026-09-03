import { Link } from 'react-router-dom'

export default function Breadcrumb({ items, separator = '/' }) {
  return (
    <nav className="breadcrumb" aria-label="Fil d'ariane">
      <ol className="breadcrumb-list">
        {items.map((item, index) => (
          <li key={index} className="breadcrumb-item">
            {item.href ? (
              <Link to={item.href} className={index === items.length - 1 ? 'active' : ''}>
                {item.label}
              </Link>
            ) : (
              <span className="breadcrumb-current">{item.label}</span>
            )}
            {index < items.length - 1 && (
              <span className="breadcrumb-separator">{separator}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}