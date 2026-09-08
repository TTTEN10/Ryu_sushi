export default function QuiSuisJe() {
  return (
    <main className="mk-site mk-page-qui-suis-je">
      <section className="mk-about-header">
        <div className="mk-container">
          <p className="mk-kicker">QUI SUIS-JE ?</p>
          <h1>Dolgoon Khuyag<br />Psychologue</h1>
          <i className="mk-rule"></i>
        </div>
      </section>

      <section className="mk-about-content-page">
        <div className="mk-container">
          <div className="mk-about-grid">
            <div className="mk-about-photo-large">
              <img src="/dolgoon-khuyag-profile.png" alt="Portrait professionnel de Dolgoon Khuyag" />
            </div>
            <div className="mk-about-text">
              <p>
                Je suis psychologue, diplômé d'un Master en psychologie sociale, du travail et des organisations.
                Mon parcours m'a amené à m'intéresser à la manière dont nos comportements et notre rapport à nous-mêmes
                se construisent à l'intersection de facteurs individuels, relationnels et environnementaux.
              </p>
              <p>
                Mon objectif n'est pas d'appliquer une méthode identique à chacun, mais de construire un accompagnement
                adapté à votre situation, à votre rythme et à ce que vous souhaitez faire évoluer.
              </p>
            </div>
          </div>

          <div className="mk-formation-section">
            <h2>Formation &amp; certifications</h2>
            <div className="mk-formation-grid">
              <div className="mk-formation-item">
                <h3>Diplôme</h3>
                <p>Master de Psychologie Sociale, du Travail et des Organisations</p>
              </div>
              <div className="mk-formation-item">
                <h3>Enregistrement</h3>
                <p>Psychologue enregistré au RPPS<br /><strong>N° 10111727177</strong></p>
              </div>
              <div className="mk-formation-item">
                <h3>Certifications</h3>
                <ul>
                  <li>Praticien certifié en Programmation Neuro-linguistique (PNL)</li>
                  <li>Praticien certifié en Hypnose Ericksonienne</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}