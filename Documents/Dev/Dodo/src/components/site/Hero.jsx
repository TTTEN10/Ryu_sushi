import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="mk-hero" id="accueil">
      <div className="mk-hero-copy">
        <p className="mk-kicker">PSYCHOLOGUE · CONSULTATIONS EN LIGNE</p>
        <h1>
          Trouver sa place.<br />
          Et <span className="mk-gold-word">oser</span> la prendre.
        </h1>
        <i className="mk-rule"></i>
        <p>
          J'accompagne les personnes qui souhaitent mieux se comprendre, dépasser ce qui les freine.
        </p>
        <p>
          Et avancer plus sereinement dans leurs relations et leurs projets.
        </p>
        <div className="mk-actions">
          <Link to="/contact" className="mk-btn mk-btn-gold mk-shine">
            Prendre rendez-vous
          </Link>
          <Link to="/mon-approche" className="mk-btn mk-btn-outline">
            Découvrir mon approche
          </Link>
        </div>
        <p className="mk-offer-note">
          <strong>Première consultation offerte</strong>
          <span>60 minutes · En visioconférence</span>
        </p>
      </div>
      <div className="mk-portrait">
        <img src="/dolgoon-khuyag-cabinet.png" alt="Dolgoon Khuyag dans son cabinet de psychologie" />
      </div>
    </section>
  )
}