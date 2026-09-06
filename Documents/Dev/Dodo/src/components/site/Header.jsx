import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { href: '/#accueil', label: 'Accueil' },
    { href: '/#accompagnement', label: 'Accompagnement' },
    { href: '/mon-approche', label: 'Mon approche' },
    { href: '/#apropos', label: 'À propos' },
    { href: '/#faq', label: 'FAQ' },
  ]

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const isActive = (href) => {
    if (href.startsWith('/#')) {
      return location.pathname === '/' && location.hash === href.substring(1)
    }
    return location.pathname === href
  }

  return (
    <header className="mk-header" role="banner">
      <Link to="/" className="mk-logo" aria-label="Dolgoon Khuyag Psychologue" onClick={closeMenu}>
        <img src="/logo-dk.png" alt="Logo" />
      </Link>

      <button
        className="mk-menu"
        aria-expanded={isMenuOpen}
        aria-label="Ouvrir le menu"
        onClick={toggleMenu}
      >
        <i></i>
        <i></i>
        <i></i>
      </button>

      <nav className={`mk-nav ${isMenuOpen ? 'active' : ''}`} role="navigation">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            to={link.href}
            className={isActive(link.href) ? 'active' : ''}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mk-header-actions">
        <Link to="/#contact" className="mk-btn mk-btn-gold mk-header-cta" onClick={closeMenu}>
          Prendre rendez-vous
        </Link>
      </div>
    </header>
  )
}