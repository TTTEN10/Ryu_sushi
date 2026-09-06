import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { href: '/', label: 'Accueil' },
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
            className={location.pathname === link.href ? 'active' : ''}
            onClick={closeMenu}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link to="/#contact" className="mk-btn mk-btn-gold mk-header-cta" onClick={closeMenu}>
        Prendre rendez-vous
      </Link>
    </header>
  )
}