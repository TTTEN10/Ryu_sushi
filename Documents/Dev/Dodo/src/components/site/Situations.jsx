export default function Situations() {
  const situations = [
    {
      title: 'Difficultés au travail',
      description: 'Conflits avec les collègues ou la hiérarchie, sentiment d\'injustice, manque de reconnaissance.',
      icon: '⚠️',
    },
    {
      title: 'Changement professionnel',
      description: 'Reconversion, évolution de poste, prise de nouvelles responsabilités, retour après congé.',
      icon: '🔄',
    },
    {
      title: 'Surcharge mentale',
      description: 'Stress chronique, pression constante, difficulté à déconnecter, troubles du sommeil.',
      icon: '🧠',
    },
    {
      title: 'Perte de sens',
      description: 'Questionnement sur son parcours, perte de motivation, recherche d\'alignement avec ses valeurs.',
      icon: '🧭',
    },
    {
      title: 'Épuisement',
      description: 'Signes de burn-out, fatigue persistante, baisse d\'énergie et de concentration.',
      icon: '🔋',
    },
    {
      title: 'Affirmation de soi',
      description: 'Difficulté à poser des limites, à exprimer ses besoins, manque de confiance en soi.',
      icon: '💪',
    },
  ]

  return (
    <section className="situations section">
      <div className="container">
        <h2 className="section-title">Situations accompagnées</h2>
        <p className="section-subtitle">
          Ces situations vous parlent ? Vous n'êtes pas seul(e) et un accompagnement peut vous aider.
        </p>
        <div className="situations-grid">
          {situations.map((situation, index) => (
            <div key={index} className="situation-card">
              <span className="situation-icon">{situation.icon}</span>
              <h3 className="situation-title">{situation.title}</h3>
              <p className="situation-description">{situation.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}