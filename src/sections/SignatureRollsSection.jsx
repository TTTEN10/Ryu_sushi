import { motion } from 'framer-motion';
import { SIGNATURE_ROLLS } from '../constants';
import { fadeInUp, defaultViewport } from '../animations/variants';

export default function SignatureRollsSection() {
  return (
    <section className="section section--dark" aria-label="Rolls signature" style={{ paddingBlock: '90px' }}>
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center mb-48"
        >
          <p className="section-label">Rolls Signature</p>
          <h2 className="section-title">Nos Créations</h2>
        </motion.div>

        <div className="horizontal-scroll" role="list" aria-label="Rolls signature Ryu Sushi">
          {SIGNATURE_ROLLS.map((roll) => (
            <div key={roll.name} className="horizontal-scroll__item" role="listitem">
              <div className="card" style={{ padding: '32px', background: 'rgba(250, 247, 239, 0.05)', height: '100%' }}>
                <div
                  style={{
                    fontSize: '64px',
                    textAlign: 'center',
                    marginBottom: '24px',
                  }}
                  aria-hidden="true"
                >
                  {roll.emoji}
                </div>
                <h3 style={{ fontSize: 'var(--font-menu)', marginBottom: '8px' }}>{roll.name}</h3>
                <p className="description" style={{ color: 'var(--steel)', fontSize: 'var(--font-small)', marginBottom: '16px' }}>
                  {roll.desc}
                </p>
                <span style={{ fontSize: 'var(--font-menu)', color: 'var(--orange)' }}>{roll.price}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
