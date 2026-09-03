import { Link } from 'react-router-dom'

export default function MentionsLegales() {
  return (
    <div className="legal-page">
      <div className="container">
        <article className="legal-content">
          <div className="section-header">
            <span className="section-label">MENTIONS LÉGALES</span>
          </div>
        <h1>Mentions légales</h1>

        <section className="legal-section">
          <h2>Éditeur du site</h2>
          <p>
            Le présent site internet est édité par <strong>Dolgoon Khuyag</strong>, psychologue du travail et des organisations.
          </p>
          <ul className="legal-list">
            <li><strong>Nom :</strong> KHUYAG Dolgoon</li>
            <li><strong>Titre professionnel :</strong> Psychologue du travail et des organisations</li>
            <li><strong>Numéro ADELI :</strong> [Numéro ADELI à compléter]</li>
            <li><strong>Adresse professionnelle :</strong> [Adresse complète à Puteaux à compléter]</li>
            <li><strong>Téléphone :</strong> [Numéro de téléphone à compléter]</li>
            <li><strong>Email :</strong> <a href="mailto:dolgoon@dkpsychologue.com">dolgoon@dkpsychologue.com</a></li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Directeur de la publication</h2>
          <p>Le directeur de la publication est <strong>Dolgoon Khuyag</strong>.</p>
        </section>

        <section className="legal-section">
          <h2>Hébergement</h2>
          <p>Le site est hébergé par :</p>
          <ul className="legal-list">
            <li><strong>Hébergeur :</strong> Scaleway</li>
            <li><strong>Adresse :</strong> 8 rue de la Ville l'Évêque, 75008 Paris, France</li>
            <li><strong>Téléphone :</strong> +33 1 84 88 28 18</li>
          </ul>
        </section>

        <section className="legal-section">
          <h2>Propriété intellectuelle</h2>
          <p>
            L'ensemble des éléments composant ce site (textes, images, logos, graphismes, vidéos, arborescence,
            logiciels, etc.) est protégé par les lois relatives à la propriété intellectuelle et appartient à
            Dolgoon Khuyag ou est utilisé avec l'autorisation des ayants droit.
          </p>
          <p>
            Toute reproduction, représentation, modification, adaptation, traduction ou diffusion, même partielle,
            par quelque procédé que ce soit, est interdite sans l'autorisation écrite préalable de Dolgoon Khuyag.
          </p>
        </section>

        <section className="legal-section">
          <h2>Responsabilité</h2>
          <p>
            Dolgoon Khuyag s'efforce de fournir des informations aussi précises que possible. Toutefois, il ne peut
            garantir l'exactitude, la complétude ou l'actualité des informations diffusées sur ce site.
          </p>
          <p>
            Le site ne pourra être tenu responsable des dommages directs ou indirects résultant de l'utilisation
            des informations contenues sur ce site ou de problèmes techniques liés à l'accès au site.
          </p>
        </section>

        <section className="legal-section">
          <h2>Liens hypertextes</h2>
          <p>
            Ce site peut contenir des liens hypertextes vers d'autres sites internet. Dolgoon Khuyag ne dispose
            d'aucun moyen de contrôle sur ces sites et n'assume aucune responsabilité quant à leur contenu ou leur
            politique de confidentialité.
          </p>
        </section>

        <section className="legal-section">
          <h2>Cookie</h2>
          <p>
            Ce site n'utilise pas de cookies traceurs. Seuls des cookies techniques nécessaires au fonctionnement
            du site peuvent être déposés sur votre terminal.
          </p>
        </section>

        <section className="legal-section">
          <h2>Langue</h2>
          <p>La langue utilisée sur ce site est le français.</p>
        </section>

        <section className="legal-section">
          <h2>Droit applicable</h2>
          <p>
            Les présentes mentions légales sont soumises au droit français. En cas de litige, les tribunaux français
            seront seuls compétents.
          </p>
        </section>

        <div className="legal-cta">
          <p>Une question concernant ces mentions légales ?</p>
          <Link to="/contact" className="btn btn-primary">Nous contacter</Link>
        </div>
        </article>
      </div>
    </div>
  )
}