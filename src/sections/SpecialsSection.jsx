import { motion } from 'framer-motion';
import { useCarousel } from '../hooks';
import { SPECIALS } from '../constants';
import { fadeInUp, defaultViewport } from '../animations/variants';
import SteamEffect from '../components/ui/SteamEffect';

export default function SpecialsSection() {
  const { current, setCurrent, paused, setPaused } = useCarousel(SPECIALS.length, 5000);

  return (
    <section className="section" aria-label="Spécialités du jour" style={{ paddingBlock: '90px' }}>
      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center mb-48"
        >
          <p className="section-label">Spécialités du Jour</p>
          <h2 className="section-title">Sélection du Chef</h2>
        </motion.div>

        <div
          className="carousel"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          role="region"
          aria-label="Carrousel des spécialités"
          aria-live="polite"
        >
          <div
            className="carousel__track"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {SPECIALS.map((special) => (
              <div key={special.name} className="carousel__slide">
                <div className="grid-2" style={{ alignItems: 'center', gap: '48px' }}>
                  <div
                    style={{
                      background: 'linear-gradient(135deg, var(--red), var(--black))',
                      borderRadius: 'var(--radius)',
                      aspectRatio: '16/10',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                    }}
                  >
                    <span style={{ fontSize: '80px' }} aria-hidden="true">🍣</span>
                    <div style={{ position: 'absolute', bottom: '20%', left: '50%', transform: 'translateX(-50%)' }}>
                      <SteamEffect />
                    </div>
                  </div>
                  <div>
                    <h3 style={{ fontSize: 'var(--font-section)', marginBottom: '16px' }}>{special.name}</h3>
                    <p className="description" style={{ color: 'var(--steel)', marginBottom: '16px' }}>{special.desc}</p>
                    <span style={{ fontSize: 'var(--font-subtitle)', color: 'var(--red)' }}>{special.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="carousel__dots" role="tablist">
            {SPECIALS.map((_, i) => (
              <button
                key={i}
                className={`carousel__dot ${current === i ? 'carousel__dot--active' : ''}`}
                onClick={() => setCurrent(i)}
                aria-label={`Aller à la diapositive ${i + 1}`}
                role="tab"
                aria-selected={current === i}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
