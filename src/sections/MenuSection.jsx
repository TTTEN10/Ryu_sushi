import { useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer, defaultViewport } from '../animations/variants';
import { MENU_CATEGORIES, MENU_ITEMS } from '../constants/menu';

export default function MenuSection() {
  const [activeCategory, setActiveCategory] = useState('Nigiri');
  const items = MENU_ITEMS[activeCategory] || [];

  return (
    <section id="menu" className="section relative" aria-label="Menu">
      <span className="kanji-deco" style={{ top: '5%', left: '3%' }} aria-hidden="true">食</span>

      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="section-label">Notre Menu</p>
          <h2 className="section-title">Fabriqué Avec Précision</h2>
          <p className="section-subtitle center description">
            Chaque pièce est préparée à la main avec les meilleurs ingrédients,
            dans le respect de la tradition culinaire japonaise.
          </p>
        </motion.div>

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

        <motion.ul
          className="menu-list"
          key={activeCategory}
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          role="list"
        >
          {items.map((item) => (
            <motion.li key={item.name} className="menu-list__item" variants={fadeInUp}>
              <div className="menu-list__header">
                <h3 className="menu-list__name">
                  {item.name}
                  {item.chefPick && (
                    <span className="menu-list__sticker">Recommandation du chef</span>
                  )}
                </h3>
                <span className="menu-list__dots" aria-hidden="true" />
                <span className="menu-list__price">{item.price}</span>
              </div>
              <p className="menu-list__desc">{item.desc}</p>
            </motion.li>
          ))}
        </motion.ul>
      </div>
    </section>
  );
}
