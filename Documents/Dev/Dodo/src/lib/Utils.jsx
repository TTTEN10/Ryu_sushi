/**
 * Formate une date en format français
 * @param {Date|string} date - La date à formater
 * @param {string} locale - La locale (défaut: 'fr-FR')
 * @param {object} options - Options de formatage
 * @returns {string} La date formatée
 */
export function formatDate(date, locale = 'fr-FR', options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }
  return new Date(date).toLocaleDateString(locale, { ...defaultOptions, ...options })
}

/**
 * Formate un montant en euros
 * @param {number} amount - Le montant à formater
 * @returns {string} Le montant formaté
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

/**
 * Valide un email
 * @param {string} email - L'email à valider
 * @returns {boolean} True si l'email est valide
 */
export function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valide un numéro de téléphone français
 * @param {string} phone - Le numéro à valider
 * @returns {boolean} True si le numéro est valide
 */
export function isValidPhone(phone) {
  const regex = /^((\+|00)33|0)[1-9](\d{2}){4}$/
  return regex.test(phone.replace(/\s/g, ''))
}

/**
 * Génère un identifiant unique
 * @returns {string} Un identifiant unique
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Debounce une fonction
 * @param {Function} func - La fonction à debouncer
 * @param {number} wait - Le temps d'attente en ms
 * @returns {Function} La fonction debouncée
 */
export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle une fonction
 * @param {Function} func - La fonction à throttler
 * @param {number} limit - La limite en ms
 * @returns {Function} La fonction throttled
 */
export function throttle(func, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Clone profondément un objet
 * @param {any} obj - L'objet à cloner
 * @returns {any} L'objet cloné
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/**
 * Vérifie si une valeur est vide
 * @param {any} value - La valeur à vérifier
 * @returns {boolean} True si la valeur est vide
 */
export function isEmpty(value) {
  if (value == null) return true
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === 'object') return Object.keys(value).length === 0
  return false
}

/**
 * Slugify une chaîne de caractères
 * @param {string} text - Le texte à slugifier
 * @returns {string} Le texte slugifié
 */
export function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export default {
  formatDate,
  formatCurrency,
  isValidEmail,
  isValidPhone,
  generateId,
  debounce,
  throttle,
  deepClone,
  isEmpty,
  slugify,
}