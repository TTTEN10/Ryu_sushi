export default function Profile() {
  return (
    <section className="profile section" id="apropos">
      <div className="container">
        <div className="section-header">
          <span className="section-label">QUI SUIS-JE ?</span>
          <h2 className="section-title">Dolgoon Khuyag, Psychologue</h2>
        </div>
        <div className="profile-content">
          <p className="profile-text">
            Je suis psychologue, diplômé d'un Master en psychologie sociale, du travail et des organisations.
            Mon parcours m'a amené à m'intéresser à la manière dont nos comportements et notre rapport à nous-mêmes
            se construisent à l'intersection de facteurs individuels, relationnels et environnementaux.
          </p>
          <p className="profile-text">
            Mon objectif n'est pas d'appliquer une méthode identique à chacun, mais de construire un accompagnement
            adapté à votre situation, à votre rythme et à ce que vous souhaitez faire évoluer.
          </p>
        </div>
        <div className="profile-credentials">
          <h3 className="credentials-title">Formation & certifications</h3>
          <ul className="credentials-list">
            <li>Master de Psychologie Sociale, du Travail et des Organisations</li>
            <li>Psychologue enregistré au RPPS</li>
            <li>Praticien certifié en Programmation Neuro-linguistique (PNL)</li>
            <li>Praticien certifié en Hypnose Ericksonienne</li>
          </ul>
          <p className="credentials-rpps">N° RPPS 10111727177</p>
        </div>
      </div>
    </section>
  )
}