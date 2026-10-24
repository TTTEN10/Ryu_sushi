
import { COUNTERS } from '../constants';
import { useCounter } from '../hooks';
import { formatCounter } from '../utils';

function CounterItem({ end, suffix, label }) {
  const { count, ref } = useCounter(end, 2000);

  return (
    <div className="counter-item" ref={ref}>
      <div className="counter-item__number">{formatCounter(count, suffix)}</div>
      <div className="counter-item__label">{label}</div>
    </div>
  );
}

export default function AboutSection() {
  return (
    <section id="about" className="section" aria-label="À propos">
      <span className="kanji-deco" style={{ top: '10%', right: '5%', opacity: 0.05 }} aria-hidden="true">道</span>

      <div className="container">
        <div className="grid-2" style={{ alignItems: 'center', gap: '64px' }}>
          <div>
            <p className="section-label">Notre Histoire</p>
            <h2 className="section-title">L&apos;Art de Ryu Sushi</h2>
            <p className="description" style={{ marginBottom: '24px', color: 'var(--steel)' }}>
              Né d&apos;une passion pour la cuisine japonaise authentique, Ryu Sushi apporte l&apos;excellence
              du sushi directement dans les rues du Morbihan, de marché en marché. Ryu — le dragon — symbolise la puissance,
              la sagesse et la quête incessante de perfection culinaire.
            </p>
            <p className="description" style={{ marginBottom: '24px', color: 'var(--steel)' }}>
              Chaque matin, nos chefs sélectionnent le poisson le plus frais auprès de fournisseurs de confiance.
              Chaque nigiri est formé à la main, chaque maki est préparé avec précision.
            </p>
            <p className="description" style={{ color: 'var(--steel)' }}>
              Des événements privés aux festivals dans le Morbihan, Ryu Sushi offre une expérience inoubliable
              qui vous transporte au cœur des meilleurs bars à sushi de Tokyo, le temps d&apos;une halte.
            </p>
            <div className="red-stamp mt-32" aria-hidden="true">龍</div>
          </div>

          <div>
            <div className="featured-grid">
              {[
                { name: 'Poisson Frais', emoji: '🐟', gradient: 'linear-gradient(135deg, #E73636, #120B03)' },
                { name: 'Fait Main', emoji: '🔪', gradient: 'linear-gradient(135deg, #F0A202, #E73636)' },
                { name: 'Food Truck', emoji: '🚚', gradient: 'linear-gradient(135deg, #7E94A0, #120B03)' },
              ].map((item) => (
                <div key={item.name} className="featured-card">
                  <div className="featured-card__bg" style={{ background: item.gradient }}>
                    <span className="featured-card__emoji">{item.emoji}</span>
                  </div>
                  <div className="featured-card__overlay">
                    <h3 className="featured-card__name">{item.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="counter-grid mt-48">
          {COUNTERS.map((c) => (
            <CounterItem key={c.label} {...c} />
          ))}
        </div>
      </div>
    </section>
  );
}
