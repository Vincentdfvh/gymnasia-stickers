// ============================================================
//  DONNÉES DES STICKERS GYMNASIA
//  Pour ajouter un sticker : ajoute une ligne dans STICKERS.
//  - iso   : code pays ISO numérique (voir https://fr.wikipedia.org/wiki/ISO_3166-1_numérique)
//  - lat/lng : position du sticker (Google Maps → clic droit → copier les coordonnées)
//  - approx : true si la position exacte n'est pas connue (point au centre / capitale)
//  - alt   : altitude en mètres (optionnel, sert pour les records)
//  - summit: true si c'est un sommet
// ============================================================

window.PEOPLE = [
  { id: "jules",   name: "Jules",        color: "#ff6b6b" },
  { id: "darius",  name: "Darius",       color: "#ffb347" },
  { id: "lemi",    name: "Lemi",         color: "#ffe066" },
  { id: "vincent", name: "Vincent",      color: "#4ade80" },
  { id: "giacomo", name: "Giacomo",      color: "#38bdf8" },
  { id: "anton",   name: "Anton",        color: "#a78bfa" },
  { id: "tristan", name: "Tristan Sidj", color: "#f472b6" },
  { id: "club",    name: "Le club",      color: "#e5e7eb" },
];

// Position du QG (pour la stat « le plus loin de la maison »)
window.HOME = { name: "Suisse", lat: 46.8, lng: 8.2 };

window.STICKERS = [
  { person: "club",    iso: "756", country: "Suisse",      continent: "Europe",            place: "Le QG",                            lat: 46.80,  lng: 8.23,    approx: true },

  { person: "jules",   iso: "276", country: "Allemagne",   continent: "Europe",            place: "Allemagne",                        lat: 51.17,  lng: 10.45,   approx: true },
  { person: "jules",   iso: "818", country: "Égypte",      continent: "Afrique",           place: "Égypte",                           lat: 26.82,  lng: 30.80,   approx: true },
  { person: "jules",   iso: "752", country: "Suède",       continent: "Europe",            place: "Au cercle polaire",                lat: 66.56,  lng: 19.80 },
  { person: "jules",   iso: "578", country: "Norvège",     continent: "Europe",            place: "Norvège",                          lat: 61.50,  lng: 9.50,    approx: true },

  { person: "darius",  iso: "364", country: "Iran",        continent: "Asie",              place: "Iran",                             lat: 32.43,  lng: 53.69,   approx: true },
  { person: "darius",  iso: "480", country: "Île Maurice", continent: "Afrique",           place: "Île Maurice",                      lat: -20.25, lng: 57.55,   approx: true },
  { person: "darius",  iso: "250", country: "France",      continent: "Europe",            place: "France",                           lat: 46.60,  lng: 2.40,    approx: true },

  { person: "lemi",    iso: "276", country: "Allemagne",   continent: "Europe",            place: "Allemagne",                        lat: 50.20,  lng: 8.60,    approx: true },

  { person: "vincent", iso: "076", country: "Brésil",      continent: "Amérique du Sud",   place: "Sur la plage et dans le village de hippies (avec Toma)", lat: -14.2, lng: -45.0, approx: true },
  { person: "vincent", iso: "152", country: "Chili",       continent: "Amérique du Sud",   place: "Chili",                            lat: -33.45, lng: -70.67,  approx: true },
  { person: "vincent", iso: "604", country: "Pérou",       continent: "Amérique du Sud",   place: "Vinicunca (montagne arc-en-ciel)", lat: -13.87, lng: -71.30,  alt: 5036, summit: true },

  { person: "giacomo", iso: "380", country: "Italie",      continent: "Europe",            place: "Italie",                           lat: 42.80,  lng: 12.50,   approx: true },

  { person: "anton",   iso: "392", country: "Japon",       continent: "Asie",              place: "Tokyo",                            lat: 35.68,  lng: 139.69 },
  { person: "anton",   iso: "392", country: "Japon",       continent: "Asie",              place: "Osaka",                            lat: 34.69,  lng: 135.50 },
  { person: "anton",   iso: "410", country: "Corée du Sud",continent: "Asie",              place: "Séoul",                            lat: 37.57,  lng: 126.98 },
  { person: "anton",   iso: "620", country: "Portugal",    continent: "Europe",            place: "Lisbonne",                         lat: 38.72,  lng: -9.14 },

  { person: "tristan", iso: "124", country: "Canada",      continent: "Amérique du Nord",  place: "Montréal",                         lat: 45.50,  lng: -73.57 },
  { person: "tristan", iso: "840", country: "USA",         continent: "Amérique du Nord",  place: "USA",                              lat: 39.80,  lng: -98.60,  approx: true },
];
