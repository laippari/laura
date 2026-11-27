// Kalenterin sisältö. Tämä on se tiedosto, jota muokataan: tekstit ja jokaisen luukun sisältö.
//
// Luukun kentät:
//   item   3D-esine, joka luukusta paljastuu: 'heart' | 'star' | 'gift' | 'bauble' | 'candle' | 'tree' |
//          'snowflake' | 'letter' | 'photo'
//   title  otsikko
//   text   viesti (rivinvaihto: \n)
//   image  vain 'photo': kuvan polku, esim. 'assets/kuva1.jpg'
//   color  valinnainen väri esineelle, esim. '#1f5a3c' (heart, gift, bauble)

export const SETTINGS = {
  year: 2026, // kalenteri aukeaa tämän vuoden joulukuussa; 24.12. jälkeen kaikki luukut pysyvät auki
  storageKey: 'laura-joulukalenteri-2026',
};

export const TEXTS = {
  pageTitle: 'Lauran joulukalenteri',
  introEyebrow: 'Joulukuu 2026',
  introTitle: 'Laura ❤️ Ville',
  introText: 'Joulukalenteri',
  // aloitusnapin teksti: ensimmäinen luukku, jokin myöhempi päivän luukku, ei avattavaa juuri nyt
  enterFirst: 'Avataan eka luukku',
  enterToday: 'Avataan päivän luukku',
  enter: 'Siirry kalenteriin',
  hint: 'Avaa tästä',
  close: 'Sulje luukku',
  doorLabel: 'Luukku {n}',
  dateLabel: '{n}. joulukuuta',
  statusBefore: 'Ensimmäinen luukku aukeaa 1.12.',
  statusBeforeNights: { one: 'Vielä yksi yö', many: 'Vielä {n} yötä' },
  statusToday: 'Päivän luukku odottaa',
  statusTodayAction: 'Avaa luukku {n}',
  statusDone: 'Päivän luukku on avattu. Huomenna aukeaa seuraava.',
  statusUnopened: { one: 'Yksi luukku on vielä avaamatta', many: '{n} luukkua on vielä avaamatta' },
  statusAfter: 'Hyvää joulua, Laura',
  lockedTomorrow: 'Luukku {n} aukeaa huomenna',
  locked: 'Luukku {n} aukeaa {n}.12.',
  wholeCalendar: 'Koko kalenteri',
  noWebGL: 'Kalenteri tarvitsee selaimen, joka osaa piirtää 3D-grafiikkaa. Kokeile toisella selaimella tai laitteella.',
};

// Paperikuvat, jotka leijailevat alas ennen kalenteria ja jäävät läjään sen alle. Viimeiset jäävät päällimmäisiksi.
export const PHOTOS = Array.from({ length: 15 }, (_, i) => `assets/kuvat/${String(i + 1).padStart(2, '0')}.jpg`);

// HUOM: alla olevat tekstit ovat paikanpitäjiä, joilla perustoiminta on rakennettu. Korvaa omilla.
export const DOORS = {
  1: { item: 'heart', title: 'Hyvää joulukuun ensimmäistä', text: 'Tästä se alkaa. Joka päivä yksi luukku, ja jokaisen takana jotain pientä sinulle.' },
  2: { item: 'star', title: 'Tähti sinulle', text: 'Pieni valo joulukuun pimeään.' },
  3: { item: 'candle', title: 'Kynttilähetki', text: 'Sytytä tänään kynttilä ja ota hetki ihan vain itsellesi.' },
  4: { item: 'snowflake', title: 'Lumihiutale', text: 'Jokainen on erilainen. Tämä on sinun.' },
  5: { item: 'letter', title: 'Pieni kirje', text: 'Tähän tulee viesti.' },
  6: { item: 'bauble', title: 'Hyvää itsenäisyyspäivää', text: 'Kaksi kynttilää ikkunalle ja rauhallinen ilta.' },
  7: { item: 'tree', title: 'Kuusi', text: 'Joulu lähestyy, oksa kerrallaan.' },
  8: { item: 'gift', title: 'Pieni lahja', text: 'Tähän tulee lahjan kuvaus.' },
  9: { item: 'heart', title: 'Luukku 9', text: 'Tähän tulee viesti.', color: '#b8324f' },
  10: { item: 'star', title: 'Luukku 10', text: 'Tähän tulee viesti.' },
  11: { item: 'candle', title: 'Luukku 11', text: 'Tähän tulee viesti.' },
  12: { item: 'bauble', title: 'Puolivälissä', text: 'Kaksitoista luukkua takana, kaksitoista edessä.', color: '#1f5a3c' },
  13: { item: 'candle', title: 'Lucian päivä', text: 'Valoa vuoden pimeimpään aikaan.' },
  14: { item: 'snowflake', title: 'Luukku 14', text: 'Tähän tulee viesti.' },
  15: { item: 'letter', title: 'Luukku 15', text: 'Tähän tulee viesti.' },
  16: { item: 'gift', title: 'Luukku 16', text: 'Tähän tulee viesti.', color: '#1f5a3c' },
  17: { item: 'tree', title: 'Luukku 17', text: 'Tähän tulee viesti.' },
  18: { item: 'heart', title: 'Luukku 18', text: 'Tähän tulee viesti.' },
  19: { item: 'star', title: 'Luukku 19', text: 'Tähän tulee viesti.' },
  20: { item: 'bauble', title: 'Luukku 20', text: 'Tähän tulee viesti.' },
  21: { item: 'snowflake', title: 'Talvipäivänseisaus', text: 'Vuoden lyhin päivä. Tästä eteenpäin valo lisääntyy.' },
  22: { item: 'letter', title: 'Luukku 22', text: 'Tähän tulee viesti.' },
  23: { item: 'tree', title: 'Aatonaatto', text: 'Enää yksi yö.' },
  24: { item: 'gift', title: 'Hyvää joulua, Laura', text: 'Viimeinen luukku. Tähän tulee jouluaaton erikoisjuttu.', color: '#c9a25a' },
};
