# ArekRun

**ArekRun** – prosta gra 2D w stylu retro lat 90. (16-bit pixel art, SNES / Genesis era).
Arek w złotej zbroi płytowej z dużym mieczem biegnie w prawo po szutrowej drodze, przeskakuje beczki i walczy z potworkami.

Inspiracja: **Mustache Protocol** (Henry Cavill + Google) – reklama/gra 16-bit side-scroller z 2026 roku.

---

## Styl i klimat
- **16-bit pixel art** (SNES / Genesis era, early 90s)
- Chunky sprites, limited palette, no anti-aliasing
- Zabawny, absurdalny ton (jak w Mustache Protocol)
- Bohater w złotej zbroi z czerwonymi akcentami i peleryną
- Mały czarno-brązowy pies, który też mówi (portret do dialogów)
- Postacie to prawdziwe osoby, które w grze mają być od razu rozpoznawalne (lekka karykatura)

---

## Postacie
| Postać | Rola | Opis |
|--------|------|------|
| **Arek** | bohater | okulary, broda, złota zbroja z mieczem |
| **Ksiądz Kamil** | główny antagonista | rude krótkie włosy (buzz cut), niebieskie oczy, złośliwy szeroki uśmiech, czarna sutanna z koloratką, czarny plecak |

---

## Ekran powitalny

Pierwszy ekran po uruchomieniu gry:
- Układ: **AREK [twarz] RUN** – słowo „AREK” po lewej, twarz głównego bohatera na środku (w złoto-czerwonej ramce), słowo „RUN” po prawej.
- Twarz z assetów (`assets/portraits/face_portrait.png`, w grze przetworzona do `assets/game/face.png`).
- Pod spodem czerwony przycisk **START NEW GAME** (klik / tap, Spacja lub Enter), który rozpoczyna poziom 1.

---

## Intro (przerywnik)

Krótka scenka po kliknięciu **START NEW GAME**, przed poziomem 1:
1. Arek idzie spokojnie **w lewo** z psem na smyczy po szutrowej drodze.
2. Obok nich przejeżdża **ksiądz Kamil w samochodzie** (widać go przez szybę auta).
3. Pies się płoszy, wyrywa i **ucieka w prawo**.
4. Arek dobywa **miecza** i zaczyna **biec za psem w prawo** – startuje poziom 1.

Grafiki:
- Ksiądz Kamil – gotowe: `assets/portraits/ksiadz_kamil_portrait_front.png` (portret do dialogów), `assets/sprites/ksiadz_kamil_stand.png`, `ksiadz_kamil_walk_1.png`, `ksiadz_kamil_walk_2.png` (wersje `_x4` – 4x większe).
- Do zrobienia: samochód z księdzem Kamilem w środku, pies (mały, czarno-brązowy).

---

## Poziom 1 – zasady

### Cel
- Zdobyć **1000 punktów**.

### Ruch
- Ekran **sam przesuwa się powoli w prawo**.
- Arek **zawsze przemieszcza się w prawo** – gracz może tylko trochę **przyspieszyć** (→) lub **zwolnić** (←), ale nie zatrzymać się ani cofnąć.
- Arek **nie może wyjść poza ekran** (ani z przodu, ani z tyłu).
- **Skok** – przeskakiwanie beczek i potworków.
- **Atak mieczem** – zabija potworki.

### Przeszkody i przeciwnicy
- **Beczki** – trzeba je przeskoczyć.
- **Potworek** – na razie jeden placeholder (zielony diablik, wygląd do ustalenia). Można go zabić mieczem.

### Punkty
| Akcja                                   | Punkty |
|-----------------------------------------|--------|
| Przeskoczenie beczki bez dotknięcia     | +30    |
| Zabicie potworka mieczem                | +50 (wartość tymczasowa, do ustalenia) |

### Życia
- Na start gracz ma **1 życie**.
- Dotknięcie **beczki** lub **potworka** = utrata 1 życia.
- W trakcie poziomu może pojawić się **serduszko** = +1 życie.
- 0 żyć = koniec gry.

### Tło
- Szutrowa droga na pierwszym planie.
- Z tyłu zachód słońca, wzgórza i co jakiś czas mijane **drzewa** w stylu 16-bit pixel art (drzewa to wybór tymczasowy – do ustalenia, co dokładnie).

---

## Sterowanie
| Akcja                  | Klawisz        | Telefon        |
|------------------------|----------------|----------------|
| Przyspiesz             | Strzałka →     | przycisk →     |
| Zwolnij                | Strzałka ←     | przycisk ←     |
| Skok                   | Spacja         | przycisk skok  |
| Atak mieczem           | Alt (zapasowo X) | przycisk atak  |

---

## Środowisko / silnik

**Gra musi działać w przeglądarce, na desktopie i na telefonie.**

- Silnik: **Phaser 3** (HTML5 / JavaScript)
- Bazowa rozdzielczość: **568×320** (mały iPhone SE w poziomie)
- Skala: `Phaser.Scale.FIT` – dopasowanie do ekranu
- Przyciski dotykowe na telefonie
- Uruchomienie: otwórz `index.html` w przeglądarce (na telefonie w poziomie) albo uruchom lokalny serwer: `python3 -m http.server` i wejdź na `http://localhost:8000`
- Phaser 3 ładowany z CDN (jsDelivr), więc potrzebny jest internet
- Wszystkie stałe (prędkości, punkty, odstępy przeszkód) są na samej górze `game.js` w obiekcie `CFG`

---

## Struktura assetów

```
assets/
├── sprites/
│   ├── idle_front.png
│   ├── idle_side.png
│   ├── run_1.png
│   ├── run_2.png
│   ├── run_3.png
│   ├── jump.png
│   ├── attack.png
│   ├── front_full.png
│   ├── ksiadz_kamil_stand.png        # 55×160, stoi (+ _x4 podgląd)
│   ├── ksiadz_kamil_walk_1.png       # 79×160, chód klatka 1 (+ _x4 podgląd)
│   └── ksiadz_kamil_walk_2.png       # 82×160, chód klatka 2 (+ _x4 podgląd)
├── game/                             # przetworzone pod grę (tools/process_assets.py)
│   ├── arek_run_1..3.png, arek_jump.png, arek_attack.png
│   ├── face.png
│   └── assets.js                     # te same PNG jako data-URI (działa z file://)
└── portraits/
    ├── dialogue_portrait.png
    ├── face_portrait.png
    └── ksiadz_kamil_portrait_front.png  # 192×192, portret do dialogów (+ _x4 podgląd)
```

Pliki `*_x4.png` to te same grafiki powiększone 4× (nearest neighbor) do podglądu.

Wszystkie grafiki mają transparentne tło i są w stylu 16-bit.

**Przetworzone grafiki do gry** (`assets/game/`, wygenerowane skryptem `tools/process_assets.py`): oryginały mają namalowaną szachownicę zamiast przezroczystości i są bardzo duże, więc skrypt usuwa tło, przycina i zmniejsza je do rozmiaru gry (oryginały zostają bez zmian). Beczka, potworek, serduszko, droga, tło i przyciski dotykowe są rysowane w kodzie (`game.js`).

**Do zrobienia:** docelowy wygląd potworka, własne grafiki beczki i tła, dźwięk.

---

## Plan projektu (roadmap)

1. **README** – założenia gry (ten plik)
2. Ekran powitalny: napis Arek Run, twarz bohatera, START NEW GAME
3. Scena Phaser: przesuwający się ekran, szutrowa droga, bieg Arka w prawo (szybciej / wolniej), blokada krawędzi ekranu
4. Skok + beczki + punkty za przeskok (+30)
5. Życia, utrata życia przy dotknięciu, ekran końca gry
6. Potworek + atak mieczem
7. Serduszko (+1 życie)
8. Tło 16-bit z mijanymi elementami
9. UI: licznik punktów i żyć, ekran wygranej po 1000 pkt
10. Sterowanie dotykowe na telefonie

### Na później
- Mówiący pies i dialogi z portretami
- Power-upy i easter eggi (inspiracja Mustache Protocol)
- Mechanika „porywania” przeciwników
- Soundtrack chiptune
- Kolejne poziomy i bossowie

---

Źródła inspiracji:
- [Digital Trends – Mustache Protocol review](https://www.digitaltrends.com/gaming/google-and-henry-cavills-mustache-protocol-game-is-retro-silly-and-a-lot-of-fun/)
- [Google Blog – Play Mustache Protocol](https://blog.google/products-and-platforms/devices/googlebook/henry-cavill-googlebook-mustache-protocol/)
