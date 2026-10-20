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

export const MENU_ITEMS = {
  Entrées: [
    { name: 'Soupe miso', price: '4 €' },
    { name: 'Salade', price: '4 €' },
    { name: '4 gyoza', price: '5 €' },
  ],
  Sashimi: [
    { name: 'Saumon', meta: '6 pièces', price: '9 €' },
    { name: 'Thon', meta: '6 pièces', price: '10 €' },
    { name: 'Bar', meta: '6 pièces', price: '9 €' },
    { name: 'Sashimix', meta: '18 pièces', price: '19 €' },
  ],
  Nigiri: [
    { name: 'Saumon', price: '6,50 €' },
    { name: 'Bar', price: '5,50 €' },
    { name: 'Thon', price: '7 €' },
  ],
  Uramaki: [
    { name: 'Cali thon épicé', desc: 'Thon épicé, ciboulette', price: '9,50 €' },
    { name: 'Cali mango', desc: 'Saumon, mangue, concombre', price: '9,50 €' },
    { name: 'Cali classic', desc: 'Saumon, avocat, concombre', price: '9,50 €' },
    { name: 'Cali cheese', desc: 'Saumon fromage', price: '9 €' },
    { name: 'Cali veggie', desc: 'Mangue, concombre, avocat', price: '9 €' },
    { name: 'Crispy cali', desc: 'Saumon cuit, cream cheese, ciboulette, oignon frit', price: '12 €' },
  ],
  Hosomaki: [
    { name: 'Saumon', price: '6,50 €' },
    { name: 'Thon', price: '7 €' },
    { name: 'Maki veggie', desc: 'Avocat, concombre', price: '5 €' },
    { name: 'Thon épicé', price: '7,50 €' },
    { name: 'Saumon avocat', price: '8 €' },
    { name: 'Maki frit', desc: 'Saumon, fromage', price: '10 €' },
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
