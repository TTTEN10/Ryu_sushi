import { Link } from 'react-router-dom'

export default function ConditionsGenerales() {
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-content">
          <div className="section-header">
            <span className="section-label">CONDITIONS</span>
          </div>
        <h1>Conditions générales de consultation</h1>

        <p className="legal-intro">
          Les présentes conditions générales régissent les relations entre Dolgoon Khuyag,
          psychologue du travail et des organisations, et toute personne consultant dans le
          cadre d'un accompagnement professionnel.
        </p>

        <section className="legal-section">
          <h2>Article 1 — Objet</h2>
          <p>
            Les présentes conditions générales ont pour objet de définir les droits et obligations
            des parties dans le cadre des consultations de psychologie du travail et des organisations.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 2 — Nature de l'accompagnement</h2>
          <p>
            Dolgoon Khuyag exerce la profession de psychologue du travail et des organisations.
            Les consultations visent à accompagner les personnes dans leurs questionnements
            professionnels, leur développement de carrière, leur bien-être au travail et leurs
            relations professionnelles.
          </p>
          <p>
            Cet accompagnement ne se substitue pas à une prise en charge médicale ou psychiatrique.
            En cas de besoin, une orientation vers un professionnel de santé approprié pourra être proposée.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 3 — Prise de rendez-vous</h2>
          <p>
            Les rendez-vous sont pris :
          </p>
          <ul className="legal-list">
            <li>En ligne via la plateforme de réservation intégrée au site</li>
            <li>Par téléphone au [numéro à compléter]</li>
            <li>Par email à <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a></li>
          </ul>
          <p>
            Lors de la prise de rendez-vous, vous êtes invité à fournir vos coordonnées complètes
            et le motif de votre consultation.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 4 — Tarifs et modalités de paiement</h2>

          <h3>4.1. Tarifs des consultations</h3>
          <ul className="legal-list">
            <li><strong>Entretien découverte (10 min) :</strong> Gratuit</li>
            <li><strong>Consultation individuelle (45 min - 1h) :</strong> 50 €</li>
            <li><strong>Programme d'accompagnement (5 séances) :</strong> 200 €</li>
            <li><strong>Accompagnement entreprise :</strong> sur devis</li>
          </ul>
          <p>
            Les tarifs sont exprimés en euros et s'entendent toutes taxes comprises.
            Le programme de 5 séances représente un tarif préférentiel de 40 € la séance.
          </p>

          <h3>4.2. Modalités de paiement</h3>
          <p>Les paiements peuvent être effectués par :</p>
          <ul className="legal-list">
            <li>Carte bancaire (via la plateforme sécurisée)</li>
            <li>Chèque</li>
            <li>Espèces (dans la limite de 50 €)</li>
            <li>Virement bancaire (pour les entreprises)</li>
          </ul>
          <p>
            Le règlement est exigible au moment de la consultation, sauf accord particulier
            pour les entreprises.
          </p>

          <h3>4.3. Remboursements</h3>
          <p>
            Les consultations de psychologie du travail ne sont pas remboursées par la
            Sécurité Sociale. Certaines mutuelles peuvent proposer des prises en charge
            partielles dans le cadre de leurs dispositifs de prévention.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 5 — Politique d'annulation et de report</h2>

          <h3>5.1. Annulation par le consultant</h3>
          <p>
            Toute annulation doit être effectuée au moins <strong>48 heures ouvrées</strong>
            avant le rendez-vous prévu. Passé ce délai, la consultation reste due.
          </p>
          <p>
            En cas d'annulation dans les 48 heures précédant le rendez-vous, la consultation
            sera facturée intégralement.
          </p>

          <h3>5.2. Report par le consultant</h3>
          <p>
            Un report peut être demandé dans les mêmes conditions que l'annulation. Le report
            est possible sans frais s'il est effectué au moins 48 heures ouvrées avant le
            rendez-vous.
          </p>

          <h3>5.3. Exceptions</h3>
          <p>
            Les cas de force majeure (maladie attestée par un certificat médical, événement
            familial grave, intempéries exceptionnelles) peuvent donner lieu à une annulation
            ou un report sans frais, même dans les 48 heures.
          </p>

          <h3>5.4. Absence du consultant</h3>
          <p>
            En cas d'absence du psychologue (maladie, empêchement professionnel), le rendez-vous
            sera reprogrammé sans frais ou remboursé intégralement si le remboursement a déjà
            été effectué.
          </p>

          <h3>5.5. Retard</h3>
          <p>
            En cas de retard du consultant, la durée de la séance sera maintenue dans la mesure
            du possible. En cas de retard important du consultant, un report ou un remboursement
            proportionnel pourra être proposé.
          </p>
          <p>
            En cas de retard du client, la séance se terminera à l'heure initialement prévue
            afin de respecter les rendez-vous suivants.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 6 — Déroulement des consultations</h2>
          <p>
            Les consultations peuvent se dérouler :
          </p>
          <ul className="legal-list">
            <li>En présentiel au cabinet situé à [adresse à compléter]</li>
            <li>En visioconférence via une plateforme sécurisée</li>
          </ul>
          <p>
            La durée des séances est indiquée lors de la prise de rendez-vous. Elle est
            généralement de 45 minutes à 1 heure.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 7 — Secret professionnel</h2>
          <p>
            Dolgoon Khuyag est tenu au secret professionnel, conformément aux articles
            226-13 et 226-14 du Code pénal et au Code de déontologie des psychologues.
          </p>
          <p>
            Toutes les informations partagées lors des consultations sont strictement
            confidentielles. Aucune information ne peut être divulguée à des tiers sans
            votre accord écrit, sauf dans les cas prévus par la loi (danger grave pour
            la personne ou pour autrui).
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 8 — Obligations du consultant</h2>
          <p>
            Le consultant s'engage à :
          </p>
          <ul className="legal-list">
            <li>Fournir des informations exactes et sincères</li>
            <li>Respecter les horaires de rendez-vous</li>
            <li>Respecter le psychologue et son espace de travail</li>
            <li>Régler les consultations aux tarifs convenus</li>
            <li>Respecter les conditions d'annulation et de report</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Article 9 — Obligations du psychologue</h2>
          <p>
            Dolgoon Khuyag s'engage à :
          </p>
          <ul className="legal-list">
            <li>Fournir un accompagnement professionnel et bienveillant</li>
            <li>Respecter le secret professionnel</li>
            <li>Agir dans le respect de la déontologie de la profession</li>
            <li>Proposer un cadre sécurisé et confidentiel</li>
            <li>Informer clairement sur les tarifs et modalités</li>
            <li>Maintenir ses compétences par la formation continue</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Article 10 — Responsabilité</h2>
          <p>
            Dolgoon Khuyag exerce sa profession dans le respect des règles déontologiques
            et avec toute la diligence nécessaire. Toutefois, la réussite de
            l'accompagnement dépend également de l'implication du consultant.
          </p>
          <p>
            La responsabilité du psychologue ne saurait être engagée en cas de
            non-respect des recommandations ou d'abandon de l'accompagnement.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 11 — Protection des données personnelles</h2>
          <p>
            Les données personnelles collectées dans le cadre des consultations font
            l'objet d'une protection particulière. Pour plus d'informations, veuillez
            consulter notre <Link to="/politique-confidentialite">politique de confidentialité</Link>.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 12 — Modification des conditions</h2>
          <p>
            Les présentes conditions générales peuvent être modifiées. Les nouvelles
            conditions s'appliquent aux consultations prises après leur publication.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 13 — Droit applicable et litiges</h2>
          <p>
            Les présentes conditions générales sont soumises au droit français.
          </p>
          <p>
            En cas de litige, les parties s'engagent à rechercher une solution amiable.
            À défaut, les tribunaux français seront seuls compétents.
          </p>
          <p>
            Conformément au Code de déontologie des psychologues, vous pouvez également
            saisir la Commission Nationale Consultative de Déontologie des Psychologues
            (CNCDP) pour toute question relative au respect de la déontologie.
          </p>
        </section>

        <section className="legal-section">
          <h2>Article 14 — Contact</h2>
          <p>
            Pour toute question concernant les présentes conditions générales :
          </p>
          <ul className="legal-list">
            <li>Email : <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a></li>
            <li>Téléphone : [Numéro à compléter]</li>
            <li>Adresse : [Adresse complète à compléter]</li>
          </ul>
        </section>

        <div className="legal-cta">
          <p>Prêt à commencer votre accompagnement ?</p>
          <Link to="/contact" className="btn btn-primary">Prendre rendez-vous</Link>
        </div>
        </article>
      </div>
    </div>
  )
}