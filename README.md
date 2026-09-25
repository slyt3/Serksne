# Vila Šerkšnė – svetainė

- `site/` – **tik šį aplanką** keliame į hostingą (index.html, send.php, assets/, .htaccess, robots.txt, sitemap.xml).
- `Nuotraukos/` – originalai, nekeičiami.
- `_tools/` – vietiniai įrankiai (Node.js), į hostingą nekeliami:
  - `node _tools/build-images.js` – WebP kopijos (480/800/1200/1600 px) į `site/assets/img/` + `site/assets/css/lqip.css`.
    Naujai nuotraukai: įrašykite ją į `PHOTOS` sąrašą skripto viršuje ir paleiskite.
  - `node _tools/fetch-fonts.js` – šriftai (.woff2) į `site/assets/fonts/` + `fonts.css`.
  - `node _tools/shot.js` – ekrano nuotraukos patikrai (reikia paleisto `php -S 127.0.0.1:8765` aplanke `site/`).
- `_kryptys/` – 3 etapo dizaino krypčių eskizas (tik peržiūrai).

Pakeitus CSS/JS, `index.html` padidinkite `?v=` numerį, kad lankytojai gautų naują versiją.
Tekstuose `[REIKIA: …]` žymekliai – trūkstama informacija, prieš paleidžiant pašalinti.
