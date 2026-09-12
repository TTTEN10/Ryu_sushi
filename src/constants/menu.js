export const MENU_CATEGORIES = [
  'Nigiri',
  'Sashimi',
  'Maki',
  'California Rolls',
  'Dragon Rolls',
  'Tempura',
  'Yakitori',
  'Gyoza',
  'Ramen',
  'Poke Bowls',
  'Desserts',
  'Boissons',
];

export const MENU_ITEMS = {
  Nigiri: [
    { name: 'Nigiri Saumon', desc: 'Saumon norvégien frais sur riz assaisonné', price: '4,50 €', chefPick: true },
    { name: 'Nigiri Thon', desc: 'Thon rouge, wasabi, feuille de shiso', price: '5,50 €', chefPick: true },
    { name: 'Nigiri Anguille', desc: 'Unagi grillée, sauce kabayaki', price: '5,00 €' },
    { name: 'Nigiri Hamachi', desc: 'Hamachi, ponzu et ciboule', price: '5,00 €' },
    { name: 'Nigiri Crevette', desc: 'Amaebi légèrement flambée', price: '4,50 €' },
    { name: 'Nigiri Poulpe', desc: 'Tako, sésame et agrumes', price: '4,00 €' },
  ],
  Sashimi: [
    { name: 'Sashimi Saumon', desc: '6 tranches de saumon premium', price: '14 €', chefPick: true },
    { name: 'Sashimi Thon', desc: '6 tranches de thon rouge', price: '16 €' },
    { name: 'Assortiment Sashimi', desc: '12 pièces sélection du chef', price: '24 €', chefPick: true },
    { name: 'Sashimi Hamachi', desc: '6 tranches, ponzu jalapeño', price: '15 €' },
  ],
  Maki: [
    { name: 'California Roll', desc: 'Crabe, avocat, concombre, tobiko', price: '10 €', chefPick: true },
    { name: 'Maki Thon Épicé', desc: 'Thon, mayo épicée, concombre', price: '12 €', chefPick: true },
    { name: 'Maki Saumon Avocat', desc: 'Saumon frais, avocat mûr', price: '11 €' },
    { name: 'Maki Légumes', desc: 'Avocat, concombre, carotte, asperge', price: '9 €' },
  ],
  'California Rolls': [
    { name: 'California Classique', desc: 'Crabe, avocat, concombre', price: '10 €', chefPick: true },
    { name: 'California Épicé', desc: 'Crabe, avocat, mayo épicée, sriracha', price: '11 €' },
    { name: 'Rainbow California', desc: 'California recouvert de poissons assortis', price: '15 €', chefPick: true },
  ],
  'Dragon Rolls': [
    { name: 'Ryu Dragon', desc: 'Anguille, avocat, concombre, sauce dragon', price: '18 €', chefPick: true },
    { name: 'Green Dragon', desc: 'Tempura crevette, avocat, tobiko wasabi', price: '16 €' },
    { name: 'Red Dragon', desc: 'Thon épicé, avocat, aioli piquant', price: '17 €', chefPick: true },
  ],
  Tempura: [
    { name: 'Tempura Crevettes', desc: '5 pièces, sauce tentsuyu', price: '12 €', chefPick: true },
    { name: 'Tempura Légumes', desc: 'Légumes de saison, pâte légère', price: '10 €' },
    { name: 'Tempura Mixte', desc: 'Crevettes et légumes', price: '14 €', chefPick: true },
  ],
  Yakitori: [
    { name: 'Yakitori Poulet', desc: 'Brochettes grillées, glaçage tare', price: '8 €', chefPick: true },
    { name: 'Yakitori Bœuf', desc: 'Wagyu, poivre yuzu', price: '12 €', chefPick: true },
    { name: 'Tsukune', desc: 'Boulettes de poulet, jaune d\'œuf', price: '9 €' },
  ],
  Gyoza: [
    { name: 'Gyoza Porc', desc: 'Raviolis poêlés, sauce ponzu', price: '8 €', chefPick: true },
    { name: 'Gyoza Légumes', desc: 'Champignons et chou', price: '7 €' },
    { name: 'Gyoza Crevettes', desc: 'Crevettes entières, ciboule', price: '9 €', chefPick: true },
  ],
  Ramen: [
    { name: 'Ramen Tonkotsu', desc: 'Bouillon porc, chashu, œuf', price: '14 €', chefPick: true },
    { name: 'Ramen Miso', desc: 'Bouillon miso, maïs, beurre', price: '13 €', chefPick: true },
    { name: 'Ramen Shoyu', desc: 'Bouillon soja, nori, pousses de bambou', price: '12 €' },
  ],
  'Poke Bowls': [
    { name: 'Poke Saumon', desc: 'Saumon mariné, riz, edamame, avocat', price: '14 €', chefPick: true },
    { name: 'Poke Thon', desc: 'Thon épicé, concombre, salade d\'algues', price: '15 €', chefPick: true },
    { name: 'Poke Tofu', desc: 'Tofu mariné, mangue, sésame', price: '12 €' },
  ],
  Desserts: [
    { name: 'Mochi Glacé', desc: 'Trois parfums assortis', price: '7 €', chefPick: true },
    { name: 'Cheesecake Matcha', desc: 'Thé vert, haricot rouge', price: '8 €', chefPick: true },
    { name: 'Dorayaki', desc: 'Galette fourrée haricot rouge', price: '6 €' },
  ],
  Boissons: [
    { name: 'Dégustation Saké', desc: 'Trois sakés premium', price: '12 €', chefPick: true },
    { name: 'Matcha Latte', desc: 'Matcha cérémonial, lait d\'avoine', price: '5 €' },
    { name: 'Limonade Yuzu', desc: 'Yuzu frais, eau pétillante', price: '4 €', chefPick: true },
    { name: 'Highball Japonais', desc: 'Whisky, soda, twist de citron', price: '9 €' },
  ],
};
