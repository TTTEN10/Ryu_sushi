import { Helmet } from 'react-helmet-async';
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  CONTACT_INFO,
  OPENING_HOURS,
  SERVED_CITIES,
  SCHEDULE_STOPS,
  NAV_LINKS,
} from '../../constants';
import {
  MENU_CATEGORIES,
  MENU_CATEGORY_NOTES,
  MENU_ITEMS,
  MENU_FORMULES,
} from '../../constants/menu';

const OG_IMAGE = `${SITE_URL}/images/ryu-truck-anime.png`;
const LOGO_IMAGE = `${SITE_URL}/images/ryu-logo.png`;

const DAY_TO_SCHEMA = {
  Lundi: 'Monday',
  Mardi: 'Tuesday',
  Mercredi: 'Wednesday',
  Jeudi: 'Thursday',
  Vendredi: 'Friday',
  Samedi: 'Saturday',
  Dimanche: 'Sunday',
};

function buildOpeningHours() {
  return OPENING_HOURS.map((slot) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: DAY_TO_SCHEMA[slot.day] || slot.day,
    opens: slot.opens,
    closes: slot.closes,
  }));
}

/** Emplacements desservis, dérivés du planning (source unique de vérité). */
const AREA_SERVED = SERVED_CITIES.map((city) => ({ '@type': 'City', name: city }));

/** "Saint-Jean-Brévelay" → "saint-jean-brevelay", pour les `@id` de lieu. */
const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function buildMenuSchema() {
  const toOffer = (price) => ({
    '@type': 'Offer',
    price: price.replace(/[^\d,]/g, '').replace(',', '.'),
    priceCurrency: 'EUR',
  });

  const toMenuItem = (item) => ({
    '@type': 'MenuItem',
    name: item.meta ? `${item.name} (${item.meta})` : item.name,
    ...(item.desc ? { description: item.desc } : {}),
    offers: toOffer(item.price),
  });

  const sections = MENU_CATEGORIES.map((cat) => ({
    '@type': 'MenuSection',
    name: cat,
    ...(MENU_CATEGORY_NOTES[cat] ? { description: MENU_CATEGORY_NOTES[cat] } : {}),
    hasMenuItem: cat === 'Menus'
      ? MENU_FORMULES.map((formule) => ({
          '@type': 'MenuItem',
          name: `Menu ${formule.name} — ${formule.pieces} (${formule.persons})`,
          description: `${formule.contents.join(', ')}. Accompagnement : ${formule.sides}.`,
          offers: toOffer(formule.price),
        }))
      : (MENU_ITEMS[cat] || []).map(toMenuItem),
  }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${SITE_URL}/#menu`,
    name: 'Menu Ryu Sushi 2026',
    description: 'Carte complète du food truck sushi japonais Ryu Sushi, en Morbihan',
    inLanguage: 'fr-FR',
    hasMenuSection: sections,
  };
}

const schemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    inLanguage: 'fr-FR',
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/#search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      '@type': 'ImageObject',
      url: LOGO_IMAGE,
      width: 470,
      height: 470,
    },
    image: OG_IMAGE,
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook],
    areaServed: {
      '@type': 'AdministrativeArea',
      name: 'Vannes et Morbihan',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'FoodEstablishment', 'LocalBusiness'],
    '@id': `${SITE_URL}/#restaurant`,
    name: SITE_NAME,
    alternateName: 'Ryu Sushi Food Truck Morbihan',
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    image: [OG_IMAGE, LOGO_IMAGE],
    logo: LOGO_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Japanese', 'Sushi', 'Japonais'],
    acceptsReservations: true,
    currenciesAccepted: 'EUR',
    paymentAccepted: 'Cash, Credit Card',
    // Food truck itinérant : le Morbihan est la zone desservie, sans adresse fixe.
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Morbihan',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT_INFO.geo.lat,
      longitude: CONTACT_INFO.geo.lng,
    },
    areaServed: [
      ...AREA_SERVED,
      { '@type': 'AdministrativeArea', name: 'Golfe du Morbihan' },
      { '@type': 'AdministrativeArea', name: 'Morbihan' },
    ],
    openingHoursSpecification: buildOpeningHours(),
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook],
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    hasMenu: { '@id': `${SITE_URL}/#menu` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FoodTruck',
    '@id': `${SITE_URL}/#foodtruck`,
    name: `${SITE_NAME} Food Truck`,
    description: 'Food truck de sushi japonais en tournée dans le Morbihan : Saint-Jean-Brévelay, Meucon, Baud, Elven, Baden, Saint-Nolff, Theix-Noyalo et Larmor-Baden.',
    url: SITE_URL,
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    image: OG_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Japanese', 'Sushi', 'Japonais'],
    address: {
      '@type': 'PostalAddress',
      addressRegion: 'Morbihan',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT_INFO.geo.lat,
      longitude: CONTACT_INFO.geo.lng,
    },
    areaServed: AREA_SERVED,
    openingHoursSpecification: buildOpeningHours(),
    hasMenu: { '@id': `${SITE_URL}/#menu` },
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook],
  },
  // Un lieu par emplacement hebdomadaire : chaque ville a sa propre adresse et
  // ses propres horaires, ce qui alimente les résultats locaux par commune.
  ...SCHEDULE_STOPS.map((stop) => ({
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    '@id': `${SITE_URL}/#stop-${slugify(stop.city)}`,
    name: `${SITE_NAME} — ${stop.city}${stop.market ? ' (marché)' : ''}`,
    description: stop.biweekly
      ? `Food truck de sushi japonais Ryu Sushi à ${stop.city}, un samedi sur deux (semaines impaires).`
      : `Food truck de sushi japonais Ryu Sushi à ${stop.city}, le ${stop.day.toLowerCase()}.`,
    url: SITE_URL,
    telephone: CONTACT_INFO.phone,
    image: OG_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Japanese', 'Sushi'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: stop.address.split(',')[0].trim(),
      addressLocality: stop.city,
      postalCode: stop.postalCode,
      addressRegion: 'Morbihan',
      addressCountry: 'FR',
    },
    areaServed: { '@type': 'City', name: stop.city },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: DAY_TO_SCHEMA[stop.day] || stop.day,
      opens: stop.opens,
      closes: stop.closes,
    },
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    hasMenu: { '@id': `${SITE_URL}/#menu` },
  })),
  {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: NAV_LINKS.map((link, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: link.label,
      item: `${SITE_URL}/${link.href}`,
    })),
  },
  buildMenuSchema(),
];

export default function SEO() {
  const title = `${SITE_NAME} — Food Truck Sushi Japonais en Tournée dans le Morbihan`;
  const twitterTitle = `${SITE_NAME} | Sushi Food Truck Morbihan`;

  return (
    <Helmet htmlAttributes={{ lang: 'fr' }}>
      <title>{title}</title>
      <meta name="description" content={SITE_DESCRIPTION} />
      <meta name="keywords" content={SITE_KEYWORDS} />
      <meta name="author" content={SITE_NAME} />
      <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      <meta name="googlebot" content="index, follow" />
      <link rel="canonical" href={SITE_URL} />
      <link rel="alternate" hrefLang="fr" href={SITE_URL} />
      <link rel="alternate" hrefLang="x-default" href={SITE_URL} />

      <meta name="geo.region" content="FR-56" />
      <meta name="geo.placename" content="Morbihan" />
      <meta name="geo.position" content={`${CONTACT_INFO.geo.lat};${CONTACT_INFO.geo.lng}`} />
      <meta name="ICBM" content={`${CONTACT_INFO.geo.lat}, ${CONTACT_INFO.geo.lng}`} />

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={SITE_URL} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={SITE_DESCRIPTION} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Food truck Ryu Sushi en tournée dans le Morbihan" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:locale:alternate" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="Food truck Ryu Sushi en tournée dans le Morbihan" />

      <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
      <meta name="application-name" content={SITE_NAME} />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
}
