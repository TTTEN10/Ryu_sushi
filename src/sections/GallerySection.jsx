import { useState } from 'react';

import { GALLERY_ITEMS } from '../constants';

export default function GallerySection() {
  const [lightbox, setLightbox] = useState(null);

  return (
    <section id="gallery" className="section" aria-label="Galerie">
      <span className="kanji-deco" style={{ bottom: '10%', left: '5%' }} aria-hidden="true">美</span>

      <div className="container">
        <div
          className="text-center"
        >
          <p className="section-label">Galerie</p>
          <h2 className="section-title">Festin Visuel</h2>
          <p className="section-subtitle center description">
            Un aperçu de l&apos;expérience Ryu Sushi — de notre cuisine à votre assiette.
          </p>
        </div>

        <div
          className="gallery-grid"
        >
          {GALLERY_ITEMS.map((item) => (
            <div
              key={item.id}
              className="gallery-card"
              onClick={() => setLightbox(item)}
              role="button"
              tabIndex={0}
              aria-label={`Voir ${item.alt}`}
              onKeyDown={(e) => e.key === 'Enter' && setLightbox(item)}
            >
              <img
                src={item.src}
                alt={item.alt}
                className="gallery-card__img"
                loading="lazy"
              />
            </div>
          ))}
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label="Visionneuse d'image">
          <button className="lightbox__close" onClick={() => setLightbox(null)} aria-label="Fermer la visionneuse">&times;</button>
          <img
            src={lightbox.src}
            alt={lightbox.alt}
            className="lightbox__image-full"
          />
        </div>
      )}
    </section>
  );
}
