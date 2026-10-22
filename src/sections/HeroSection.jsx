import { motion } from 'framer-motion';
import { fadeInUp, fadeInRight } from '../animations/variants';
const truckAnimeImg = '/images/ryu-truck-anime.png';

export default function HeroSection() {
  return (
    <section id="home" className="hero section" aria-label="Accueil">
      <div className="hero__bg-circles" aria-hidden="true">
        <div className="hero__circle hero__circle--1" />
        <div className="hero__circle hero__circle--2" />
        <div className="hero__circle hero__circle--3" />
      </div>
      <div className="paper-texture" aria-hidden="true" />

      <div className="smoke-container" style={{ bottom: '20%', left: '60%' }} aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <div key={i} className="smoke-particle" style={{ animationDelay: `${i * 1.2}s`, left: `${i * 20}px` }} />
        ))}
      </div>

      <span className="kanji-deco" style={{ top: '15%', right: '5%' }} aria-hidden="true">龍</span>

      <div className="container hero__content">
        <motion.div
          className="hero__text"
          initial="hidden"
          animate="visible"
          variants={fadeInUp}
        >
          <h1 className="hero__title">
            Du Vrai
            <span className="hero__title-accent">Sushi</span>
            En Morbihan
          </h1>
          <p className="hero__subtitle description">
            L&apos;art du sushi japonais depuis notre food truck itinérant, de Saint-Jean-Brévelay
            à Larmor-Baden. Ingrédients frais, techniques traditionnelles, énergie moderne.
          </p>
          <div className="btn-group">
            <a href="#contact" className="btn btn--primary">Commander</a>
            <a href="#menu" className="btn btn--secondary">Menu</a>
          </div>
        </motion.div>

        <motion.div
          className="hero__visual"
          initial="hidden"
          animate="visible"
          variants={fadeInRight}
          transition={{ delay: 0.3 }}
        >
          <img
            src={truckAnimeImg}
            alt="Food truck Ryu Sushi en tournée dans le Morbihan - sushi japonais premium dans le Golfe du Morbihan"
            className="hero__anime-truck"
            loading="eager"
            width={560}
            height={350}
          />
        </motion.div>
      </div>
    </section>
  );
}
