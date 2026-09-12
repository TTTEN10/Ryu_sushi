import { Helmet } from 'react-helmet-async';
import {
  SITE_NAME,
  SITE_URL,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  CONTACT_INFO,
  OPENING_HOURS,
  NAV_LINKS,
} from '../../constants';
import { MENU_CATEGORIES, MENU_ITEMS } from '../../constants/menu';

const OG_IMAGE = `${SITE_URL}/assets/ryu-truck-anime.png`;
const LOGO_IMAGE = `${SITE_URL}/assets/ryu-logo.png`;

const DAY_TO_SCHEMA = {
  Lundi: 'Monday',
  Mardi: 'Tuesday',
  Mercredi: 'Wednesday',
  Jeudi: 'Thursday',
  Vendredi: 'Friday',
  Samedi: 'Saturday',
  Dimanche: 'Sunday',
};

function parseHours(hours) {
  const [opens, closes] = hours.split(' — ').map((part) => part.trim());
  return { opens, closes };
}

function buildMenuSchema() {
  const items = MENU_CATEGORIES.flatMap((cat) =>
    (MENU_ITEMS[cat] || []).map((item) => ({
      '@type': 'MenuItem',
      name: item.name,
      description: item.desc,
      offers: {
        '@type': 'Offer',
        price: item.price.replace(/[^\d,]/g, '').replace(',', '.'),
        priceCurrency: 'EUR',
      },
    }))
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Menu Ryu Sushi',
    description: 'Carte complète du food truck sushi japonais Ryu Sushi à Paris',
    hasMenuSection: MENU_CATEGORIES.map((cat) => ({
      '@type': 'MenuSection',
      name: cat,
      hasMenuItem: (MENU_ITEMS[cat] || []).map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        description: item.desc,
        offers: {
          '@type': 'Offer',
          price: item.price.replace(/[^\d,]/g, '').replace(',', '.'),
          priceCurrency: 'EUR',
        },
      })),
    })),
    hasMenuItem: items.slice(0, 20),
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
    alternateName: 'Ryu Sushi Food Truck Vannes',
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
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vannes',
      addressRegion: 'Morbihan',
      postalCode: '56000',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT_INFO.geo.lat,
      longitude: CONTACT_INFO.geo.lng,
    },
    areaServed: [
      { '@type': 'City', name: 'Vannes' },
      { '@type': 'City', name: 'Ploeren' },
      { '@type': 'City', name: 'Arradon' },
      { '@type': 'City', name: 'Baden' },
      { '@type': 'City', name: 'Plescop' },
      { '@type': 'AdministrativeArea', name: 'Golfe du Morbihan' },
    ],
    openingHoursSpecification: OPENING_HOURS.map((h) => {
      const { opens, closes } = parseHours(h.hours);
      return {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: DAY_TO_SCHEMA[h.day] || h.day,
        opens,
        closes,
      };
    }),
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook],
    parentOrganization: { '@id': `${SITE_URL}/#organization` },
    hasMenu: { '@id': `${SITE_URL}/#menu` },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FoodTruck',
    '@id': `${SITE_URL}/#foodtruck`,
    name: `${SITE_NAME} Food Truck`,
    description: 'Food truck sushi japonais premium à Vannes et dans le Golfe du Morbihan',
    telephone: CONTACT_INFO.phone,
    email: CONTACT_INFO.email,
    image: OG_IMAGE,
    priceRange: '€€',
    servesCuisine: ['Japanese', 'Sushi', 'Japonais'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vannes',
      addressRegion: 'Morbihan',
      postalCode: '56000',
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: CONTACT_INFO.geo.lat,
      longitude: CONTACT_INFO.geo.lng,
    },
    hasMenu: { '@id': `${SITE_URL}/#menu` },
    sameAs: [CONTACT_INFO.instagram, CONTACT_INFO.facebook],
  },
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
  const title = `${SITE_NAME} — Food Truck Sushi Japonais Premium à Vannes & Morbihan`;
  const twitterTitle = `${SITE_NAME} | Sushi Food Truck Vannes`;

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
      <meta name="geo.placename" content="Vannes" />
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
      <meta property="og:image:alt" content="Food truck Ryu Sushi à Vannes, Morbihan" />
      <meta property="og:locale" content="fr_FR" />
      <meta property="og:locale:alternate" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={twitterTitle} />
      <meta name="twitter:description" content={SITE_DESCRIPTION} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="Food truck Ryu Sushi à Vannes, Morbihan" />

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
