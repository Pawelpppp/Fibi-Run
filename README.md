# Fibi Run

**Fibi Run** to prosta gra 2D w stylu retro lat 90. (16-bit pixel art, epoka SNES / Genesis), działająca w przeglądarce na komputerze i telefonie.
Arek w złotej zbroi z dużym mieczem biegnie w prawo po szutrowej drodze, przeskakuje beczki, tnie potworki i staje do walki z dresiarzem **Rafałem** oraz dwukrotnie z **księdzem Kamilem**, który porwał jego psa **Fibi**. Po drodze zamarza w lodzie, traci zbroję i odzyskuje ją razem z mieczem. Całość z chiptune'ową muzyką i przyciskiem wyciszenia.

Inspiracja: **Mustache Protocol** (Henry Cavill + Google) – 16-bitowy side-scroller z 2026 roku.

📖 **Wiki projektu:** https://github.com/Pawelpppp/Fibi-Run/wiki (fabuła, mechanika, tech stack, assety, roadmapa)

---

## Jak uruchomić

- **Najprościej:** otwórz `index.html` w przeglądarce (na telefonie – w poziomie). Grafiki są wbudowane jako data-URI (`assets/game/assets.js`), więc działa też z `file://`.
- **Lokalny serwer:** `python3 -m http.server` i wejdź na `http://localhost:8000`.
- Phaser 3 ładowany jest z CDN (jsDelivr), więc potrzebny jest internet.
- Parametr URL `?mission=N` (1–6) startuje wskazaną misję (boss od areny; `?mission=3` = T-shirt bez miecza); `?nointro` pomija intro i od razu startuje misję 1 (przydatne przy testach).
- Telefon w pionie pokazuje podpowiedź „Obróć telefon poziomo” i wstrzymuje grę.

## Fabuła w skrócie

1. **Intro:** Arek (casual: czerwony t-shirt, spodenki, trampki) spaceruje z Fibi na smyczy. Obok przejeżdża samochód z księdzem Kamilem, pies się płoszy, zrywa smycz i ucieka w prawo.
2. Arek wyciąga zza pleców miecz i unosi go nad głowę, z nieba uderza **piorun**, następuje **transformacja** w złotą zbroję i Arek biegnie za psem – zaczyna się **misja 1** (bieg).
3. Po zdobyciu 1000 pkt ekran gwałtownie przesuwa się do areny, gdzie czeka Fibi (po prawej), a wchodzi **Rafał** (**misja 2** – boss: pięści i rzut kastetem; przed walką krótka wymiana zdań z portretem). Po jego pokonaniu z prawej leci **zamrażający czar** i zamyka Arka w bryle lodu; z tej samej strony nadjeżdża ksiądz Kamil, drwi z Arka, zabiera Rafała do auta, **zabiera też Fibi** i odjeżdża w prawo. Wtedy **piorun rozbija lód i zbroję** – Arek zostaje w T-shircie.
4. **Misja 3** (bieg, 3000 pkt, nowe potworki) Arek zaczyna **w T-shircie i bez miecza** (stomp na potworki działa, ataku nie ma). W **połowie celu** leży na drodze miecz – po podniesieniu ekran ciemnieje, trafia go piorun i Arek odzyskuje zbroję. Misja kończy się areną, gdzie czeka Fibi. Nadjeżdża ksiądz Kamil – **misja 4** (boss). Po pokonaniu Kamila ten w szale wsiada do auta, **zabiera Fibi i odjeżdża**; Arek rusza w pościg.
5. **Misja 5** (bieg – na razie zastępcza, 1500 pkt, jak misja 3). Na jej końcu Kamil wraca swoim autem – **misja 6, finałowa walka** – **finałowa walka** (auto można zniszczyć, po jego zniszczeniu Kamil wpada w szał). Po jego pokonaniu Arek unosi miecz, trafia go piorun, zdejmuje zbroję, pojawia się napis WYGRAŁEŚ!, Arek odchodzi w lewo za ekran – ekran KONIEC GRY.

### Postacie
| Postać | Rola | Opis |
|--------|------|------|
| **Arek** | bohater | okulary, broda; w grze złota zbroja z peleryną i mieczem, w intro wersja casual |
| **Ksiądz Kamil** | antagonista / boss | rude krótkie włosy, czarna sutanna, jeździ czerwonym hatchbackiem, rzuca krzyżykami – boss w **misjach 4 i 6** |
| **Rafał** | dresiarz / boss misji 2 | blady, szczupły, jasnobrązowy jeżyk, charakterystyczny dzióbek, **blizna na policzku** i **duży, gruby złoty łańcuch**; błyszczący czarny dres z białymi paskami, białe buty. Umiejętności specjalne: **walka na pięści** i **rzut kastetem** (w grze od misji 2) |
| **Fibi** | pies | mały czarno-brązowy kundelek (portret na ekranie tytułowym, w intro i w arenie) |

## Przebieg gry

| Etap | Cel | Najważniejsze |
|------|-----|---------------|
| Ekran tytułowy | **FIBI [portret] RUN**, przyciski START NEW GAME i **WYNIKI** (Spacja / Enter startuje) | po starcie leci intro (Spacja / tap pomija); WYNIKI otwiera tablicę |
| Intro | ok. 11 s bez dialogów | spacer, auto Kamila, ucieczka psa, miecz, piorun, transformacja |
| Misja 1 (bieg) | **1000 pkt** | beczki (też podwójne), zielony potworek, serduszka |
| Misja 2 – boss: **Rafał** | 4 trafienia w Rafała | pięści (prosty + sierpowy) i rzut kastetem, miecz lub skok na głowę; po wygranej **scena zamrożenia** (czar, Kamil, piorun) |
| Misja 3 (bieg) | **3000 pkt** (licznik od 0) | start **w T-shircie, bez miecza**; w połowie celu miecz na drodze → piorun → zbroja wraca; szybszy ekran, więcej potworków: ghoul, imp, nietoperz |
| Misja 4 – boss: ksiądz Kamil | 3 trafienia w Kamila | miecz lub skok na głowę, czary-krzyżyki, na końcu zabiera Fibi |
| Misja 5 (bieg, **zastępcza**) | **1500 pkt** (licznik od 0) | na razie te same ustawienia co misja 3 (`CFG.LEVEL3`) |
| Misja 6 – finałowy boss: ksiądz Kamil | pokonać Kamila (6 żyć) | więcej czarów, auto do zniszczenia (5 cięć), potem szał; wygrana = zakończenie i KONIEC GRY |

### Misja 1 (bieg)
- Ekran sam przesuwa się w prawo; Arek zawsze biegnie w prawo – gracz może tylko **przyspieszyć** (→) albo **zwolnić** (←), ale nie zatrzymać się ani cofnąć. Arek **nigdy nie opuszcza ekranu** (jego pozycja jest przycinana do krawędzi kamery, też przy odrzucie, przyspieszeniu i w arenach bossów) – przewijanie ekranu go najwyżej popycha, nie zabija.
- **Beczki** trzeba przeskoczyć (+30 pkt za beczkę). Od 60 pkt czasem są **dwie**: obok siebie albo jedna na drugiej (+60).
- **Potworek** (zielony diablik, placeholder) – zabijasz mieczem (+50).
- **Życia:** start z 1 życiem, dotknięcie beczki/potworka = −1, **serduszko** = +1 (maks. 5), po trafieniu krótka nietykalność. 0 żyć = game over.
- **Błyskawica** (żółta, unosi się nisko nad drogą – trzeba podskoczyć; misje 1, 3 i 5; w scenach z piorunem nie pojawia się): na **6 s** ekran przewija się **1,6× szybciej** (Arek biegnie tak samo szybciej względem podłoża, punkty liczą się normalnie). Pod sercami widać ikonę i malejący pasek czasu, a na ekranie smugi prędkości; kolejna błyskawica odnawia licznik. Ustawienia: `CFG.SPEED_ITEM`.
- **Utrata życia:** smutny dźwięk „wah-wah-wah-waaah”, a z lewej albo prawej krawędzi ekranu na ok. 1,2 s wsuwa się **ksiądz Kamil** i śmieje się z dymkiem „HA HA!” (tylko dekoracja: bez kolizji, nie blokuje sterowania; gdy Kamil jest już na arenie, śmieje się w miejscu). Ustawienia: `CFG.HAHA`.
- Pasek postępu i licznik punktów w prawym górnym rogu.

### Misja 2 – boss: Rafał
1. Po 1000 pkt: ten sam przelot do **statycznej areny**; **Fibi stoi przy prawej krawędzi** (nie przeszkadza i nie można jej trafić – ani Arek, ani Rafał nie wchodzą na nią). Rafał wchodzi pieszo z prawej, po czym krótki **dialog z portretem** (2 kwestie, ok. 4 s).
2. **Rafał ma 4 życia** (4 kastety w HUD). Trafiasz go **mieczem** albo **skokiem na głowę** (jak Kamila); po trafieniu jest ogłuszony i odskakuje.
3. **Walka na pięści (z bliska):** idzie do Arka, **zamach (miga, wykrzyknik)** → **prosty** → krótka pauza → **sierpowy**. Trafienie = −1 życie + **odrzut**. Po kombinacji odpoczywa (wtedy go bij). Ciosy można przeskoczyć (pięść mierzy w tułów).
4. **Rzut kastetem (z daleka, od ok. 110 px):** zamach z kastetem w górze i złotą poświatą → **obracający się kastet** leci nisko (**przeskocz**) albo wysoko (**nie skacz**). **Miecz odbija kastet** (dźwięk „klang”).
5. **Poniżej połowy życia (≤2)** wpada w szał: ~1,4× szybszy, krótsze zapowiedzi i przerwy, czerwona poświata, czasem **dwa kastety pod rząd**.
6. Zasady jak przy Kamilu: porażka = „TRY AGAIN” od checkpointu areny (3 życia). Po wygranej Rafał pada i zaczyna się **scena zamrożenia** (opis niżej, sterowanie zablokowane, ok. 20 s).
7. Ustawienia: `CFG.RAFAL` w `game.js`; grafiki `assets/game/rafal_*.png` (z `tools/process_assets.py`), dźwięki `punch`, `throw`, `clang` w `audio.js`; muzyka jak przy pierwszym bossie.

#### Scena po pokonaniu Rafała: zamrożenie → Kamil → piorun (misja 2 → 3)
1. **Zamrażający czar:** chwilę po upadku Rafała z **prawej strony** ekranu leci szybki lodowy pocisk (`freeze_spell`, świst `freezecast`) i trafia Arka – błysk, trzask lodu (`freeze`), Arek zamarza w **bryle lodu** (`arek_frozen`, napis FROZEN!). Sterowanie jest zablokowane.
2. **Kamil nadjeżdża z prawej** (ta sama strona co czar), staje przy Rafale, wysiada i w oknie dialogowym z portretem drwi z zamarzniętego Arka: *„ZIMNO CI, RYCERZYKU? RAFAŁ, DO AUTA!”* → *„IDZIEMY NA LODY, A TY SIĘ OCHŁODŹ!”* (kwestie w `CFG.FREEZE.TEXT`). Potem wciąga Rafała do auta, auto zawraca po **Fibi** i odjeżdża w prawo (dźwięki silnika, hamulców, drzwi).
3. **Piorun:** po odjeździe niebo ciemnieje, lód drży (`charge`), piorun uderza w bryłę – błysk, grzmot (`thunder`) i **rozbicie** (`shatter`): lód pęka na klatkach `ice_shatter_1..3`, lecą odłamki, a zbroja rozpada się na części (`armor_shatter_1..3`). Zostaje **Arek w czerwonym T-shircie** (`arek_casual_*`), otrząsa się („BRR!”) i startuje **misja 3**.
4. Ustawienia: `CFG.FREEZE` (czasy, prędkość czaru, dialog, liczba odłamków, punkty zakotwiczenia grafik).

### Misja 4 – boss: ksiądz Kamil
1. Po 3000 pkt sterowanie się blokuje, ekran szybko przesuwa się w prawo (Arek ląduje przy lewej krawędzi, Fibi stoi po prawej i zostaje tam przez całą walkę; Fibi pojawia się znów przy kolejnym bossie), po czym zatrzymuje się – to **statyczna arena**, w której Arek chodzi swobodnie w lewo i prawo.
2. Nadjeżdża auto Kamila, ksiądz wysiada i zaczyna się walka.
3. **Kamil ma 3 życia** (3 krzyżyki w HUD). Trafiasz go **mieczem** albo **skacząc mu na głowę** (stomp z odbiciem). Po trafieniu jest chwilę nietykalny i ogłuszony; z każdym straconym życiem jest szybszy i częściej rzuca czary.
4. **Czar:** Kamil unosi świecący **krzyżyk** i wysyła go w lewo lub prawo – **nisko** (przeskocz) albo **wysoko** (nie skacz). Krzyżyk można zbić mieczem.
5. Dotknięcie Kamila (poza skokiem na głowę) lub krzyżyka = −1 życie. Porażka = game over; „TRY AGAIN” wraca od razu do areny (checkpoint, 3 życia).
6. Po wygranej Kamil w szale wskakuje do auta, zabiera Fibi i odjeżdża w prawo; ekran rusza dalej → misja 5.

### Misje 3 i 5 (biegi)
- **Misja 3:** cel **3000 pkt** zdobytych w misji (licznik zaczyna się od 0), potem walka z Kamilem (misja 4).
  - **Arek w T-shircie, bez miecza** (po scenie zamrożenia): animacje `arek_casual_*` (bieg 6 klatek, skok 5 faz). Atak (Alt / X / przycisk) nic nie robi poza komunikatem **NO SWORD!**; **skok na potworka** (stomp) nadal działa. HUD pokazuje czerwony napis **NO SWORD** z ikoną miecza, a na pasku postępu **białą kreskę w połowie celu** (tam leży miecz).
  - **Miecz w połowie celu** (`CFG.SWORD_PICKUP.AT_FRAC` = 0.5, czyli 1500 pkt): przed Arkiem pojawia się wbity w drogę miecz (`sword_pickup`, złota poświata, napis SWORD AHEAD!; wokół niego ok. 200 px bez przeszkód). Dotknięcie → krótka scena: Arek schyla się po miecz i unosi go nad głowę, ekran **ciemnieje**, chwila ciszy, **piorun** w miecz i **przemiana** (jak w intro: migotanie sylwetki, iskry, `reveal`) – Arek odzyskuje **zbroję**, napis ARMOR BACK!, HUD „SWORD!” i bieg toczy się dalej już **z mieczem**.
  - Śmierć w misji 3 → jak dotąd restart od misji 1 (Arek znów w zbroi); stan jest spójny: T-shirt tylko w misji 3 przed podniesieniem miecza, `?mission=3` startuje w T-shircie, `?mission=4/5/6` w zbroi (przy starcie debugowym `?mission=N` restart powtarza tę samą misję).
  - Ustawienia: `CFG.SWORD_PICKUP`.
- **Misja 5 – zastępcza:** na razie to ten sam bieg co misja 3, tylko z celem **1500 pkt** i trochę gęstszymi potworami (`CFG.LEVEL3`); do zastąpienia docelową misją.
- Szybszy ekran i częstsze potworki; beczki jak wcześniej (podwójne od początku).
- Potworki (placeholdery): **ghoul** (zielony, +50), **imp** (czerwony, szybki, biegnie na Arka, +70), **bat** (nietoperz, leci falująco na wysokości, +60).

### Misja 6 – finałowy boss: ksiądz Kamil
1. Po 1500 pkt w misji 5 – jak przy pierwszym bossie: sterowanie się blokuje, ekran przesuwa się do **statycznej areny**.
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

## Misje / bossowie
Plan z grafikami bossów jest wdrożony w kodzie (misje nieparzyste = bieg, parzyste = boss):

| Misja | Typ | Boss | Stan w grze |
|-------|-----|------|-------------|
| 1 | bieg | – | gotowa (dawny poziom 1) |
| 2 | boss | **Rafał** (dres) – walka na pięści (prosty, sierpowy) i **rzut kastetem** (pocisk z obrotem); blizna, złoty łańcuch | gotowa; po wygranej scena zamrożenia (czar → Kamil zabiera Rafała i Fibi → piorun rozbija lód i zbroję) |
| 3 | bieg | – | gotowa; Arek w T-shircie bez miecza, w połowie celu podnosi miecz i odzyskuje zbroję |
| 4 | boss | **ksiądz Kamil** | gotowa (dawny pierwszy boss, zabiera Fibi) |
| 5 | bieg | – | **zastępcza** – kopia misji 3 z celem 1500 pkt (`CFG.LEVEL3`), brak docelowej treści |
| 6 | boss | **ksiądz Kamil** (finał) | gotowa (dawny finałowy boss + zakończenie) |

Parametr URL `?mission=N` (1–6) startuje od razu wskazaną misję (boss = od areny, checkpoint z 3 życiami) – do testów.

## Muzyka i dźwięk

Cały dźwięk jest **generowany w przeglądarce** (Web Audio API, plik `audio.js`) – bez plików audio, działa z `file://` i z serwera. Muzyka jest autorska w klimacie 16-bitowych gier akcji (SNES / Genesis) – nie kopiuje żadnej istniejącej melodii.

**Muzyka**
- Aranżacja: **lead** z dwóch rozstrojonych „pulsów” z prawdziwą modulacją wypełnienia (PWM) i vibrato, **echo** (delay z sprzężeniem) na leadzie, harmonia w tercję, **arpeggia** akordów, **bas** z skokami oktawowymi (wzmocniony: głośniejsza linia, osobny **sub-sinus oktawę niżej**, półka +5 dB poniżej 150 Hz i lekkie „sidechain” pod stopę, żeby bas nie zlewał się z bębnem), **stabsy** akordowe, **perkusja** (stopa, werbel, hi-haty, toms, crash – szum + obwiednie wysokości) z fillami.
- **Budowa utworów:** intro / A / A2 / B / mostek / B2 (zamiast krótkich pętli), 38–48 taktów, pętla wraca po intro. Kompresor „klejący” + limiter na wyjściu (bez przesterowań).
- Utwory: tytułowy (a-moll, heroiczny), intro, poziom 1 (e-moll, ~152 BPM), poziom 2 (szybszy, wyżej), boss (d-moll, 176 BPM), finałowy boss (186 BPM, harmonia + stabsy), **szał** (210 BPM, podwojenie oktawą, podwójna stopa), fanfara zwycięstwa, napisy końcowe, game over.

**Efekty**
- **Transformacja** (intro i zdjęcie zbroi w zakończeniu): narastające ładowanie (świst + piła + pisk, kończy się dokładnie w chwili uderzenia) → **grzmot** (trzask + dudniący pogłos, muzyka na chwilę przycichnie) → **migoczące arpeggio iskier** → **power chord** przy odsłonięciu. Zgrane z animacją (czasy z `CFG`).
- **Auto Kamila:** silnik (piła + sub + przester, dudnienie LFO, szum) z wysokością i głośnością zależną od prędkości auta, **panoramą stereo** i efektem Dopplera przy przejeździe w intro; wjazd na arenę (obie walki), odjazd z Fibim; **pisk hamulców** przy zatrzymaniu i **trzaśnięcie drzwiami** (wysiadanie Kamila, wsiadanie, Fibi w aucie).
- **Utrata życia:** `lifelost` (pulsowa „smutna trąbka” z vibrato i filtrem wah, ok. 1 s) + chwilę później `haha` (3 krótkie „ha”), podgląd offline `sfx_lifelost`; **błyskawica** (`boost`: wznoszący zjazd w górę).
- **Lód i miecz:** `freezecast` (świst lodowego czaru), `freeze` (trzask lodu + kryształowy dzwonek), `shatter` (szkło + metal zbroi + grzmot), `shing` (wyciągnięcie miecza z ziemi); piorun w misji 3 używa tego samego `charge` / `thunder` / `reveal` co transformacja w intro.
- Pozostałe: skok, cięcie, trafienie, serduszko, krzyżyk, uderzenie w auto, wybuch.

**Sterowanie dźwiękiem**
- Dźwięk startuje po **pierwszym kliknięciu / dotknięciu / klawiszu** (wymóg przeglądarek).
- **Przycisk wyciszenia** (ikona głośnika u góry – na ekranie tytułowym, w intro i w grze; klik/tap) oraz klawisz **M**. Wybór jest zapamiętywany w `localStorage` (`fibi_muted`); wyciszenie obejmuje muzykę i efekty (w tym silnik). Dźwięk cichnie też, gdy karta jest w tle.
- Edycja: melodie, progresje, wzorce basu/perkusji i budowa to dane w `SONGS` w `audio.js`; efekty w `playSfx`. Podgląd offline: `FibiAudio.render('boss', 25)` (albo `sfx_transform`, `sfx_car_arrive`, `sfx_car_passby`) zwraca bufor stereo do zapisu jako WAV.

## Sterowanie

| Akcja | Klawiatura | Telefon |
|-------|------------|---------|
| Przyspiesz / idź w prawo | → lub D | przycisk → |
| Zwolnij / idź w lewo | ← lub A | przycisk ← |
| Skok | Spacja (zapasowo ↑, W) | przycisk skok |
| Atak mieczem | Alt (zapasowo X, Z) | przycisk atak |
| Wycisz / włącz dźwięk | **M** | ikona głośnika u góry |
| Pełny ekran | **F** | ikona ramki u góry (ukryta, gdy przeglądarka nie pozwala, np. Safari na iPhonie) |
| Menu / restart po końcu gry | Spacja lub Enter; Esc = menu; R = zagraj ponownie (po KONIEC GRY) | przycisk na ekranie |

W arenie bossa → / ← poruszają Arka swobodnie po ekranie (ekran się nie przewija).

## Tablica wyników

Po **GAME OVER** i po ekranie **KONIEC GRY** (wygrana) gracz może wpisać **nick** (maks. 12 znaków, wielkie litery, cyfry, spacja, myślnik i polskie znaki). Zapis: nick, **łączna liczba punktów** z całej rozgrywki (wszystkie misje) oraz **czas od kliknięcia START** do końca gry, w formacie `mm:ss`. Czas obejmuje intro i ewentualne „TRY AGAIN” w tej samej sesji (od tego samego START). „PLAY AGAIN” po wygranej zaczyna nowy pomiar.

Podczas gry (i w intro) w HUD widać licznik czasu. Tablicę można też otworzyć z menu tytułowego przyciskiem **WYNIKI** (ranga, nick, punkty, czas; podczas pobierania widać **CZEKAJ...**). Sortowanie: więcej punktów, przy remisie krótszy czas. Lokalnie trzymane jest do 20 wyników (`localStorage`, klucz `fibi_leaderboard`).

Tablica jest **wspólna dla wszystkich graczy** — wyniki idą do Azure Function (`CFG.LEADERBOARD.API_URL`):

`https://fibirun-scores-a3hea0bphtf2aaer.polandcentral-01.azurewebsites.net/api/scores`

- **GET** — top 20 (`nick`, `score`, `time_ms`, `created_at`)
- **POST** — JSON `{nick, score, time_ms}` (`Content-Type: application/json`); czas krótszy niż 1 s jest przed wysyłką podnoszony do 1000 ms (wymóg API)

CORS dopuszcza tylko **`https://pawelpppp.github.io`** oraz **`http://localhost`** (port 80, bez numeru portu w adresie; `http://localhost:8000` już nie przejdzie). Otwarcie gry jako `file://` albo z innej domeny nie przejdzie przez CORS — wtedy gra spada na zapis lokalny i pokazuje adnotację **OFFLINE** (wpis nie ginie). To samo przy błędzie sieci.

Opcjonalnie zamiast Azure można ustawić [Supabase](https://supabase.com): wyczyść `API_URL` i wklej `SUPABASE_URL` oraz `SUPABASE_ANON_KEY` (schemat w `docs/supabase-scores.sql`). `API_URL` ma pierwszeństwo, gdy oba są wypełnione.

## Wersjonowanie

Gra pokazuje numer wersji w prawym górnym rogu ekranu tytułowego, w formacie **v1.N**. **N** to łączna liczba commitów na gałęzi `master` (`git rev-list --count HEAD`). Numer ma rosnąć automatycznie po każdym commicie.

**Docelowo (GitHub Actions):** workflow `.github/workflows/pages.yml` przy wdrażaniu strony wylicza N, wpisuje `version.js` tylko do artefaktu (z krótkim hashem w `window.FIBI_VERSION_SHA`) i wdraża GitHub Pages. CI **nie** dodaje dodatkowego commita, więc nie powstaje pętla wdrożeń. Gotowy plik workflow jest w [`docs/pages-workflow.yml`](docs/pages-workflow.yml) — wystarczy skopiować go do `.github/workflows/pages.yml` (push tego pliku wymaga zakresu `workflow` w tokenie GitHub) i w ustawieniach repozytorium ustawić źródło Pages na **GitHub Actions**.

**Teraz (zapasowo):** `version.js` w repozytorium ma aktualny numer 1.N i jest serwowany razem z grą. Przed commitem aktualizuje go hook `tools/pre-commit` (instalacja w klonie: `bash tools/install-version-hook.sh`). Ręcznie: `bash tools/write_version.sh`. Na [GitHub Pages](https://pawelpppp.github.io/Fibi-Run/) widać ten plik także pod adresem [version.js](https://pawelpppp.github.io/Fibi-Run/version.js).

## Tech stack

- **Phaser 3.80.1** (CDN jsDelivr), czysty **JavaScript** (`game.js`, `audio.js`, `leaderboard.js`), **HTML5** (`index.html`)
- Rozdzielczość bazowa **568×320**, `Phaser.Scale.FIT`, `pixelArt: true`, `roundPixels`
- Sceny: `Boot → Title → Intro → Play` (boss, finał i zakończenie to tryby `PlayScene`; game over i KONIEC GRY to nakładki; nick i tablica to scena `Board`)
- **Dźwięk:** `audio.js` – własny silnik Web Audio (PWM, delay, filtry, szum, sekwencer z kolejką czasu), muzyka i SFX proceduralne, możliwość renderu offline do WAV
- Fizyka własna (bez Arcade): prosty skok z grawitacją i skrzynki kolizji
- Wszystkie stałe gry (prędkości, punkty, odstępy, czasy intra i bossa, poziom 2) są na górze `game.js` w obiekcie **`CFG`**
- Beczka, potworki, serce, krzyżyk, tło, przyciski dotykowe i czcionka 5×7 są **rysowane w kodzie** (tekstury canvas)
- **Pipeline grafik:** Python + Pillow/NumPy/SciPy (`tools/process_assets.py`) – usuwa namalowaną szachownicę, wyrównuje klatki, zmniejsza do rozmiaru gry, kwantyzuje paletę i zapisuje PNG oraz `assets/game/assets.js` (data-URI, działa z `file://`)
- Sterowanie dotykowe (multi-touch) i klawiatura; wykrywanie telefonu, overlay „obróć telefon”

Przebudowa grafik: `pip install pillow numpy scipy` → `python3 tools/process_assets.py`.

## Struktura projektu

```
index.html              # strona, CDN Phaser, podpowiedź "obróć telefon"
game.js                 # cała gra: CFG, tekstury, sceny Boot/Title/Intro/Play/Board
audio.js                # muzyka chiptune i efekty (Web Audio), przycisk/klawisz mute
leaderboard.js          # tablica wyników: Azure Function (API_URL) + localStorage, opcjonalnie Supabase
version.js              # window.FIBI_VERSION = 1.N (N = liczba commitów; aktualizowane hookiem / write_version.sh)
docs/pages-workflow.yml # docelowy workflow Pages (skopiować do .github/workflows/pages.yml, gdy token ma zakres workflow)
docs/supabase-scores.sql # schemat tabeli scores i polityki RLS (wspólna tablica)
tools/process_assets.py # przetwarzanie oryginalnych grafik -> assets/game + assets.js
tools/write_version.sh  # lokalne wyliczenie 1.N z liczby commitów
tools/pre-commit        # hook git: wpisuje wersję przed commitem
tools/install-version-hook.sh  # instalacja hooka w klonie
tools/test_*.py         # testy Playwright (menu, błyskawica, scena zamrożenia i miecz); API tablicy mockowane
assets/
├── sprites/            # oryginały (Arek, Kamil, auto, Fibi, casual) + podglądy *_x4.png
│   ├── arek_casual_run6_1..6.png   # casual: bieg, 6 klatek
│   ├── arek_casual_jump_1..5.png   # casual: skok 5 faz (przysiad, wznoszenie, szczyt, opadanie, lądowanie)
│   ├── arek_run6_1..6.png          # zbroja: bieg, 6 klatek
│   ├── arek_jump_1..5.png          # zbroja: skok 5 faz (w tym uniesiony miecz)
│   │                   #   utrata życia – Kamil wsuwa się z krawędzi ekranu i się śmieje (w grze):
│   ├── ksiadz_kamil_laugh_walk_1..4.png  # Kamil idzie w prawo, śmieje się, głowa do gracza (75–78×160), cykl 4 klatek
│   ├── ksiadz_kamil_bubble_haha.png      # dymek „HA HA!” (96×50, ogonek w lewo-dół; rysowany pikselowo)
│   │                   #   Rafał dres (boss misji 2, w grze – przetwarzane przez process_assets.py):
│   ├── rafal_dres_stand.png              # stoi, w prawo (49×160)
│   ├── rafal_dres_walk_1..4.png          # chód, 4 klatki (74/55/67/61×160, jedna skala ze stand)
│   ├── rafal_dres_punch_1..3.png         # ciosy: zamach, prosty, sierpowy (75–89×155, ta sama skala co stand/walk)
│   ├── rafal_dres_throw_1..2.png         # rzut kastetem: zamach, wypuszczenie (78–89×153)
│   ├── rafal_dres_kastet.png             # pocisk – kastet (30×17)
│   ├── rafal_dres_kastet_spin_1..2.png   # obrót kastetu w locie (25×24 pod kątem, 4×24 bokiem)
│   │                   #   scena zamrożenia Arka po Rafale i odzyskania miecza (w grze, patrz „Grafiki sceny zamrożenia”):
│   ├── arek_frozen.png                   # Arek w zbroi w bloku lodu (221×228; lód półprzezroczysty, alfa 140–180 – wyjątek od binarnej alfy, zachowana w grze)
│   ├── ice_shatter_1..3.png              # lód pęka / odłamki lecą / drobne okruchy (221×228, ten sam układ i pozycja bloku co arek_frozen)
│   ├── armor_shatter_1..3.png            # zbroja rozlatuje się po uderzeniu pioruna, Arek w czerwonym t-shircie (264×232, Arek w tym samym miejscu we wszystkich klatkach)
│   ├── freeze_spell_1..2.png             # pocisk – kryształ lodu, 2 klatki migotania (32×25)
│   └── sword_pickup.png                  # miecz Arka wbity w ziemię (40×98) – leży na drodze w połowie misji 3
├── portraits/          # portrety do dialogów (Fibi, Kamil, ...)
│   ├── ksiadz_kamil_portrait_front.png # Kamil (portret w dialogu po pokonaniu Rafała → assets/game/kamil_portrait.png)
│   └── rafal_dres_portrait_front.png  # Rafał dres (192×192)
└── game/               # przetworzone sprite'y do gry + assets.js (data-URI)
```

## Assety i placeholdery

**Gotowe (własne grafiki):** scena zamrożenia i miecza (`arek_frozen`, `ice_shatter_1..3`, `armor_shatter_1..3`, `freeze_spell_1..2`, `sword_pickup`), Rafał dres (chód, ciosy, rzut, kastet, portret), portret Kamila, Arek w zbroi (bieg 6 klatek, skok 5 faz przełączanych wg prędkości pionowej, atak), Arek casual (bieg 6 klatek, skok 5 faz, stoi), ksiądz Kamil (stoi, chód 1–2, portret; śmiejący się chód `ksiadz_kamil_laugh_walk_1..4` + dymek `ksiadz_kamil_bubble_haha` – w grze przy utracie życia, przetwarzane do `assets/game/kamil_laugh_walk_*.png` i `kamil_bubble_haha.png`), samochód Kamila (2 klatki jazdy + wariant z pustym siedzeniem generowany przez `process_assets.py`), Fibi (stoi, chód 1–2, portret).

**Placeholdery (rysowane w kodzie, do podmiany na docelowe grafiki):** beczka, potworki (ghoul, imp, nietoperz), krzyżyk-czar, serduszka, droga, tło (zachód słońca, wzgórza, drzewa), przyciski dotykowe, miecz w ręce Arka w scenie podnoszenia i w intro (w grafikach casual nie ma pozy z mieczem) oraz błyskawica w intro / w scenach z piorunem.

**Grafiki sceny zamrożenia (skale w `tools/process_assets.py`)**
- `arek_frozen`, `ice_shatter_1..3`: skala klatek biegu w zbroi (`arek_run6_*` → 64 px), **całe płótno 221×228** (bez przycinania), półprzezroczystość lodu zachowana; w grze `origin (0.5, 194/228)` – dół bryły stoi na ziemi, odłamki spadają poniżej linii ziemi (`CFG.FREEZE.ORIGIN_FROZEN_Y`).
- `armor_shatter_1..3`: skala Arka casual (`arek_casual_*` → 60 px), całe płótno 264×232, `origin (0.5, 224/232)` – stopy Arka w T-shircie w tym samym miejscu co `arek_casual_stand` (`CFG.FREEZE.ORIGIN_ARMOR_Y`); po animacji sprite płynnie zastępuje zwykły Arek casual.
- `freeze_spell_1..2` (grot w prawo, w grze `flipX` – leci w lewo; skala 0,75) i `sword_pickup` (skala biegu w zbroi, dół = ziemia).
- Podmiana grafiki: wrzuć nowy plik o tej samej nazwie do `assets/sprites/` i uruchom `python3 tools/process_assets.py`.

Szczegóły: wiki → *Assety i grafiki*.

## Znane problemy i roadmapa

**Znane ograniczenia**
- Muzyka i efekty są proceduralnie syntezowane (placeholder jakościowy – docelowo można podmienić na nagrane utwory).
- Piktogramy ikony głośnika i polskie znaki w czcionce 5×7 są uproszczone.
- Spacer casual w intro używa dwóch klatek biegu (przeciwne nogi) na przemian ze staniem – nie ma osobnego cyklu chodu.
- Skala głowy Arka w starej klatce ataku skorygowana ręcznie (`HEAD_SCALE` w skrypcie grafik).
- Wartości punktów potworków i balans trudności są tymczasowe.
- Porażka w biegu (przed areną bossa, także w misji 3 przed lub po podniesieniu miecza) restartuje grę od misji 1 w zbroi; checkpoint działa tylko w arenie bossa (po wejściu do areny, np. po przegranej z Rafałem wracasz od razu do jego areny).

**Zrobione:** wersjonowanie v1.N (liczba commitów, ekran tytułowy), ekran tytułowy, intro z transformacją, misje 1–6 (biegi + bossowie: Rafał, Kamil, finałowy Kamil; misja 5 zastępcza), scena po Rafale (zamrożenie, Kamil, piorun, T-shirt), miecz do podniesienia w misji 3 (piorun przywraca zbroję), błyskawica przyspieszająca ekran, Kamil „HA HA” i dźwięk utraty życia, wspólna tablica wyników na Azure, mocniejszy bas w muzyce, parametr `?mission=N`, finałowy boss (auto do zniszczenia, szał), zakończenie z piorunem i napisem WYGRAŁEŚ!, ekran KONIEC GRY, muzyka chiptune + przycisk mute (M), sterowanie dotykowe, animacja biegu (6 klatek) i skoku (5 faz), checkpoint w arenie bossa.

**Do zrobienia:** docelowe grafiki potworków/beczek/tła, dopracowanie balansu i dźwięku.

**Pomysły na później**
- Nagrany soundtrack i głosy
- Mówiący pies i dialogi z portretami
- Docelowe grafiki potworków, beczek i tła
- Power-upy i easter eggi (inspiracja Mustache Protocol)
- Mechanika „porywania” przeciwników
- Docelowa misja 5 (bieg) zamiast zastępczej
- Kolejne poziomy i bossowie

---

Źródła inspiracji:
- [Digital Trends – Mustache Protocol review](https://www.digitaltrends.com/gaming/google-and-henry-cavills-mustache-protocol-game-is-retro-silly-and-a-lot-of-fun/)
- [Google Blog – Play Mustache Protocol](https://blog.google/products-and-platforms/devices/googlebook/henry-cavill-googlebook-mustache-protocol/)
