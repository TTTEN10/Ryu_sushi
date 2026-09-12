import { motion } from 'framer-motion';
import { fadeInUp, defaultViewport } from '../animations/variants';
import { CONTACT_INFO } from '../constants';

export default function ContactSection() {
  return (
    <section id="contact" className="section section--dark" aria-label="Contact">
      <span className="kanji-deco" style={{ top: '8%', right: '3%' }} aria-hidden="true">連</span>

      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="section-label">Contact</p>
          <h2 className="section-title">Commandez par téléphone</h2>
        </motion.div>

        <motion.div
          className="contact-coords glass-card mt-48"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
        >

          <div className="contact-coords__item">
            <p className="contact-coords__label">Téléphone</p>
            <p className="contact-coords__value">
              <a href={`tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`}>{CONTACT_INFO.phone}</a>
            </p>
          </div>

          <div className="contact-coords__item">
            <p className="contact-coords__label">E-mail</p>
            <p className="contact-coords__value">
              <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
