// Carte officielle Ryu Sushi — 2026 (source : menu_2026.md)

export const MENU_CATEGORIES = [
  'Entrées',
  'Sashimi',
  'Nigiri',
  'Uramaki',
  'Hosomaki',
  'Menus',
  'Poke Bowls',
  'Brochettes',
  'Dessert',
  'Boissons',
];

// Note affichée sous le nom de la catégorie (quantité, accompagnement…)
export const MENU_CATEGORY_NOTES = {
  Sashimi: '+ riz',
  Nigiri: '2 pièces',
  Uramaki: '8 pièces',
  Hosomaki: '8 pièces',
  Menus: '+ 1 € la boisson',
  Brochettes: '2 pièces + riz',
};

// Vignette affichée à gauche du nom de l'article (fichiers dans public/images/)
export const MENU_ITEMS = {
  Entrées: [
    { name: 'Soupe miso', price: '4 €', image: 'soupe-miso.png' },
    { name: 'Salade', price: '4 €', image: 'salade.png' },
    { name: '4 gyoza', price: '5 €', image: 'gyoza.png' },
  ],
  Sashimi: [
    { name: 'Saumon', meta: '6 pièces', price: '9 €', image: 'sashimi-saumon.png' },
    { name: 'Thon', meta: '6 pièces', price: '10 €', image: 'sashimi-thon.png' },
    { name: 'Bar', meta: '6 pièces', price: '9 €', image: 'sashimi-bar.png' },
    { name: 'Sashimix', meta: '18 pièces', price: '19 €', image: 'sashimix.png' },
  ],
  Nigiri: [
    { name: 'Saumon', price: '6,50 €', image: 'nigiri-saumon.png' },
    { name: 'Bar', price: '5,50 €', image: 'nigiri-bar.png' },
    { name: 'Thon', price: '7 €', image: 'nigiri-thon.png' },
  ],
  Uramaki: [
    { name: 'Cali thon épicé', desc: 'Thon épicé, ciboulette', price: '9,50 €', image: 'cali-thon-epice.png' },
    { name: 'Cali mango', desc: 'Saumon, mangue, concombre', price: '9,50 €', image: 'cali-mango.png' },
    { name: 'Cali classic', desc: 'Saumon, avocat, concombre', price: '9,50 €', image: 'cali-classic.png' },
    { name: 'Cali cheese', desc: 'Saumon fromage', price: '9 €', image: 'cali-cheese.png' },
    { name: 'Cali veggie', desc: 'Mangue, concombre, avocat', price: '9 €', image: 'cali-veggie.png' },
    { name: 'Crispy cali', desc: 'Saumon cuit, cream cheese, ciboulette, oignon frit', price: '12 €', image: 'crispy-cali.png' },
  ],
  Hosomaki: [
    { name: 'Saumon', price: '6,50 €', image: 'maki-saumon.png' },
    { name: 'Thon', price: '7 €', image: 'maki-thon.png' },
    { name: 'Maki veggie', desc: 'Avocat, concombre', price: '5 €', image: 'maki-veggie.png' },
    { name: 'Thon épicé', price: '7,50 €', image: 'maki-thon-epice.png' },
    { name: 'Saumon avocat', price: '8 €', image: 'maki-saumon-avocat.png' },
    { name: 'Maki frit', desc: 'Saumon, fromage', price: '10 €', image: 'maki-frit.png' },
  ],
  'Poke Bowls': [
    { name: 'Saumon bowl', meta: 'cuit ou cru', desc: 'Riz, saumon mariné, avocat, concombre, carotte, mangue, sésame, ciboulette', price: '16 €' },
    { name: 'Thon bowl', desc: 'Riz, thon mariné, avocat, concombre, carotte, échalote, sésame, ciboulette', price: '17 €' },
    { name: 'Veggie bowl', desc: 'Riz, avocat, concombre, mangue, carotte, radis, sésame, ciboulette', price: '15 €' },
  ],
  Brochettes: [
    { name: 'Yaki-cheese fry', desc: 'Brochette de bœuf, fromage panée', price: '8 €' },
    { name: 'Yaki-cheese', desc: 'Brochette de bœuf, fromage', price: '7 €' },
    { name: 'Yakitori poulet', desc: 'Brochette de poulet', price: '6 €' },
    { name: 'Eby fry', desc: 'Crevette panée', price: '5 €' },
    { name: 'Bol de riz', desc: 'Riz vinaigré avec sésame', price: '3 €' },
  ],
  Dessert: [
    { name: 'Mochi x 2', desc: 'Gâteau à base de pâte de riz (sésame / cacahuète / haricot rouge)', price: '3,50 €' },
  ],
  Boissons: [
    { name: 'Coca-Cola', meta: '33 cl', price: '2,50 €' },
    { name: 'Eau', meta: '50 cl', price: '1,50 €' },
    { name: 'Oasis', meta: '33 cl', price: '2,50 €' },
    { name: 'Ice Tea', meta: '33 cl', price: '2,50 €' },
  ],
};

// Catégories dont les articles partagent une seule photo : l'image est affichée
// une fois en tête de catégorie au lieu d'une vignette par article.
export const MENU_CATEGORY_IMAGES = {
  'Poke Bowls': { image: 'poke-bowl.jpg', alt: 'Poke bowl Ryu Sushi' },
  Brochettes: { image: 'brochettes-japonaises.png', alt: 'Brochettes japonaises et riz sésame' },
};

// Formules : structure différente des articles à la carte (pièces, convives, contenu détaillé)
export const MENU_FORMULES = [
  {
    name: 'Hitori',
    pieces: '20 pièces',
    persons: '1 personne',
    price: '22 €',
    contents: [
      '2 sashimi saumon',
      '2 sashimi thon',
      '2 nigiri saumon',
      '2 nigiri thon',
      '4 maki saumon',
      '4 cali mango',
      '4 maki frit',
    ],
    sides: 'salade',
  },
  {
    name: 'Nijuu',
    pieces: '38 pièces',
    persons: '2 personnes',
    price: '40 €',
    contents: [
      '3 sashimi saumon',
      '3 sashimi thon',
      '2 sashimi bar',
      '3 nigiri saumon',
      '3 nigiri thon',
      '8 maki saumon',
      '4 maki frit',
      '4 cali thon épicé',
      '4 cali mango',
      '4 cali veggie',
    ],
    sides: 'soupe et salade',
  },
  {
    name: 'Sanjuu',
    pieces: '50 pièces',
    persons: '3 personnes',
    price: '54 €',
    contents: [
      '3 sashimi saumon',
      '3 sashimi thon',
      '3 sashimi bar',
      '3 nigiri saumon',
      '3 nigiri thon',
      '3 nigiri bar',
      '8 maki saumon',
      '4 cali classic',
      '4 maki frit',
      '4 cali thon épicé',
      '4 cali mango',
      '4 cali veggie',
      '4 crispy cali',
    ],
    sides: 'soupe, salade et gyoza',
  },
  {
    name: 'Shogo',
    meta: 'midi',
    pieces: '15 pièces',
    persons: '1 personne',
    price: '16 €',
    contents: [
      '2 sashimi saumon',
      '2 sashimi thon',
      '3 nigiri saumon',
      '4 maki saumon',
      '2 cali mango',
      '2 maki frit',
    ],
    sides: 'salade',
    note: 'Menu servi uniquement le midi.',
  },
];
