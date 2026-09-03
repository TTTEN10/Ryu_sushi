import { Link } from 'react-router-dom'

export default function PolitiqueConfidentialite() {
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-content">
          <div className="section-header">
            <span className="section-label">CONFIDENTIALITÉ</span>
          </div>
        <h1>Politique de confidentialité</h1>

        <p className="legal-intro">
          La protection de vos données personnelles est une priorité. Cette politique de confidentialité
          vous informe sur la manière dont vos données sont collectées, utilisées et protégées dans le
          cadre de l'utilisation de ce site et des consultations de psychologie.
        </p>

        <section className="legal-section">
          <h2>1. Responsable du traitement</h2>
          <p>Le responsable du traitement des données est :</p>
          <ul className="legal-list">
            <li><strong>Nom :</strong> Dolgoon Khuyag</li>
            <li><strong>Qualité :</strong> Psychologue du travail et des organisations</li>
            <li><strong>Adresse :</strong> [Adresse complète à Puteaux à compléter]</li>
            <li><strong>Email :</strong> <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a></li>
            <li><strong>Téléphone :</strong> [Numéro de téléphone à compléter]</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>2. Données collectées</h2>
          <p>Nous collectons les catégories de données suivantes :</p>

          <h3>2.1. Données de contact</h3>
          <ul className="legal-list">
            <li>Nom et prénom</li>
            <li>Adresse email</li>
            <li>Numéro de téléphone</li>
            <li>Entreprise / organisation (pour les consultations professionnelles)</li>
          </ul>

          <h3>2.2. Données de santé</h3>
          <p>
            Dans le cadre des consultations psychologiques, des données relatives à la santé mentale
            peuvent être collectées. Ces données sont sensibles et bénéficient d'une protection
            renforcée conformément au RGPD.
          </p>

          <h3>2.3. Données de navigation</h3>
          <ul className="legal-list">
            <li>Adresse IP (temporairement, pour des raisons de sécurité)</li>
            <li>Date et heure de connexion</li>
            <li>Pages consultées</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>3. Finalités du traitement</h2>
          <p>Vos données sont utilisées pour :</p>
          <ul className="legal-list">
            <li>La prise de rendez-vous et la gestion des consultations</li>
            <li>L'envoi de confirmations et de rappels de rendez-vous</li>
            <li>La facturation et la gestion administrative</li>
            <li>La tenue du dossier professionnel dans le respect du secret professionnel</li>
            <li>L'amélioration du site internet</li>
            <li>La réponse aux demandes de contact</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>4. Base légale du traitement</h2>
          <p>Le traitement des données repose sur :</p>
          <ul className="legal-list">
            <li><strong>Le consentement :</strong> pour les données de contact via le formulaire</li>
            <li><strong>L'exécution d'un contrat :</strong> pour la gestion des rendez-vous et consultations</li>
            <li><strong>L'obligation légale :</strong> pour la conservation des documents comptables</li>
            <li><strong>L'intérêt légitime :</strong> pour la sécurité du site internet</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>5. Durée de conservation</h2>
          <p>Les données sont conservées selon les durées suivantes :</p>
          <ul className="legal-list">
            <li><strong>Dossier professionnel :</strong> 10 ans après la dernière consultation (recommandation de la CNIL)</li>
            <li><strong>Données de contact (prospects) :</strong> 3 ans après le dernier contact</li>
            <li><strong>Données de facturation :</strong> 10 ans (obligation légale)</li>
            <li><strong>Données de navigation :</strong> 1 an maximum</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>6. Destinataires des données</h2>
          <p>
            Vos données sont strictement confidentielles. Elles ne sont communiquées à aucun tiers,
            sauf dans les cas suivants :
          </p>
          <ul className="legal-list">
            <li>Aux professionnels de santé impliqués dans votre prise en charge (avec votre accord)</li>
            <li>Aux hébergeurs techniques du site (données de navigation uniquement)</li>
            <li>Aux autorités judiciaires ou administratives si la loi l'exige</li>
          </ul>
          <p>
            En tant que psychologue, Dolgoon Khuyag est tenu au <strong>secret professionnel</strong>,
            conformément aux articles 226-13 et 226-14 du Code pénal et au Code de déontologie des psychologues.
          </p>
        </section>

        <section className="legal-section">
          <h2>7. Sécurité des données</h2>
          <p>
            Des mesures de sécurité techniques et organisationnelles sont mises en œuvre pour protéger
            vos données :
          </p>
          <ul className="legal-list">
            <li>Site sécurisé par protocole HTTPS (chiffrement SSL/TLS)</li>
            <li>Accès aux dossiers réservé au professionnel habilité</li>
            <li>Serveurs hébergés dans l'Union Européenne</li>
            <li>Formation à la protection des données personnelles</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>8. Vos droits</h2>
          <p>Conformément au RGPD, vous disposez des droits suivants :</p>
          <ul className="legal-list">
            <li><strong>Droit d'accès :</strong> obtenir la confirmation que vos données sont traitées et y accéder</li>
            <li><strong>Droit de rectification :</strong> faire corriger des données inexactes</li>
            <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données (sous réserve des obligations légales)</li>
            <li><strong>Droit à la limitation :</strong> demander la limitation du traitement</li>
            <li><strong>Droit à la portabilité :</strong> récupérer vos données dans un format structuré</li>
            <li><strong>Droit d'opposition :</strong> vous opposer au traitement pour des raisons légitimes</li>
          </ul>
          <p>
            Pour exercer vos droits, contactez-nous à l'adresse email suivante :
            <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a>
          </p>
          <p>
            Si vous estimez que vos droits ne sont pas respectés, vous pouvez déposer une réclamation
            auprès de la <strong>CNIL</strong> (Commission Nationale de l'Informatique et des Libertés) :
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">www.cnil.fr</a>
          </p>
        </section>

        <section className="legal-section">
          <h2>9. Cookies</h2>
          <p>
            Ce site n'utilise pas de cookies traceurs ou publicitaires. Seuls des cookies techniques
            nécessaires au fonctionnement du site peuvent être déposés sur votre terminal.
          </p>
        </section>

        <section className="legal-section">
          <h2>10. Modification de la politique</h2>
          <p>
            Cette politique de confidentialité peut être modifiée pour tenir compte de l'évolution
            de la réglementation ou des pratiques. La version en ligne fait foi.
          </p>
        </section>

        <section className="legal-section">
          <h2>11. Contact</h2>
          <p>
            Pour toute question concernant cette politique de confidentialité ou l'exercice de vos droits,
            vous pouvez contacter Dolgoon Khuyag :
          </p>
          <ul className="legal-list">
            <li>Par email : <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a></li>
            <li>Par téléphone : [Numéro de téléphone à compléter]</li>
            <li>Par courrier : [Adresse complète à compléter]</li>
          </ul>
        </section>

        <div className="legal-cta">
          <p>Une question ou souhaitez prendre rendez-vous ?</p>
          <Link to="/contact" className="btn btn-primary">Nous contacter</Link>
        </div>
        </article>
      </div>
    </div>
  )
}