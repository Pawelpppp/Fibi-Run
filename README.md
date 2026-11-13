# ArekRun

**ArekRun** – prosta gra 2D w stylu retro lat 90. (16-bit pixel art).  
Główny bohater (Arek w złotej zbroi płytowej z dużym mieczem) biegnie w prawo, skacze, atakuje i porywa przeciwników.

Inspiracja: **Mustache Protocol** (Henry Cavill + Google) – reklama/gra 16-bit side-scroller z 2026 roku.

---

## Założenia gry (na podstawie Mustache Protocol + własne)

### Styl i klimat
- **16-bit pixel art** (SNES / Genesis era, early 90s)
- Chunky sprites, limited palette, no anti-aliasing
- Zabawny, absurdalny ton (jak w Mustache Protocol: steki, grzebień-miecz, arm reload, mustache theme)
- Bohater w charakterystycznej złotej zbroi z czerwonymi akcentami i peleryną

### Mechanika
- **Side-scroller** – postać biegnie głównie w prawo
- Ruch: **strzałki lewo / prawo** (można cofać się w lewo)
- **Skok**: Spacja
- **Atak mieczem**: Spacja (lub Alt w przyszłości – do dodania)
- Możliwość skakania na przeciwników (jak w Mustache Protocol)
- **Porywanie przeciwników** – unikalna mechanika ArekRun (do rozbudowy)
- Proste power-upy (np. stek = bulk up + silniejszy atak, inspiracja z Cavill)

### Kontrolki (startowe)
| Akcja          | Klawisz     |
|----------------|-------------|
| Ruch w prawo   | Strzałka →  |
| Ruch w lewo    | Strzałka ←  |
| Skok           | Spacja      |
| Atak mieczem   | Spacja / Alt (przyszłość) |

---

## Co zaczerpnąć z Mustache Protocol

Z reklamy/gry Henry’ego Cavilla warto wziąć:

- **Prosty side-scroller** bez skomplikowanych combos (tylko move + jump + attack)
- **Pixel art 16-bit** z charakterystycznym bohaterem w zbroi
- **Humor i absurd** (grzebień jako miecz, steki jako power-up, tańce, easter eggi)
- **Power-upy** zmieniające styl ataku (np. arm reload, bulk up)
- **Dialogi / portrety** – portret twarzy od frontu do rozmów
- **Browser-playable** – gra działa w przeglądarce (desktop + mobile)
- **Prosta progresja poziomów** z bossami i easter eggami
- **Charakterystyczny soundtrack** retro (chiptune / 16-bit)

Źródła inspiracji:
- [Digital Trends – Mustache Protocol review](https://www.digitaltrends.com/gaming/google-and-henry-cavills-mustache-protocol-game-is-retro-silly-and-a-lot-of-fun/)
- [Google Blog – Play Mustache Protocol](https://blog.google/products-and-platforms/devices/googlebook/henry-cavill-googlebook-mustache-protocol/)

---

## Środowisko / silnik

**Obowiązkowo: gra musi działać w przeglądarce i najlepiej na telefonie.**

**Minimalna szerokość: mały iPhone SE w poziomie (~568px).**

**Wybrane środowisko: Phaser 3 (HTML5 / JavaScript)**

- Skala: `Phaser.Scale.FIT` – dopasowuje się do ekranu
- Bazowa rozdzielczość: **568×320** (mały iPhone SE landscape)
- Działa na desktopie i mobile
- Przyciski dotykowe na telefonie (lewo / prawo / skok / atak)
- Otwórz `index.html` w przeglądarce (najlepiej w poziomie na telefonie)

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
│   └── front_full.png
└── portraits/
    ├── dialogue_portrait.png
    └── face_portrait.png
```

Wszystkie grafiki mają transparentne tło i są w stylu 16-bit.

---

## Następne kroki (roadmap)

1. **README** (ten plik) – fundament założeń
2. Podstawowy silnik Phaser – ruch, skok, animacje biegu
3. Atak mieczem + kolizje
4. Przeciwnicy + mechanika „porywania”
5. Tła, UI, portrety do dialogów
6. Power-upy i easter eggi (inspiracja Mustache Protocol)
7. Soundtrack chiptune

---

## Prompt base (dla dalszej pracy z AI)

> „Stwórz w Phaser 3 prosty side-scroller 16-bit. Postać biegnie w prawo (strzałki), skacze spacją, atakuje mieczem. Użyj sprite’ów z folderu assets/sprites. Styl retro early 90s jak Mustache Protocol (Henry Cavill).”

---

**Projekt ArekRun** – retro side-scroller inspirowany Mustache Protocol.  
Grafiki głównego bohatera gotowe. Czas na silnik.
