'use strict';
/* =====================================================================
   Fibi Run - retro side-scroller (Phaser 3), 16-bit pixel art
   Sceny: Boot -> Title -> Intro -> Play (poziom 1 -> przelot -> boss Kamil -> poziom 2; game over / wygrana to nakładki)
   ===================================================================== */

/* ---------------------------------------------------------------------
   USTAWIENIA - tu wszystko łatwo zmienić (prędkości, punkty, spawn)
   --------------------------------------------------------------------- */
const CFG = {
    WIDTH: 568,
    HEIGHT: 320,

    // --- świat ---
    ROAD_TOP: 246,          // górna krawędź szutrowej drogi (y)
    GROUND_Y: 258,          // y stóp Arka na drodze

    // --- ruch (px/s) ---
    SCROLL_SPEED: 80,       // ekran sam przesuwa się w prawo z tą prędkością
    SPEED_NORMAL: 80,       // prędkość Arka bez klawiszy (= ekran, zostaje w miejscu)
    SPEED_SLOW: 60,         // ← zwolnij (nadal biegnie w prawo, nigdy nie stoi)
    SPEED_FAST: 135,        // → przyspiesz
    EDGE_MARGIN: 20,        // ile px od krawędzi ekranu Arek może dojść (połowa jego szerokości)

    // --- skok ---
    JUMP_VELOCITY: 420,     // prędkość początkowa skoku (px/s)
    GRAVITY: 700,           // grawitacja (px/s^2)
    JUMP_BUFFER: 0.12,      // s - wciśnięcie skoku tuż przed lądowaniem też działa

    // --- atak mieczem ---
    ATTACK_TIME: 0.28,      // s - czas trwania ataku
    ATTACK_COOLDOWN: 0.12,  // s - przerwa po ataku
    SWORD_REACH: 46,        // px przed Arkiem, na które sięga miecz

    // --- punkty / życia ---
    GOAL_SCORE: 1000,       // tyle punktów = wygrana
    POINTS_BARREL: 30,      // przeskoczenie beczki bez dotknięcia
    POINTS_MONSTER: 50,     // zabicie potworka mieczem (WARTOŚĆ TYMCZASOWA - do ustalenia)
    START_LIVES: 1,
    MAX_LIVES: 5,
    INVULN_TIME: 1.6,       // s nietykalności po utracie życia

    // --- pojawianie się przeszkód (w px świata) ---
    FIRST_OBSTACLE_X: 540,  // gdzie pierwsza przeszkoda
    GAP_MIN: 220,           // minimalna odległość między przeszkodami
    GAP_MAX: 380,           // maksymalna odległość
    GAP_RAMP: 0.3,          // o ile (30%) odstępy maleją do końca poziomu
    DOUBLE_BARREL_CHANCE: 0.3,  // szansa, że przeszkoda-beczka to dwie beczki (obok siebie albo jedna na drugiej)
    DOUBLE_MIN_SCORE: 60,       // od ilu punktów mogą pojawiać się podwójne beczki
    STACK_SHARE: 0.5,           // z podwójnych: tyle to beczka na beczce, reszta - dwie obok siebie
    PAIR_SPACING: 20,           // odległość środków dwóch beczek obok siebie (px; beczka ma 24 px)
    STACK_STEP: 26,             // o ile wyżej leży druga beczka (px; beczka ma 28 px, 2 px zakładki)
    MONSTER_CHANCE: 0.3,    // szansa, że przeszkoda to potworek (reszta: beczka)
    MONSTER_SPEED: 28,      // potworek idzie w lewo z tą prędkością (px/s)
    HEART_CHANCE: 0.14,     // szansa na serduszko w przerwie między przeszkodami
    HEART_GUARANTEE: 9,     // po tylu przeszkodach bez serduszka na pewno się pojawi
    HEART_HEIGHT: 74,       // wysokość serduszka nad ziemią (trzeba podskoczyć)

    // --- intro (przerywnik przed poziomem 1) ---
    INTRO_AREK_X: 170,        // gdzie na ekranie stoi Arek (tam też zaczyna poziom 1)
    INTRO_WALK_SPEED: 34,      // prędkość spaceru (px/s, tło przesuwa się w prawo)
    INTRO_DOG_DIST: 58,        // odległość psa od Arka (pies idzie za nim, po prawej)
    INTRO_CAR_START: 4.0,      // s - kiedy wjeżdża samochód
    INTRO_CAR_SPEED: 170,      // px/s
    INTRO_CAR_SCALE: 0.58,     // skala auta (sprite 219x100) - dach ~ wzrost Arka (64 px); mniej = mniejsze auto
    INTRO_CAR_BOTTOM: 248,     // y kół samochodu (dalszy pas drogi, za Arkiem)
    INTRO_SCARE_TIME: 0.6,     // s - pies się płoszy, zanim zerwie smycz
    INTRO_TURN_TIME: 0.6,      // s - Arek reaguje i odwraca się w prawo
    INTRO_SWORD_TIME: 1.1,     // s - wyciąga miecz zza pleców i unosi go nad głowę
    INTRO_HOLD_TIME: 0.35,     // s - chwila ciszy przed uderzeniem pioruna (niebo ciemnieje)
    INTRO_STRIKE_TIME: 0.6,    // s - piorun z nieba uderza w miecz
    INTRO_TRANSFORM_TIME: 0.9, // s - przemiana: błysk, iskry, zmiana na zbroję
    INTRO_CHASE_TIME: 1.8,     // s - Arek w zbroi biegnie za psem, potem startuje poziom 1
    INTRO_DOG_SPEED: 210,      // px/s - jak szybko ucieka pies
    INTRO_SKIP_GUARD: 0.4,     // s - tyle ignorujemy "skip", żeby klik START nie pominął intra

    // --- animacja biegu / chodu ---
    RUN_FPS: 10,                // klatek/s przy prędkości SPEED_NORMAL (cykl 1-2-3-2 = ~2,5 kroku/s)
    RUN_TIMESCALE_MIN: 0.7,     // tempo animacji = prędkość Arka / SPEED_NORMAL, w tych granicach
    RUN_TIMESCALE_MAX: 1.9,
    WALK_FPS: 3,                // tempo spaceru casual w intro (klatek/s przy INTRO_WALK_SPEED)
    SLASH_OFFSET_X: 12,         // przesunięcie błysku miecza od środka (głowy) Arka

    // --- przejście po poziomie 1 i walka z bossem (ksiądz Kamil) ---
    ARENA_RUSH_DISTANCE: 1100,  // o ile px ekran gwałtownie przesuwa się w prawo (bohater ląduje przy lewej krawędzi)
    ARENA_RUSH_TIME: 2.2,       // s - jak długo trwa ten przelot
    ARENA_HERO_X: 34,           // gdzie na ekranie stoi Arek po przelocie (skrajnie lewa strona)
    ARENA_CAR_TIME: 1.7,        // s - dojazd samochodu Kamila
    ARENA_CAR_STOP: 0.70,       // gdzie auto staje (ułamek szerokości ekranu)
    BOSS_HERO_SPEED: 150,       // px/s - ruch Arka w arenie (lewo/prawo dowolnie)
    BOSS_HP: 3,                 // życia Kamila
    BOSS_SPEED: 62,             // px/s - chód Kamila
    BOSS_RAGE_SPEED: 0.3,       // o ile szybszy za każde stracone życie (x1.3, x1.6)
    BOSS_INVULN: 1.2,           // s nietykalności Kamila po trafieniu
    BOSS_STUN: 0.7,             // s - po trafieniu Kamil jest ogłuszony (nie rani, odskakuje)
    BOSS_SPELL_MIN: 2.0,        // s - odstęp między czarami (losowo min..max)
    BOSS_SPELL_MAX: 3.4,
    BOSS_SPELL_WINDUP: 0.65,    // s - Kamil unosi krzyżyk przed wystrzałem
    STOMP_BOUNCE: 330,          // px/s - odbicie Arka po skoczeniu na Kamila
    CROSS_SPEED: 175,           // px/s - prędkość krzyżyka
    CROSS_HIGH_CHANCE: 0.45,    // szansa na krzyżyk wysoko (trzeba nie skakać) zamiast przy ziemi (trzeba przeskoczyć)
    CROSS_LOW_Y: 12,            // wysokość środka niskiego krzyżyka nad ziemią
    CROSS_HIGH_Y: 68,           // wysokość środka wysokiego krzyżyka nad ziemią

    // --- poziom 2 (po pokonaniu Kamila; licznik punktów zaczyna od 0) ---
    LEVEL2: {
        GOAL_SCORE: 3000,        // tyle punktów trzeba zdobyć w poziomie 2
        SCROLL_SPEED: 100, SPEED_NORMAL: 100, SPEED_SLOW: 75, SPEED_FAST: 165,
        GAP_MIN: 200, GAP_MAX: 340, GAP_RAMP: 0.25,
        MONSTER_CHANCE: 0.45,    // więcej potworów niż w poziomie 1
        MONSTER_MIX: { ghoul: 0.34, imp: 0.33, bat: 0.33 },
        DOUBLE_BARREL_CHANCE: 0.35, DOUBLE_MIN_SCORE: 0,
        HEART_CHANCE: 0.16,
    },
    POINTS_IMP: 70,             // szybki diablik
    POINTS_BAT: 60,             // latający nietoperz
    IMP_SPEED: 125,             // px/s - diablik biegnie na Arka
    BAT_SPEED: 48,              // px/s - nietoperz leci w lewo
    BAT_HEIGHT: 76,             // średnia wysokość lotu nad ziemią
    BAT_WAVE: 14,               // amplituda falowania (px)

    // --- tło ---
    TREE_GAP_MIN: 130,      // odstępy między drzewami w tle (px, przestrzeń tła)
    TREE_GAP_MAX: 380,
    PARALLAX_FAR: 0.08,
    PARALLAX_MID: 0.2,
    PARALLAX_NEAR: 0.36,
    PARALLAX_TREES: 0.55,
};

const W = CFG.WIDTH, H = CFG.HEIGHT;
const IS_TOUCH = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) ||
    /[?&]touch\b/.test(location.search);

/* Alt/Spację/strzałki przechwytuje Phaser (preventDefault po obsłużeniu klawisza),
   dzięki czemu Alt nie przenosi fokusu do menu przeglądarki. NIE wołamy tu własnego
   preventDefault przed Phaserem - Phaser ignoruje zdarzenia z defaultPrevented. */

/* =====================================================================
   PIKSELOWA CZCIONKA 5x7 (generowana do tekstur canvas - bez plików)
   ===================================================================== */
const GLYPHS = {
    'A': '01110,10001,10001,11111,10001,10001,10001', 'B': '11110,10001,10001,11110,10001,10001,11110',
    'C': '01110,10001,10000,10000,10000,10001,01110', 'D': '11110,10001,10001,10001,10001,10001,11110',
    'E': '11111,10000,10000,11110,10000,10000,11111', 'F': '11111,10000,10000,11110,10000,10000,10000',
    'G': '01110,10001,10000,10111,10001,10001,01111', 'H': '10001,10001,10001,11111,10001,10001,10001',
    'I': '01110,00100,00100,00100,00100,00100,01110', 'J': '00111,00010,00010,00010,00010,10010,01100',
    'K': '10001,10010,10100,11000,10100,10010,10001', 'L': '10000,10000,10000,10000,10000,10000,11111',
    'M': '10001,11011,10101,10101,10001,10001,10001', 'N': '10001,11001,10101,10011,10001,10001,10001',
    'O': '01110,10001,10001,10001,10001,10001,01110', 'P': '11110,10001,10001,11110,10000,10000,10000',
    'Q': '01110,10001,10001,10001,10101,10010,01101', 'R': '11110,10001,10001,11110,10100,10010,10001',
    'S': '01111,10000,10000,01110,00001,00001,11110', 'T': '11111,00100,00100,00100,00100,00100,00100',
    'U': '10001,10001,10001,10001,10001,10001,01110', 'V': '10001,10001,10001,10001,10001,01010,00100',
    'W': '10001,10001,10001,10101,10101,10101,01010', 'X': '10001,10001,01010,00100,01010,10001,10001',
    'Y': '10001,10001,01010,00100,00100,00100,00100', 'Z': '11111,00001,00010,00100,01000,10000,11111',
    '0': '01110,10001,10011,10101,11001,10001,01110', '1': '00100,01100,00100,00100,00100,00100,01110',
    '2': '01110,10001,00001,00010,00100,01000,11111', '3': '11110,00001,00001,01110,00001,00001,11110',
    '4': '00010,00110,01010,10010,11111,00010,00010', '5': '11111,10000,11110,00001,00001,10001,01110',
    '6': '01110,10000,10000,11110,10001,10001,01110', '7': '11111,00001,00010,00100,01000,01000,01000',
    '8': '01110,10001,10001,01110,10001,10001,01110', '9': '01110,10001,10001,01111,00001,00001,01110',
    ':': '00000,00100,00100,00000,00100,00100,00000', '.': '00000,00000,00000,00000,00000,01100,01100',
    ',': '00000,00000,00000,00000,01100,00100,01000', '-': '00000,00000,00000,11111,00000,00000,00000',
    '+': '00000,00100,00100,11111,00100,00100,00000', '/': '00001,00001,00010,00100,01000,10000,10000',
    '!': '00100,00100,00100,00100,00100,00000,00100', '?': '01110,10001,00001,00010,00100,00000,00100',
    '=': '00000,00000,11111,00000,11111,00000,00000', '<': '00010,00100,01000,10000,01000,00100,00010',
    '>': '01000,00100,00010,00001,00010,00100,01000', ' ': '00000,00000,00000,00000,00000,00000,00000',
};

/** Tekstura z napisem (cache po treści). o: {scale, color, shadow} */
function pxTextKey(scene, str, o) {
    const key = `px|${str}|${o.scale}|${o.color}|${o.shadow || ''}`;
    if (scene.textures.exists(key)) return key;
    const s = o.scale, off = o.shadow ? Math.max(1, Math.round(s / 2)) : 0;
    const tex = scene.textures.createCanvas(key, Math.max(1, (str.length * 6 - 1) * s + off), 7 * s + off);
    const c = tex.getContext();
    const draw = (dx, dy, col) => {
        c.fillStyle = col;
        [...str].forEach((ch, i) => {
            const g = (GLYPHS[ch] || GLYPHS[' ']).split(',');
            g.forEach((row, r) => [...row].forEach((v, k) => {
                if (v === '1') c.fillRect(i * 6 * s + k * s + dx, r * s + dy, s, s);
            }));
        });
    };
    if (o.shadow) for (let k = off; k >= 1; k--) draw(k, k, o.shadow);
    draw(0, 0, o.color);
    tex.refresh();
    return key;
}

/** Obraz z napisem; .setString(nowy) podmienia tekst. */
function pxText(scene, x, y, str, opts) {
    const o = Object.assign({ scale: 2, color: '#ffffff', shadow: '#000000', ox: 0.5, oy: 0 }, opts);
    const img = scene.add.image(x, y, pxTextKey(scene, str, o)).setOrigin(o.ox, o.oy);
    img._str = str;
    img.setString = (s) => {
        if (s !== img._str) { img._str = s; img.setTexture(pxTextKey(scene, s, o)); }
        return img;
    };
    return img;
}

/* =====================================================================
   GENEROWANA GRAFIKA (tło, beczka, potworek, serce, przyciski...)
   ===================================================================== */
function canvasTex(scene, key, w, h, fn) {
    if (scene.textures.exists(key)) return;
    const t = scene.textures.createCanvas(key, w, h);
    fn(t.getContext(), w, h);
    t.refresh();
}
const rect = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
const rgb = (r, g, b) => `rgb(${r},${g},${b})`;

/** Rysuje sprite z ASCII-artu (kropka = przezroczysty), powiększony `scale` razy. */
function artTex(scene, key, rows, pal, scale) {
    canvasTex(scene, key, rows[0].length * scale, rows.length * scale, (c) => {
        rows.forEach((r, y) => {
            if (r.length !== rows[0].length) console.warn('art row width', key, y);
            [...r].forEach((ch, x) => { if (ch !== '.') rect(c, x * scale, y * scale, scale, scale, pal[ch]); });
        });
    });
}

function disc(c, cx, cy, r, col) {
    c.fillStyle = col;
    for (let y = -r; y <= r; y++) {
        const hw = Math.floor(Math.sqrt(r * r - y * y) + 0.5);
        c.fillRect(cx - hw, cy + y, hw * 2 + 1, 1);
    }
}

function makeTextures(scene) {
    /* --- niebo: zachód słońca, pasmami (jak w makiecie) --- */
    canvasTex(scene, 'sky', W, H, (c) => {
        const bands = [[20, 12, 48], [36, 20, 72], [60, 28, 92], [96, 36, 104], [140, 52, 96], [196, 84, 72], [236, 140, 60]];
        for (let y = 0; y < H; y++) {
            const b = bands[Math.min(bands.length - 1, Math.floor(y * bands.length / (H - 70)))];
            rect(c, 0, y, W, 1, rgb(...b));
        }
        let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let i = 0; i < 70; i++) {
            const bright = rnd() > 0.7;
            rect(c, Math.floor(rnd() * W), Math.floor(rnd() * 130), bright ? 2 : 1, bright ? 2 : 1, 'rgb(255,240,200)');
        }
        // słońce przy horyzoncie z poziomymi pasami (retro)
        disc(c, 420, 190, 42, 'rgb(255,214,90)');
        disc(c, 420, 190, 38, 'rgb(255,236,140)');
        for (let i = 0; i < 9; i++) rect(c, 376, 192 + i * 5, 88, 1 + Math.floor(i / 2), rgb(236, 140, 60));
    });

    /* --- warstwy wzgórz (kafelkowane poziomo: całkowita liczba okresów) --- */
    const hills = (key, color, base, fn) => canvasTex(scene, key, W, H, (c) => {
        c.fillStyle = color;
        for (let x = 0; x < W; x += 2) {
            const y = Math.round(fn(2 * Math.PI * x / W, x));
            c.fillRect(x, y, 2, H - y);
        }
    });
    hills('hills_far', rgb(98, 44, 104), 200, (t) =>
        220 - 40 * (0.65 * (1 - Math.abs(Math.sin(2 * t + 1))) + 0.35 * (1 - Math.abs(Math.sin(5 * t)))));
    hills('hills_mid', rgb(64, 34, 86), 228, (t) => 232 - 14 * Math.sin(3 * t + 2) - 8 * Math.sin(7 * t) - 4 * Math.sin(13 * t));
    hills('hills_near', rgb(40, 28, 62), 240, (t) => 244 - 8 * Math.sin(4 * t) - 5 * Math.sin(11 * t + 1) - 2 * Math.sin(23 * t));

    /* --- szutrowa droga --- */
    canvasTex(scene, 'gravel', 128, H - CFG.ROAD_TOP, (c, w, h) => {
        rect(c, 0, 0, w, h, rgb(120, 96, 72));
        rect(c, 0, 0, w, 3, rgb(70, 54, 40));
        rect(c, 0, 3, w, 2, rgb(96, 76, 56));
        let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        const cols = [rgb(90, 70, 52), rgb(150, 124, 96), rgb(170, 150, 120), rgb(104, 82, 60)];
        for (let i = 0; i < 260; i++) {
            const y = 6 + Math.floor(rnd() * (h - 6));
            const big = y > h * 0.55 && rnd() > 0.7;
            rect(c, Math.floor(rnd() * w), y, big ? 3 : 2, big ? 2 : 1 + Math.floor(rnd() * 2), cols[Math.floor(rnd() * cols.length)]);
        }
    });

    /* --- drzewa 16-bit w tle --- */
    const pine = (key, w, h, tiers) => canvasTex(scene, key, w, h, (c) => {
        const cx = Math.floor(w / 2);
        rect(c, cx - 2, h - 10, 4, 10, rgb(60, 36, 28));
        rect(c, cx - 2, h - 10, 1, 10, rgb(84, 52, 36));
        const th = Math.floor((h - 8) / tiers);
        for (let t = 0; t < tiers; t++) {
            const top = t * th * 0.85, bw = Math.floor((w / 2 - 1) * (0.45 + 0.55 * (t + 1) / tiers));
            for (let y = 0; y < th + 6; y++) {
                const half = Math.floor(bw * (y + 1) / (th + 6));
                const yy = Math.floor(top) + y;
                rect(c, cx - half, yy, half * 2 + 1, 1, rgb(22, 56, 52));
                rect(c, cx - half, yy, Math.max(1, Math.floor(half * 0.5)), 1, rgb(34, 84, 62));
                rect(c, cx + half - 1, yy, 2, 1, rgb(14, 36, 40));
            }
        }
    });
    pine('tree_pine_big', 38, 72, 4);
    pine('tree_pine_small', 26, 50, 3);
    canvasTex(scene, 'tree_oak', 46, 60, (c) => {
        rect(c, 20, 30, 6, 30, rgb(62, 38, 28));
        rect(c, 20, 30, 2, 30, rgb(90, 58, 38));
        rect(c, 24, 30, 2, 30, rgb(44, 26, 24));
        rect(c, 14, 40, 6, 2, rgb(62, 38, 28)); rect(c, 26, 36, 8, 2, rgb(62, 38, 28));
        const blobs = [[23, 16, 15], [12, 24, 10], [34, 24, 10], [23, 28, 11]];
        blobs.forEach(([x, y, r]) => disc(c, x, y, r, rgb(24, 62, 54)));
        blobs.forEach(([x, y, r]) => disc(c, x - 2, y - 2, r - 3, rgb(38, 94, 64)));
        [[18, 9, 5], [10, 19, 3], [28, 12, 3]].forEach(([x, y, r]) => disc(c, x, y, r, rgb(66, 130, 78)));
        [[30, 30, 3], [22, 34, 3]].forEach(([x, y, r]) => disc(c, x, y, r, rgb(16, 44, 44)));
    });

    /* --- beczka 12x14 (x2 = 24x28) --- */
    artTex(scene, 'barrel', [
        '..oooooooo..',
        '.ollllmmmmo.',
        'ommlmmmmdmmo',
        'hhhhhhhhhhhh',
        'bbbbbbbbbbbb',
        'ommlmmmmdmdo',
        'ommlmmmmdddo',
        'ommlmmmmdddo',
        'ommlmmmmdmdo',
        'hhhhhhhhhhhh',
        'bbbbbbbbbbbb',
        'ommlmmmmdmdo',
        '.odmmmmmddo.',
        '..oooooooo..',
    ], { o: '#2a1608', d: '#6b3a16', m: '#9a5a24', l: '#c98a44', b: '#3b3f52', h: '#8a92ae' }, 2);

    /* --- potworek 14x12 (x2 = 28x24), placeholder: zielony diablik --- */
    const MON_A = [
        '...y......y...',
        '...yy....yy...',
        '..oGGGGGGGGo..',
        '.oGGLLGGGGGGo.',
        'oGGLLGGGGGGGGo',
        'oGwrGGGGGGwrGo',
        'oGkkkkkkkkkkGo',
        'oGwkwkwkwkwkGo',
        'oGGGGGGGGGGGGo',
        '.oGGGGGGGGGGo.',
        '.ooGGGooGGGoo.',
        '..ooo....ooo..',
    ];
    const MON_B = MON_A.slice(0, 9).concat([
        '.oGGGGGGGGGGo.',
        '..oGGGooGGGo..',
        '...ooo..ooo...',
    ]);
    const monPal = { o: '#14301a', G: '#3f9a3a', L: '#8ee06a', w: '#ffffff', k: '#151515', y: '#f0c040', r: '#e03030' };
    const impPal = { o: '#3a0a0a', G: '#d03a24', L: '#ff8a5a', w: '#ffffff', k: '#151515', y: '#ffd040', r: '#ffe060' };
    artTex(scene, 'monster_1', MON_A, monPal, 2);
    artTex(scene, 'monster_2', MON_B, monPal, 2);
    artTex(scene, 'imp_1', MON_A, impPal, 2);
    artTex(scene, 'imp_2', MON_B, impPal, 2);

    /* --- nietoperz 14x9 (x2) --- */
    const batPal = { P: '#2a1040', p: '#6a3a9a', r: '#ff4040', w: '#ffffff' };
    artTex(scene, 'bat_1', [
        'P............P',
        'PP....PP....PP',
        'PPP..PppP..PPP',
        'PpPPPPppPPPPpP',
        '.PPPppppppPPP.',
        '..PPPprrpPPP..',
        '....PpppppP...',
        '.....PwPPwP...',
        '..............',
    ].map(r => r.padEnd(14, '.').slice(0, 14)), batPal, 2);
    artTex(scene, 'bat_2', [
        '..............',
        '..............',
        '..PP......PP..',
        '.PppP.PP.PppP.',
        'PpppPPppPPpppP',
        'PPPPPppppPPPPP',
        '.PPPPprrpPPPP.',
        '....PpppppP...',
        '.....PwPPwP...',
    ].map(r => r.padEnd(14, '.').slice(0, 14)), batPal, 2);

    /* --- krzyżyk Kamila (pocisk i ikona życia bossa) 7x10 (x2 = 14x20) --- */
    const crossRows = [
        '..ooo..',
        '..oyo..',
        'ooooyoo',
        'oyyyyyo',
        'ooooyoo',
        '..oyo..',
        '..oyo..',
        '..oyo..',
        '..oyo..',
        '..ooo..',
    ];
    artTex(scene, 'cross', crossRows, { o: '#5a3a00', y: '#ffe060' }, 2);
    artTex(scene, 'cross_empty', crossRows, { o: '#4a3a5a', y: '#2a1c3c' }, 2);
    canvasTex(scene, 'cross_glow', 30, 30, (c) => {
        disc(c, 15, 15, 14, 'rgba(255,224,96,0.18)');
        disc(c, 15, 15, 9, 'rgba(255,240,160,0.22)');
    });

    /* --- serduszko 9x8 (x2) --- */
    artTex(scene, 'heart', [
        '.ooo.ooo.',
        'orrrorrro',
        'orprrrrro',
        'orrrrrrro',
        '.orrrrro.',
        '..orrro..',
        '...oro...',
        '....o....',
    ], { o: '#4a0a14', r: '#e0202a', p: '#ff9aa8' }, 2);
    artTex(scene, 'heart_empty', [
        '.ooo.ooo.',
        'o...o...o',
        'o.......o',
        'o.......o',
        '.o.....o.',
        '..o...o..',
        '...o.o...',
        '....o....',
    ], { o: '#5a4a6a' }, 2);

    /* --- smuga miecza --- */
    canvasTex(scene, 'slash', 46, 52, (c) => {
        for (let y = 0; y < 52; y++) for (let x = 0; x < 46; x++) {
            const dx = x - 2, dy = y - 26, d = Math.sqrt(dx * dx + dy * dy), a = Math.atan2(dy, dx);
            if (d > 17 && d < 25 && Math.abs(a) < 1.15) {
                const t = (d - 17) / 8;
                rect(c, x, y, 1, 1, t > 0.7 ? 'rgb(255,255,255)' : t > 0.3 ? 'rgb(255,240,160)' : 'rgb(255,200,80)');
            }
        }
    });
    /* --- miecz (intro): ostrzem do góry, 13x47 --- */
    canvasTex(scene, 'sword', 13, 47, (c) => {
        rect(c, 6, 0, 1, 1, 'rgb(240,244,255)');
        rect(c, 5, 1, 3, 1, 'rgb(240,244,255)');
        rect(c, 5, 2, 3, 32, 'rgb(214,222,238)');
        rect(c, 5, 2, 1, 32, 'rgb(250,252,255)');
        rect(c, 7, 2, 1, 32, 'rgb(130,142,168)');
        rect(c, 6, 4, 1, 26, 'rgb(170,182,206)');
        rect(c, 1, 34, 11, 3, 'rgb(255,208,64)');
        rect(c, 1, 36, 11, 1, 'rgb(150,100,20)');
        rect(c, 5, 37, 3, 7, 'rgb(120,64,30)');
        rect(c, 5, 38, 1, 5, 'rgb(160,96,50)');
        rect(c, 4, 44, 5, 3, 'rgb(255,208,64)');
        rect(c, 4, 46, 5, 1, 'rgb(150,100,20)');
    });
    canvasTex(scene, 'dot', 3, 3, (c) => rect(c, 0, 0, 3, 3, '#fff'));

    /* --- przyciski dotykowe 44x44 --- */
    const btn = (key, icon) => canvasTex(scene, key, 44, 44, (c) => {
        disc(c, 22, 22, 22, 'rgb(255,208,64)');
        disc(c, 22, 22, 20, 'rgb(28,18,52)');
        disc(c, 22, 22, 18, 'rgb(52,34,96)');
        c.fillStyle = 'rgb(255,255,255)';
        icon(c);
    });
    const tri = (c, dir) => {
        for (let d = -9; d <= 9; d++) {
            const len = 14 - Math.round(Math.abs(d) * 14 / 10);
            if (len <= 0) continue;
            if (dir === 'L') c.fillRect(22 - 8 + Math.round(Math.abs(d) * 14 / 10), 22 + d, len, 1);
            if (dir === 'R') c.fillRect(22 + 8 - Math.round(Math.abs(d) * 14 / 10) - len + 1, 22 + d, len, 1);
        }
    };
    btn('btn_left', (c) => tri(c, 'L'));
    btn('btn_right', (c) => tri(c, 'R'));
    btn('btn_jump', (c) => {
        for (let r = 0; r < 11; r++) c.fillRect(22 - r, 11 + r, r * 2 + 1, 1);
        c.fillRect(19, 22, 7, 11);
    });
    btn('btn_attack', (c) => {
        for (let i = 0; i < 20; i++) c.fillRect(11 + i, 31 - i, 3, 3);   // ostrze po przekątnej
        c.fillStyle = 'rgb(255,208,64)';
        for (let i = 0; i < 9; i++) c.fillRect(12 + i, 20 + i, 3, 3);     // jelec
        c.fillRect(10, 32, 5, 5);                                          // rękojeść
    });
}

/* =====================================================================
   TŁO (wspólne dla ekranu powitalnego i poziomu)
   ===================================================================== */
function buildBackground(scene) {
    const bg = { layers: [] };
    scene.add.image(0, 0, 'sky').setOrigin(0).setScrollFactor(0).setDepth(0);
    [['hills_far', CFG.PARALLAX_FAR, 1], ['hills_mid', CFG.PARALLAX_MID, 2], ['hills_near', CFG.PARALLAX_NEAR, 3]].forEach(([key, f, d]) => {
        bg.layers.push({ f, spr: scene.add.tileSprite(0, 0, W, H, key).setOrigin(0).setScrollFactor(0).setDepth(d) });
    });
    bg.trees = [];
    bg.nextTreeX = 40;      // następne drzewo na prawo (przestrzeń tła)
    bg.leftTreeX = 40;      // następne drzewo na lewo (intro przewija tło w drugą stronę)
    bg.ground = scene.add.tileSprite(0, CFG.ROAD_TOP, W, H - CFG.ROAD_TOP, 'gravel').setOrigin(0).setScrollFactor(0).setDepth(4);
    bg.layers.push({ f: 1, spr: bg.ground });
    const kinds = ['tree_pine_big', 'tree_pine_small', 'tree_oak'];
    const addTree = (x) => {
        const key = kinds[Math.floor(Math.random() * kinds.length)];
        const spr = scene.add.image(0, CFG.ROAD_TOP + 3, key).setOrigin(0.5, 1).setScrollFactor(0).setDepth(3.5);
        bg.trees.push({ spr, x });
    };
    const gap = () => Phaser.Math.Between(CFG.TREE_GAP_MIN, CFG.TREE_GAP_MAX);
    bg.update = (camX) => {
        const cx = Math.floor(camX);
        bg.layers.forEach(l => { l.spr.tilePositionX = Math.floor(cx * l.f); });
        // drzewa: co jakiś czas przesuwają się w tle (paralaksa)
        const px = camX * CFG.PARALLAX_TREES;
        while (bg.nextTreeX < px + W + 60) { addTree(bg.nextTreeX); bg.nextTreeX += gap(); }
        while (bg.leftTreeX > px - 60) { bg.leftTreeX -= gap(); addTree(bg.leftTreeX); }
        for (let i = bg.trees.length - 1; i >= 0; i--) {
            const t = bg.trees[i], sx = Math.round(t.x - px);
            if (sx < -70 || sx > W + 70) { t.spr.destroy(); bg.trees.splice(i, 1); } else t.spr.x = sx;
        }
    };
    return bg;
}

/** Czerwony przycisk w stylu makiety. Zwraca kontener-obiekt z .hit (zone). */
function makeButton(scene, cx, y, w, h, label, onClick, depth) {
    const d = depth || 10;
    const x = Math.round(cx - w / 2);
    const parts = [
        scene.add.rectangle(x, y, w, h, 0x8c1e14).setOrigin(0),
        scene.add.rectangle(x + 2, y + 2, w - 4, h - 4, 0xc83020).setOrigin(0),
        scene.add.rectangle(x + 2, y + 2, w - 4, 3, 0xe85a40).setOrigin(0),
        pxText(scene, cx, y + Math.round((h - 14) / 2), label, { scale: 2, color: '#ffffff', shadow: '#500a0a' }),
    ];
    const arrow = scene.add.triangle(0, 0, 0, 0, 0, 12, 8, 6, 0xffd040).setOrigin(0).setPosition(x - 16, y + Math.round(h / 2) - 6);
    parts.push(arrow);
    parts.forEach(p => p.setDepth(d).setScrollFactor(0));
    scene.tweens.add({ targets: arrow, x: x - 12, duration: 350, yoyo: true, repeat: -1 });
    const hit = scene.add.zone(x - 18, y - 6, w + 36, h + 12).setOrigin(0).setScrollFactor(0).setDepth(d).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', onClick);
    hit.on('pointerover', () => parts[1].setFillStyle(0xdc4030));
    hit.on('pointerout', () => parts[1].setFillStyle(0xc83020));
    return { parts, hit };
}

/** Samochód Kamila zmniejszony wygładzonym skalowaniem do nowych tekstur (ostre piksele przy skali 1:1). */
function makeCar(scene, cs) {
    const keys = [1, 2].map(n => {
        const key = `car_${n}_s${cs}`;
        if (!scene.textures.exists(key)) {
            const src = scene.textures.get('car_' + n).getSourceImage();
            const tex = scene.textures.createCanvas(key, Math.round(src.width * cs), Math.round(src.height * cs));
            const c = tex.getContext();
            c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
            c.drawImage(src, 0, 0, tex.width, tex.height);
            tex.refresh();
        }
        return key;
    });
    if (!scene.anims.exists('car_drive_s')) {
        scene.anims.create({ key: 'car_drive_s', frameRate: 8, repeat: -1, frames: keys.map(key => ({ key })) });
    }
    return { keys, half: Math.round(109.5 * cs) };
}

/* =====================================================================
   BOOT - wczytanie grafik + tekstur generowanych
   ===================================================================== */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        this.cameras.main.setBackgroundColor('#0c0818');
        const names = ['arek_run_1', 'arek_run_2', 'arek_run_3', 'arek_jump', 'arek_attack', 'fibi_face', 'car_1', 'car_2', 'arek_casual_run_1', 'arek_casual_run_2', 'arek_casual_run_3', 'arek_casual_stand', 'fibi_walk_1', 'fibi_walk_2', 'fibi_stand', 'kamil_stand', 'kamil_walk_1', 'kamil_walk_2'];
        names.forEach(n => {
            // data-URI (assets/game/assets.js) działa też z file://; fallback: zwykłe pliki
            const src = (window.AREK_ASSETS && window.AREK_ASSETS[n]) || `assets/game/${n}.png`;
            this.load.image(n, src);
        });
    }
    create() {
        makeTextures(this);
        this.anims.create({
            // ping-pong 1-2-3-2: pozy "wykrok" (1,3) przeplatane pozą "mijanie" (2) - bez skoku 3->1
            key: 'run', frameRate: CFG.RUN_FPS, repeat: -1,
            frames: ['arek_run_1', 'arek_run_2', 'arek_run_3', 'arek_run_2'].map(key => ({ key })),
        });
        this.anims.create({
            key: 'casual_run', frameRate: CFG.RUN_FPS, repeat: -1,
            frames: ['arek_casual_run_1', 'arek_casual_run_2', 'arek_casual_run_3', 'arek_casual_run_2'].map(key => ({ key })),
        });
        // spacer: krok (casual_run_2: stopy na ziemi) na przemian z pozą stojącą (mijanie nóg) - bez fazy lotu jak w biegu
        this.anims.create({
            key: 'casual_walk', frameRate: CFG.WALK_FPS, repeat: -1,
            frames: ['arek_casual_run_2', 'arek_casual_stand', 'arek_casual_run_2', 'arek_casual_stand'].map(key => ({ key })),
        });
        this.anims.create({ key: 'car_drive', frameRate: 8, repeat: -1, frames: [{ key: 'car_1' }, { key: 'car_2' }] });
        this.anims.create({ key: 'dog_walk', frameRate: 4, repeat: -1, frames: [{ key: 'fibi_walk_1' }, { key: 'fibi_walk_2' }] });
        this.anims.create({ key: 'dog_run', frameRate: 12, repeat: -1, frames: [{ key: 'fibi_walk_1' }, { key: 'fibi_walk_2' }] });
        this.anims.create({ key: 'kamil_walk', frameRate: 6, repeat: -1, frames: [{ key: 'kamil_walk_1' }, { key: 'kamil_walk_2' }] });
        this.anims.create({ key: 'imp_run', frameRate: 9, repeat: -1, frames: [{ key: 'imp_1' }, { key: 'imp_2' }] });
        this.anims.create({ key: 'bat_fly', frameRate: 7, repeat: -1, frames: [{ key: 'bat_1' }, { key: 'bat_2' }] });
        this.anims.create({ key: 'monster_walk', frameRate: 4, repeat: -1, frames: [{ key: 'monster_1' }, { key: 'monster_2' }] });
        this.scene.start('Title');
    }
}

/* =====================================================================
   EKRAN POWITALNY:  FIBI [portret] RUN  +  START NEW GAME
   ===================================================================== */
class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        this.t = 0;
        this.bg = buildBackground(this);
        const face = this.textures.get('fibi_face').getSourceImage();
        const fw = face.width, fh = face.height;
        const fx = Math.round((W - fw) / 2), fy = 36 + Math.round((170 - fh) / 2);   // środek jak dla portretu 170 px
        // ramka złoto-czerwona
        this.add.rectangle(fx - 4, fy - 4, fw + 8, fh + 8, 0x8c1e14).setOrigin(0).setDepth(6);
        this.add.rectangle(fx - 2, fy - 2, fw + 4, fh + 4, 0xffd040).setOrigin(0).setDepth(6);
        this.add.rectangle(fx, fy, fw, fh, 0x1e163c).setOrigin(0).setDepth(6);
        this.add.image(fx, fy, 'fibi_face').setOrigin(0).setDepth(7);
        const ty = fy + Math.round(fh / 2) - 21;
        const big = { scale: 6, color: '#ffd040', shadow: '#8c1e14' };
        pxText(this, Math.round((fx - 6) / 2), ty, 'FIBI', big).setDepth(7);
        pxText(this, Math.round((fx + fw + 6 + W) / 2), ty, 'RUN', big).setDepth(7);

        const start = () => {
            if (this.starting) return;
            this.starting = true;
            this.cameras.main.fadeOut(180, 12, 8, 24);
            const next = /[?&]nointro\b/.test(location.search) ? 'Play' : 'Intro';
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(next));
        };
        makeButton(this, W / 2, 232, 220, 26, 'START NEW GAME', start, 8);
        const hint = IS_TOUCH ? 'TAP TO START' : 'SPACE OR ENTER';
        pxText(this, W / 2, 268, hint, { scale: 1, color: '#f0d8a0', shadow: '#2a1608' }).setDepth(8);
        if (!IS_TOUCH) {
            pxText(this, W / 2, 302, '< > SPEED   SPACE JUMP   ALT SWORD', { scale: 1, color: '#f0d8a0', shadow: '#2a1608' }).setDepth(8);
        }
        const kb = this.input.keyboard;
        kb.addKeys('SPACE,ENTER', true);
        kb.on('keydown-SPACE', start);
        kb.on('keydown-ENTER', start);
        this.cameras.main.fadeIn(200, 12, 8, 24);
    }
    update(time, delta) {
        this.t += delta / 1000;
        this.bg.update(this.t * 40);
    }
}

/* =====================================================================
   INTRO: Arek (casual, bez zbroi) spaceruje w lewo z Fibi, przejeżdża ksiądz Kamil,
   pies ucieka, Arek wyciąga zza pleców miecz, unosi go, piorun z nieba -> przemiana
   w Arka w zbroi i bieg w prawo -> poziom 1
   ===================================================================== */
class IntroScene extends Phaser.Scene {
    constructor() { super('Intro'); }

    create() {
        this.t = 0;
        this.camX = 0;
        this.scroll = -CFG.INTRO_WALK_SPEED;   // tło jedzie w prawo = Arek idzie w lewo
        this.phase = 'walk';
        this.phaseT = 0;
        this.finished = false;
        this.dogVx = 0;
        this.boltT = 0;
        this.bg = buildBackground(this);

        const ax = CFG.INTRO_AREK_X, gy = CFG.GROUND_Y;
        this.arek = this.add.sprite(ax, gy, 'arek_casual_run_1').setOrigin(0.5, 1).setDepth(6).setFlipX(true);
        this.arek.play('casual_walk');         // powolny spacer (tempo dopasowane do przesuwania tła w update)
        this.dog = this.add.sprite(ax + CFG.INTRO_DOG_DIST, gy + 1, 'fibi_stand').setOrigin(0.5, 1).setDepth(6).setFlipX(true);
        this.dog.play('dog_walk');

        const carInfo = makeCar(this, CFG.INTRO_CAR_SCALE);
        this.carHalf = carInfo.half;    // połowa szerokości auta
        this.car = this.add.sprite(-this.carHalf - 20, CFG.INTRO_CAR_BOTTOM, carInfo.keys[0]).setOrigin(0.5, 1).setDepth(4.8).setVisible(false);
        this.car.play('car_drive_s');

        this.leash = this.add.graphics().setDepth(6.5);
        this.leashState = 'taut';              // 'taut' -> 'hang' po zerwaniu -> 'gone'

        // miecz zza pleców + ramię, burza (przyciemnienie), piorun i błysk
        this.sword = this.add.image(0, 0, 'sword').setOrigin(0.5, 0.85).setDepth(5.9).setVisible(false);
        this.armG = this.add.graphics().setDepth(6.6);
        this.dim = this.add.rectangle(0, 0, W, H, 0x0a0620).setOrigin(0).setDepth(4.9).setAlpha(0);
        this.boltG = this.add.graphics().setDepth(18);
        this.flashRect = this.add.rectangle(0, 0, W, H, 0xffffff).setOrigin(0).setDepth(19).setAlpha(0);

        // podpowiedź i pomijanie (Spacja / Enter / tap)
        const hint = IS_TOUCH ? 'TAP - SKIP' : 'SPACE - SKIP';
        pxText(this, W - 8, 8, hint, { scale: 2, color: '#ffffff', shadow: '#2a1040', ox: 1 }).setDepth(20).setAlpha(0.85);
        const kb = this.input.keyboard;
        kb.addKeys('SPACE,ENTER', true);
        const skip = () => { if (this.t > CFG.INTRO_SKIP_GUARD) this.finish(); };
        kb.on('keydown-SPACE', skip);
        kb.on('keydown-ENTER', skip);
        this.input.on('pointerdown', skip);
        this.cameras.main.fadeIn(250, 12, 8, 24);
    }

    bubble(x, y, str, color) {
        const t = pxText(this, x, y, str, { scale: 3, color: color || '#ffd040', shadow: '#3a1008' }).setDepth(9);
        this.tweens.add({ targets: t, y: y - 10, duration: 250, ease: 'Back.out' });
        this.tweens.add({ targets: t, alpha: 0, delay: 650, duration: 250, onComplete: () => t.destroy() });
    }

    setPhase(p) { this.phase = p; this.phaseT = 0; }

    update(time, delta) {
        if (this.finished) return;
        const dt = Math.min(delta, 50) / 1000;
        this.t += dt; this.phaseT += dt;
        const arek = this.arek, dog = this.dog, car = this.car, gy = CFG.GROUND_Y;
        const P = this.phaseT;

        // --- samochód ---
        if (this.t >= CFG.INTRO_CAR_START && car.x < W + this.carHalf + 20) {
            car.setVisible(true);
            car.x += CFG.INTRO_CAR_SPEED * dt;
            car.y = CFG.INTRO_CAR_BOTTOM - (Math.floor(this.t * 16) % 2);   // drgania silnika
        }
        const carFront = car.x + this.carHalf - 8;

        // --- fazy ---
        if (this.phase === 'walk') {
            dog.y = gy + 1 - (Math.floor(this.t * 5) % 2);
            if (car.visible && carFront > dog.x - 70) {          // auto tuż obok psa -> pies się płoszy
                this.setPhase('scare');
                dog.anims.stop(); dog.setTexture('fibi_stand');
                this.bubble(dog.x, dog.y - 36, '!', '#ff5050');
                this.tweens.add({ targets: dog, y: gy + 1 - 12, duration: 120, yoyo: true, repeat: 1 });
            }
        } else if (this.phase === 'scare') {
            dog.x += Math.sin(this.t * 90) * 0.6;                 // dygocze
            if (P >= CFG.INTRO_SCARE_TIME) {                      // smycz pęka, pies w nogi
                this.setPhase('turn');
                this.leashState = 'hang';
                this.leashSnapT = 0;
                this.burst(dog.x - 8, dog.y - 17, 0xe0c080);
                dog.setFlipX(false); dog.play('dog_run'); dog.y = gy + 1;
                this.dogVx = 40;
                arek.anims.stop();                                // Arek staje
                arek.setTexture('arek_casual_stand');
                this.bubble(arek.x, arek.y - 74, '?!', '#ffffff');
            }
        } else if (this.phase === 'turn') {
            if (P > CFG.INTRO_TURN_TIME * 0.5) arek.setFlipX(false);   // odwraca się w prawo, za psem
            if (P >= CFG.INTRO_TURN_TIME) {
                this.setPhase('sword');
                this.leashState = 'gone';
                this.sword.setVisible(true);
                this.tweens.add({ targets: this.dim, alpha: 0.5, duration: (CFG.INTRO_SWORD_TIME + CFG.INTRO_HOLD_TIME) * 1000 });
            }
        } else if (this.phase === 'sword') {
            if (P >= CFG.INTRO_SWORD_TIME) this.setPhase('hold');
        } else if (this.phase === 'hold') {
            if (P >= CFG.INTRO_HOLD_TIME) {
                this.setPhase('strike');
                this.strike();
            }
        } else if (this.phase === 'strike') {
            if (P >= CFG.INTRO_STRIKE_TIME) {
                this.setPhase('transform');
                this.boltG.clear();
                this.transformStart();
            }
        } else if (this.phase === 'transform') {
            this.transformUpdate(P);
            if (P >= CFG.INTRO_TRANSFORM_TIME) {
                this.setPhase('chase');
                arek.setScale(1).clearTint();
                arek.play('run'); arek.anims.timeScale = 1;
            }
        } else if (this.phase === 'chase') {
            if (P >= CFG.INTRO_CHASE_TIME) this.finish();
        }

        // --- miecz: wyciągany zza pleców i unoszony nad głowę ---
        this.updateSword();

        // --- piorun (migotanie) ---
        if (this.phase === 'strike') {
            this.boltT -= dt;
            if (this.boltT <= 0) { this.boltT = 0.06; this.drawBolt(); }
        }

        // --- pies ucieka w prawo ---
        if (this.dogVx > 0) {
            this.dogVx = Math.min(CFG.INTRO_DOG_SPEED, this.dogVx + 300 * dt);
            dog.x += this.dogVx * dt;
            if (dog.x > W + 40) dog.setVisible(false);
        }

        // --- przewijanie tła: spacer w lewo -> stop -> (burza) -> bieg w prawo ---
        let target = -CFG.INTRO_WALK_SPEED;
        if (['turn', 'sword', 'hold', 'strike', 'transform'].includes(this.phase)) target = 0;
        if (this.phase === 'chase') target = CFG.SCROLL_SPEED;
        if (this.phase === 'scare') target = -CFG.INTRO_WALK_SPEED * 0.4;
        this.scroll += (target - this.scroll) * Math.min(1, dt * 5);
        this.camX += this.scroll * dt;
        if (this.phase === 'walk' || this.phase === 'scare') this.arek.anims.timeScale = Math.max(0.2, Math.abs(this.scroll) / CFG.INTRO_WALK_SPEED);   // kroki zgrane z tłem
        this.bg.update(this.camX);

        this.drawLeash(dt);
    }

    /** Pozycja rękojeści miecza względem Arka (stóp): zza pleców -> przed siebie -> nad głowę. */
    swordPose() {
        const keys = [   // [p, dx, dy, kąt°]
            [0.00, -5, -30, -62], [0.35, -1, -44, -35], [0.60, 5, -52, -10], [1.00, 9, -70, 0],
        ];
        const p = Phaser.Math.Clamp(this.phase === 'sword' ? this.phaseT / CFG.INTRO_SWORD_TIME : 1, 0, 1);
        let k = 1; while (k < keys.length - 1 && p > keys[k][0]) k++;
        const A = keys[k - 1], B = keys[k], u = Phaser.Math.Clamp((p - A[0]) / (B[0] - A[0]), 0, 1);
        const e = u * u * (3 - 2 * u);
        return { dx: A[1] + (B[1] - A[1]) * e, dy: A[2] + (B[2] - A[2]) * e, ang: A[3] + (B[3] - A[3]) * e, p };
    }
    updateSword() {
        const g = this.armG, sw = this.sword, arek = this.arek;
        g.clear();
        if (!sw.visible) return;
        const pose = this.swordPose();
        const hx = arek.x + pose.dx, hy = arek.y + pose.dy;
        sw.setPosition(Math.round(hx), Math.round(hy)).setAngle(pose.ang);
        sw.setDepth(pose.p < 0.3 ? 5.9 : 6.2);                    // najpierw zza pleców, potem przed Arkiem
        if (this.phase === 'hold' || this.phase === 'strike') sw.y += Math.round(Math.sin(this.t * 60));   // drży
        // ramię: od barku do rękojeści (3 px, kolor skóry)
        if (pose.p >= 0.25) {
            const sx = arek.x + 3, sy = arek.y - 40;
            for (let i = 0; i <= 24; i++) {
                const u = i / 24, x = Math.round(sx + (hx - sx) * u), y = Math.round(sy + (hy - sy) * u);
                g.fillStyle(0xd98f5e, 1).fillRect(x - 1, y - 1, 3, 3);
            }
        }
        this.swordTip = { x: hx + Math.sin(Phaser.Math.DegToRad(pose.ang)) * 40, y: hy - Math.cos(Phaser.Math.DegToRad(pose.ang)) * 40 };
    }

    strike() {
        const cam = this.cameras.main;
        cam.flash(280, 255, 255, 255);
        cam.shake(450, 0.01);
        this.flashRect.setAlpha(0.9);
        this.tweens.add({ targets: this.flashRect, alpha: 0, duration: 200 });
        this.boltT = 0;
        this.drawBolt();
        this.sparkle(this.swordTip.x, this.swordTip.y, 14, [0xffffff, 0xbfe0ff, 0x6a8cff]);
    }
    drawBolt() {
        const g = this.boltG, tip = this.swordTip;
        g.clear();
        const pts = [[Phaser.Math.Between(-20, 20) + tip.x, -4]];
        const n = Math.ceil(tip.y / 18);
        for (let i = 1; i <= n; i++) {
            const y = Math.min(tip.y, i * 18), j = 1 - i / n;
            pts.push([i === n ? tip.x : tip.x + (Math.random() - 0.5) * 46 * j + (Math.random() - 0.5) * 6, y]);
        }
        const draw = (path, w, col, al) => {
            g.fillStyle(col, al);
            for (let i = 1; i < path.length; i++) {
                const [x0, y0] = path[i - 1], [x1, y1] = path[i], steps = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
                for (let k = 0; k <= steps; k++) {
                    const u = k / steps;
                    g.fillRect(Math.round(x0 + (x1 - x0) * u - w / 2), Math.round(y0 + (y1 - y0) * u), w, 2);
                }
            }
        };
        // gałązka pioruna
        const m = pts[Math.floor(pts.length / 2)], br = [m, [m[0] + (Math.random() < 0.5 ? -26 : 26), m[1] + 26], [m[0] + (Math.random() < 0.5 ? -34 : 34), m[1] + 48]];
        [pts, br].forEach((path, idx) => {
            const k = idx ? 0.6 : 1;
            draw(path, Math.round(11 * k), 0x4a6cff, 0.4);
            draw(path, Math.round(6 * k), 0xbfe0ff, 0.85);
            draw(path, Math.max(2, Math.round(3 * k)), 0xffffff, 1);
        });
        // błysk w miejscu uderzenia
        g.fillStyle(0xffffff, 0.9).fillRect(Math.round(tip.x) - 7, Math.round(tip.y) - 3, 14, 6);
        g.fillStyle(0xffffff, 0.5).fillRect(Math.round(tip.x) - 12, Math.round(tip.y) - 1, 24, 2);
    }

    sparkle(x, y, n, colors) {
        for (let i = 0; i < n; i++) {
            const d = this.add.image(x, y, 'dot').setTint(Phaser.Utils.Array.GetRandom(colors)).setDepth(17)
                .setScale(Math.random() < 0.35 ? 2 : 1);
            const ang = Math.random() * Math.PI * 2, r = 14 + Math.random() * 40;
            this.tweens.add({
                targets: d, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r - 14, alpha: 0,
                duration: 450 + Math.random() * 450, onComplete: () => d.destroy(),
            });
        }
    }

    transformStart() {
        this.arek.setTintFill(0xffffff);
        this.revealed = false;
        this.tweens.add({ targets: this.dim, alpha: 0, duration: 500 });
        this.tweens.add({ targets: this.sword, alpha: 0, duration: 250 });
    }
    transformUpdate(P) {
        const arek = this.arek, cx = arek.x, cy = arek.y - 30;
        if (Math.random() < 0.7) this.sparkle(cx + Phaser.Math.Between(-14, 14), cy + Phaser.Math.Between(-28, 28), 2, [0xffffff, 0xffd040, 0xfff0a0]);
        if (P < CFG.INTRO_TRANSFORM_TIME * 0.5) {
            // sylwetka miga biało między ubraniem a zbroją
            const alt = Math.floor(P * 16) % 2;
            arek.setTexture(alt ? 'arek_jump' : 'arek_casual_stand').setTintFill(0xffffff);
        } else if (!this.revealed) {
            this.revealed = true;                                   // odsłonięcie: złota zbroja
            arek.setTexture('arek_jump').clearTint().setScale(1.18);
            this.sword.setVisible(false);
            this.armG.clear();
            this.cameras.main.flash(220, 255, 240, 180);
            this.sparkle(cx, cy, 30, [0xffd040, 0xffffff, 0xff7040]);
            this.tweens.add({ targets: arek, scale: 1, duration: 260, ease: 'Back.out' });
        }
    }

    drawLeash(dt) {
        const g = this.leash, arek = this.arek, dog = this.dog;
        g.clear();
        if (this.leashState === 'gone') return;
        const hx = Math.round(arek.x + (arek.flipX ? 11 : -11)), hy = Math.round(arek.y - 25);
        const pts = [];
        const line = (x0, y0, x1, y1, sag) => {
            for (let i = 0; i <= 40; i++) {
                const u = i / 40;
                pts.push([Math.round(x0 + (x1 - x0) * u), Math.round(y0 + (y1 - y0) * u + Math.sin(Math.PI * u) * sag)]);
            }
        };
        if (this.leashState === 'taut') {
            const cx = Math.round(dog.x + (dog.flipX ? -9 : 9)), cy = Math.round(dog.y - 17);
            line(hx, hy, cx, cy, this.phase === 'scare' ? 1 : 7);
        } else {
            this.leashSnapT = (this.leashSnapT || 0) + dt;
            const sway = Math.sin(this.leashSnapT * 7) * 3 * Math.exp(-this.leashSnapT * 1.5);
            line(hx, hy, hx + 4 + sway, hy + 20, 1);    // urwana smycz zwisa z ręki
        }
        g.fillStyle(0x3a2410, 1);
        pts.forEach(([x, y]) => g.fillRect(x, y + 1, 1, 1));
        g.fillStyle(0xd8b070, 1);
        pts.forEach(([x, y]) => g.fillRect(x, y, 1, 1));
    }

    burst(x, y, tint) {
        for (let i = 0; i < 8; i++) {
            const d = this.add.image(x, y, 'dot').setTint(tint).setDepth(9);
            const ang = Math.random() * Math.PI * 2, r = 8 + Math.random() * 16;
            this.tweens.add({ targets: d, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r - 6, alpha: 0, duration: 400, onComplete: () => d.destroy() });
        }
    }

    finish() {
        if (this.finished) return;
        this.finished = true;
        this.cameras.main.fadeOut(220, 12, 8, 24);
        this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Play', { startX: CFG.INTRO_AREK_X }));
    }
}

/* =====================================================================
   POZIOM 1
   ===================================================================== */
class PlayScene extends Phaser.Scene {
    constructor() { super('Play'); }

    init(data) {
        this.startX = (data && data.startX) || 130;
        this.startLevel = (data && data.level) || 1;
    }

    /** Parametry poziomu (poziom 1: stałe CFG, poziom 2: CFG.LEVEL2). */
    levelParams(level) {
        if (level === 2) {
            const L = CFG.LEVEL2;
            return {
                level, goal: L.GOAL_SCORE, scroll: L.SCROLL_SPEED, normal: L.SPEED_NORMAL, slow: L.SPEED_SLOW, fast: L.SPEED_FAST,
                gapMin: L.GAP_MIN, gapMax: L.GAP_MAX, gapRamp: L.GAP_RAMP, monsterChance: L.MONSTER_CHANCE, mix: L.MONSTER_MIX,
                doubleChance: L.DOUBLE_BARREL_CHANCE, doubleMin: L.DOUBLE_MIN_SCORE, heartChance: L.HEART_CHANCE,
            };
        }
        return {
            level, goal: CFG.GOAL_SCORE, scroll: CFG.SCROLL_SPEED, normal: CFG.SPEED_NORMAL, slow: CFG.SPEED_SLOW, fast: CFG.SPEED_FAST,
            gapMin: CFG.GAP_MIN, gapMax: CFG.GAP_MAX, gapRamp: CFG.GAP_RAMP, monsterChance: CFG.MONSTER_CHANCE, mix: { ghoul: 1 },
            doubleChance: CFG.DOUBLE_BARREL_CHANCE, doubleMin: CFG.DOUBLE_MIN_SCORE, heartChance: CFG.HEART_CHANCE,
        };
    }

    create() {
        this.state = 'play';
        this.mode = 'run';          // 'run' | 'rush' | 'arrive' | 'boss' | 'bossend'
        this.level = this.startLevel;
        this.L = this.levelParams(this.level);
        this.camX = 0;
        this.scrollCur = this.L.scroll;
        this.clock = 0;
        this.score = 0;
        this.lives = CFG.START_LIVES;
        this.invuln = 0;
        this.jumpBuf = 0;
        this.attackT = 0;
        this.attackCd = 0;
        this.facing = 1;
        this.barrels = []; this.monsters = []; this.hearts = []; this.crosses = [];
        this.boss = null; this.fibi = null; this.car = null;
        this.spawning = true;
        this.nextObstacleX = CFG.FIRST_OBSTACLE_X;
        this.sinceHeart = 0;
        this.touch = { left: false, right: false };
        this.jumpQ = false; this.attackQ = false; this.enterQ = false; this.escQ = false;
        this.stats = { barrelsPassed: 0, monstersKilled: 0, bossHits: 0 };

        this.cameras.main.setBackgroundColor('#0c0818');
        this.bg = buildBackground(this);

        // --- Arek ---
        this.a = { x: this.startX, y: CFG.GROUND_Y, vy: 0, prevY: CFG.GROUND_Y, onGround: true };
        this.arek = this.add.sprite(this.a.x, this.a.y, 'arek_run_1').setOrigin(0.5, 1).setDepth(6);
        this.arek.play('run');
        this.pose = 'run';
        this.slash = this.add.image(0, 0, 'slash').setOrigin(0, 0.5).setDepth(7).setVisible(false);

        this.buildHud();
        this.buildInput();
        if (IS_TOUCH) this.buildTouchButtons();
        this.spawnAhead();

        if (this.level === 1) this.showBanner('LEVEL 1', `REACH ${this.L.goal} POINTS`);
        if (!IS_TOUCH) {
            this.hintTxt = pxText(this, W / 2, 292, '< > SPEED   SPACE JUMP   ALT SWORD', { scale: 2, color: '#ffffff', shadow: '#2a1608' })
                .setScrollFactor(0).setDepth(12);
            this.tweens.add({ targets: this.hintTxt, alpha: 0, delay: 5000, duration: 600 });
        }
        this.cameras.main.fadeIn(200, 12, 8, 24);
    }

    showBanner(title, sub) {
        const b = [
            pxText(this, W / 2, 84, title, { scale: 5, color: '#ffd040', shadow: '#8c1e14' }).setScrollFactor(0).setDepth(12),
            pxText(this, W / 2, 128, sub, { scale: 2, color: '#ffffff', shadow: '#2a1040' }).setScrollFactor(0).setDepth(12),
        ];
        this.tweens.add({ targets: b, alpha: 0, delay: 2200, duration: 600, onComplete: () => b.forEach(o => o.destroy()) });
    }

    /* ---------- HUD ---------- */
    buildHud() {
        this.heartImgs = [];
        for (let i = 0; i < CFG.MAX_LIVES; i++) {
            this.heartImgs.push(this.add.image(8 + i * 22, 8, 'heart').setOrigin(0).setScrollFactor(0).setDepth(10));
        }
        this.scoreTxt = pxText(this, W - 8, 8, this.scoreStr(), { scale: 2, color: '#ffd040', shadow: '#3a1008', ox: 1 })
            .setScrollFactor(0).setDepth(10);
        // pasek postępu do celu poziomu
        this.add.rectangle(W - 8 - 121, 25, 122, 8, 0xffd040).setOrigin(0).setScrollFactor(0).setDepth(10);
        this.add.rectangle(W - 8 - 120, 26, 120, 6, 0x1e0c30).setOrigin(0).setScrollFactor(0).setDepth(10);
        this.bar = this.add.rectangle(W - 8 - 119, 27, 1, 4, 0xffd040).setOrigin(0).setScrollFactor(0).setDepth(10);
        // życia bossa (3 krzyżyki, pokazywane w walce)
        this.bossHud = [pxText(this, W / 2, 6, 'KS. KAMIL', { scale: 1, color: '#ffe060', shadow: '#3a1008' }).setScrollFactor(0).setDepth(10)];
        for (let i = 0; i < CFG.BOSS_HP; i++) {
            this.bossHud.push(this.add.image(W / 2 + (i - (CFG.BOSS_HP - 1) / 2) * 20, 16, 'cross').setOrigin(0.5, 0).setScrollFactor(0).setDepth(10));
        }
        this.bossHud.forEach(o => o.setVisible(false));
        this.refreshHud();
    }
    scoreStr() { return 'SCORE ' + String(this.score).padStart(4, '0'); }
    refreshHud() {
        this.heartImgs.forEach((h, i) => {
            h.setTexture(i < this.lives ? 'heart' : 'heart_empty').setVisible(i < Math.max(this.lives, CFG.START_LIVES));
        });
        this.scoreTxt.setString(this.scoreStr());
        this.bar.width = Math.max(1, Math.round(118 * Math.min(1, this.score / this.L.goal)));
        if (this.boss) this.bossHud.slice(1).forEach((c, i) => c.setTexture(i < this.boss.hp ? 'cross' : 'cross_empty'));
    }

    /* ---------- sterowanie ---------- */
    buildInput() {
        const KC = Phaser.Input.Keyboard.KeyCodes;
        const kb = this.input.keyboard;
        this.keys = kb.addKeys({
            left: KC.LEFT, right: KC.RIGHT, a: KC.A, d: KC.D,
            jump: KC.SPACE, up: KC.UP, w: KC.W,
            attack: KC.ALT, attackX: KC.X, attackZ: KC.Z,
            enter: KC.ENTER, esc: KC.ESC,
        }, true);
        // zdarzenia keydown (a nie JustDown) - nie giną przy bardzo krótkim naciśnięciu klawisza
        ['SPACE', 'UP', 'W'].forEach(n => kb.on('keydown-' + n, () => { this.jumpQ = true; }));
        ['ALT', 'X', 'Z'].forEach(n => kb.on('keydown-' + n, () => { this.attackQ = true; }));
        kb.on('keydown-ENTER', () => { this.enterQ = true; });
        kb.on('keydown-ESC', () => { this.escQ = true; });
        this.input.addPointer(3);   // multi-touch
    }

    buildTouchButtons() {
        this.buttons = [];
        const add = (name, tex, x, y) => {
            const img = this.add.image(x, y, tex).setScrollFactor(0).setDepth(15).setAlpha(0.55);
            const zone = this.add.zone(x, y, 62, 62).setScrollFactor(0).setDepth(16).setInteractive();
            const b = { name, img, ids: new Set() };
            const sync = () => {
                const on = b.ids.size > 0;
                if (name === 'left' || name === 'right') this.touch[name] = on;
                img.setAlpha(on ? 0.95 : 0.55).setScale(on ? 0.92 : 1);
            };
            b.sync = sync;
            zone.on('pointerdown', (p) => {
                b.ids.add(p.id); sync();
                if (name === 'jump') this.jumpQ = true;
                if (name === 'attack') this.attackQ = true;
            });
            zone.on('pointerover', (p) => { if (p.isDown && (name === 'left' || name === 'right')) { b.ids.add(p.id); sync(); } });
            zone.on('pointerout', (p) => { b.ids.delete(p.id); sync(); });
            this.buttons.push(b);
        };
        add('left', 'btn_left', 32, 290);
        add('right', 'btn_right', 86, 290);
        add('attack', 'btn_attack', W - 86, 290);
        add('jump', 'btn_jump', W - 32, 290);
        this.input.on('pointerup', (p) => this.buttons.forEach(b => { b.ids.delete(p.id); b.sync(); }));
    }

    /* ---------- spawn ---------- */
    spawnAhead() {
        if (!this.spawning) return;
        const L = this.L;
        while (this.nextObstacleX < this.camX + W + 100) {
            const x = this.nextObstacleX;
            const first = this.barrels.length + this.monsters.length === 0 && x === CFG.FIRST_OBSTACLE_X;
            if (!first && Math.random() < L.monsterChance) this.spawnMonster(x, this.pickMonsterType());
            else if (!first && this.score >= L.doubleMin && Math.random() < L.doubleChance) {
                this.spawnBarrels(x, Math.random() < CFG.STACK_SHARE ? 'stack' : 'pair');
            } else this.spawnBarrels(x, 'single');
            this.sinceHeart++;
            const ramp = 1 - L.gapRamp * Math.min(1, this.score / L.goal);
            const gap = Phaser.Math.Between(L.gapMin, L.gapMax) * ramp;
            if (Math.random() < L.heartChance || this.sinceHeart >= CFG.HEART_GUARANTEE) {
                this.spawnHeart(x + gap / 2);
                this.sinceHeart = 0;
            }
            this.nextObstacleX += Math.max(gap, 200);
        }
    }
    pickMonsterType() {
        const mix = this.L.mix, r = Math.random();
        let acc = 0;
        for (const [type, w] of Object.entries(mix)) { acc += w; if (r < acc) return type; }
        return 'ghoul';
    }
    /** Beczki jako grupa: 'single', 'pair' (dwie obok siebie) albo 'stack' (jedna na drugiej).
        Punkty (POINTS_BARREL za każdą beczkę) dostaje się za całą grupę po jej przeskoczeniu. */
    spawnBarrels(x, kind) {
        const grp = { members: [], touched: false, scored: false };
        const parts = kind === 'pair' ? [[0, 0], [CFG.PAIR_SPACING, 0]] : kind === 'stack' ? [[0, 0], [0, 1]] : [[0, 0]];
        parts.forEach(([dx, lvl]) => {
            const s = this.add.image(x + dx, CFG.GROUND_Y + 2 - lvl * CFG.STACK_STEP, 'barrel').setOrigin(0.5, 1).setDepth(5 + lvl * 0.1);
            const b = { s, wx: x + dx, hw: 9, h: 24, lvl, passed: false, grp };
            grp.members.push(b); this.barrels.push(b);
        });
        grp.kind = kind;
    }
    /** Potworki: 'ghoul' (zielony, wolny), 'imp' (czerwony, szybki), 'bat' (nietoperz, lata). */
    spawnMonster(x, type) {
        type = type || 'ghoul';
        const tex = { ghoul: 'monster_1', imp: 'imp_1', bat: 'bat_1' }[type];
        const s = this.add.sprite(x, type === 'bat' ? CFG.GROUND_Y - CFG.BAT_HEIGHT : CFG.GROUND_Y + 2, tex).setOrigin(0.5, 1).setDepth(5);
        s.play({ ghoul: 'monster_walk', imp: 'imp_run', bat: 'bat_fly' }[type]);
        const m = {
            s, type, wx: x, dead: false, ph: Math.random() * 6,
            hw: type === 'imp' ? 11 : type === 'bat' ? 12 : 11, h: type === 'bat' ? 14 : 20,
            speed: { ghoul: CFG.MONSTER_SPEED, imp: CFG.IMP_SPEED, bat: CFG.BAT_SPEED }[type],
            pts: { ghoul: CFG.POINTS_MONSTER, imp: CFG.POINTS_IMP, bat: CFG.POINTS_BAT }[type],
            cy: CFG.GROUND_Y - CFG.BAT_HEIGHT,
        };
        if (type === 'bat') s.setOrigin(0.5, 0.5);
        this.monsters.push(m);
    }
    spawnHeart(x) {
        const y = CFG.GROUND_Y - CFG.HEART_HEIGHT;
        const s = this.add.image(x, y, 'heart').setDepth(5);
        this.tweens.add({ targets: s, y: y - 4, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
        this.hearts.push({ s, wx: x, y, hw: 9, taken: false });
    }

    /* ---------- pomocnicze ---------- */
    popup(wx, y, str, color) {
        const t = pxText(this, wx, y, str, { scale: 2, color: color || '#ffffff', shadow: '#000000' }).setDepth(9);
        this.tweens.add({ targets: t, y: y - 26, alpha: 0, duration: 800, onComplete: () => t.destroy() });
    }
    burst(x, y, tint, n) {
        for (let i = 0; i < (n || 9); i++) {
            const d = this.add.image(x, y, 'dot').setTint(tint).setDepth(9);
            const ang = Math.random() * Math.PI * 2, r = 12 + Math.random() * 22;
            this.tweens.add({
                targets: d, x: x + Math.cos(ang) * r, y: y + Math.sin(ang) * r - 10, alpha: 0, duration: 450,
                onComplete: () => d.destroy(),
            });
        }
    }
    addScore(n, wx, y) {
        this.score += n;
        this.popup(wx, y, '+' + n, '#ffd040');
        this.refreshHud();
        this.tweens.add({ targets: this.scoreTxt, scale: 1.25, duration: 90, yoyo: true });
        if (this.score >= this.L.goal && this.mode === 'run') {
            if (this.level === 1) this.startRush(); else this.win();
        }
    }
    arekBox() {
        const a = this.a;
        return { l: a.x - 8, r: a.x + 8, t: a.y - 50, b: a.y - 2 };
    }
    static hit(A, B) { return A.l < B.r && A.r > B.l && A.t < B.b && A.b > B.t; }
    clearWorld(fade) {
        this.spawning = false;
        [...this.barrels, ...this.monsters, ...this.hearts].forEach(o => {
            this.tweens.killTweensOf(o.s);
            this.tweens.add({ targets: o.s, alpha: 0, duration: fade || 250, onComplete: () => o.s.destroy() });
        });
        this.barrels = []; this.monsters = []; this.hearts = [];
    }

    /* =================================================================
       PĘTLA
       ================================================================= */
    update(time, delta) {
        const dt = Math.min(delta, 50) / 1000;
        this.clock += dt;
        const k = this.keys;
        let jumpPress = this.jumpQ, attackPress = this.attackQ;
        const enterPress = this.enterQ, escPress = this.escQ;
        this.jumpQ = false; this.attackQ = false; this.enterQ = false; this.escQ = false;

        if (this.state !== 'play') {
            if (this.endReady && (jumpPress || enterPress)) this.scene.restart();
            else if (this.endReady && escPress) this.scene.start('Title');
            return;
        }

        const locked = this.mode === 'rush' || this.mode === 'arrive' || this.mode === 'bossend';
        if (locked) { jumpPress = false; attackPress = false; }
        const left = !locked && (k.left.isDown || k.a.isDown || this.touch.left);
        const right = !locked && (k.right.isDown || k.d.isDown || this.touch.right);
        const L = this.L;
        const a = this.a;
        a.prevY = a.y;

        // --- ruch poziomy Arka i kamera zależnie od trybu ---
        let animSpeed = 1;
        if (this.mode === 'run') {
            let v = L.normal;
            if (right && !left) v = L.fast; else if (left && !right) v = L.slow;
            this.scrollCur += (L.scroll - this.scrollCur) * Math.min(1, dt * 2.5);
            this.camX += this.scrollCur * dt;
            a.x += v * dt;
            animSpeed = v / CFG.SPEED_NORMAL;
        } else if (this.mode === 'rush') {
            this.rushT += dt;
            const u = Math.min(1, this.rushT / CFG.ARENA_RUSH_TIME), e = u * u * (3 - 2 * u);
            this.camX = this.rushFrom + CFG.ARENA_RUSH_DISTANCE * e;
            a.x = this.camX + this.rushSX0 + (CFG.ARENA_HERO_X - this.rushSX0) * e;
            animSpeed = 2.2;
            if (u >= 1) this.startArrive();
        } else if (this.mode === 'boss') {
            const dir = (right ? 1 : 0) - (left ? 1 : 0);
            a.x += dir * CFG.BOSS_HERO_SPEED * dt;
            if (dir) this.facing = dir;
            this.heroMoving = dir !== 0;
            animSpeed = Math.abs(dir) * CFG.BOSS_HERO_SPEED / CFG.SPEED_NORMAL;
        } else if (this.mode === 'bossend') {
            // po zwycięstwie: tło rusza dopiero gdy auto odjedzie (startLevel2 przełącza tryb)
            this.heroMoving = false;
        } else {
            this.heroMoving = false;
        }
        a.x = Phaser.Math.Clamp(a.x, this.camX + CFG.EDGE_MARGIN, this.camX + W - CFG.EDGE_MARGIN);
        if (this.mode === 'run' || this.mode === 'rush') this.facing = 1;

        // --- skok / grawitacja ---
        if (jumpPress) this.jumpBuf = CFG.JUMP_BUFFER; else this.jumpBuf = Math.max(0, this.jumpBuf - dt);
        if (this.jumpBuf > 0 && a.onGround) { a.vy = -CFG.JUMP_VELOCITY; a.onGround = false; this.jumpBuf = 0; }
        if (!a.onGround) {
            a.vy += CFG.GRAVITY * dt;
            a.y += a.vy * dt;
            if (a.y >= CFG.GROUND_Y) { a.y = CFG.GROUND_Y; a.vy = 0; a.onGround = true; }
        }

        // --- atak ---
        this.attackCd = Math.max(0, this.attackCd - dt);
        if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt);
        if (attackPress && this.attackCd <= 0) {
            this.attackT = CFG.ATTACK_TIME;
            this.attackCd = CFG.ATTACK_TIME + CFG.ATTACK_COOLDOWN;
        }
        const swordActive = this.attackT > 0 && this.attackT < CFG.ATTACK_TIME - 0.04;
        const sword = swordActive
            ? (this.facing > 0 ? { l: a.x, r: a.x + CFG.SWORD_REACH, t: a.y - 56, b: a.y } : { l: a.x - CFG.SWORD_REACH, r: a.x, t: a.y - 56, b: a.y })
            : null;
        const body = this.arekBox();

        // --- świat poziomu / boss ---
        if (this.mode === 'run') {
            this.spawnAhead();
            if (this.updateWorld(dt, body, sword) === false) return;
        } else if (this.mode === 'boss') {
            this.updateBoss(dt, body, sword);
            if (this.state !== 'play') return;
        }
        this.updateCrosses(dt, body, sword);
        if (this.state !== 'play') return;

        // --- nietykalność (miganie) ---
        if (this.invuln > 0) {
            this.invuln = Math.max(0, this.invuln - dt);
            this.arek.setAlpha(this.invuln < 10 && Math.floor(this.invuln * 12) % 2 ? 0.35 : 1);   // >10 s = ukryta nietykalność (przejścia)
        } else this.arek.setAlpha(1);

        // --- wygląd Arka ---
        const sx = Math.round(a.x), sy = Math.round(a.y);
        this.arek.setPosition(sx, sy).setFlipX(this.facing < 0);
        const idle = (this.mode === 'arrive' || this.mode === 'bossend' || (this.mode === 'boss' && !this.heroMoving));
        let pose = 'run';
        if (this.attackT > 0) pose = 'attack'; else if (!a.onGround) pose = 'jump'; else if (idle) pose = 'idle';
        if (pose !== this.pose) {
            this.pose = pose;
            if (pose === 'run') this.arek.play('run');
            else { this.arek.anims.stop(); this.arek.setTexture({ jump: 'arek_jump', attack: 'arek_attack', idle: 'arek_run_2' }[pose]); }   // idle (arena): poza "mijania", stopy na ziemi
        }
        if (pose === 'run') {
            this.arek.anims.timeScale = Phaser.Math.Clamp(animSpeed, CFG.RUN_TIMESCALE_MIN, CFG.RUN_TIMESCALE_MAX);   // kadencja ~ prędkość względem podłoża
        }
        this.slash.setVisible(this.attackT > CFG.ATTACK_TIME * 0.35)
            .setOrigin(this.facing > 0 ? 0 : 1, 0.5).setFlipX(this.facing < 0)
            .setPosition(sx + CFG.SLASH_OFFSET_X * this.facing, sy - 30);
        this.slash.setAlpha(Math.min(1, this.attackT / (CFG.ATTACK_TIME * 0.6)));

        // --- kamera i tło ---
        this.cameras.main.scrollX = Math.floor(this.camX);
        this.bg.update(this.camX);
    }

    /** Beczki, potworki, serduszka (tryb 'run'). Zwraca false, gdy scena przeszła w koniec gry. */
    updateWorld(dt, body, sword) {
        const a = this.a;
        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const m = this.monsters[i];
            if (m.dead) continue;
            m.wx -= m.speed * dt;
            let box;
            if (m.type === 'bat') {
                m.cy = CFG.GROUND_Y - CFG.BAT_HEIGHT + Math.sin(this.clock * 4 + m.ph) * CFG.BAT_WAVE;
                m.s.setPosition(Math.round(m.wx), Math.round(m.cy));
                box = { l: m.wx - m.hw, r: m.wx + m.hw, t: m.cy - m.h / 2, b: m.cy + m.h / 2 };
            } else {
                m.s.x = Math.round(m.wx);
                box = { l: m.wx - m.hw, r: m.wx + m.hw, t: CFG.GROUND_Y - m.h, b: CFG.GROUND_Y };
            }
            if (sword && PlayScene.hit(sword, box)) { this.killMonster(m); if (this.mode !== 'run') return true; continue; }
            if (PlayScene.hit(body, box)) this.hurt();
            if (m.wx < this.camX - 60) { m.s.destroy(); this.monsters.splice(i, 1); }
        }
        for (let i = this.barrels.length - 1; i >= 0; i--) {
            const b = this.barrels[i];
            const bot = CFG.GROUND_Y - b.lvl * CFG.STACK_STEP;
            const box = { l: b.wx - b.hw, r: b.wx + b.hw, t: bot - b.h, b: bot };
            if (PlayScene.hit(body, box)) { b.grp.touched = true; this.hurt(); }
            if (!b.passed && b.wx + b.hw < a.x - 8) b.passed = true;
            const g = b.grp;
            if (!g.scored && !g.touched && g.members.every(m => m.passed)) {
                g.scored = true;
                this.stats.barrelsPassed += g.members.length;
                this.addScore(CFG.POINTS_BARREL * g.members.length, a.x, a.y - 60);
                if (this.state !== 'play' || this.mode !== 'run') return this.state === 'play';
            }
            if (b.wx < this.camX - 60) { b.s.destroy(); this.barrels.splice(i, 1); }
        }
        for (let i = this.hearts.length - 1; i >= 0; i--) {
            const h = this.hearts[i];
            if (PlayScene.hit(body, { l: h.wx - h.hw, r: h.wx + h.hw, t: h.y - 8, b: h.y + 8 })) {
                this.lives = Math.min(CFG.MAX_LIVES, this.lives + 1);
                this.popup(h.wx, h.y - 10, '+1 LIFE', '#ff7080');
                this.burst(h.wx, h.y, 0xff4060);
                h.s.destroy(); this.tweens.killTweensOf(h.s); this.hearts.splice(i, 1);
                this.refreshHud();
            } else if (h.wx < this.camX - 40) { this.tweens.killTweensOf(h.s); h.s.destroy(); this.hearts.splice(i, 1); }
        }
        return this.state === 'play';
    }

    killMonster(m) {
        m.dead = true;
        this.stats.monstersKilled++;
        const s = m.s;
        s.anims.stop();
        s.setTint(0xffffff);
        const y = m.type === 'bat' ? m.cy : CFG.GROUND_Y - 12;
        this.burst(m.wx, y, { ghoul: 0x6ae04a, imp: 0xff6a40, bat: 0xb070ff }[m.type]);
        this.tweens.add({
            targets: s, y: s.y - 34, angle: 200, alpha: 0, duration: 450,
            onComplete: () => { s.destroy(); const i = this.monsters.indexOf(m); if (i >= 0) this.monsters.splice(i, 1); },
        });
        this.addScore(m.pts, m.wx, y - 38);
    }

    hurt() {
        if (this.invuln > 0 || this.state !== 'play') return;
        this.lives -= 1;
        this.refreshHud();
        this.cameras.main.shake(160, 0.012);
        this.cameras.main.flash(120, 255, 60, 60);
        if (this.lives <= 0) { this.gameOver(); return; }
        this.invuln = CFG.INVULN_TIME;
        this.popup(this.a.x, this.a.y - 62, '-1 LIFE', '#ff5050');
    }

    /* =================================================================
       KONIEC POZIOMU 1 -> PRZELOT EKRANU -> ARENA -> WALKA Z KAMILEM
       ================================================================= */
    startRush() {
        this.mode = 'rush';
        this.invuln = 99;                       // w trakcie przejścia nic nie rani
        this.clearWorld(250);
        this.rushT = 0;
        this.rushFrom = this.camX;
        this.rushSX0 = this.a.x - this.camX;
        this.arenaCamX = this.rushFrom + CFG.ARENA_RUSH_DISTANCE;
        this.popup(this.a.x, this.a.y - 70, 'LEVEL 1 CLEAR!', '#ffffff');
        // Fibi czeka na prawym końcu areny
        this.fibi = this.add.sprite(this.arenaCamX + W - 36, CFG.GROUND_Y + 1, 'fibi_stand').setOrigin(0.5, 1).setDepth(5.5).setFlipX(true);
        this.cameras.main.flash(160, 255, 255, 255);
    }

    startArrive() {
        this.mode = 'arrive';
        this.camX = this.arenaCamX;
        this.attackT = 0;
        this.invuln = 0.01;
        const info = makeCar(this, CFG.INTRO_CAR_SCALE);
        this.carHalf = info.half;
        const stopX = this.camX + W * CFG.ARENA_CAR_STOP;
        this.car = this.add.sprite(this.camX - this.carHalf - 30, CFG.INTRO_CAR_BOTTOM, info.keys[0]).setOrigin(0.5, 1).setDepth(4.8);
        this.car.play('car_drive_s');
        this.time.delayedCall(500, () => {
            this.tweens.add({
                targets: this.car, x: stopX, duration: CFG.ARENA_CAR_TIME * 1000, ease: 'Quad.out',
                onComplete: () => { this.car.anims.stop(); this.kamilGetsOut(); },
            });
        });
    }

    kamilGetsOut() {
        const car = this.car;
        const kx = car.x - 14;
        const s = this.add.sprite(kx, CFG.GROUND_Y, 'kamil_stand').setOrigin(0.5, 1).setDepth(6).setFlipX(true).setAlpha(0);
        this.boss = { s, x: kx, vx: 0, hp: CFG.BOSS_HP, invuln: 0, stun: 0, state: 'idle', stateT: 0.4, spellCd: 1.6, target: kx, face: -1, knock: 0, rage: false };
        this.time.delayedCall(450, () => {
            this.tweens.add({ targets: car, y: car.y - 2, duration: 80, yoyo: true, repeat: 1 });   // drzwi
            this.tweens.add({ targets: s, alpha: 1, y: CFG.GROUND_Y - 16, duration: 180, yoyo: true,
                onComplete: () => { s.y = CFG.GROUND_Y; } });
            this.time.delayedCall(420, () => {
                this.bossHud.forEach(o => o.setVisible(true));
                this.refreshHud();
                this.showBanner('BOSS FIGHT', 'KS. KAMIL');
                this.invuln = 0;
                this.mode = 'boss';
            });
        });
    }

    /* ---------- walka ---------- */
    kamilBox() {
        const b = this.boss;
        return { l: b.x - 11, r: b.x + 11, t: CFG.GROUND_Y - 58, b: CFG.GROUND_Y };
    }
    updateBoss(dt, body, sword) {
        const b = this.boss, a = this.a;
        if (!b || b.hp <= 0) return;
        b.invuln = Math.max(0, b.invuln - dt);
        b.stun = Math.max(0, b.stun - dt);
        const lost = CFG.BOSS_HP - b.hp;
        const speed = CFG.BOSS_SPEED * (1 + CFG.BOSS_RAGE_SPEED * lost);
        const minX = this.camX + 40, maxX = this.camX + W - 40;

        if (b.stun > 0) {
            b.x += b.knock * dt; b.knock *= Math.pow(0.02, dt);          // odskok po trafieniu
            b.s.anims.stop(); b.s.setTexture('kamil_stand');
        } else if (b.state === 'cast') {
            b.stateT -= dt;
            b.face = Math.sign(a.x - b.x) || b.face;
            const u = 1 - Math.max(0, b.stateT) / CFG.BOSS_SPELL_WINDUP;
            if (b.cross) b.cross.setPosition(Math.round(b.x), CFG.GROUND_Y - 78 - Math.round(u * 6)).setScale(1 + 0.6 * u);
            if (b.glow) b.glow.setPosition(Math.round(b.x), CFG.GROUND_Y - 78).setScale(1 + u * 1.2).setAlpha(0.5 + 0.5 * Math.sin(this.clock * 30));
            if (b.stateT <= 0) this.fireCross();
        } else {
            b.spellCd -= dt;
            if (b.state === 'idle') {
                b.stateT -= dt;
                b.s.anims.stop(); b.s.setTexture('kamil_stand');
                b.face = Math.sign(a.x - b.x) || b.face;
                if (b.spellCd <= 0) this.startCast();
                else if (b.stateT <= 0) {
                    // raz podchodzi do Arka, raz kręci się po arenie
                    b.target = Math.random() < 0.55 ? a.x + Phaser.Math.Between(-60, 60) : Phaser.Math.Between(minX, maxX);
                    b.target = Phaser.Math.Clamp(b.target, minX, maxX);
                    b.state = 'walk'; b.stateT = Phaser.Math.FloatBetween(1.0, 2.2);
                    b.s.play('kamil_walk');
                }
            } else if (b.state === 'walk') {
                b.stateT -= dt;
                const d = b.target - b.x;
                if (Math.abs(d) < 6 || b.stateT <= 0) { b.state = 'idle'; b.stateT = Phaser.Math.FloatBetween(0.3, 0.8); }
                else { b.face = Math.sign(d); b.x += b.face * speed * dt; }
                if (b.spellCd <= 0 && b.state === 'walk') this.startCast();
            }
        }
        b.x = Phaser.Math.Clamp(b.x, minX - 10, maxX + 10);
        b.s.setPosition(Math.round(b.x), CFG.GROUND_Y).setFlipX(b.face < 0);
        b.s.setAlpha(b.invuln > 0 ? (Math.floor(b.invuln * 14) % 2 ? 0.4 : 1) : 1);

        const kb = this.kamilBox();
        // miecz
        if (sword && b.invuln <= 0 && PlayScene.hit(sword, kb)) this.hitBoss(Math.sign(b.x - a.x) || 1);
        // dotyk: skok na głowę (stomp) albo obrażenia
        if (PlayScene.hit(body, kb)) {
            const stomp = a.vy > 30 && (a.prevY - 2) <= kb.t + 14;
            if (stomp) {
                if (b.invuln <= 0) this.hitBoss(Math.sign(b.x - a.x) || 1);
                a.vy = -CFG.STOMP_BOUNCE; a.onGround = false; a.y = kb.t - 3;
                this.burst(b.x, kb.t, 0xffffff, 6);
            } else if (b.stun <= 0) this.hurt();
        }
    }

    startCast() {
        const b = this.boss;
        b.state = 'cast'; b.stateT = CFG.BOSS_SPELL_WINDUP;
        b.s.anims.stop(); b.s.setTexture('kamil_stand');
        b.glow = this.add.image(b.x, CFG.GROUND_Y - 78, 'cross_glow').setDepth(8).setBlendMode(Phaser.BlendModes.ADD);
        b.cross = this.add.image(b.x, CFG.GROUND_Y - 78, 'cross').setDepth(8.5);
    }
    fireCross() {
        const b = this.boss, a = this.a;
        const dir = Math.sign(a.x - b.x) || (b.x < this.camX + W / 2 ? 1 : -1);
        const high = Math.random() < CFG.CROSS_HIGH_CHANCE;
        const cy = CFG.GROUND_Y - (high ? CFG.CROSS_HIGH_Y : CFG.CROSS_LOW_Y);
        if (b.cross) { b.cross.destroy(); b.cross = null; }
        if (b.glow) { b.glow.destroy(); b.glow = null; }
        const s = this.add.image(b.x + dir * 16, cy, 'cross').setDepth(7.5);
        const glow = this.add.image(s.x, cy, 'cross_glow').setDepth(7.4).setBlendMode(Phaser.BlendModes.ADD);
        this.crosses.push({ s, glow, wx: b.x + dir * 16, cy, vx: dir * CFG.CROSS_SPEED, high });
        this.burst(b.x + dir * 12, cy, 0xffe060, 8);
        const lost = CFG.BOSS_HP - b.hp;
        b.spellCd = Phaser.Math.FloatBetween(CFG.BOSS_SPELL_MIN, CFG.BOSS_SPELL_MAX) * (1 - 0.12 * lost);
        b.state = 'idle'; b.stateT = 0.5;
    }
    updateCrosses(dt, body, sword) {
        for (let i = this.crosses.length - 1; i >= 0; i--) {
            const c = this.crosses[i];
            c.wx += c.vx * dt;
            c.s.setPosition(Math.round(c.wx), Math.round(c.cy + Math.sin(this.clock * 20 + i) * 1.5));
            c.glow.setPosition(c.s.x, c.s.y).setAlpha(0.6 + 0.4 * Math.sin(this.clock * 25));
            if (Math.random() < 0.3) this.burst(c.wx - Math.sign(c.vx) * 8, c.cy, 0xffe060, 1);
            const box = { l: c.wx - 6, r: c.wx + 6, t: c.cy - 9, b: c.cy + 9 };
            let remove = c.wx < this.camX - 30 || c.wx > this.camX + W + 30;
            if (sword && PlayScene.hit(sword, box)) { this.burst(c.wx, c.cy, 0xffffff, 8); remove = true; }   // miecz niszczy krzyżyk
            else if (PlayScene.hit(body, box)) { this.hurt(); this.burst(c.wx, c.cy, 0xffe060, 8); remove = true; }
            if (remove) { c.s.destroy(); c.glow.destroy(); this.crosses.splice(i, 1); }
            if (this.state !== 'play') return;
        }
    }

    hitBoss(dir) {
        const b = this.boss;
        b.hp -= 1;
        this.stats.bossHits++;
        b.invuln = CFG.BOSS_INVULN; b.stun = CFG.BOSS_STUN; b.knock = dir * 170;
        if (b.cross) { b.cross.destroy(); b.cross = null; }
        if (b.glow) { b.glow.destroy(); b.glow = null; }
        b.state = 'idle'; b.stateT = 0.6;
        this.refreshHud();
        this.cameras.main.shake(180, 0.01);
        this.burst(b.x, CFG.GROUND_Y - 36, 0xff5040, 12);
        this.popup(b.x, CFG.GROUND_Y - 74, b.hp > 0 ? 'HIT!' : 'K.O.!', '#ff5040');
        b.s.setTintFill(0xffffff);
        this.time.delayedCall(90, () => { if (b.s && b.s.active) b.s.clearTint(); });
        if (b.hp <= 0) this.bossDefeated();
    }

    /* ---------- po wygranej: szał, auto, Fibi, odjazd ---------- */
    bossDefeated() {
        const b = this.boss;
        this.mode = 'bossend';
        this.invuln = 99;
        this.crosses.forEach(c => { c.s.destroy(); c.glow.destroy(); });
        this.crosses = [];
        b.rage = true; b.stun = 99; b.hp = 0;
        b.s.anims.stop(); b.s.setTexture('kamil_stand');
        this.time.delayedCall(180, () => {
            b.s.setTint(0xff4030);
            this.bubbleAt(b.x, CFG.GROUND_Y - 80, '!!!', '#ff3030');
            this.rageEv = this.time.addEvent({ delay: 50, loop: true, callback: () => {
                b.s.x = Math.round(b.x) + Phaser.Math.Between(-2, 2);
                b.s.setTint(Math.random() < 0.5 ? 0xff4030 : 0xff9070);
            } });
        });
        // 1) szał (1,5 s) -> 2) biegnie do auta -> 3) wskakuje -> 4) auto po Fibi -> 5) odjazd
        this.time.delayedCall(1700, () => {
            this.rageEv.remove(); b.s.setTint(0xff6a50);
            b.s.play('kamil_walk'); b.s.setFlipX(this.car.x < b.x);
            this.tweens.add({
                targets: b.s, x: this.car.x, duration: Math.abs(this.car.x - b.x) / 0.22, ease: 'Linear',
                onComplete: () => this.kamilIntoCar(),
            });
        });
    }
    bubbleAt(x, y, str, color) {
        const t = pxText(this, x, y, str, { scale: 3, color, shadow: '#3a1008' }).setDepth(9);
        this.tweens.add({ targets: t, y: y - 12, duration: 300, ease: 'Back.out' });
        this.tweens.add({ targets: t, alpha: 0, delay: 900, duration: 300, onComplete: () => t.destroy() });
    }
    kamilIntoCar() {
        const b = this.boss, car = this.car;
        b.s.anims.stop();
        this.tweens.add({
            targets: b.s, y: CFG.GROUND_Y - 36, alpha: 0, duration: 320, ease: 'Quad.out',
            onComplete: () => {
                b.s.destroy();
                this.tweens.add({ targets: car, y: car.y - 2, duration: 70, yoyo: true, repeat: 3 });   // auto buja
                this.cameras.main.shake(150, 0.004);
                this.time.delayedCall(500, () => this.carGrabsFibi());
            },
        });
        this.bossHud.forEach(o => o.setVisible(false));
    }
    carGrabsFibi() {
        const car = this.car, fibi = this.fibi;
        car.play('car_drive_s');
        this.tweens.add({
            targets: car, x: fibi.x - 52, duration: 1000, ease: 'Quad.inOut',
            onComplete: () => {
                car.anims.stop();
                this.bubbleAt(fibi.x, CFG.GROUND_Y - 44, '!', '#ff5050');
                this.tweens.add({
                    targets: fibi, x: car.x + 8, y: CFG.GROUND_Y - 24, alpha: 0, scale: 0.7, duration: 420, ease: 'Quad.out',
                    onComplete: () => {
                        fibi.destroy();
                        car.play('car_drive_s');
                        const out = this.camX + W + this.carHalf + 60;
                        let started = false;
                        this.tweens.add({
                            targets: car, x: out, duration: 2000, ease: 'Quad.in',
                            onUpdate: () => { if (!started && car.x > this.camX + W - this.carHalf) { started = true; this.startLevel2(); } },
                            onComplete: () => { car.destroy(); this.car = null; },
                        });
                    },
                });
            },
        });
    }

    /* ---------- poziom 2 ---------- */
    startLevel2() {
        this.level = 2;
        this.L = this.levelParams(2);
        this.mode = 'run';
        this.boss = null;
        this.score = 0;
        this.scrollCur = 0;                 // ekran rusza płynnie
        this.invuln = 0.6;
        this.spawning = true;
        this.nextObstacleX = this.camX + W + 380;
        this.sinceHeart = 0;
        this.refreshHud();
        this.showBanner('LEVEL 2', `REACH ${this.L.goal} POINTS`);
    }

    /* ---------- koniec gry ---------- */
    gameOver() {
        this.state = 'over';
        this.arek.anims.stop();
        this.arek.setTexture('arek_jump').setTint(0xff6060).setAlpha(1);
        this.slash.setVisible(false);
        this.tweens.add({ targets: this.arek, y: this.arek.y - 24, angle: 90, alpha: 0.7, duration: 500, ease: 'Quad.out' });
        this.showEnd('GAME OVER', '#ff4040', '#4a0808', 'TRY AGAIN');
    }
    win() {
        this.state = 'win';
        this.arek.anims.stop();
        this.arek.setTexture('arek_jump').setAlpha(1);
        this.slash.setVisible(false);
        this.tweens.add({ targets: this.arek, y: this.arek.y - 30, duration: 300, yoyo: true, repeat: 2 });
        this.showEnd('YOU WIN!', '#ffd040', '#8c1e14', 'PLAY AGAIN');
    }
    showEnd(title, color, shadow, label) {
        this.endReady = false;
        const d = 20;
        const dim = this.add.rectangle(0, 0, W, H, 0x0c0818, 0.62).setOrigin(0).setScrollFactor(0).setDepth(d).setAlpha(0);
        this.tweens.add({ targets: dim, alpha: 1, duration: 300 });
        const t = pxText(this, W / 2, 56, title, { scale: 6, color, shadow }).setScrollFactor(0).setDepth(d + 1);
        const sub = this.state === 'win' ? `LEVEL ${this.level} COMPLETE` : (this.mode === 'boss' ? 'KS. KAMIL WINS THIS ROUND' : `REACH ${this.L.goal} POINTS TO WIN`);
        pxText(this, W / 2, 112, sub, { scale: 2, color: '#ffffff', shadow: '#2a1040' }).setScrollFactor(0).setDepth(d + 1);
        pxText(this, W / 2, 140, this.scoreStr(), { scale: 3, color: '#ffd040', shadow: '#3a1008' }).setScrollFactor(0).setDepth(d + 1);
        const btn = makeButton(this, W / 2, 190, 220, 28, label, () => { if (this.endReady) this.scene.restart(); }, d + 1);
        const hint = IS_TOUCH ? 'TAP THE BUTTON' : 'SPACE OR ENTER   ESC = MENU';
        pxText(this, W / 2, 232, hint, { scale: 1, color: '#f0d8a0', shadow: '#2a1608' }).setScrollFactor(0).setDepth(d + 1);
        // krótka blokada, żeby wciśnięta spacja (skok) nie wystartowała od razu nowej gry
        this.time.delayedCall(700, () => { this.endReady = true; });
        this.endObjects = [dim, t, btn];
    }
}

/* =====================================================================
   START
   ===================================================================== */
const KC_ = Phaser.Input.Keyboard.KeyCodes;
const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game-container',
    width: W,
    height: H,
    backgroundColor: '#0c0818',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: W,
        height: H,
    },
    input: { activePointers: 4, keyboard: { capture: [KC_.SPACE, KC_.ALT, KC_.LEFT, KC_.RIGHT, KC_.UP, KC_.DOWN, KC_.ENTER] } },
    scene: [BootScene, TitleScene, IntroScene, PlayScene],
});
window.__arekGame = game;   // do debugowania / testów

/* Pion na telefonie: pokazujemy podpowiedź (CSS) i zatrzymujemy grę */
const portraitMQ = window.matchMedia('(orientation: portrait) and (max-width: 900px)');
const applyOrientation = () => {
    if (!game.loop) return;
    if (portraitMQ.matches) game.loop.sleep(); else if (!game.loop.running) game.loop.wake();
};
(portraitMQ.addEventListener ? portraitMQ.addEventListener('change', applyOrientation) : portraitMQ.addListener(applyOrientation));
game.events.once('ready', () => setTimeout(() => { if (portraitMQ.matches) applyOrientation(); }, 200));
