import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/#axes', label: 'Accompagnement' },
    { href: '/#approche', label: 'Mon approche' },
    { href: '/#apropos', label: 'À propos' },
    { href: '/#faq', label: 'FAQ' },
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  return (
    <header className="site-header" role="banner">
      <div className="container header-content">
        <Link to="/" className="logo" aria-label="Dolgoon Khuyag Psychologue - Page d'accueil" onClick={closeMenu}>
          <span className="logo-text">DOLGOON KHUYAG PSYCHOLOGUE</span>
        </Link>
        <nav
          className={`main-nav ${isMenuOpen ? 'active' : ''}`}
          role="navigation"
          aria-label="Navigation principale"
        >
          <ul className="nav-list">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  to={link.href}
                  className={location.pathname === link.href ? 'active' : ''}
                  onClick={closeMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link to="/contact" className="header-cta" onClick={closeMenu}>
          Prendre rendez-vous
        </Link>
        <button
          className={`mobile-menu-toggle ${isMenuOpen ? 'active' : ''}`}
          aria-label="Menu"
          aria-expanded={isMenuOpen}
          onClick={toggleMenu}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  )
}