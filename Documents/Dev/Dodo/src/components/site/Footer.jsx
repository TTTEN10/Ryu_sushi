import { Link } from 'react-router-dom'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const navLinks = [
    { href: '/mentions-legales', label: 'Mentions légales' },
    { href: '/politique-confidentialite', label: 'Politique de confidentialité' },
    { href: '/conditions-annulation', label: "Conditions d'annulation" },
    { href: '/#contact', label: 'Contact' },
  ]

  return (
    <footer className="mk-footer" role="contentinfo">
      <div>
        <strong>DOLGOON KHUYAG</strong>
        <small>Psychologue · Consultations individuelles en ligne</small>
      </div>
      <nav>
        {navLinks.map((link, index) => (
          <Link key={index} to={link.href}>
            {link.label}
          </Link>
        ))}
      </nav>
      <p>
        Les consultations proposées ne remplacent pas les dispositifs d'urgence médicale ou psychiatrique.
      </p>
    </footer>
  )
}