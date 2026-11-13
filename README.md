# Fibi Run

**Fibi Run** to prosta gra 2D w stylu retro lat 90. (16-bit pixel art, epoka SNES / Genesis), działająca w przeglądarce na komputerze i telefonie.
Arek w złotej zbroi z dużym mieczem biegnie w prawo po szutrowej drodze, przeskakuje beczki, tnie potworki, a na końcu pierwszego poziomu staje do walki z **księdzem Kamilem**, który porwał jego psa **Fibi**.

Inspiracja: **Mustache Protocol** (Henry Cavill + Google) – 16-bitowy side-scroller z 2026 roku.

📖 **Wiki projektu:** https://github.com/Pawelpppp/Fibi-Run/wiki (fabuła, mechanika, tech stack, assety, roadmapa)

---

## Jak uruchomić

- **Najprościej:** otwórz `index.html` w przeglądarce (na telefonie – w poziomie). Grafiki są wbudowane jako data-URI (`assets/game/assets.js`), więc działa też z `file://`.
- **Lokalny serwer:** `python3 -m http.server` i wejdź na `http://localhost:8000`.
- Phaser 3 ładowany jest z CDN (jsDelivr), więc potrzebny jest internet.
- Parametr URL `?nointro` pomija intro i od razu startuje poziom 1 (przydatne przy testach).
- Telefon w pionie pokazuje podpowiedź „Obróć telefon poziomo” i wstrzymuje grę.

## Fabuła w skrócie

1. **Intro:** Arek (casual: czerwony t-shirt, spodenki, trampki) spaceruje z Fibi na smyczy. Obok przejeżdża samochód z księdzem Kamilem, pies się płoszy, zrywa smycz i ucieka w prawo.
2. Arek wyciąga zza pleców miecz i unosi go nad głowę, z nieba uderza **piorun**, następuje **transformacja** w złotą zbroję i Arek biegnie za psem – zaczyna się poziom 1.
3. Po zdobyciu 1000 pkt ekran gwałtownie przesuwa się do areny, gdzie czeka Fibi. Nadjeżdża ksiądz Kamil i zaczyna się **walka z bossem**.
4. Po pokonaniu Kamila ten w szale wsiada do auta, **zabiera Fibi i odjeżdża**. Arek rusza w pościg – **poziom 2** (3000 pkt, nowe potworki).
5. Na końcu poziomu 2 Kamil wraca swoim autem – **finałowa walka**. Po jego pokonaniu Arek unosi miecz, trafia go piorun, zdejmuje zbroję, pojawia się napis WYGRAŁEŚ!, Arek odchodzi w lewo za ekran – koniec gry.

### Postacie
| Postać | Rola | Opis |
|--------|------|------|
| **Arek** | bohater | okulary, broda; w grze złota zbroja z peleryną i mieczem, w intro wersja casual |
| **Ksiądz Kamil** | antagonista / boss | rude krótkie włosy, czarna sutanna, jeździ czerwonym hatchbackiem, rzuca krzyżykami |
| **Fibi** | pies | mały czarno-brązowy kundelek (portret na ekranie tytułowym, w intro i w arenie) |

## Przebieg gry

| Etap | Cel | Najważniejsze |
|------|-----|---------------|
| Ekran tytułowy | **FIBI [portret] RUN**, przycisk START NEW GAME (klik / tap / Spacja / Enter) | po starcie leci intro (Spacja / tap pomija) |
| Intro | ok. 11 s bez dialogów | spacer, auto Kamila, ucieczka psa, miecz, piorun, transformacja |
| Poziom 1 | **1000 pkt** | beczki (też podwójne), zielony potworek, serduszka |
| Boss: ksiądz Kamil | 3 trafienia w Kamila | miecz lub skok na głowę, czary-krzyżyki |
| Poziom 2 | **3000 pkt** (licznik od 0) | szybszy ekran, więcej potworków: ghoul, imp, nietoperz |
| Finałowy boss: ksiądz Kamil | pokonać Kamila (więcej żyć) | więcej czarów, auto do zniszczenia, potem ostrzejsze ataki; wygrana = koniec gry |

### Poziom 1
- Ekran sam przesuwa się w prawo; Arek zawsze biegnie w prawo – gracz może tylko **przyspieszyć** (→) albo **zwolnić** (←), ale nie zatrzymać się ani cofnąć. Arek nie wychodzi poza ekran.
- **Beczki** trzeba przeskoczyć (+30 pkt za beczkę). Od 60 pkt czasem są **dwie**: obok siebie albo jedna na drugiej (+60).
- **Potworek** (zielony diablik, placeholder) – zabijasz mieczem (+50).
- **Życia:** start z 1 życiem, dotknięcie beczki/potworka = −1, **serduszko** = +1 (maks. 5), po trafieniu krótka nietykalność. 0 żyć = game over.
- Pasek postępu i licznik punktów w prawym górnym rogu.

### Boss: ksiądz Kamil
1. Po 1000 pkt sterowanie się blokuje, ekran szybko przesuwa się w prawo (Arek ląduje przy lewej krawędzi, Fibi stoi po prawej), po czym zatrzymuje się – to **statyczna arena**, w której Arek chodzi swobodnie w lewo i prawo.
2. Nadjeżdża auto Kamila, ksiądz wysiada i zaczyna się walka.
3. **Kamil ma 3 życia** (3 krzyżyki w HUD). Trafiasz go **mieczem** albo **skacząc mu na głowę** (stomp z odbiciem). Po trafieniu jest chwilę nietykalny i ogłuszony; z każdym straconym życiem jest szybszy i częściej rzuca czary.
4. **Czar:** Kamil unosi świecący **krzyżyk** i wysyła go w lewo lub prawo – **nisko** (przeskocz) albo **wysoko** (nie skacz). Krzyżyk można zbić mieczem.
5. Dotknięcie Kamila (poza skokiem na głowę) lub krzyżyka = −1 życie. Porażka = game over (restart od poziomu 1).
6. Po wygranej Kamil w szale wskakuje do auta, zabiera Fibi i odjeżdża w prawo; ekran rusza dalej → poziom 2.

### Poziom 2
- Cel: **3000 pkt** zdobytych w poziomie 2 (licznik zaczyna się od 0), potem finałowa walka z Kamilem.
- Szybszy ekran i częstsze potworki; beczki jak wcześniej (podwójne od początku).
- Potworki (placeholdery): **ghoul** (zielony, +50), **imp** (czerwony, szybki, biegnie na Arka, +70), **bat** (nietoperz, leci falująco na wysokości, +60).

### Finałowy boss: ksiądz Kamil (do zrobienia)
1. Po 3000 pkt w poziomie 2 – jak przy pierwszym bossie: sterowanie się blokuje, ekran przesuwa się do **statycznej areny**.
2. Nadjeżdża ksiądz Kamil swoim samochodem i zaczyna się walka.
3. Kamil ma **więcej żyć** niż w pierwszej walce i **więcej czarów** (częściej rzuca krzyżyki).
4. **Auto Kamila można zniszczyć** (np. mieczem). Po zniszczeniu auta Kamil atakuje **jeszcze zajadlej**.
5. Po pokonaniu Kamila – **zakończenie** (scenka, sterowanie zablokowane):
   1. Arek unosi miecz nad głowę.
   2. Z nieba uderza w niego **piorun**.
   3. Arek **zdejmuje zbroję** (odwrotna transformacja – wraca wersja casual).
   4. Pojawia się napis **WYGRAŁEŚ!**
   5. Arek odchodzi **w lewo** za ekran.
   6. Ekran **KONIEC GRY**.

## Sterowanie

| Akcja | Klawiatura | Telefon |
|-------|------------|---------|
| Przyspiesz / idź w prawo | → lub D | przycisk → |
| Zwolnij / idź w lewo | ← lub A | przycisk ← |
| Skok | Spacja (zapasowo ↑, W) | przycisk skok |
| Atak mieczem | Alt (zapasowo X, Z) | przycisk atak |
| Menu / restart po końcu gry | Spacja lub Enter; Esc = menu | przycisk na ekranie |

W arenie bossa → / ← poruszają Arka swobodnie po ekranie (ekran się nie przewija).

## Tech stack

- **Phaser 3.80.1** (CDN jsDelivr), czysty **JavaScript** (jeden plik `game.js`), **HTML5** (`index.html`)
- Rozdzielczość bazowa **568×320**, `Phaser.Scale.FIT`, `pixelArt: true`, `roundPixels`
- Sceny: `Boot → Title → Intro → Play` (boss i poziom 2 to tryby `PlayScene`; game over i wygrana to nakładki)
- Fizyka własna (bez Arcade): prosty skok z grawitacją i skrzynki kolizji
- Wszystkie stałe gry (prędkości, punkty, odstępy, czasy intra i bossa, poziom 2) są na górze `game.js` w obiekcie **`CFG`**
- Beczka, potworki, serce, krzyżyk, tło, przyciski dotykowe i czcionka 5×7 są **rysowane w kodzie** (tekstury canvas)
- **Pipeline grafik:** Python + Pillow/NumPy/SciPy (`tools/process_assets.py`) – usuwa namalowaną szachownicę, wyrównuje klatki, zmniejsza do rozmiaru gry, kwantyzuje paletę i zapisuje PNG oraz `assets/game/assets.js` (data-URI, działa z `file://`)
- Sterowanie dotykowe (multi-touch) i klawiatura; wykrywanie telefonu, overlay „obróć telefon”

Przebudowa grafik: `pip install pillow numpy scipy` → `python3 tools/process_assets.py`.

## Struktura projektu

```
index.html              # strona, CDN Phaser, podpowiedź "obróć telefon"
game.js                 # cała gra: CFG, tekstury, sceny Boot/Title/Intro/Play
tools/process_assets.py # przetwarzanie oryginalnych grafik -> assets/game + assets.js
assets/
├── sprites/            # oryginały (Arek, Kamil, auto, Fibi, casual) + podglądy *_x4.png
│   │                   #   nowe klatki animacji (#3, jeszcze niepodpięte w grze):
│   ├── arek_casual_run6_1..6.png   # casual: bieg, 6 klatek (111×154 … 68×159; wys. ≤160)
│   ├── arek_casual_jump_1..5.png   # casual: skok 5 faz (przysiad, wznoszenie, szczyt, opadanie, lądowanie)
│   ├── arek_run6_1..6.png          # zbroja: bieg, 6 klatek (wys. 129–160)
│   └── arek_jump_1..5.png          # zbroja: skok 5 faz (wys. 126–207, z uniesionym mieczem)
├── portraits/          # portrety do dialogów (Fibi, Kamil, ...)
└── game/               # przetworzone sprite'y do gry + assets.js (data-URI)
```

## Assety i placeholdery

**Gotowe (własne grafiki):** Arek w zbroi (bieg 1–3, skok, atak; nowe: bieg 6 klatek `arek_run6_*`, skok 5 faz `arek_jump_*`), Arek casual (bieg 1–3, stoi; nowe: bieg 6 klatek `arek_casual_run6_*`, skok 5 faz `arek_casual_jump_*`), ksiądz Kamil (stoi, chód 1–2, portret), samochód Kamila (2 klatki jazdy), Fibi (stoi, chód 1–2, portret).

**Placeholdery (rysowane w kodzie, do podmiany na docelowe grafiki):** beczka, potworki (ghoul, imp, nietoperz), krzyżyk-czar, serduszka, droga, tło (zachód słońca, wzgórza, drzewa), przyciski dotykowe, miecz i błyskawica w intro (w grafikach casual nie ma pozy z mieczem). Kamil w aucie ma „kierowcę” na sprite'cie auta także po wyjściu z niego.

Szczegóły: wiki → *Assety i grafiki*.

## Znane problemy i roadmapa

**Znane ograniczenia**
- Brak dźwięku i muzyki.
- Spacer casual w intro korzysta z istniejących klatek (ta sama noga z przodu) – docelowo warto dorysować klatki z przeciwną nogą.
- Skala głowy Arka w skoku i ataku skorygowana ręcznie (`HEAD_SCALE` w skrypcie grafik).
- Wartości punktów potworków i balans trudności są tymczasowe.
- Po przegranej w walce z bossem gra restartuje się od poziomu 1 (brak checkpointu przed areną).

**Zrobione:** ekran tytułowy, intro z transformacją, poziom 1, boss Kamil, poziom 2, sterowanie dotykowe, animacja biegu.

**Do zrobienia:** finałowa walka z księdzem Kamilem na końcu poziomu 2 (więcej żyć i czarów, niszczenie auta, scenka zakończenia z piorunem, zdjęciem zbroi, napisem WYGRAŁEŚ! i ekranem KONIEC GRY).

**Pomysły na później**
- Dźwięk i soundtrack chiptune
- Mówiący pies i dialogi z portretami
- Docelowe grafiki potworków, beczek i tła
- Power-upy i easter eggi (inspiracja Mustache Protocol)
- Mechanika „porywania” przeciwników
- Kolejne poziomy i bossowie
- Checkpoint przed walką z bossem, ekran wyników / rekordy

---

Źródła inspiracji:
- [Digital Trends – Mustache Protocol review](https://www.digitaltrends.com/gaming/google-and-henry-cavills-mustache-protocol-game-is-retro-silly-and-a-lot-of-fun/)
- [Google Blog – Play Mustache Protocol](https://blog.google/products-and-platforms/devices/googlebook/henry-cavill-googlebook-mustache-protocol/)
