import { Link } from 'react-router-dom'

export default function Offre() {
  return (
    <section className="offre section" id="offre">
      <div className="container">
        <div className="offre-content">
          <span className="section-label">PREMIÈRE CONSULTATION OFFERTE</span>
          <h2 className="offre-title">Faisons d'abord connaissance.</h2>
          <p className="offre-text">
            Avant de commencer un accompagnement, je vous propose une première consultation offerte de 60 minutes
            pour clarifier votre demande et voir si ma manière de vous accompagner correspond à vos besoins.
          </p>
          <p className="offre-text highlight">
            Vous restez entièrement libre de poursuivre ou non.
          </p>
          <div className="offre-details">
            <div className="detail-item">
              <span className="detail-icon">✓</span>
              <span>Consultation individuelle</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">✓</span>
              <span>En ligne</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">✓</span>
              <span>60 minutes</span>
            </div>
            <div className="detail-item">
              <span className="detail-icon">✓</span>
              <span>Confidentiel</span>
            </div>
          </div>
          <div className="offre-cta">
            <Link to="/contact" className="btn btn-primary">Prendre rendez-vous</Link>
          </div>
        </div>
      </div>
    </section>
  )
}