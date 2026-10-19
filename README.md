# Slovenčina — študijný zápisník

Osobná statická príprava z dodaného ZIPu. Otvor **index.html** v prehliadači; netreba inštaláciu, pripojenie ani build. Žiadny backend ani vzdialené služby. Ak chceš lokálnu HTTP adresu, v tomto priečinku spusti `python3 -m http.server 8765 --bind 127.0.0.1` a otvor `http://127.0.0.1:8765`.

Vzhľad používa zelenkastý papier, slonovinové poznámky a jemné červenohnedé akcenty. Stránka je bez dekoratívnej ilustrácie; Instrument Sans má čítací rez 500 a nadpisy 600. Vizuálne pravidlá a aktuálne tokeny sú v `DESIGN.md`.

## Obsah a hranice

- Poznámky zo siedmich tém, 95 flashkariet so sebahodnotením, 66 kvízových otázok s vysvetlením, vyhľadávanie bez diakritiky a všetkých 30 originálov.
- Jediný zdroj učiva je archív `drive-download-20261019T080136Z-1-001.zip`. `sources.js` obsahuje pôvodné texty, názvy a SHA-256 každého originálu. V `content.js` je spracované učivo s väzbou na zdroj pri každej časti, karte a otázke.
- Rozsah je pripravený pre 1. ročník podľa hlavných materiálov; spoločný dokument pre všetky ročníky je dostupný celý. Termín 26. 10. 2026 je prevzatý z dokumentu VSTUPNÝ PROGRESCHECK.
- Lexikológia, slohové postupy a štýly, ucelený výklad neohybných slovných druhov a vybrané slová sú v rozsahu, ale bez uceleného výkladu v ZIPe. Stránka medzery výslovne označuje a nedopĺňa ich zvonka.
- Vyplnený T9 nie je overený kľúč. Napríklad úloha 29 žiada tri pojmy, ale v dodanej vyplnenej verzii sú štyri. Nejednoznačné a rozporné úlohy sa automaticky nehodnotia. Originály zostávajú dostupné bez zmeny.

## Ukladanie a ovládanie

Ukladanie sa zapína dobrovoľne. Pokrok ostáva iba v localStorage konkrétneho prehliadača; samostatne sa uchováva voľba ukladania. Bez súhlasu alebo pri zablokovanom úložisku aplikácia funguje v pamäti aktuálnej stránky. Päť hlavných odkazov je vo vodorovnej hlavičke. Nastavenia úložiska sú na desktope vpravo pod navigáciou; pri šírke do 900 px sú pod ikonovým tlačidlom „Nastavenia ukladania pokroku“ pri vyhľadávaní. Reset vyžaduje potvrdenie a maže iba pokrok tejto pomôcky.

Flashkartu otočí klik alebo Enter na zameranej karte; medzerník funguje pri zameranej karte alebo samotnej stránke. Po odhalení odpovede a pri focuse na karte `1` znamená ešte zopakovať a `2` toto už viem. Skratky nepreberajú ovládanie polí ani otvoreného dialógu. Všetky funkcie majú aj bežné tlačidlá. Escape zatvorí zväčšený obrázok a nastavenia. Poznámky možno vytlačiť štandardným tlačovým dialógom prehliadača.

## Súbory

`index.html`, `styles.css`, `app.js`, `core.js`, `content.js`, `sources.js`, `info.html`, `favicon.svg`, `fonts/`, `materialy/`, `Obrazky/`. Projektový priečinok `Obrazky` je relatívny odkaz na `../../Obrazky/SJL-vstupna-pisomka`, aby originálne vizuálne prílohy žili na kanonickom mieste v trezore. Pripravený ZIP tento odkaz nahrádza skutočnými súbormi a je prenosný samostatne.

Písma: Instrument Sans, Copyright 2022 The Instrument Project Authors, SIL Open Font License 1.1; licencia v `fonts/OFL.txt`.

## Overenie

Bez závislostí: `node tests/core.test.cjs`. Pri odovzdaní prešli všetky štyri testy: hľadanie s diakritikou, validácia poškodeného pokroku, miešanie bez strát a integrita učiva vrátane SHA-256 všetkých 30 originálov, obrázkov a väzieb na zdroje. Prehliadačová kontrola prešla 23 scenármi: spustenie cez `file://`, učenie, vyhľadávanie, klávesnica, mobil od 320 px, úložisko a znížený pohyb; nezachytila externé požiadavky ani chyby konzoly. Sedem snímok zachytáva úvod, poznámky a karty na desktope aj mobile a kvíz na desktope. Kontrola používa už nainštalovaný Playwright v pracovnom prostredí, nie závislosť stránky; dôkazy sú uložené mimo dodávanej aplikácie.

## Publikovanie a podklady

Verejná verzia: [https://konarciksamuel-cpu.github.io/slovencina/](https://konarciksamuel-cpu.github.io/slovencina/). Publikovanie si používateľ výslovne vyžiadal. GitHub Pages používa samostatný verejný repozitár [konarciksamuel-cpu/slovencina](https://github.com/konarciksamuel-cpu/slovencina), vetvu `main`, koreňový priečinok a `.nojekyll`. Publikujú sa iba súbory učebnej stránky a poskytnuté podklady. Práva na ďalšie verejné šírenie školských podkladov neboli doložené. `info.html` opisuje GitHub hosting, lokálne ukladanie a bezplatné používanie; netvrdí právny audit.
