import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const googleCalendarLink = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3M14KT0UXbAChtDdtm_zrZ-CvaptWn5NCTUnPyjmz3lE9KtL0NB-lvxlZdrxAZKhBWpCEIYlFI"

  const navLinks = [
    { href: '#accueil', label: 'Accueil' },
    { href: '#accompagnement', label: 'Accompagnement' },
    { href: '/mon-approche', label: 'Mon approche', isRoute: true },
    { href: '/qui-suis-je', label: 'Qui suis-je', isRoute: true },
    { href: '#faq', label: 'FAQ' },
  ]

  const toggleMenu = () => {
    const newState = !isMenuOpen
    setIsMenuOpen(newState)
    // Prevent body scroll when menu is open
    document.body.classList.toggle('menu-open', newState)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    document.body.classList.remove('menu-open')
  }

  const handleNavClick = (href, isRoute, e) => {
    e.preventDefault()
    closeMenu()

    if (isRoute) {
      navigate(href)
    } else {
      if (location.pathname !== '/') {
        navigate('/' + href)
      } else {
        const element = document.querySelector(href)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }
    }
  }

  const handleBookClick = (e) => {
    e.preventDefault()
    closeMenu()
    window.open(googleCalendarLink, '_blank', 'noopener,noreferrer')
  }

  const isActive = (href, isRoute) => {
    if (isRoute) {
      return location.pathname === href
    }
    return location.pathname === '/' && location.hash === href
  }

  return (
    <header className="mk-header" role="banner">
      <a href="/" className="mk-logo" aria-label="Dolgoon Khuyag Psychologue" onClick={(e) => { e.preventDefault(); navigate('/'); closeMenu(); }}>
        <img src="/logo-dk.png" alt="" />
        <span className="mk-logo-text">
          <strong>DOLGOON KHUYAG</strong>
          <span>Psychologue</span>
        </span>
      </a>

      <button
        className={`mk-menu ${isMenuOpen ? 'active' : ''}`}
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
          <a
            key={link.href}
            href={link.href}
            className={isActive(link.href, link.isRoute) ? 'active' : ''}
            onClick={(e) => handleNavClick(link.href, link.isRoute, e)}
          >
            {link.label}
          </a>
        ))}
      </nav>

      <div className="mk-header-actions">
        <button
          className="mk-btn mk-btn-gold mk-header-cta"
          onClick={handleBookClick}
        >
          Prendre rendez-vous
        </button>
      </div>
    </header>
  )
}