export const FRENCH_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

export function formatCounter(value, suffix = '') {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k${suffix}`;
  }
  return `${value}${suffix}`;
}

/**
 * Numéro de semaine ISO 8601 (1 à 53). Les semaines impaires sont celles
 * où le planning du samedi est actif.
 */
export function getIsoWeekNumber(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  // Le jeudi de la semaine courante détermine l'année ISO (norme 8601).
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/** Vrai si le samedi de la semaine en cours fait partie des semaines impaires. */
export function isBiweeklySaturdayActive(date = new Date()) {
  return getIsoWeekNumber(date) % 2 === 1;
}

/** Vrai si ce jour comporte au moins un arrêt (et, pour le samedi, la semaine impaire). */
export function isScheduleDayActive(entry, date = new Date()) {
  if (!entry || entry.closed || !entry.stops?.length) return false;
  if (entry.biweekly && !isBiweeklySaturdayActive(date)) return false;
  return true;
}

/**
 * Entrée de planning correspondant à `date` (aujourd'hui par défaut),
 * week-end et jour de fermeture inclus.
 */
export function getTodaySchedule(schedule, date = new Date()) {
  return schedule.find((s) => s.day === FRENCH_DAYS[date.getDay()]) || schedule[0];
}

/** Prochaine date (à partir de `from`) où ce jour du planning est actif. */
export function getNextActiveDate(entry, from = new Date()) {
  if (!entry) return null;

  const targetIndex = FRENCH_DAYS.indexOf(entry.day);
  if (targetIndex === -1) return null;

  // On balaie les 8 prochains jours pour couvrir le samedi en semaine paire.
  for (let offset = 0; offset <= 7; offset += 1) {
    const candidate = new Date(from);
    candidate.setDate(from.getDate() + offset);
    if (candidate.getDay() === targetIndex && isScheduleDayActive(entry, candidate)) {
      return candidate;
    }
  }

  return null;
}

/** "HH:MM" → minutes depuis minuit. */
function timeToMinutes(value) {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

/** "20:30" → "20h30", "09:00" → "9h" (affichage français compact). */
export function formatTimeLabel(value) {
  const [hours, minutes] = value.split(':');
  return minutes === '00' ? `${Number(hours)}h` : `${Number(hours)}h${minutes}`;
}

/**
 * État de service à `date`, pour l'indicateur « ouvert maintenant ».
 * Renvoie `{ open, current, next }` : l'arrêt en cours quand le camion sert,
 * sinon le prochain arrêt de la journée (`null` si le service est terminé
 * ou si le jour est inactif).
 */
export function getOpenStatus(entry, date = new Date()) {
  const closed = { open: false, current: null, next: null };
  if (!isScheduleDayActive(entry, date)) return closed;

  const now = date.getHours() * 60 + date.getMinutes();
  const stops = entry.stops.map((stop) => ({
    ...stop,
    opensAt: timeToMinutes(stop.opens),
    closesAt: timeToMinutes(stop.closes),
  }));

  const current = stops.find((stop) => now >= stop.opensAt && now < stop.closesAt);
  if (current) return { open: true, current, next: null };

  return { open: false, current: null, next: stops.find((stop) => now < stop.opensAt) || null };
}

/** "1 samedi sur 2" → clé de classe CSS, ou null si le jour n'est pas bimensuel. */
export function getBiweeklyState(entry, date = new Date()) {
  if (!entry?.biweekly) return null;

  const active = isBiweeklySaturdayActive(date);
  const next = active ? null : getNextActiveDate(entry, date);

  return {
    active,
    next,
    nextLabel: next
      ? next.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
      : null,
  };
}
