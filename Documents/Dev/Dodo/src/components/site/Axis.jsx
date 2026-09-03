export default function Axis() {
  const axes = [
    {
      title: 'Stress et anxiété',
      description: 'Gestion du stress, troubles anxieux, pression professionnelle.',
    },
    {
      title: 'Épuisement professionnel',
      description: 'Prévention et accompagnement du burn-out.',
    },
    {
      title: 'Relations professionnelles',
      description: 'Conflits, communication, leadership et travail d\'équipe.',
    },
    {
      title: 'Équilibre vie pro-vie perso',
      description: 'Harmonisation des sphères personnelle et professionnelle.',
    },
    {
      title: 'Développement de carrière',
      description: 'Orientation, reconversion, évolution professionnelle.',
    },
    {
      title: 'Estime de soi',
      description: 'Confiance en soi, affirmation, gestion des émotions.',
    },
  ]

  return (
    <section className="axis section">
      <div className="container">
        <h2 className="section-title">Domaines d'intervention</h2>
        <p className="section-subtitle">
          Accompagnement spécialisé dans les problématiques liées au travail et aux organisations.
        </p>
        <div className="axis-grid">
          {axes.map((axe, index) => (
            <div key={index} className="axis-card">
              <h3 className="axis-title">{axe.title}</h3>
              <p className="axis-description">{axe.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}