export default function Methodologie() {
  const facteurs = [
    { title: 'Votre histoire', description: 'Les expériences qui ont construit votre manière de vous percevoir.' },
    { title: 'Votre fonctionnement', description: 'Vos croyances, émotions, besoins et stratégies de protection.' },
    { title: 'Vos relations', description: 'La manière dont les interactions influencent votre place.' },
    { title: 'Votre environnement', description: 'Les contextes familiaux, sociaux, professionnels et culturels.' },
  ]

  const etapes = [
    {
      number: '01',
      title: 'COMPRENDRE',
      description: "Mettre du sens sur ce que vous vivez. Identifier les expériences, croyances, émotions et mécanismes qui influencent votre manière d'agir et de réagir.",
    },
    {
      number: '02',
      title: 'APAISER',
      description: 'Travailler sur ce qui continue de vous affecter. Faire en sorte que certaines peurs, émotions ou expériences prennent progressivement moins de place.',
    },
    {
      number: '03',
      title: 'EXPÉRIMENTER',
      description: "Faire évoluer concrètement votre manière d'agir et inscrire progressivement les changements dans votre quotidien.",
    },
  ]

  return (
    <section className="methodologie section" id="approche">
      <div className="container">
        <div className="section-header">
          <span className="section-label">MON APPROCHE</span>
          <h2 className="section-title">Comprendre ce qui se joue en vous, mais aussi autour de vous.</h2>
          <p className="section-intro">
            Nos difficultés ne viennent généralement pas d'une seule cause. Notre manière de penser, ressentir et agir
            se construit à travers notre histoire, nos expériences, nos relations et nos environnements.
          </p>
        </div>

        <div className="methodologie-facteurs">
          <h3 className="facteurs-title">VOUS</h3>
          <div className="facteurs-grid">
            {facteurs.map((facteur, index) => (
              <div key={index} className="facteur-card">
                <h4 className="facteur-name">{facteur.title}</h4>
                <p className="facteur-description">{facteur.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="methodologie-steps">
          <p className="steps-intro">Un accompagnement qui ne s'arrête pas à la prise de conscience.</p>
          <div className="steps-grid">
            {etapes.map((etape, index) => (
              <div key={index} className="step-card">
                <span className="step-number">{etape.number}</span>
                <h4 className="step-title">{etape.title}</h4>
                <p className="step-description">{etape.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}