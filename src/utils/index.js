export function getTodaySchedule(schedule) {
  const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const today = days[new Date().getDay()];
  return schedule.find((s) => s.day === today) || schedule[0];
}

export function formatCounter(value, suffix = '') {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k${suffix}`;
  }
  return `${value}${suffix}`;
}
