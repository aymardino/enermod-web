/** Photos used in banners and cards, with their credits. Wikimedia Commons photos are under the
 *  Creative Commons licence named here; credit them with author, licence and source link (shown on
 *  each banner and listed on the legal notice page). AISESA photos belong to AISESA. */
export type Photo = {
  src: string;
  en: string;
  fr: string;
  creator: string;
  license: string;
  licenseUrl?: string;
  source?: string;
  /** CSS object-position: the part of the photo kept when it is cropped */
  position?: string;
};

export const PHOTOS = {
  "hero-noor-ouarzazate": { src: "/images/photos/hero-noor-ouarzazate.jpg", en: "Noor 1 and 2 solar power station, Ouarzazate, Morocco", fr: "Centrale solaire Noor 1 et 2, Ouarzazate, Maroc", creator: "Richard Allaway", license: "CC BY 2.0", licenseUrl: "https://creativecommons.org/licenses/by/2.0/", source: "https://commons.wikimedia.org/w/index.php?curid=103843880", position: "center 60%" },
  "transmission-line": { src: "/images/photos/transmission-line.jpg", en: "Transmission line in Tsavo East National Park, Kenya", fr: "Ligne de transport électrique, parc national de Tsavo Est, Kenya", creator: "CT Cooper", license: "CC BY 3.0", licenseUrl: "https://creativecommons.org/licenses/by/3.0/", source: "https://commons.wikimedia.org/w/index.php?curid=20744356", position: "center 45%" },
  "akosombo-dam": { src: "/images/photos/akosombo-dam.jpg", en: "Spillway of the Akosombo dam, Ghana", fr: "Évacuateur du barrage d’Akosombo, Ghana", creator: "ZSM", license: "CC BY-SA 3.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/3.0/", source: "https://commons.wikimedia.org/w/index.php?curid=11989962", position: "center 55%" },
  "rural-electrification-nigeria": { src: "/images/photos/rural-electrification-nigeria.jpg", en: "Rural electrification, Chori village, Nigeria", fr: "Électrification rurale, village de Chori, Nigeria", creator: "Kambai Akau", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/w/index.php?curid=119450281", position: "center 40%" },
  "geothermal-kenya": { src: "/images/photos/geothermal-kenya.jpg", en: "Orpower4 geothermal power plant, Olkaria, Kenya", fr: "Centrale géothermique Orpower4, Olkaria, Kenya", creator: "Bbossoxx", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/w/index.php?curid=90633846", position: "center 55%" },
  "lake-turkana-wind": { src: "/images/photos/lake-turkana-wind.jpg", en: "Building the Lake Turkana wind power project, Kenya", fr: "Chantier du parc éolien du lac Turkana, Kenya", creator: "george garang", license: "CC BY-SA 2.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/2.0/", source: "https://commons.wikimedia.org/w/index.php?curid=90218012", position: "center 55%" },
  "solar-technicians": { src: "/images/photos/solar-technicians.jpg", en: "Technicians carrying a solar panel (Innovation: Africa)", fr: "Techniciens portant un panneau solaire (Innovation: Africa)", creator: "IAfrica76", license: "CC0 1.0", licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/deed.en/", source: "https://commons.wikimedia.org/w/index.php?curid=163952895", position: "center 35%" },
  "gouda-wind-farm": { src: "/images/photos/gouda-wind-farm.jpg", en: "Gouda wind farm, South Africa", fr: "Parc éolien de Gouda, Afrique du Sud", creator: "Discott", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/w/index.php?curid=43159087", position: "center 50%" },
  "inga-dam": { src: "/images/photos/inga-dam.jpg", en: "Inga dam, Democratic Republic of the Congo", fr: "Barrage d’Inga, République démocratique du Congo", creator: "Χρίστος Ιμμανοελ", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/w/index.php?curid=87785506", position: "center 45%" },
  "noor-iii-tower": { src: "/images/photos/noor-iii-tower.jpg", en: "Noor III solar tower, Ouarzazate, Morocco", fr: "Tour solaire Noor III, Ouarzazate, Maroc", creator: "Marc Lacoste", license: "CC BY-SA 4.0", licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/", source: "https://commons.wikimedia.org/w/index.php?curid=74315666", position: "center 45%" },
  "aisesa-congress-talk": { src: "/images/aisesa-congress-talk.jpg", en: "Presentation of this mapping at the 3rd AISESA Congress, Kampala, September 2026", fr: "Présentation de cette cartographie au 3e Congrès AISESA, Kampala, septembre 2026", creator: "AISESA", license: "© AISESA", position: "center 30%" },
  "aisesa-congress-group": { src: "/images/aisesa-congress-group.jpg", en: "Participants of the 3rd AISESA Congress, Kampala, September 2026", fr: "Participants du 3e Congrès AISESA, Kampala, septembre 2026", creator: "AISESA", license: "© AISESA", position: "center 62%" },
} satisfies Record<string, Photo>;

export type PhotoId = keyof typeof PHOTOS;

/** "Photo: Richard Allaway, CC BY 2.0" (the banner credit line). */
export function photoCredit(id: PhotoId, locale: string): string {
  const p: Photo = PHOTOS[id];
  return `${locale === "fr" ? "Photo :" : "Photo:"} ${p.creator}, ${p.license}`;
}

export function photoAlt(id: PhotoId, locale: string): string {
  const p: Photo = PHOTOS[id];
  return locale === "fr" ? p.fr : p.en;
}
