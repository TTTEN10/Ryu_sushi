import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fadeInUp, defaultViewport } from '../animations/variants';
import { WEEKLY_SCHEDULE, CATERING_SERVICES, BIWEEKLY_NOTE } from '../constants';
import {
  FRENCH_DAYS,
  getTodaySchedule,
  isScheduleDayActive,
  getBiweeklyState,
  getOpenStatus,
  formatTimeLabel,
} from '../utils';
const truckAnimeImg = '/images/ryu-truck-anime.png';

/** Un jour du planning affiché en carte compacte. */
function ScheduleCard({ entry, isToday }) {
  const active = isScheduleDayActive(entry);
  const biweekly = getBiweeklyState(entry);

  const modifiers = [
    'schedule-card',
    'schedule-card--horizontal',
    isToday ? 'schedule-card--today' : '',
    !active ? 'schedule-card--inactive' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="listitem"
      className={modifiers}
      style={{ background: 'rgba(250, 247, 239, 0.05)' }}
    >
      <div className="schedule-card__day">{entry.day.slice(0, 3)}</div>

      {entry.closed ? (
        <div className="schedule-card__location">Fermé</div>
      ) : (
        <>
          <div className="schedule-card__location">
            {entry.stops.map((stop) => (
              <span key={stop.city} className="schedule-card__stop">
                {stop.city}
                {stop.market ? <span className="schedule-card__tag">marché</span> : null}
              </span>
            ))}
          </div>
          <div className="schedule-card__time">
            {entry.stops.map((stop) => (
              <span key={stop.city} className="schedule-card__slot">{stop.time}</span>
            ))}
          </div>
        </>
      )}

      {biweekly && (
        <span className="schedule-card__badge">
          {biweekly.active ? 'Ce samedi' : `Prochain : ${biweekly.nextLabel}`}
        </span>
      )}
    </div>
  );
}

/** Prochain jour de service après `todayName`, dérivé du planning. */
function getNextServiceDay(schedule, todayName, now) {
  const todayIndex = FRENCH_DAYS.indexOf(todayName);
  if (todayIndex === -1) return null;

  for (let offset = 1; offset <= 7; offset += 1) {
    const name = FRENCH_DAYS[(todayIndex + offset) % 7];
    const entry = schedule.find((s) => s.day === name);
    // On ancre la recherche sur le vrai jour calendaire pour gérer le samedi bimensuel.
    const date = new Date(now);
    date.setDate(now.getDate() + offset);
    if (entry && isScheduleDayActive(entry, date)) return { entry, offset };
  }

  return null;
}

/** Bloc « aujourd'hui » : gère jour fermé, samedi inactif et jours à deux arrêts. */
function TodayCard({ entry, todayName, now }) {
  const biweekly = getBiweeklyState(entry, now);
  const status = getOpenStatus(entry, now);
  const closedToday = entry.closed || (biweekly && !biweekly.active);
  const nextService = closedToday ? getNextServiceDay(WEEKLY_SCHEDULE, todayName, now) : null;

  return (
    <div className="glass-card find-us-horizontal__today">
      <p className="section-label" style={{ color: 'var(--orange)' }}>
        {closedToday ? 'Aujourd’hui' : 'Emplacement du jour'} — {todayName}
      </p>

      {closedToday ? (
        <>
          <h3 style={{ fontSize: 'var(--font-subtitle)', marginBottom: '8px' }}>
            {entry.closed ? 'Fermé' : 'Pas de service ce samedi'}
          </h3>
          <p className="description" style={{ color: 'var(--steel)' }}>
            {entry.closed ? 'Nous sommes fermés le lundi.' : `${BIWEEKLY_NOTE}.`}
            {nextService ? (
              <>
                {' '}Prochain service {nextService.offset === 1 ? 'demain' : nextService.entry.day.toLowerCase()}{' '}
                à {nextService.entry.stops.map((stop) => stop.city).join(' et ')}, dès{' '}
                {formatTimeLabel(nextService.entry.stops[0].opens)}. Retrouvez tous nos emplacements ci-dessous.
              </>
            ) : (
              ' Retrouvez tous nos emplacements ci-dessous.'
            )}
          </p>
        </>
      ) : (
        <>
          <div className="open-status">
            <span
              className={`open-status__dot ${status.open ? 'open-status__dot--open' : ''}`}
              aria-hidden="true"
            />
            <span className="open-status__label">
              {status.open
                ? `Ouvert maintenant — jusqu’à ${formatTimeLabel(status.current.closes)}`
                : status.next
                  ? `Fermé — reprise à ${formatTimeLabel(status.next.opens)}`
                  : 'Service terminé pour aujourd’hui'}
            </span>
          </div>

          <h3 style={{ fontSize: 'var(--font-subtitle)', marginBottom: '16px' }}>
            {entry.stops.map((stop) => stop.city).join(' · ')}
          </h3>
          <ul className="today-stops">
            {entry.stops.map((stop) => (
              <li key={stop.city} className="today-stops__item">
                <span className="today-stops__time">{stop.time}</span>
                <span className="today-stops__address">{stop.address}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {biweekly && (
        <p className="find-us-horizontal__biweekly">
          {biweekly.active
            ? BIWEEKLY_NOTE
            : `${BIWEEKLY_NOTE} — prochain passage le ${biweekly.nextLabel}`}
        </p>
      )}
    </div>
  );
}

export default function FoodTruckSection() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    // On réévalue chaque minute : l'indicateur ouvert/fermé suit l'horloge.
    const interval = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const todayName = FRENCH_DAYS[now.getDay()];
  const today = getTodaySchedule(WEEKLY_SCHEDULE, now);
  const status = getOpenStatus(today, now);
  const activeToday = isScheduleDayActive(today, now);

  const subtitle = status.open
    ? `Le camion sert en ce moment à ${status.current.city} — ${status.current.time}.`
    : activeToday
      ? `Suivez nos emplacements hebdomadaires dans le Morbihan. Aujourd’hui : ${today.stops
          .map((stop) => stop.city)
          .join(' et ')}.`
      : 'Suivez nos emplacements hebdomadaires dans le Morbihan, du mardi au dimanche.';

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
            {subtitle}
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
              alt="Food truck Ryu Sushi en tournée dans le Morbihan - camion de sushi japonais"
              className="find-us-horizontal__img"
              loading="lazy"
              width={480}
              height={300}
            />
          </div>

          <div className="find-us-horizontal__info">
            <TodayCard entry={today} todayName={todayName} now={now} />

            <div
              className="find-us-horizontal__schedule"
              role="list"
              aria-label="Planning hebdomadaire du food truck"
            >
              {WEEKLY_SCHEDULE.map((entry) => (
                <ScheduleCard key={entry.day} entry={entry} isToday={entry.day === todayName} />
              ))}
            </div>

            <p className="schedule-note">{BIWEEKLY_NOTE}.</p>
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
