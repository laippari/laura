# Lauran joulukalenteri

Selaimessa toimiva 3D-joulukalenteri: pähkinäpuinen kaappi, jossa on 24 tammiluukkua. Joka päivä aukeaa yksi
luukku, ja sen takaa paljastuu 3D-esine ja viesti. Julkaistu sivu:
https://laippari.github.io/laura/

## Miten se toimii

1. **Aloitus** – lyhyt lataus (sykkivä sydän), sitten valokuvat liukuvat isoina näkymän läpi ja asettuvat reunoille
   otsikon *Laura ❤️ Ville* ympärille. Napista *Siirry kalenteriin* kuvat lentävät pois ja palaavat samaan sommitelmaan
   eri paikkoihin, ja kaappi laskeutuu keskelle. Napautus kuvien aikana hyppää suoraan otsikkoon.
2. **Kalenteri** – kamera näyttää koko kaapin ja liukuu sitten päivän luukulle, jonka alla lukee *Avaa tästä*.
   Luukut, jotka saa avata, hehkuvat reunoiltaan. Kaappia voi kallistella vetämällä. Näkymässä ei ole pysyviä
   tekstejä: napautus kaapin viereen näyttää kaapin alla kuplassa, mikä tilanne on (esim. montako yötä on jäljellä).
3. **Luukku** – napautus avaa luukun, sisältö leijuu esiin omaan näkymäänsä (esinettä voi pyörittää vetämällä)
   ja alle tulee otsikko ja viesti. *Sulje luukku* palauttaa koko kalenteriin.
4. Avatut luukut jäävät raolleen ja niihin voi palata. Tulevan päivän luukku vain kolahtaa, ja kaapin alle tulee *Malta vielä hetki, murunen 😘* (neljä versiota vuorotellen, `tooEarly` tiedostossa `src/content.js`).

**Ääni:** soittorasia soittaa taustalla Kulkusia, We Wish You a Merry Christmasia ja Jouluyö, juhlayötä silmukassa,
ja luukuilla on omat äänensä (avaus, sisällön paljastus, sulkeminen, liian aikainen napautus). Äänet syntetisoidaan
selaimessa ja nauhoitetaan latauksen jälkeen WAV-muotoon (`src/sound.js`). Musiikki soi audio-elementillä, joka soi
iPhonessa myös äänettömällä. Selain sallii äänen vasta ensimmäisestä kosketuksesta, joten musiikki alkaa siitä.
Oikean yläkulman nuottinappi mykistää, ja valinta muistetaan.

**Koko näyttö:** puhelimen selain näyttää osoitekentän ja kameran alla sivun oman taustan, joten sivun taustana on
sama neulekuvio samassa mittakaavassa ja kohdassa kuin 3D-seinä (`pageBackground` tiedostossa `src/main.js`).
Androidilla osoitepalkki värjätään punaiseksi (`theme-color`).

Luukut aukeavat laitteen kellon mukaan 1.–24.12.2026; sen jälkeen kaikki pysyvät auki. Avatut luukut muistetaan
selaimessa (`localStorage`), eli muisti on laitekohtainen.

## Sisällön muokkaus

Kaikki tekstit ja luukkujen sisältö ovat tiedostossa **`src/content.js`**:

```js
5: { item: 'photo', title: 'Otsikko', text: 'Viesti tähän.', image: 'assets/kuva.jpg' },
```

| Kenttä | Sisältö |
| --- | --- |
| `item` | `heart` · `star` · `gift` · `bauble` · `candle` · `tree` · `snowflake` · `letter` · `photo` |
| `title`, `text` | otsikko ja viesti (rivinvaihto `\n`) |
| `image` | vain `photo`: kuva `assets/`-kansiossa (rajataan neliöksi keskeltä) |
| `color` | valinnainen väri: `heart`, `gift`, `bauble` |

Uusi esinetyyppi lisätään `src/items.js`:ään (funktio, joka palauttaa noin yhden yksikön kokoisen ryhmän) ja
`BUILDERS`-listaan.

**Huom:** repositorio on julkinen, joten luukkujen sisältö on luettavissa lähdekoodista etukäteen. Sivu pyytää
hakukoneita olemaan indeksoimatta sitä.

## Esikatselu

```sh
python3 -m http.server 8000      # → http://localhost:8000
```

| Osoite | Toiminto |
| --- | --- |
| `?paiva=5` | näyttää kalenterin sellaisena kuin se on 5.12. (`0` = ennen joulukuuta, `24` = kaikki auki) |
| `?nollaa` | unohtaa avatut luukut tällä laitteella |

Samat toimivat julkaistulla sivulla, esim. `https://laippari.github.io/laura/?paiva=24&nollaa`.

## Rakenne

| Polku | Sisältö |
| --- | --- |
| `index.html` | Sivun rakenne ja tyylit. |
| `src/content.js` | Tekstit ja luukkujen sisältö. |
| `src/main.js` | Näkymä, kamera, tilakone ja käyttöliittymä. |
| `src/calendar.js` | Kaappi ja luukut. `LAYOUT` määrää, missä lokerossa mikin päivä on. |
| `src/items.js` | Luukkujen 3D-esineet. |
| `src/textures.js` | Proseduraaliset tekstuurit (puu, numerot, hehkut, taustan neulekuvio silmukka kerrallaan). |
| `src/photos.js` | Paperikuvat: putoaminen ja läjä kaapin alla. Kuvat listataan `content.js`:n `PHOTOS`-listassa. |
| `src/sound.js` | Musiikki ja äänet (Web Audio, ei tiedostoja). |
| `src/backdrop.js` | Tausta: neulottu jouluseinä kaapin takana, lumisade ja pehmeät valot. |
| `assets/` | Kuvat: `assets/kuvat/` paperikuville (neliö, 640 px, ei sijaintitietoja), muut `photo`-luukuille. |

three.js ladataan jsDelivr-CDN:stä (`three@0.186.1`, lukittu versio). Käännösvaihetta ei ole.

## Julkaisu

Jokainen `main`-haaran push julkaisee sivun GitHub Pagesiin (`.github/workflows/pages.yml`). Julkaisu lisää
skriptien osoitteisiin versioleiman (`?v=<commit>`), joten puhelin ei aja välimuistista vanhaa versiota.
Kertaluonteinen asetus: **Settings → Pages → Build and deployment → Source → GitHub Actions**.
