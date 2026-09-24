export default function Profile() {
  return (
    <section className="mk-about" id="apropos">
      <div className="mk-about-head">
        <div className="mk-about-photo">
          <img src="/dolgoon-khuyag-profile.png" alt="Portrait professionnel de Dolgoon Khuyag" />
        </div>
        <div>
          <p className="mk-kicker">QUI SUIS-JE ?</p>
          <h2>
            Dolgoon Khuyag,<br />
            Psychologue
          </h2>
          <i className="mk-rule"></i>
        </div>
      </div>
      <div className="mk-about-content">
        <div className="mk-about-description">
          <p>
            Je suis psychologue, diplômé d'un Master en psychologie sociale, du travail et des organisations.
            Mon parcours m'a amené à m'intéresser à la manière dont nos comportements et notre rapport à nous-mêmes
            se construisent à l'intersection de facteurs individuels, relationnels et environnementaux.
          </p>
          <p>
            Mon objectif n'est pas d'appliquer une méthode identique à chacun, mais de construire un accompagnement
            adapté à votre situation, à votre rythme et à ce que vous souhaitez faire évoluer.
          </p>
          <div className="mk-about-formation">
            <h3>Formation &amp; certifications</h3>
            <ul className="mk-cert-list">
              <li>
                <strong>Master en psychologie</strong>
                <span>Psychologie sociale, du travail et des organisations</span>
              </li>
              <li>
                <strong>Enregistrement RPPS</strong>
                <span>Psychologue enregistré au répertoire</span>
              </li>
              <li>
                <strong>Praticien certifié PNL</strong>
                <span>Programmation Neuro-linguistique</span>
              </li>
              <li>
                <strong>Praticien certifié Hypnose</strong>
                <span>Hypnose Ericksonienne</span>
              </li>
            </ul>
            <p className="mk-rpps">N° RPPS 10111727177</p>
          </div>
        </div>
      </div>
    </section>
  )
}