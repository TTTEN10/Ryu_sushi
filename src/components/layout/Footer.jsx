import { FaInstagram, FaFacebookF } from 'react-icons/fa';
import { CONTACT_INFO, NAV_LINKS } from '../../constants';
import logoImg from '../../assets/ryu-logo.png';

export default function Footer() {
  return (
    <footer className="footer" role="contentinfo">
      <div className="container">
        <div className="footer__grid">
          <div>
            <img src={logoImg} alt="Ryu Sushi" className="footer__logo" />
            <p className="footer__desc">
              Food truck de sushi japonais premium à Vannes et dans le Morbihan. Savoir-faire authentique
              et ingrédients les plus frais, directement dans vos rues.
            </p>
            <div className="footer__socials">
              <a href={CONTACT_INFO.instagram} className="footer__social" aria-label="Instagram Ryu Sushi" target="_blank" rel="noopener noreferrer">
                <FaInstagram size={16} />
              </a>
              <a href={CONTACT_INFO.facebook} className="footer__social" aria-label="Facebook Ryu Sushi" target="_blank" rel="noopener noreferrer">
                <FaFacebookF size={16} />
              </a>
            </div>
          </div>

          <div>
            <h4 className="footer__heading">Navigation</h4>
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="footer__link">{link.label}</a>
            ))}
          </div>

          <div>
            <h4 className="footer__heading">Contact</h4>
            <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`} className="footer__link">{CONTACT_INFO.phone}</a>
            <a href={`mailto:${CONTACT_INFO.email}`} className="footer__link">{CONTACT_INFO.email}</a>
          </div>
        </div>

        <div className="footer__bottom">
          <span>&copy; {new Date().getFullYear()} Ryu Sushi. Tous droits réservés.</span>
          <span>Créé avec le sourire</span>
        </div>
      </div>
    </footer>
  );
}
