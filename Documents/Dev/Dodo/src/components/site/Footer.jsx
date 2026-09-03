import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const mainNavLinks = [
    { href: '/', label: 'Accueil' },
    { href: '/#axes', label: 'Accompagnement' },
    { href: '/#approche', label: 'Mon approche' },
    { href: '/#apropos', label: 'À propos' },
    { href: '/#faq', label: 'FAQ' },
  ]

  const legalLinks = [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/politique-confidentialite', label: 'Politique de confidentialité' },
    { href: '/conditions-generales', label: "Conditions d'annulation" },
    { href: '/contact', label: 'Contact' },
  ]

  return (
    <footer className="site-footer" role="contentinfo">
      <div className="container">
        <div className="footer-content">
          <div className="footer-brand">
            <span className="logo-text">DOLGOON KHUYAG</span>
            <p className="footer-tagline">Psychologue · Consultations individuelles en ligne</p>
          </div>
          <nav className="footer-nav" aria-label="Navigation principale">
            <ul>
              {mainNavLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="footer-legal">
            <ul>
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link to={link.href}>{link.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="disclaimer">Les consultations proposées ne remplacent pas les dispositifs d'urgence médicale ou psychiatrique.</p>
          <p>&copy; {currentYear} Dolgoon Khuyag. Tous droits réservés.</p>
        </div>
      </div>
    </footer>
  )
}