import { useState } from 'react';

import {
  MENU_CATEGORIES,
  MENU_CATEGORY_NOTES,
  MENU_CATEGORY_IMAGES,
  MENU_ITEMS,
  MENU_FORMULES,
} from '../constants/menu';
import { CONTACT_INFO } from '../constants';

const PHONE_HREF = `tel:${CONTACT_INFO.phone.replace(/\s/g, '')}`;

function FormuleCard({ formule }) {
  return (
    <li className="formule-card">
      <div className="formule-card__header">
        <div>
          <h3 className="formule-card__name">
            {formule.name}
            {formule.meta && <span className="formule-card__meta">{formule.meta}</span>}
          </h3>
          <p className="formule-card__serve">
            {formule.pieces} · {formule.persons}
          </p>
        </div>
        <span className="formule-card__price">{formule.price}</span>
      </div>

      <ul className="formule-card__contents" role="list">
        {formule.contents.map((line) => (
          <li key={line} className="formule-card__content-line">{line}</li>
        ))}
      </ul>

      <div className="formule-card__footer">
        <p className="formule-card__sides">
          <span className="formule-card__sides-label">Accompagnement{formule.sides.includes(' et ') ? 's' : ''} :</span>{' '}
          {formule.sides}
        </p>
        {formule.note && <p className="formule-card__note">{formule.note}</p>}
      </div>
    </li>
  );
}

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('Entrées');
  const isFormules = activeCategory === 'Menus';
  const items = MENU_ITEMS[activeCategory] || [];
  const note = MENU_CATEGORY_NOTES[activeCategory];
  const categoryImage = MENU_CATEGORY_IMAGES[activeCategory];

  return (
    <section id="menu" className="section relative" aria-label="Menu">
      <span className="kanji-deco" style={{ top: '5%', left: '3%' }} aria-hidden="true">食</span>

      <div className="container">
        <div
          className="text-center"
        >
          <p className="section-label">Notre Menu 2026</p>
          <h2 className="section-title">Fabriqué Avec Précision</h2>
          <p className="section-subtitle center description">
            Chaque pièce est préparée à la main avec les meilleurs ingrédients,
            dans le respect de la tradition culinaire japonaise.
          </p>
          <p className="menu-order-note">
            Préparation sur commande — commande par appel ou SMS au{' '}
            <a href={PHONE_HREF}>{CONTACT_INFO.phone}</a>.
          </p>
        </div>

        <div className="menu-categories" role="tablist" aria-label="Catégories du menu">
          {MENU_CATEGORIES.map((cat) => (
            <button
              key={cat}
              role="tab"
              aria-selected={activeCategory === cat}
              className={`menu-category-btn ${activeCategory === cat ? 'menu-category-btn--active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {note && <p className="menu-category-note">{note}</p>}

        {isFormules ? (
          <ul
            className="formule-grid"
            key={activeCategory}
            role="list"
          >
            {MENU_FORMULES.map((formule) => (
              <FormuleCard key={formule.name} formule={formule} />
            ))}
          </ul>
        ) : (
          <div
            key={activeCategory}
          >
            {categoryImage && (
              <div className="menu-category-image">
                <img
                  src={`/images/${categoryImage.image}`}
                  alt={categoryImage.alt}
                  loading="lazy"
                />
              </div>
            )}

            <ul className="menu-list" role="list">
              {items.map((item) => (
                <li key={item.name} className="menu-list__item">
                  {item.image && (
                    <img
                      className="menu-list__thumb"
                      src={`/images/${item.image}`}
                      alt={item.name}
                      loading="lazy"
                      width="56"
                      height="56"
                    />
                  )}
                  <div className="menu-list__body">
                    <div className="menu-list__header">
                      <h3 className="menu-list__name">
                        {item.name}
                        {item.meta && <span className="menu-list__meta">{item.meta}</span>}
                      </h3>
                      <span className="menu-list__dots" aria-hidden="true" />
                      <span className="menu-list__price">{item.price}</span>
                    </div>
                    {item.desc && <p className="menu-list__desc">{item.desc}</p>}
                  </div>
                </li>
              ))}
            </ul>
            </div>
          )}
      </div>
    </section>
  );
}
