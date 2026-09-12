import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, defaultViewport } from '../animations/variants';
import { WEEKLY_SCHEDULE, CATERING_SERVICES } from '../constants';
import { getTodaySchedule } from '../utils';
import truckAnimeImg from '../assets/ryu-truck-anime.png';

const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export default function FoodTruckSection() {
  const [todayName, setTodayName] = useState('');
  const [today, setToday] = useState(WEEKLY_SCHEDULE[0]);

  useEffect(() => {
    const updateToday = () => {
      const name = FRENCH_DAYS[new Date().getDay()];
      setTodayName(name);
      setToday(getTodaySchedule(WEEKLY_SCHEDULE));
    };

    updateToday();
    const interval = setInterval(updateToday, 60_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="food-truck" className="section section--dark" aria-label="Food Truck">
      <span className="kanji-deco" style={{ top: '5%', left: '8%' }} aria-hidden="true">車</span>

      <div className="container">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="text-center"
        >
          <p className="section-label">Nous Trouver</p>
          <h2 className="section-title">Le Food Truck Ryu Sushi</h2>
          <p className="section-subtitle center description" style={{ color: 'var(--steel)' }}>
            Suivez nos emplacements hebdomadaires à Vannes et dans le Golfe du Morbihan. Aujourd&apos;hui : {today.location}.
          </p>
        </motion.div>

        <motion.div
          className="find-us-horizontal mt-48"
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
        >
          <div className="find-us-horizontal__truck">
            <img
              src={truckAnimeImg}
              alt="Food truck Ryu Sushi à Vannes - camion de sushi japonais dans le Morbihan, Golfe du Morbihan"
              className="find-us-horizontal__img"
              loading="lazy"
              width={480}
              height={300}
            />
          </div>

          <div className="find-us-horizontal__info">
            <div className="glass-card find-us-horizontal__today">
              <p className="section-label" style={{ color: 'var(--orange)' }}>Emplacement du jour — {todayName}</p>
              <h3 style={{ fontSize: 'var(--font-subtitle)', marginBottom: '8px' }}>{today.location}</h3>
              <p className="description" style={{ color: 'var(--steel)' }}>{today.time}</p>
            </div>

            <div className="find-us-horizontal__schedule" role="list" aria-label="Planning hebdomadaire">
              {WEEKLY_SCHEDULE.map((s) => (
                <div
                  key={s.day}
                  role="listitem"
                  className={`schedule-card schedule-card--horizontal ${s.day === todayName ? 'schedule-card--today' : ''}`}
                  style={{ background: 'rgba(250, 247, 239, 0.05)' }}
                >
                  <div className="schedule-card__day">{s.day.slice(0, 3)}</div>
                  <div className="schedule-card__location">{s.location}</div>
                  <div className="schedule-card__time">{s.time}</div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={defaultViewport}
          variants={fadeInUp}
          className="mt-48"
        >
          <h3 className="section-title text-center" style={{ fontSize: 'var(--font-subtitle)' }}>Nos Services</h3>
          <div className="services-horizontal mt-32">
            {CATERING_SERVICES.map((service) => (
              <div key={service.title} className="card services-horizontal__card" style={{ background: 'rgba(250, 247, 239, 0.05)' }}>
                <h4 style={{ fontSize: 'var(--font-menu)', marginBottom: '12px', color: 'var(--orange)' }}>{service.title}</h4>
                <p className="description" style={{ color: 'var(--steel)', fontSize: 'var(--font-small)' }}>{service.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
