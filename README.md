# Fibi Run

**Fibi Run** to prosta gra 2D w stylu retro lat 90. (16-bit pixel art, epoka SNES / Genesis), działająca w przeglądarce na komputerze i telefonie.
Arek w złotej zbroi z dużym mieczem biegnie w prawo po szutrowej drodze, przeskakuje beczki, tnie potworki i dwukrotnie staje do walki z **księdzem Kamilem**, który porwał jego psa **Fibi**. Całość z chiptune'ową muzyką i przyciskiem wyciszenia.

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
5. Na końcu poziomu 2 Kamil wraca swoim autem – **finałowa walka** (auto można zniszczyć, po jego zniszczeniu Kamil wpada w szał). Po jego pokonaniu Arek unosi miecz, trafia go piorun, zdejmuje zbroję, pojawia się napis WYGRAŁEŚ!, Arek odchodzi w lewo za ekran – ekran KONIEC GRY.

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
| Finałowy boss: ksiądz Kamil | pokonać Kamila (6 żyć) | więcej czarów, auto do zniszczenia (5 cięć), potem szał; wygrana = zakończenie i KONIEC GRY |

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
5. Dotknięcie Kamila (poza skokiem na głowę) lub krzyżyka = −1 życie. Porażka = game over; „TRY AGAIN” wraca od razu do areny (checkpoint, 3 życia).
6. Po wygranej Kamil w szale wskakuje do auta, zabiera Fibi i odjeżdża w prawo; ekran rusza dalej → poziom 2.

### Poziom 2
- Cel: **3000 pkt** zdobytych w poziomie 2 (licznik zaczyna się od 0), potem finałowa walka z Kamilem.
- Szybszy ekran i częstsze potworki; beczki jak wcześniej (podwójne od początku).
- Potworki (placeholdery): **ghoul** (zielony, +50), **imp** (czerwony, szybki, biegnie na Arka, +70), **bat** (nietoperz, leci falująco na wysokości, +60).

### Finałowy boss: ksiądz Kamil
1. Po 3000 pkt w poziomie 2 – jak przy pierwszym bossie: sterowanie się blokuje, ekran przesuwa się do **statycznej areny**.
2. Nadjeżdża ksiądz Kamil swoim samochodem, wysiada (auto zostaje zaparkowane z pustym siedzeniem kierowcy) i zaczyna się walka.
3. Kamil ma **6 żyć** (pierwszy boss: 3), jest szybszy i ma **więcej czarów**: pojedynczy krzyżyk, **dwa naraz w obie strony** oraz **salwy** (3 krzyżyki jeden za drugim). Salwa jest zawsze na jednej wysokości – skok przez całą serię albo stanie w miejscu.
4. **Auto Kamila można zniszczyć** – wytrzymuje **5 cięć mieczem** (pasek życia nad autem). Pociemnieje, zaczyna dymić (≤3 HP), potem się pali (1 HP), w końcu **wybucha** (zostaje dymiący wrak, z którego wypada serduszko). Wybuch rani Arka, jeśli stoi tuż przy aucie.
5. Po zniszczeniu auta Kamil wpada w **szał (FURY)**: czerwona poświata, ~1,5× szybszy, krótsze przerwy między czarami, salwy po 5 krzyżyków i **szarże** przez arenę (po szarży jest chwilę zmęczony – wtedy go bij). Zmienia się też muzyka.
6. Porażka w arenie = „TRY AGAIN” od **checkpointu** przy arenie bossa (z 3 życiami), bez przechodzenia poziomu od nowa.
7. Po pokonaniu Kamila – **zakończenie** (scenka, sterowanie zablokowane):
   1. Kamil pada i rozsypuje się w gwiazdki; jeśli auto jeszcze stało – wybucha.
   2. Arek idzie na środek areny i unosi miecz nad głowę.
   3. Z nieba uderza w niego **piorun**.
   4. Arek **zdejmuje zbroję** (odwrotna transformacja – wraca wersja casual).
   5. Pojawia się napis **WYGRAŁEŚ!** (z fanfarą).
   6. Arek odchodzi **w lewo** za ekran (dobiega do niego Fibi).
   7. Ekran **KONIEC GRY** z przyciskami MENU (Enter) i PLAY AGAIN (R).

## Muzyka i dźwięk

Cały dźwięk jest **generowany w przeglądarce** (Web Audio API, plik `audio.js`) – bez plików audio, działa z `file://` i z serwera. Muzyka jest autorska w klimacie chiptune z czasów SNES / Genesis (pulsujące fale prostokątne, bas, perkusja z szumu) – nie kopiuje żadnej istniejącej melodii.

- Utwory: tytułowy, intro, poziom 1, poziom 2 (szybszy, wyższy), boss, finałowy boss, szał (po zniszczeniu auta), fanfara zwycięstwa, napisy końcowe, game over.
- Proste efekty: skok, cięcie, trafienie, serduszko, krzyżyk, uderzenie w auto, wybuch, piorun.
- Dźwięk startuje po **pierwszym kliknięciu / dotknięciu / klawiszu** (wymóg przeglądarek).
- **Przycisk wyciszenia** (ikona głośnika u góry – na ekranie tytułowym, w intro i w grze; klik/tap) oraz klawisz **M**. Wybór jest zapamiętywany w `localStorage` (`fibi_muted`). Dźwięk cichnie też, gdy karta jest w tle.
- Edycja: melodie to tablice nut w `TRACKS` w `audio.js` (tempo, tonacja, 16 kroków na takt), efekty w `SFX`.

## Sterowanie

| Akcja | Klawiatura | Telefon |
|-------|------------|---------|
| Przyspiesz / idź w prawo | → lub D | przycisk → |
| Zwolnij / idź w lewo | ← lub A | przycisk ← |
| Skok | Spacja (zapasowo ↑, W) | przycisk skok |
| Atak mieczem | Alt (zapasowo X, Z) | przycisk atak |
| Wycisz / włącz dźwięk | **M** | ikona głośnika u góry |
| Menu / restart po końcu gry | Spacja lub Enter; Esc = menu; R = zagraj ponownie (po KONIEC GRY) | przycisk na ekranie |

W arenie bossa → / ← poruszają Arka swobodnie po ekranie (ekran się nie przewija).

## Tech stack

- **Phaser 3.80.1** (CDN jsDelivr), czysty **JavaScript** (jeden plik `game.js`), **HTML5** (`index.html`)
- Rozdzielczość bazowa **568×320**, `Phaser.Scale.FIT`, `pixelArt: true`, `roundPixels`
- Sceny: `Boot → Title → Intro → Play` (boss, finał i zakończenie to tryby `PlayScene`; game over i KONIEC GRY to nakładki)
- **Dźwięk:** `audio.js` – własny silnik Web Audio (oscylatory pulse/trójkąt, szum, sekwencer z kolejką czasu), muzyka i SFX proceduralne, możliwość renderu offline do WAV
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
audio.js                # muzyka chiptune i efekty (Web Audio), przycisk/klawisz mute
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

**Gotowe (własne grafiki):** Arek w zbroi (bieg 1–3, skok, atak; nowe: bieg 6 klatek `arek_run6_*`, skok 5 faz `arek_jump_*`), Arek casual (bieg 1–3, stoi; nowe: bieg 6 klatek `arek_casual_run6_*`, skok 5 faz `arek_casual_jump_*`), ksiądz Kamil (stoi, chód 1–2, portret), samochód Kamila (2 klatki jazdy + wariant z pustym siedzeniem generowany przez `process_assets.py`), Fibi (stoi, chód 1–2, portret).

**Placeholdery (rysowane w kodzie, do podmiany na docelowe grafiki):** beczka, potworki (ghoul, imp, nietoperz), krzyżyk-czar, serduszka, droga, tło (zachód słońca, wzgórza, drzewa), przyciski dotykowe, miecz i błyskawica w intro (w grafikach casual nie ma pozy z mieczem).

Szczegóły: wiki → *Assety i grafiki*.

## Znane problemy i roadmapa

**Znane ograniczenia**
- Muzyka i efekty są proceduralnie syntezowane (placeholder jakościowy – docelowo można podmienić na nagrane utwory).
- Piktogramy ikony głośnika i polskie znaki w czcionce 5×7 są uproszczone.
- Spacer casual w intro korzysta z istniejących klatek (ta sama noga z przodu) – docelowo warto dorysować klatki z przeciwną nogą.
- Skala głowy Arka w skoku i ataku skorygowana ręcznie (`HEAD_SCALE` w skrypcie grafik).
- Wartości punktów potworków i balans trudności są tymczasowe.
- Porażka w poziomie 1 lub 2 (przed areną bossa) restartuje grę od poziomu 1; checkpoint działa tylko w arenie bossa.

**Zrobione:** ekran tytułowy, intro z transformacją, poziom 1, boss Kamil, poziom 2, finałowy boss (auto do zniszczenia, szał), zakończenie z piorunem i napisem WYGRAŁEŚ!, ekran KONIEC GRY, muzyka chiptune + przycisk mute (M), sterowanie dotykowe, animacja biegu, checkpoint w arenie bossa.

**Do zrobienia:** docelowe grafiki potworków/beczek/tła, dopracowanie balansu i dźwięku.

**Pomysły na później**
- Nagrany soundtrack i głosy
- Mówiący pies i dialogi z portretami
- Docelowe grafiki potworków, beczek i tła
- Power-upy i easter eggi (inspiracja Mustache Protocol)
- Mechanika „porywania” przeciwników
- Kolejne poziomy i bossowie
- Ekran wyników / rekordy

---

Źródła inspiracji:
- [Digital Trends – Mustache Protocol review](https://www.digitaltrends.com/gaming/google-and-henry-cavills-mustache-protocol-game-is-retro-silly-and-a-lot-of-fun/)
- [Google Blog – Play Mustache Protocol](https://blog.google/products-and-platforms/devices/googlebook/henry-cavill-googlebook-mustache-protocol/)
