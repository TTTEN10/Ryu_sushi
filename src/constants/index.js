export const SITE_NAME = 'Ryu Sushi';
export const SITE_URL = 'https://ryusushi.com';
export const SITE_DESCRIPTION = 'Food truck de sushi japonais premium en itinérance dans le Morbihan : Saint-Jean-Brévelay, Meucon, Baud, Elven, Baden, Saint-Nolff, Theix-Noyalo et Larmor-Baden. Poisson frais, savoir-faire authentique et cuisine de rue raffinée. Consultez le planning hebdomadaire et réservez votre expérience.';
export const SITE_KEYWORDS = 'sushi morbihan, food truck morbihan, camion sushi morbihan, sushi vannes, food truck vannes, sushi saint-jean-brévelay, sushi meucon, sushi baud, sushi elven, sushi baden, sushi saint-nolff, sushi theix-noyalo, sushi larmor-baden, traiteur sushi morbihan, festival sushi morbihan, ryu sushi, food truck itinérant bretagne, marché sushi morbihan';

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
  address: 'Golfe du Morbihan, France',
  geo: { lat: 47.6577, lng: -2.7603 },
};

export const COUNTERS = [
  { end: 8, suffix: '+', label: "Années d'expérience" },
  { end: 50000, suffix: '+', label: 'Sushis servis' },
  { end: 100, suffix: '%', label: 'Servis avec sourire' },
];

/**
 * Planning hebdomadaire du food truck — source unique de vérité.
 * Chaque jour porte une liste d'arrêts (`stops`) : certains jours en comptent deux
 * (marché le matin, service le soir). `closed: true` marque un jour sans service.
 * `opens` / `closes` sont au format 24 h "HH:MM" pour les données structurées ;
 * `time` est la version affichée.
 */
export const WEEKLY_SCHEDULE = [
  {
    day: 'Lundi',
    closed: true,
    stops: [],
  },
  {
    day: 'Mardi',
    stops: [
      {
        label: 'Saint-Jean-Brévelay',
        market: false,
        time: '12h — 20h30',
        opens: '12:00',
        closes: '20:30',
        address: 'Rue de l’Église, 56660 Saint-Jean-Brévelay',
        city: 'Saint-Jean-Brévelay',
        postalCode: '56660',
      },
    ],
  },
  {
    day: 'Mercredi',
    stops: [
      {
        label: 'Meucon',
        market: true,
        time: '16h — 20h',
        opens: '16:00',
        closes: '20:00',
        address: 'Place de la Mairie, 56890 Meucon',
        city: 'Meucon',
        postalCode: '56890',
      },
    ],
  },
  {
    day: 'Jeudi',
    stops: [
      {
        label: 'Baud',
        market: false,
        time: '12h — 21h',
        opens: '12:00',
        closes: '21:00',
        address: 'Place du Marché, 56150 Baud',
        city: 'Baud',
        postalCode: '56150',
      },
    ],
  },
  {
    day: 'Vendredi',
    stops: [
      {
        label: 'Elven',
        market: true,
        time: '8h — 13h',
        opens: '08:00',
        closes: '13:00',
        address: 'Place de l’Église, 56250 Elven',
        city: 'Elven',
        postalCode: '56250',
      },
      {
        label: 'Baden',
        market: true,
        time: '16h — 20h',
        opens: '16:00',
        closes: '20:00',
        address: 'Place du Marchallac’h, 56870 Baden',
        city: 'Baden',
        postalCode: '56870',
      },
    ],
  },
  {
    day: 'Samedi',
    // Un samedi sur deux — semaines impaires uniquement.
    biweekly: true,
    stops: [
      {
        label: 'Saint-Nolff',
        market: true,
        time: '9h — 13h',
        opens: '09:00',
        closes: '13:00',
        address: 'Centre commercial des Ajoncs, 56250 Saint-Nolff',
        city: 'Saint-Nolff',
        postalCode: '56250',
      },
      {
        label: 'Theix-Noyalo',
        market: false,
        time: '16h — 20h',
        opens: '16:00',
        closes: '20:00',
        address: '6 place de Rhuys, 56450 Theix-Noyalo',
        city: 'Theix-Noyalo',
        postalCode: '56450',
      },
    ],
  },
  {
    day: 'Dimanche',
    stops: [
      {
        label: 'Larmor-Baden',
        market: true,
        time: '8h — 13h',
        opens: '08:00',
        closes: '13:00',
        address: 'Place de l’Église, 56870 Larmor-Baden',
        city: 'Larmor-Baden',
        postalCode: '56870',
      },
    ],
  },
];

export const BIWEEKLY_NOTE = '1 samedi sur 2 — semaines impaires';

/** Toutes les villes desservies, dans l'ordre du planning. */
export const SERVED_CITIES = [
  ...new Set(WEEKLY_SCHEDULE.flatMap((d) => d.stops.map((s) => s.city))),
];

/**
 * Arrêts à plat, un par emplacement hebdomadaire : `{ day, city, address,
 * postalCode, market, opens, closes, biweekly }`. Utilisé pour les données
 * structurées, qui décrivent un lieu par ville plutôt qu'un lieu unique.
 */
export const SCHEDULE_STOPS = WEEKLY_SCHEDULE.flatMap((d) =>
  d.stops.map((s) => ({
    day: d.day,
    city: s.city,
    address: s.address,
    postalCode: s.postalCode,
    market: s.market,
    opens: s.opens,
    closes: s.closes,
    biweekly: Boolean(d.biweekly),
  }))
);

/**
 * Créneaux d'ouverture dérivés du planning, pour les données structurées.
 * Un jour à deux arrêts produit deux créneaux (valide en schema.org).
 */
export const OPENING_HOURS = WEEKLY_SCHEDULE.flatMap((d) =>
  d.stops.map((s) => ({ day: d.day, opens: s.opens, closes: s.closes }))
);


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
  { id: 1, alt: 'Yakitori grillé', aspect: 'tall', src: '/images/gallery-yakitori.jpg' },
  { id: 2, alt: 'California roll', aspect: 'wide', src: '/images/gallery-california.jpg' },
  { id: 3, alt: 'Bento Ryu Sushi', aspect: 'square', src: '/images/gallery-bento.jpg' },
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
    answer: 'Notre emplacement change chaque jour dans le Morbihan : Saint-Jean-Brévelay le mardi, Meucon le mercredi, Baud le jeudi, Elven et Baden le vendredi, Saint-Nolff et Theix-Noyalo le samedi, Larmor-Baden le dimanche. Consultez la section Food Truck pour l\'adresse et les horaires du jour.',
  },
  {
    question: 'Êtes-vous ouverts le lundi ?',
    answer: 'Non, le food truck est fermé tous les lundis. Nous vous retrouvons du mardi au dimanche.',
  },
  {
    question: 'Le samedi, êtes-vous toujours là ?',
    answer: 'Nous sommes présents un samedi sur deux, les semaines impaires. Le planning du site indique automatiquement si le samedi à venir est ouvert.',
  },
  {
    question: 'Proposez-vous des événements privés ou des festivals ?',
    answer: 'Oui. Ryu Sushi intervient pour les événements privés et les festivals dans tout le Morbihan, avec des menus sur mesure et une préparation live.',
  },
  {
    question: 'Les poissons sont-ils frais ?',
    answer: 'Absolument. Nos chefs sélectionnent chaque matin des produits de la mer auprès de fournisseurs de confiance.',
  },
  {
    question: 'Comment réserver ou commander ?',
    answer: 'Commandez par appel ou SMS au 07 88 42 15 46. Pour un événement privé ou un festival, appelez-nous ou écrivez à ryusushi56@gmail.com.',
  },
];
