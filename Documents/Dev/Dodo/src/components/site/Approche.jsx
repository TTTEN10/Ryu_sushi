export default function Approche() {
  const approches = [
    {
      title: 'Écoute active',
      description: 'Une approche centrée sur vos besoins et votre vécu personnel.',
      icon: '👂',
    },
    {
      title: 'Bienveillance',
      description: 'Un accompagnement respectueux et sans jugement.',
      icon: '💚',
    },
    {
      title: 'Confidentialité',
      description: 'Vos échanges sont protégés par le secret professionnel.',
      icon: '🔒',
    },
    {
      title: 'Personnalisation',
      description: 'Un suivi adapté à votre situation et vos objectifs.',
      icon: '✨',
    },
  ]

  return (
    <section className="approche section">
      <div className="container">
        <h2 className="section-title">Mon approche</h2>
        <p className="section-subtitle">
          Une méthode bienveillante et personnalisée pour vous accompagner vers le mieux-être.
        </p>
        <div className="approche-grid">
          {approches.map((approche, index) => (
            <div key={index} className="approche-card">
              <span className="approche-icon">{approche.icon}</span>
              <h3 className="approche-title">{approche.title}</h3>
              <p className="approche-description">{approche.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}