export default function Methodologie() {
  const dimensions = [
    { title: 'Votre histoire', description: 'Les expériences qui ont construit votre manière de vous percevoir.' },
    { title: 'Votre fonctionnement', description: 'Vos croyances, émotions, besoins et stratégies de protection.' },
    { title: 'Vos relations', description: 'La manière dont les interactions influencent votre place.' },
    { title: 'Votre environnement', description: 'Les contextes familiaux, sociaux, professionnels et culturels.' },
  ]

  const steps = [
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
    {
      number: '04',
      title: 'INTÉGRER',
      description: "Ancrer ces changements dans la durée pour qu'ils deviennent une nouvelle façon d'être, de penser et d'agir, alignée avec qui vous êtes.",
    },
  ]

  return (
    <>
      <section className="mk-approach-intro" id="approche">
        <div>
          <p className="mk-kicker">MON APPROCHE</p>
          <h2>Comprendre ce qui se joue en vous, mais aussi autour de vous.</h2>
          <i className="mk-rule"></i>
          <p>
            Nos difficultés ne viennent généralement pas d'une seule cause. Notre manière de penser, ressentir et agir
            se construit à travers notre histoire, nos expériences, nos relations et nos environnements.
          </p>
        </div>
        <div className="mk-dimension-wheel">
          {dimensions.slice(0, 2).map((dim) => (
            <article key={dim.title} className="mk-reveal-card">
              <h3>{dim.title}</h3>
              <p>{dim.description}</p>
            </article>
          ))}
          <div className="mk-dimension-vous" aria-hidden="true">
            <span>Vous</span>
          </div>
          {dimensions.slice(2).map((dim) => (
            <article key={dim.title} className="mk-reveal-card">
              <h3>{dim.title}</h3>
              <p>{dim.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mk-process">
        <div className="mk-process-inner">
          <div className="mk-process-title">
            <p className="mk-kicker">COMMENT SE DÉROULE L'ACCOMPAGNEMENT</p>
            <h2>Un accompagnement qui ne s'arrête pas à la prise de conscience.</h2>
            <i className="mk-rule"></i>
          </div>
          <div className="mk-process-hub">
            {steps.map((step, index) => (
              <article key={index} className="mk-process-item">
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
            <div className="mk-process-vous" aria-hidden="true">
              <span>Vous</span>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}