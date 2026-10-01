import { Link, useNavigate } from 'react-router-dom'

export default function Hero() {
  const navigate = useNavigate()
  const googleCalendarLink = "https://calendar.google.com/calendar/u/0/appointments/schedules/AcZssZ3M14KT0UXbAChtDdtm_zrZ-CvaptWn5NCTUnPyjmz3lE9KtL0NB-lvxlZdrxAZKhBWpCEIYlFI"

  const handleBookClick = (e) => {
    e.preventDefault()
    window.open(googleCalendarLink, '_blank', 'noopener,noreferrer')
  }

  return (
    <section className="mk-hero" id="accueil">
      <div className="mk-hero-media">
        <img
          src="/dolgoon-khuyag-cabinet.png"
          alt="Dolgoon Khuyag, psychologue, dans son cabinet"
        />
      </div>
      <div className="mk-hero-copy">
        <p className="mk-kicker">PSYCHOLOGUE · CONSULTATIONS EN LIGNE</p>
        <h1>
          Trouver sa place,<br />
          <span className="mk-gold-word">Oser</span> la prendre
        </h1>
        <i className="mk-rule"></i>
        <p>
          J'accompagne les personnes qui souhaitent mieux se comprendre, dépasser ce qui les freine et avancer plus sereinement dans leurs relations et leurs projets.
        </p>
        <div className="mk-actions">
          <button onClick={handleBookClick} className="mk-btn mk-btn-gold mk-shine">
            Prendre rendez-vous
          </button>
          <Link to="/mon-approche" className="mk-btn mk-btn-outline">
            Découvrir mon approche
          </Link>
        </div>
        <p className="mk-offer-note">
          <strong>Première consultation offerte</strong>
          <span>30 minutes · En visioconférence</span>
        </p>
      </div>
    </section>
  )
}