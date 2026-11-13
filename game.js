'use strict';
/* =====================================================================
   ArekRun - retro side-scroller (Phaser 3), 16-bit pixel art
   Sceny: Boot -> Title -> Intro -> Play (poziom 1; ekrany końca gry/wygranej to nakładki)
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
    JUMP_VELOCITY: 400,     // prędkość początkowa skoku (px/s)
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
    INTRO_TURN_TIME: 0.4,      // s - Arek reaguje i odwraca się
    INTRO_DRAW_TIME: 0.9,      // s - Arek dobywa miecza (pozycja ataku)
    INTRO_CHASE_TIME: 2.0,     // s - Arek biegnie za psem, potem startuje poziom 1
    INTRO_DOG_SPEED: 210,      // px/s - jak szybko ucieka pies
    INTRO_SKIP_GUARD: 0.4,     // s - tyle ignorujemy "skip", żeby klik START nie pominął intra

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
    const monPal = { o: '#14301a', G: '#3f9a3a', L: '#8ee06a', w: '#ffffff', k: '#151515', y: '#f0c040', r: '#e03030' };
    artTex(scene, 'monster_1', [
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
    ], monPal, 2);
    artTex(scene, 'monster_2', [
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
        '..oGGGooGGGo..',
        '...ooo..ooo...',
    ], monPal, 2);

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

/* =====================================================================
   BOOT - wczytanie grafik + tekstur generowanych
   ===================================================================== */
class BootScene extends Phaser.Scene {
    constructor() { super('Boot'); }
    preload() {
        this.cameras.main.setBackgroundColor('#0c0818');
        const names = ['arek_run_1', 'arek_run_2', 'arek_run_3', 'arek_jump', 'arek_attack', 'face', 'car_1', 'car_2', 'fibi_walk_1', 'fibi_walk_2', 'fibi_stand'];
        names.forEach(n => {
            // data-URI (assets/game/assets.js) działa też z file://; fallback: zwykłe pliki
            const src = (window.AREK_ASSETS && window.AREK_ASSETS[n]) || `assets/game/${n}.png`;
            this.load.image(n, src);
        });
    }
    create() {
        makeTextures(this);
        this.anims.create({
            key: 'run', frameRate: 9, repeat: -1,
            frames: ['arek_run_1', 'arek_run_2', 'arek_run_3'].map(key => ({ key })),
        });
        this.anims.create({ key: 'car_drive', frameRate: 8, repeat: -1, frames: [{ key: 'car_1' }, { key: 'car_2' }] });
        this.anims.create({ key: 'dog_walk', frameRate: 4, repeat: -1, frames: [{ key: 'fibi_walk_1' }, { key: 'fibi_walk_2' }] });
        this.anims.create({ key: 'dog_run', frameRate: 12, repeat: -1, frames: [{ key: 'fibi_walk_1' }, { key: 'fibi_walk_2' }] });
        this.anims.create({ key: 'monster_walk', frameRate: 4, repeat: -1, frames: [{ key: 'monster_1' }, { key: 'monster_2' }] });
        this.scene.start('Title');
    }
}

/* =====================================================================
   EKRAN POWITALNY:  AREK [twarz] RUN  +  START NEW GAME
   ===================================================================== */
class TitleScene extends Phaser.Scene {
    constructor() { super('Title'); }
    create() {
        this.t = 0;
        this.bg = buildBackground(this);
        const face = this.textures.get('face').getSourceImage();
        const fw = face.width, fh = face.height;
        const fx = Math.round((W - fw) / 2), fy = 36;
        // ramka złoto-czerwona
        this.add.rectangle(fx - 4, fy - 4, fw + 8, fh + 8, 0x8c1e14).setOrigin(0).setDepth(6);
        this.add.rectangle(fx - 2, fy - 2, fw + 4, fh + 4, 0xffd040).setOrigin(0).setDepth(6);
        this.add.rectangle(fx, fy, fw, fh, 0x1e163c).setOrigin(0).setDepth(6);
        this.add.image(fx, fy, 'face').setOrigin(0).setDepth(7);
        const ty = fy + Math.round(fh / 2) - 21;
        const big = { scale: 6, color: '#ffd040', shadow: '#8c1e14' };
        pxText(this, Math.round((fx - 6) / 2), ty, 'AREK', big).setDepth(7);
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
   INTRO: Arek spaceruje w lewo z psem, przejeżdża ksiądz Kamil, pies ucieka,
   Arek dobywa miecza i biegnie za nim w prawo -> poziom 1
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
        this.bg = buildBackground(this);

        const ax = CFG.INTRO_AREK_X, gy = CFG.GROUND_Y;
        this.arek = this.add.sprite(ax, gy, 'arek_run_1').setOrigin(0.5, 1).setDepth(6).setFlipX(true);
        this.arek.play('run');
        this.arek.anims.timeScale = 0.4;       // powolny spacer
        this.dog = this.add.sprite(ax + CFG.INTRO_DOG_DIST, gy + 1, 'fibi_stand').setOrigin(0.5, 1).setDepth(6).setFlipX(true);
        this.dog.play('dog_walk');
        // auto zmniejszone wygładzonym skalowaniem do nowej tekstury (ostre piksele przy skali 1:1)
        const cs = CFG.INTRO_CAR_SCALE, sf = (n) => {
            const key = `car_${n}_s${cs}`;
            if (!this.textures.exists(key)) {
                const src = this.textures.get('car_' + n).getSourceImage();
                const tex = this.textures.createCanvas(key, Math.round(src.width * cs), Math.round(src.height * cs));
                const c = tex.getContext();
                c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high';
                c.drawImage(src, 0, 0, tex.width, tex.height);
                tex.refresh();
            }
            return key;
        };
        const carKeys = [sf(1), sf(2)];
        if (!this.anims.exists('car_drive_s')) {
            this.anims.create({ key: 'car_drive_s', frameRate: 8, repeat: -1, frames: carKeys.map(key => ({ key })) });
        }
        this.carHalf = Math.round(109.5 * cs);    // połowa szerokości auta
        this.car = this.add.sprite(-this.carHalf - 20, CFG.INTRO_CAR_BOTTOM, carKeys[0]).setOrigin(0.5, 1).setDepth(5).setVisible(false);
        this.car.play('car_drive_s');
        this.slash = this.add.image(0, 0, 'slash').setOrigin(0, 0.5).setDepth(7).setVisible(false);
        this.leash = this.add.graphics().setDepth(6.5);
        this.leashState = 'taut';              // 'taut' -> 'hang' po zerwaniu

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
            if (this.phaseT >= CFG.INTRO_SCARE_TIME) {            // smycz pęka, pies w nogi
                this.setPhase('turn');
                this.leashState = 'hang';
                this.leashSnapT = 0;
                this.burst(dog.x - 8, dog.y - 17, 0xe0c080);
                dog.setFlipX(false); dog.play('dog_run'); dog.y = gy + 1;
                this.dogVx = 40;
                arek.anims.stop();                                // Arek staje
                this.bubble(arek.x, arek.y - 76, '?!', '#ffffff');
            }
        } else if (this.phase === 'turn') {
            if (this.phaseT >= CFG.INTRO_TURN_TIME) {
                this.setPhase('draw');
                arek.setFlipX(false).setTexture('arek_attack');   // dobywa miecza
                this.slashT = 0.5;
            }
        } else if (this.phase === 'draw') {
            if (this.phaseT >= CFG.INTRO_DRAW_TIME) {
                this.setPhase('chase');
                arek.play('run');
                arek.anims.timeScale = 1;
            }
        } else if (this.phase === 'chase') {
            if (this.phaseT >= CFG.INTRO_CHASE_TIME) this.finish();
        }

        // --- pies ucieka w prawo ---
        if (this.dogVx > 0) {
            this.dogVx = Math.min(CFG.INTRO_DOG_SPEED, this.dogVx + 300 * dt);
            dog.x += this.dogVx * dt;
            if (dog.x > W + 40) dog.setVisible(false);
        }

        // --- przewijanie tła: spacer w lewo -> stop -> bieg w prawo ---
        let target = -CFG.INTRO_WALK_SPEED;
        if (this.phase === 'turn' || this.phase === 'draw') target = 0;
        if (this.phase === 'chase') target = CFG.SCROLL_SPEED;
        if (this.phase === 'scare') target = -CFG.INTRO_WALK_SPEED * 0.4;
        this.scroll += (target - this.scroll) * Math.min(1, dt * 5);
        this.camX += this.scroll * dt;
        this.bg.update(this.camX);

        // --- smuga miecza ---
        if (this.slashT > 0) {
            this.slashT -= dt;
            this.slash.setVisible(true).setPosition(arek.x + 6, arek.y - 30).setAlpha(Math.min(1, this.slashT / 0.3));
        } else this.slash.setVisible(false);

        this.drawLeash(dt);
    }

    drawLeash(dt) {
        const g = this.leash, arek = this.arek, dog = this.dog;
        g.clear();
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

    init(data) { this.startX = (data && data.startX) || 130; }

    create() {
        this.state = 'play';
        this.camX = 0;
        this.score = 0;
        this.lives = CFG.START_LIVES;
        this.invuln = 0;
        this.jumpBuf = 0;
        this.attackT = 0;
        this.attackCd = 0;
        this.barrels = []; this.monsters = []; this.hearts = [];
        this.nextObstacleX = CFG.FIRST_OBSTACLE_X;
        this.sinceHeart = 0;
        this.touch = { left: false, right: false };
        this.jumpQ = false; this.attackQ = false; this.enterQ = false; this.escQ = false;
        this.stats = { barrelsPassed: 0, monstersKilled: 0 };

        this.cameras.main.setBackgroundColor('#0c0818');
        this.bg = buildBackground(this);

        // --- Arek ---
        this.a = { x: this.startX, y: CFG.GROUND_Y, vy: 0, onGround: true };
        this.arek = this.add.sprite(this.a.x, this.a.y, 'arek_run_1').setOrigin(0.5, 1).setDepth(6);
        this.arek.play('run');
        this.pose = 'run';
        this.slash = this.add.image(0, 0, 'slash').setOrigin(0, 0.5).setDepth(7).setVisible(false);

        this.buildHud();
        this.buildInput();
        if (IS_TOUCH) this.buildTouchButtons();
        this.spawnAhead();

        this.banner = [
            pxText(this, W / 2, 84, 'LEVEL 1', { scale: 5, color: '#ffd040', shadow: '#8c1e14' }).setScrollFactor(0).setDepth(12),
            pxText(this, W / 2, 128, `REACH ${CFG.GOAL_SCORE} POINTS`, { scale: 2, color: '#ffffff', shadow: '#2a1040' }).setScrollFactor(0).setDepth(12),
        ];
        this.tweens.add({ targets: this.banner, alpha: 0, delay: 2200, duration: 600 });
        if (!IS_TOUCH) {
            this.hintTxt = pxText(this, W / 2, 292, '< > SPEED   SPACE JUMP   ALT SWORD', { scale: 2, color: '#ffffff', shadow: '#2a1608' })
                .setScrollFactor(0).setDepth(12);
            this.tweens.add({ targets: this.hintTxt, alpha: 0, delay: 5000, duration: 600 });
        }
        this.cameras.main.fadeIn(200, 12, 8, 24);
    }

    /* ---------- HUD ---------- */
    buildHud() {
        this.heartImgs = [];
        for (let i = 0; i < CFG.MAX_LIVES; i++) {
            this.heartImgs.push(this.add.image(8 + i * 22, 8, 'heart').setOrigin(0).setScrollFactor(0).setDepth(10));
        }
        this.scoreTxt = pxText(this, W - 8, 8, this.scoreStr(), { scale: 2, color: '#ffd040', shadow: '#3a1008', ox: 1 })
            .setScrollFactor(0).setDepth(10);
        // pasek postępu do 1000 pkt
        this.add.rectangle(W - 8 - 121, 25, 122, 8, 0xffd040).setOrigin(0).setScrollFactor(0).setDepth(10);
        this.add.rectangle(W - 8 - 120, 26, 120, 6, 0x1e0c30).setOrigin(0).setScrollFactor(0).setDepth(10);
        this.bar = this.add.rectangle(W - 8 - 119, 27, 1, 4, 0xffd040).setOrigin(0).setScrollFactor(0).setDepth(10);
        this.refreshHud();
    }
    scoreStr() { return 'SCORE ' + String(this.score).padStart(4, '0'); }
    refreshHud() {
        this.heartImgs.forEach((h, i) => {
            h.setTexture(i < this.lives ? 'heart' : 'heart_empty').setVisible(i < Math.max(this.lives, CFG.START_LIVES));
        });
        this.scoreTxt.setString(this.scoreStr());
        this.bar.width = Math.max(1, Math.round(118 * Math.min(1, this.score / CFG.GOAL_SCORE)));
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
        while (this.nextObstacleX < this.camX + W + 100) {
            const x = this.nextObstacleX;
            const first = this.barrels.length + this.monsters.length === 0 && x === CFG.FIRST_OBSTACLE_X;
            if (!first && Math.random() < CFG.MONSTER_CHANCE) this.spawnMonster(x); else this.spawnBarrel(x);
            this.sinceHeart++;
            const ramp = 1 - CFG.GAP_RAMP * Math.min(1, this.score / CFG.GOAL_SCORE);
            const gap = Phaser.Math.Between(CFG.GAP_MIN, CFG.GAP_MAX) * ramp;
            if (Math.random() < CFG.HEART_CHANCE || this.sinceHeart >= CFG.HEART_GUARANTEE) {
                this.spawnHeart(x + gap / 2);
                this.sinceHeart = 0;
            }
            this.nextObstacleX += Math.max(gap, 200);
        }
    }
    spawnBarrel(x) {
        const s = this.add.image(x, CFG.GROUND_Y + 2, 'barrel').setOrigin(0.5, 1).setDepth(5);
        this.barrels.push({ s, wx: x, hw: 9, h: 24, passed: false, touched: false });
    }
    spawnMonster(x) {
        const s = this.add.sprite(x, CFG.GROUND_Y + 2, 'monster_1').setOrigin(0.5, 1).setDepth(5);
        s.play('monster_walk');
        this.monsters.push({ s, wx: x, hw: 11, h: 20, dead: false });
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
    burst(x, y, tint) {
        for (let i = 0; i < 9; i++) {
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
        if (this.score >= CFG.GOAL_SCORE) this.win();
    }
    arekBox() {
        const a = this.a;
        return { l: a.x - 8, r: a.x + 8, t: a.y - 50, b: a.y - 2 };
    }
    static hit(A, B) { return A.l < B.r && A.r > B.l && A.t < B.b && A.b > B.t; }

    /* ---------- pętla ---------- */
    update(time, delta) {
        const dt = Math.min(delta, 50) / 1000;
        const k = this.keys;
        const jumpPress = this.jumpQ, attackPress = this.attackQ, enterPress = this.enterQ, escPress = this.escQ;
        this.jumpQ = false; this.attackQ = false; this.enterQ = false; this.escQ = false;

        if (this.state !== 'play') {
            if (this.endReady && (jumpPress || enterPress)) this.scene.restart();
            else if (this.endReady && escPress) this.scene.start('Title');
            return;
        }

        // --- prędkość Arka względem świata: zawsze > 0 ---
        const left = k.left.isDown || k.a.isDown || this.touch.left;
        const right = k.right.isDown || k.d.isDown || this.touch.right;
        let v = CFG.SPEED_NORMAL;
        if (right && !left) v = CFG.SPEED_FAST; else if (left && !right) v = CFG.SPEED_SLOW;

        this.camX += CFG.SCROLL_SPEED * dt;
        const a = this.a;
        a.x += v * dt;
        a.x = Phaser.Math.Clamp(a.x, this.camX + CFG.EDGE_MARGIN, this.camX + W - CFG.EDGE_MARGIN);

        // --- skok ---
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

        // --- obiekty świata ---
        this.spawnAhead();
        const body = this.arekBox();
        const sword = swordActive ? { l: a.x, r: a.x + CFG.SWORD_REACH, t: a.y - 56, b: a.y } : null;

        for (let i = this.monsters.length - 1; i >= 0; i--) {
            const m = this.monsters[i];
            if (m.dead) continue;
            m.wx -= CFG.MONSTER_SPEED * dt;
            m.s.x = Math.round(m.wx);
            const box = { l: m.wx - m.hw, r: m.wx + m.hw, t: CFG.GROUND_Y - m.h, b: CFG.GROUND_Y };
            if (sword && PlayScene.hit(sword, box)) { this.killMonster(m); continue; }
            if (PlayScene.hit(body, box)) this.hurt();
            if (m.wx < this.camX - 60) { m.s.destroy(); this.monsters.splice(i, 1); }
        }
        for (let i = this.barrels.length - 1; i >= 0; i--) {
            const b = this.barrels[i];
            const box = { l: b.wx - b.hw, r: b.wx + b.hw, t: CFG.GROUND_Y - b.h, b: CFG.GROUND_Y };
            if (PlayScene.hit(body, box)) { b.touched = true; this.hurt(); }
            if (!b.passed && !b.touched && b.wx + b.hw < a.x - 8) {
                b.passed = true;
                this.stats.barrelsPassed++;
                this.addScore(CFG.POINTS_BARREL, a.x, a.y - 60);
                if (this.state !== 'play') return;
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
        if (this.state !== 'play') return;

        // --- nietykalność (miganie) ---
        if (this.invuln > 0) {
            this.invuln = Math.max(0, this.invuln - dt);
            this.arek.setAlpha(Math.floor(this.invuln * 12) % 2 ? 0.35 : 1);
        } else this.arek.setAlpha(1);

        // --- wygląd Arka ---
        const sx = Math.round(a.x), sy = Math.round(a.y);
        this.arek.setPosition(sx, sy);
        let pose = 'run';
        if (this.attackT > 0) pose = 'attack'; else if (!a.onGround) pose = 'jump';
        if (pose !== this.pose) {
            this.pose = pose;
            if (pose === 'run') this.arek.play('run');
            else { this.arek.anims.stop(); this.arek.setTexture(pose === 'attack' ? 'arek_attack' : 'arek_jump'); }
        }
        if (pose === 'run') this.arek.anims.timeScale = v / CFG.SPEED_NORMAL;
        this.slash.setVisible(this.attackT > CFG.ATTACK_TIME * 0.35).setPosition(sx + 6, sy - 30);
        this.slash.setAlpha(Math.min(1, this.attackT / (CFG.ATTACK_TIME * 0.6)));

        // --- kamera i tło ---
        const cx = Math.floor(this.camX);
        this.cameras.main.scrollX = cx;
        this.bg.update(this.camX);
    }

    killMonster(m) {
        m.dead = true;
        this.stats.monstersKilled++;
        const s = m.s;
        s.anims.stop();
        s.setTint(0xffffff);
        this.burst(m.wx, CFG.GROUND_Y - 12, 0x6ae04a);
        this.tweens.add({
            targets: s, y: s.y - 34, angle: 200, alpha: 0, duration: 450,
            onComplete: () => { s.destroy(); const i = this.monsters.indexOf(m); if (i >= 0) this.monsters.splice(i, 1); },
        });
        this.addScore(CFG.POINTS_MONSTER, m.wx, CFG.GROUND_Y - 50);
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

    /* ---------- koniec poziomu ---------- */
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
        const sub = this.state === 'win' ? 'LEVEL 1 COMPLETE' : `REACH ${CFG.GOAL_SCORE} POINTS TO WIN`;
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
