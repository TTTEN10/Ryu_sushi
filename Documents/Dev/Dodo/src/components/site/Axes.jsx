import { Link } from 'react-router-dom'

export default function Axes() {
  const axes = [
    {
      number: '01',
      title: 'IDENTITÉ',
      subtitle: 'Se découvrir et se (re)construire',
      description: "Comprendre son histoire, son fonctionnement et son rapport à soi pour apaiser certaines blessures, questionner ses croyances et construire une identité plus alignée et ancrée.",
    },
    {
      number: '02',
      title: 'RELATIONS',
      subtitle: 'Trouver sa place avec les autres',
      description: "S'affirmer davantage, exprimer ses besoins, poser ses limites et construire des relations dans lesquelles on se sent plus libre d'être soi.",
    },
    {
      number: '03',
      title: 'DIRECTION',
      subtitle: 'Trouver une direction qui a du sens',
      description: "Clarifier ses aspirations, ses valeurs et ses priorités pour faire des choix personnels ou professionnels qui correspondent davantage à ce que l'on souhaite construire.",
    },
    {
      number: '04',
      title: 'ACTION',
      subtitle: 'Oser avancer et dépasser ses blocages',
      description: "Peur de l'échec, doute, perfectionnisme, procrastination ou regard des autres… comprendre ce qui freine le passage à l'action pour expérimenter de nouvelles façons d'agir.",
    },
  ]

  return (
    <section className="axes section" id="axes">
      <div className="container">
        <div className="section-header">
          <span className="section-label">COMMENT JE PEUX VOUS AIDER</span>
          <h2 className="section-title">4 axes de travail</h2>
          <p className="section-intro">
            Les difficultés rencontrées dans notre rapport à nous-mêmes, nos relations, nos choix ou nos projets
            sont rarement complètement indépendantes.
          </p>
          <p className="section-intro">
            Je vous accompagne sur ces différentes dimensions dans votre vie personnelle comme professionnelle.
          </p>
        </div>
        <div className="axes-grid">
          {axes.map((axe, index) => (
            <div key={index} className="axe-card">
              <span className="axe-number">{axe.number}</span>
              <h3 className="axe-title">{axe.title}</h3>
              <p className="axe-subtitle">{axe.subtitle}</p>
              <p className="axe-description">{axe.description}</p>
            </div>
          ))}
        </div>
        <div className="axes-cta">
          <Link to="/contact" className="btn btn-primary">Prendre rendez-vous</Link>
        </div>
      </div>
    </section>
  )
}