export const SITE_NAME = 'Ryu Sushi';
export const SITE_URL = 'https://ryusushi.com';
export const SITE_DESCRIPTION = 'Food truck de sushi japonais premium à Vannes et dans le Morbihan. Poisson frais, savoir-faire authentique et cuisine de rue raffinée. Trouvez notre camion sushi à Vannes, consultez le menu et réservez votre expérience.';
export const SITE_KEYWORDS = 'sushi vannes, food truck vannes, camion sushi vannes, restaurant japonais vannes, maki vannes, nigiri frais vannes, traiteur sushi morbihan, festival sushi vannes, ryu sushi vannes, vannes food, vannes food truck, vannes foodtruck, vannes sushi, manger sushi vannes, meilleur sushi vannes, food truck morbihan, sushi golfe du morbihan';

export const NAV_LINKS = [
  { label: 'Accueil', href: '#home' },
  { label: 'Menu', href: '#menu' },
  { label: 'Food Truck', href: '#food-truck' },
  { label: 'À Propos', href: '#about' },
  { label: 'Galerie', href: '#gallery' },
  { label: 'Contact', href: '#contact' },
];

export const CONTACT_INFO = {
  phone: '07 88 42 15 46',
  email: 'ryusushi56@gmail.com',
  instagram: 'https://instagram.com/ryusushi',
  facebook: 'https://www.facebook.com/people/Ryu-Sushi/61555112947963/?mibextid=wwXIfr&rdid=4hVQzpv94R97sT20&share_url=https%3A%2F%2Fwww.facebook.com%2Fshare%2F19B6FVZBff%2F%3Fmibextid%3DwwXIfr',
  address: 'Vannes, Morbihan, France',
  geo: { lat: 47.6577, lng: -2.7603 },
};

export const OPENING_HOURS = [
  { day: 'Lundi', hours: '11:00 — 22:00' },
  { day: 'Mardi', hours: '11:00 — 22:00' },
  { day: 'Mercredi', hours: '11:00 — 22:00' },
  { day: 'Jeudi', hours: '11:00 — 23:00' },
  { day: 'Vendredi', hours: '11:00 — 23:00' },
  { day: 'Samedi', hours: '12:00 — 23:00' },
  { day: 'Dimanche', hours: '12:00 — 21:00' },
];

export const COUNTERS = [
  { end: 8, suffix: '+', label: "Années d'expérience" },
  { end: 50000, suffix: '+', label: 'Sushis servis' },
  { end: 100, suffix: '%', label: 'Servis avec sourire' },
];

export const WEEKLY_SCHEDULE = [
  { day: 'Lundi', location: 'Port de Vannes', time: '11:30 — 14:30 / 18:00 — 22:00' },
  { day: 'Mardi', location: 'Place de la République - Vannes', time: '11:30 — 14:30 / 18:00 — 22:00' },
  { day: 'Mercredi', location: 'Marché des Lices - Vannes', time: '11:30 — 14:30 / 18:00 — 22:00' },
  { day: 'Jeudi', location: 'Jardin des Remparts - Vannes', time: '11:30 — 14:30 / 18:00 — 22:00' },
  { day: 'Vendredi', location: 'Plage de Conleau - Vannes', time: '11:30 — 14:30 / 18:00 — 23:00' },
  { day: 'Samedi', location: 'Marché de Keroulzer - Vannes', time: '11:30 — 23:00' },
  { day: 'Dimanche', location: 'Port de Plaisance - Vannes', time: '12:00 — 21:00' },
];

export const CATERING_SERVICES = [
  { title: 'Événements privés', desc: 'Réceptions intimistes avec menus sushi sur mesure, préparés devant vos invités.' },
  { title: 'Festivals', desc: 'Service haute capacité sans compromis sur la qualité ni la présentation.' },
];

export const SPECIALS = [
  { name: 'Dragon Roll du Chef', desc: 'Crevette tempura, avocat, sauce anguille', price: '16 €' },
  { name: 'Box Omakase', desc: '12 pièces sélectionnées par le chef', price: '45 €' },
  { name: 'Poke Thon Épicé', desc: 'Thon frais, mayo épicée, edamame', price: '14 €' },
];

export const GALLERY_ITEMS = [
  { id: 1, alt: 'Yakitori grillé', aspect: 'tall', src: '/gallery/yakitori.jpg' },
  { id: 2, alt: 'California roll', aspect: 'wide', src: '/gallery/california.jpg' },
  { id: 3, alt: 'Bento Ryu Sushi', aspect: 'square', src: '/gallery/bento.jpg' },
];

export const SIGNATURE_ROLLS = [
  { name: 'Ryu Dragon', desc: 'Anguille, avocat, concombre, sauce dragon', price: '18 €' },
  { name: 'Tokyo Sunset', desc: 'Saumon, mangue, tobiko, mayo épicée', price: '15 €' },
  { name: 'Black Pearl', desc: 'Thon, tobiko noir, huile de truffe', price: '20 €' },
  { name: 'Golden Koi', desc: 'Hamachi, feuille d\'or, zestes de yuzu', price: '22 €' },
  { name: 'Sakura Blossom', desc: 'Tempura de crevette, radis sakura', price: '16 €' },
  { name: 'Volcano Roll', desc: 'Thon épicé, jalapeño, sauce volcano', price: '17 €' },
];

export const FAQ_ITEMS = [
  {
    question: 'Où se trouve le food truck Ryu Sushi aujourd\'hui ?',
    answer: 'Notre emplacement change chaque jour dans Paris. Consultez la section Food Truck pour voir le planning hebdomadaire et l\'adresse du jour.',
  },
  {
    question: 'Proposez-vous des événements privés ou des festivals ?',
    answer: 'Oui. Ryu Sushi intervient pour les événements privés et les festivals avec des menus sur mesure et une préparation live.',
  },
  {
    question: 'Les poissons sont-ils frais ?',
    answer: 'Absolument. Nos chefs sélectionnent chaque matin des produits de la mer auprès de fournisseurs de confiance.',
  },
  {
    question: 'Comment réserver ou commander ?',
    answer: 'Utilisez le formulaire de contact ou de réservation sur le site, ou appelez-nous au 07 88 42 15 46.',
  },
];
