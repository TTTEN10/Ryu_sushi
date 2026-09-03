import { Link } from 'react-router-dom'

export default function Hero() {
  return (
    <section className="hero" id="accueil">
      <div className="hero-overlay">
        <div className="container">
          <div className="hero-content">
            <div className="hero-banner">
              <span className="hero-banner-text">PSYCHOLOGUE · CONSULTATIONS EN LIGNE</span>
            </div>
            <h1 className="hero-title">Trouver sa place. Et oser la prendre.</h1>
            <p className="hero-subtitle">
              J'accompagne les personnes qui souhaitent mieux se comprendre, dépasser ce qui les freine
              et avancer plus sereinement dans leurs relations et leurs projets.
            </p>
            <div className="hero-actions">
              <Link to="/contact" className="btn btn-primary">Prendre rendez-vous</Link>
              <a href="#approche" className="btn btn-outline">Découvrir mon approche</a>
            </div>
            <div className="hero-offer">
              <span className="offer-badge">Première consultation offerte</span>
              <span className="offer-details">60 minutes · En visioconférence</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}