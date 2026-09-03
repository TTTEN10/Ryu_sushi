import { Link } from 'react-router-dom'

export default function Axes() {
  const axes = [
    {
      number: '01',
      label: 'IDENTITÉ',
      title: 'Se découvrir et se (re)construire',
      description: "Comprendre son histoire, son fonctionnement et son rapport à soi pour apaiser certaines blessures, questionner ses croyances et construire une identité plus alignée et ancrée.",
    },
    {
      number: '02',
      label: 'RELATIONS',
      title: 'Trouver sa place avec les autres',
      description: "S'affirmer davantage, exprimer ses besoins, poser ses limites et construire des relations dans lesquelles on se sent plus libre d'être soi.",
    },
    {
      number: '03',
      label: 'DIRECTION',
      title: 'Trouver une direction qui a du sens',
      description: "Clarifier ses aspirations, ses valeurs et ses priorités pour faire des choix personnels ou professionnels qui correspondent davantage à ce que l'on souhaite construire.",
    },
    {
      number: '04',
      label: 'ACTION',
      title: 'Oser avancer et dépasser ses blocages',
      description: "Peur de l'échec, doute, perfectionnisme, procrastination ou regard des autres… comprendre ce qui freine le passage à l'action pour expérimenter de nouvelles façons d'agir.",
    },
  ]

  return (
    <section className="mk-axes" id="accompagnement">
      <div className="mk-axes-head">
        <p className="mk-kicker">COMMENT JE PEUX VOUS AIDER</p>
        <h2>4 axes de travail</h2>
        <p>
          Les difficultés rencontrées dans notre rapport à nous-mêmes, nos relations, nos choix ou nos projets
          sont rarement complètement indépendantes.
        </p>
        <strong>
          Je vous accompagne sur ces différentes dimensions dans votre <b>vie personnelle</b> comme <b>professionnelle</b>.
        </strong>
      </div>
      <div className="mk-axes-grid">
        {axes.map((axe, index) => (
          <article key={index} className="mk-reveal-card">
            <div>
              <span>{axe.number}</span>
              <small>{axe.label}</small>
            </div>
            <h3>{axe.title}</h3>
            <p>{axe.description}</p>
          </article>
        ))}
      </div>
      <Link to="/contact" className="mk-btn mk-btn-gold mk-shine">
        Prendre rendez-vous
      </Link>
    </section>
  )
}