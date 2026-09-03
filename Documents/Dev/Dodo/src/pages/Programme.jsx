import { Link } from 'react-router-dom'

export default function Programme() {
  const consultations = [
    {
      title: 'Entretien découverte',
      duration: '10 minutes',
      price: 'Gratuit',
      description: 'Premier échange pour faire connaissance et définir vos besoins.',
    },
    {
      title: 'Consultation individuelle',
      duration: '45 min - 1 heure',
      price: '50 €',
      description: 'Séance personnalisée pour travailler sur vos objectifs.',
    },
    {
      title: 'Programme accompagnement',
      duration: '5 séances',
      price: '200 €',
      description: 'Suivi complet avec un tarif préférentiel (40 €/séance).',
      featured: true,
    },
    {
      title: 'Accompagnement entreprise',
      duration: 'Sur mesure',
      price: 'Sur devis',
      description: 'Interventions en entreprise pour le bien-être des équipes.',
    },
  ]

  return (
    <div className="legal-page">
      <div className="container">
        <div className="section-header">
          <span className="section-label">TARIFS</span>
          <h2 className="section-title">Mon programme d'accompagnement</h2>
          <p className="section-intro">
            Des formules adaptées à vos besoins pour un accompagnement sur mesure.
          </p>
        </div>
        <div className="consultation-grid">
          {consultations.map((consultation, index) => (
            <div key={index} className={`consultation-card ${consultation.featured ? 'featured' : ''}`}>
              <div className="consultation-header">
                <h3 className="consultation-title">{consultation.title}</h3>
                {consultation.featured && (
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
    </div>
  )
}