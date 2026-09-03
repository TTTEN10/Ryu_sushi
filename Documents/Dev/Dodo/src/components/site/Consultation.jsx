import { Link } from 'react-router-dom'

export default function Consultation() {
  const consultations = [
    {
      title: 'Entretien découverte',
      duration: '10 minutes',
      price: 'Gratuit',
      description: 'Premier échange pour faire connaissance et définir vos besoins.',
      available: true,
    },
    {
      title: 'Consultation individuelle',
      duration: '45 min - 1 heure',
      price: '50 €',
      description: 'Séance personnalisée pour travailler sur vos objectifs.',
      available: true,
    },
    {
      title: 'Programme accompagnement',
      duration: '5 séances',
      price: '200 €',
      description: 'Suivi complet avec un tarif préférentiel (40 €/séance).',
      available: true,
    },
    {
      title: 'Accompagnement entreprise',
      duration: 'Sur mesure',
      price: 'Sur devis',
      description: 'Interventions en entreprise pour le bien-être des équipes.',
      available: true,
    },
  ]

  return (
    <section className="consultation section">
      <div className="container">
        <h2 className="section-title">Consultations</h2>
        <p className="section-subtitle">
          Des formules adaptées à vos besoins pour un accompagnement sur mesure.
        </p>
        <div className="consultation-grid">
          {consultations.map((consultation, index) => (
            <div key={index} className={`consultation-card ${consultation.title === 'Programme accompagnement' ? 'featured' : ''}`}>
              <div className="consultation-header">
                <h3 className="consultation-title">{consultation.title}</h3>
                {consultation.title === 'Programme accompagnement' && (
                  <span className="consultation-badge">Recommandé</span>
                )}
              </div>
              <div className="consultation-details">
                <span className="consultation-duration">{consultation.duration}</span>
                <span className="consultation-price">{consultation.price}</span>
              </div>
              <p className="consultation-description">{consultation.description}</p>
              <Link to="/contact" className="btn btn-primary">
                {consultation.title === 'Entretien découverte' ? 'Réserver' : 'Prendre rendez-vous'}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}