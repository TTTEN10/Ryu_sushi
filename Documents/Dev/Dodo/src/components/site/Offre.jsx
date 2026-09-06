import { Link } from 'react-router-dom'

export default function Offre() {
  return (
    <section className="mk-contact" id="contact">
      <div className="mk-contact-inner">
        <div className="mk-contact-content">
          <p className="mk-kicker">PREMIÈRE CONSULTATION OFFERTE</p>
          <h2>Faisons d'abord connaissance.</h2>
          <i className="mk-rule"></i>
          <p>
            Avant de commencer un accompagnement, je vous propose une première <b>consultation offerte de 60 minutes</b> pour
            clarifier votre demande et voir si ma manière de vous accompagner correspond à vos besoins.
          </p>
          <strong>Vous restez entièrement libre de poursuivre ou non.</strong>
        </div>
        <div className="mk-contact-items">
          <ul className="mk-contact-list">
            <li><span aria-hidden="true">•</span>Consultation individuelle</li>
            <li><span aria-hidden="true">•</span>En ligne</li>
            <li><span aria-hidden="true">•</span>60 minutes</li>
            <li><span aria-hidden="true">•</span>Confidentiel</li>
          </ul>
          <Link to="/contact" className="mk-btn mk-btn-gold mk-shine">
            Prendre rendez-vous
          </Link>
        </div>
      </div>
    </section>
  )
}