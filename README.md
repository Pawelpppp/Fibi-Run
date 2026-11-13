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
- Na środku duży napis **Arek Run**.
- Twarz głównego bohatera z assetów (`assets/portraits/face_portrait.png`).
- Pod spodem przycisk **START NEW GAME**, który rozpoczyna poziom 1.

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
- **Potworek** – na razie jeden, dowolny stworek (wygląd do ustalenia). Można go zabić mieczem.

### Punkty
| Akcja                                   | Punkty |
|-----------------------------------------|--------|
| Przeskoczenie beczki bez dotknięcia     | +30    |
| Zabicie potworka mieczem                | do ustalenia |

### Życia
- Na start gracz ma **1 życie**.
- Dotknięcie **beczki** lub **potworka** = utrata 1 życia.
- W trakcie poziomu może pojawić się **serduszko** = +1 życie.
- 0 żyć = koniec gry.

### Tło
- Szutrowa droga na pierwszym planie.
- Z tyłu co jakiś czas mijamy elementy tła w stylu 16-bit pixel art (do ustalenia, co dokładnie).

---

## Sterowanie
| Akcja                  | Klawisz        | Telefon        |
|------------------------|----------------|----------------|
| Przyspiesz             | Strzałka →     | przycisk →     |
| Zwolnij                | Strzałka ←     | przycisk ←     |
| Skok                   | Spacja         | przycisk skok  |
| Atak mieczem           | Alt            | przycisk atak  |

---

## Środowisko / silnik

**Gra musi działać w przeglądarce, na desktopie i na telefonie.**

- Silnik: **Phaser 3** (HTML5 / JavaScript)
- Bazowa rozdzielczość: **568×320** (mały iPhone SE w poziomie)
- Skala: `Phaser.Scale.FIT` – dopasowanie do ekranu
- Przyciski dotykowe na telefonie
- Uruchomienie: otwórz `index.html` w przeglądarce (na telefonie w poziomie)

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
│   ├── ksiadz_kamil_stand.png        # 28×80, stoi (+ _x4 podgląd)
│   ├── ksiadz_kamil_walk_1.png       # 40×80, chód klatka 1 (+ _x4 podgląd)
│   └── ksiadz_kamil_walk_2.png       # 41×80, chód klatka 2 (+ _x4 podgląd)
└── portraits/
    ├── dialogue_portrait.png
    ├── face_portrait.png
    └── ksiadz_kamil_portrait_front.png  # 96×96, portret do dialogów (+ _x4 podgląd)
```

Pliki `*_x4.png` to te same grafiki powiększone 4× (nearest neighbor) do podglądu.

Wszystkie grafiki mają transparentne tło i są w stylu 16-bit.

**Do zrobienia:** beczka, potworek, serduszko, szutrowa droga, elementy tła, UI (punkty, życia).

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
