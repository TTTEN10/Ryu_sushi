export default function Contact() {
  const email = "dolgoon@dkpsychologue.com"
  const calendlyLink = "https://calendly.com/dolgoon-khuyag/consultation-offerte"

  return (
    <main className="mk-contact-page">
      <div className="mk-container">
        <div className="mk-contact-page-content">
          <p className="mk-kicker">CONTACT</p>
          <h1>Prendre rendez-vous</h1>
          <i className="mk-rule"></i>
          <p className="mk-contact-intro">
            Une question ? Un besoin d'accompagnement ? N'hésitez pas à me contacter.
          </p>

          <div className="mk-contact-coordonnees">
            <div className="mk-contact-item">
              <span className="mk-contact-icon">📧</span>
              <div>
                <strong>Email</strong>
                <a href={`mailto:${email}`}>{email}</a>
              </div>
            </div>
            <div className="mk-contact-item">
              <span className="mk-contact-icon">📍</span>
              <div>
                <strong>Cabinet</strong>
                <p>Puteaux, France</p>
              </div>
            </div>
          </div>

          <div className="mk-contact-actions">
            <a href={calendlyLink} target="_blank" rel="noopener noreferrer" className="mk-btn mk-btn-gold">
              Prendre rendez-vous sur Calendly
            </a>
            <a href={`mailto:${email}`} className="mk-btn mk-btn-outline">
              Envoyer un email
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}