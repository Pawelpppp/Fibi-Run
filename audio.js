'use strict';
/* =====================================================================
   Fibi Run - muzyka i efekty dźwiękowe (Web Audio API, bez plików dźwiękowych)
   Oryginalna kompozycja w duchu 16-bitowych gier akcji (SNES / Genesis):
   - lead: dwa lekko rozstrojone "pulsy" z prawdziwą modulacją wypełnienia (PWM) i vibrato,
     echo (delay z sprzężeniem) na leadzie, harmonia w tercję, podwojenie oktawą w szale
   - arpeggia akordów (pulse 12,5 %), bas (pulse + sub-trójkąt + osobna warstwa sine oktawę niżej, filtrowana), "stabsy" akordowe
   - perkusja: stopa / werbel / hi-haty / toms / crash (szum + obwiednie wysokości)
   - budowa utworu: intro / A / B / mostek / powtórki z fillami (zamiast krótkiej pętli)
   - na szynie muzyki: półka basowa (~+5 dB poniżej 150 Hz) i lekkie "sidechain" suba pod stopę; SFX bez zmian
   - kompresor + limiter na wyjściu (bez przesterowań)
   Działa z file:// i http. Wszystko proceduralne.

   API (window.FibiAudio):
     unlock()            - odblokowanie po pierwszym geście (klik / klawisz / dotyk)
     play(nazwa)         - title | intro | level | level2 | boss | finalboss | fury | victory | credits | gameover
     stop(fade)          - cisza (krótkie wyciszenie)
     sfx(nazwa, opcje)   - jump | sword | hurt | kill | heart | bossHit | cross | punch | throw | clang | carHit | explosion | rush | stomp | click
                           transformacja: charge(czas s) | thunder | sparkle(czas s) | reveal   (lightning = thunder)
                           auto: brake | slam
                           utrata życia: lifelost (smutna puzonowa gama wah-wah-wah-waaah, ~1 s) | haha (śmiech Kamila, 3x staccato)
     carEngine()         - uchwyt silnika auta {set({speed,pan,vol,pitch}), stop(fade)} (speed 0..1.3)
     duck(poziom, czas)  - chwilowe przyciszenie muzyki (np. na grzmot)
     muted / setMuted(v) / toggleMute() / onChange(fn)  - wyciszenie (zapamiętane w localStorage)
     render(nazwa, sek)  - offline -> Promise<[Float32Array L, R]>; nazwy utworów albo
                           sfx_transform | sfx_car_arrive | sfx_car_passby (podgląd / eksport WAV)
   Wszystkie ustawienia utworów (tempo, tonacja, głośności, sekcje) są w SONGS poniżej.
   ===================================================================== */
(function () {
    const STEPS = 16;                                   // kroków (szesnastek) na takt
    const NOTE_IDX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
    function midi(name) {                               // 'F#5' -> 78
        const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
        if (!m) throw new Error('nuta?' + name);
        return 12 * (parseInt(m[3], 10) + 1) + NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    }
    const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
    const B = (s) => s.trim().split(/\s+/);             // takt = 16 tokenów: nuta | '.' pauza | '-' przedłużenie

    /* ---------- akordy: 'Em' 'C' 'B7' 'Bb' 'E5' ---------- */
    const QUAL = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], 5: [0, 7, 12], dim: [0, 3, 6] };
    function chord(name) {
        const m = /^([A-G])(#|b)?(m7|m|7|5|dim)?$/.exec(name);
        if (!m) throw new Error('akord?' + name);
        const pc = (NOTE_IDX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
        const iv = QUAL[m[3] || ''];
        let r = 48 + pc; if (r < 52) r += 12;            // trzon akordu: E3..D#4
        return { pc, tones: iv.map(i => r + i), bass: 36 + pc, pcs: iv.map(i => (pc + i) % 12) };
    }

    /* ---------- perkusja: wzorce po 16 kroków; 'x' = uderzenie, wielka litera = akcent ---------- */
    const DR = {
        rock:    { k: 'x.....x...x.x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        rock16:  { k: 'x.....x...x.x...', s: '....x.......x..x', h: 'xxxxxxxxxxxxxxxx', o: '..............x.' },
        four:    { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
        half:    { k: 'x.......x.x.....', s: '........x.......', h: '..x...x...x...x.' },
        titleB:  { k: 'x...x...x...x...', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
        boss:    { k: 'x.x.x.x.x.x.x.xx', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' },
        bossB:   { k: 'x.xxx.x.x.xxx.x.', s: '....x.......x..x', h: 'x.x.x.x.x.x.x.x.', o: '..x...x...x...x.' },
        fury:    { k: 'x.xxx.xxx.xxx.xx', s: '....x...x...x.x.', h: 'xxxxxxxxxxxxxxxx', o: '..x...x...x...x.' },
        march:   { k: 'x...x...x...x...', s: '....x.......xxxx', h: 'x.x.x.x.x.x.x.x.' },
        lull:    { k: 'x.......x.......', s: '........x.......', h: '..x...x...x...x.' },
        fillA:   { k: 'x.....x...x.....', s: '........x.x.xxxx', h: 'x.x.x.x.........' },
        fillB:   { k: 'x...x...........', s: '................', t: '....1.1.2.2.3.3.', h: 'x.x.x.x.........' },
        fillC:   { k: 'x.x.x.x.........', s: '....x.x.xxxxxxxx', h: 'x.x.x.x.........' },
        roll:    { k: 'x...x...x...x...', s: 'xxxxxxxxxxxxXXXX', h: '' },
        fillD:   { k: 'x.x.x.x.x.x.....', s: '............xxXX', t: '......1.2.3.....', h: '' },
    };

    /* =================================================================
       UTWORY. Sekcja: prog (akordy na takty), lead (tokeny na takty), bass (wzorzec 16 kroków:
       r=prima o=oktawa f=kwinta b=septyma), arp (indeksy tonów akordu), stab (kroki), drums, fill (ostatni takt),
       crash (talerz na początku), harm (harmonia w tercję), oct (podwojenie oktawą niżej)
       ================================================================= */
    const ARP = {
        up: [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3],
        wide: [0, 2, 4, 2, 0, 2, 5, 2, 0, 2, 4, 2, 1, 3, 5, 3],
        run: [0, 1, 2, 4, 3, 4, 2, 1, 0, 1, 2, 4, 5, 4, 2, 1],
        slow: [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 0, null, 1, null],
        sparse: [0, null, null, 1, null, null, 2, null, null, 1, null, null, 0, null, null, 2],
    };

    /* ---------- LEVEL (e-moll, zadziorny) ---------- */
    const L_A = [
        B('E5 . E5 G5 . B5 - - A5 - G5 - E5 - . .'),
        B('E5 . E5 G5 . B5 - - D6 - B5 - G5 - . .'),
        B('C6 . C6 B5 . G5 - - E5 - G5 - C6 - . .'),
        B('D5 . F#5 A5 . D6 - - C#6 - A5 - F#5 - A5 .'),
        B('E5 . E5 G5 . B5 - - E6 - D6 - B5 - G5 .'),
        B('B5 . B5 D6 . G6 - - F#6 - D6 - B5 - G5 .'),
        B('E6 . E6 . G6 - E6 - D6 - C6 - G5 - E5 -'),
        B('F#5 . B5 . D#6 - B5 - F#6 - - - E6 D#6 B5 .'),
    ];
    const L_B = [
        B('G5 - - C6 - - E6 - - D6 - C6 - G5 - -'),
        B('D6 - - G6 - - B6 - - A6 - G6 - D6 - -'),
        B('C6 - - E6 - - A6 - - G6 - E6 - C6 - -'),
        B('B5 - - E6 - G6 - B6 - A6 G6 - E6 - . .'),
        B('G5 . C6 . E6 - - G6 - - E6 - C6 - . .'),
        B('A5 . D6 . F#6 - - A6 - - F#6 - D6 - . .'),
        B('G6 - F#6 - E6 - B5 - E6 - G6 - B6 - . .'),
        B('A6 - F#6 - D#6 - B5 - F#5 . A5 . B5 - . .'),
    ];
    const L_BR = [
        B('A5 - - - - - - - C6 - - - E6 - - -'),
        B('G6 - - - - - - - E6 - - - C6 - - -'),
        B('D6 - - - - - - - F#6 - - - A6 - - -'),
        B('D#6 - - - F#6 - - - B6 - - - . . . .'),
    ];
    const LEVEL = {
        bpm: 152, loopFrom: 1, leadVol: 0.15, duty: 0.25, arpVol: 0.05, bassVol: 0.26, stabVol: 0.06, drumVol: 1, echo: 0.36,
        order: ['intro', 'A', 'A2', 'B', 'bridge', 'B2'],
        sec: {
            intro: { prog: B('Em Em C B7'), arp: 'run', bass: 'r . . . r . . . r . . . r . . .', drums: 'half', fill: 'fillA', stab: null },
            A:  { prog: B('Em Em C D Em G C B7'), lead: L_A, arp: 'up', bass: 'r . r r o . r . r . r r o . f o', drums: 'rock', fill: 'fillA', crash: true },
            A2: { prog: B('Em Em C D Em G C B7'), lead: L_A, arp: 'run', bass: 'r . o . r . o . r . o . r . o .', drums: 'rock16', fill: 'fillB', crash: true,
                  harm: true, stab: '..x...x...x...x.', duty: 0.125 },
            B:  { prog: B('C G Am Em C D Em B7'), lead: L_B, arp: 'wide', bass: 'r . o . r . o . r . o . r . o .', drums: 'four', fill: 'fillC', crash: true, duty: 0.5, stab: 'x.....x.....x...' },
            bridge: { prog: B('Am C D B7'), lead: L_BR, arp: 'sparse', bass: 'r . . . . . . . r . . . . . . .', drums: 'lull', fill: 'roll', duty: 0.5 },
            B2: { prog: B('C G Am Em C D Em B7'), lead: L_B, arp: 'run', bass: 'r r o r r o r r o r r o r r o r', drums: 'bossB', fill: 'fillD', crash: true, harm: true, duty: 0.25,
                  stab: 'x.x...x.x.x...x.' },
        },
    };

    /* ---------- BOSS (d-moll, szybki, ciężki) ---------- */
    const B_A = [
        B('D5 . D5 F5 . A5 . G5 F5 . D5 . F5 G5 A5 .'),
        B('A5 - A5 . C6 - A5 G5 F5 . E5 F5 D5 - . .'),
        B('Bb5 . Bb5 A5 . G5 F5 . G5 A5 Bb5 . D6 - . .'),
        B('C6 . C6 Bb5 . G5 E5 . G5 . C6 - E6 - . .'),
        B('D6 . D6 F6 . E6 D6 C6 D6 - A5 - F5 . A5 D6'),
        B('C6 - . A5 F5 . A5 C6 F6 - E6 C6 A5 - . .'),
        B('D6 - Bb5 - D6 - F6 - E6 . D6 C6 Bb5 - A5 -'),
        B('A5 . C#6 E6 A6 - . G6 F6 . E6 C#6 A5 - . .'),
    ];
    const B_B = [
        B('G5 - Bb5 - D6 - G6 - F6 - D6 - Bb5 - G5 -'),
        B('A5 - C#6 - E6 - A6 - G6 - E6 - C#6 - A5 -'),
        B('D6 - F6 - A6 - D7 - C7 - A6 - F6 - D6 -'),
        B('D6 - Bb5 - F6 - D6 - Bb5 - D6 - F6 - A6 -'),
        B('G6 - . G6 Bb6 - G6 - F6 - D6 - Bb5 - D6 -'),
        B('E6 - . E6 A6 - E6 - C#6 - E6 - A6 - . .'),
        B('D6 . D6 . F6 . A6 . D7 - - - C7 - A6 -'),
        B('G6 - F6 - E6 - C#6 - A5 . . A5 C#6 E6 A6 .'),
    ];
    const B_BR = [
        B('Bb5 - - - - - - - D6 - - - F6 - - -'),
        B('E6 - - - - - - - G6 - - - E6 - - -'),
        B('A5 - - - C#6 - - - E6 - - - A6 - - -'),
        B('A6 - - . . . . . . . . . . . . .'),
    ];
    const BOSS = {
        bpm: 176, loopFrom: 1, leadVol: 0.15, duty: 0.25, arpVol: 0.055, bassVol: 0.29, stabVol: 0.075, drumVol: 1.1, echo: 0.3,
        order: ['intro', 'A', 'B', 'A2', 'bridge', 'B2'],
        sec: {
            intro: { prog: B('Dm Dm'), arp: 'run', bass: 'r r o r r r o r r r o r r o r o', drums: 'boss', fill: 'roll', stab: 'x.....x.x.....x.' },
            A:  { prog: B('Dm Dm Bb C Dm Dm Bb A'), lead: B_A, arp: 'up', bass: 'r r o r r r o r r r o r r o r o', drums: 'boss', fill: 'fillC', crash: true,
                  stab: 'x..x..x.x..x..x.' },
            B:  { prog: B('Gm A Dm Bb Gm A Dm A'), lead: B_B, arp: 'wide', bass: 'r . o . r . o . r . o . r . o .', drums: 'bossB', fill: 'fillD', crash: true, duty: 0.5,
                  stab: 'x...x...x...x...', harm: true },
            A2: { prog: B('Dm Dm Bb C Dm Dm Bb A'), lead: B_A, arp: 'run', bass: 'r r o r r r o r r r o r r o r o', drums: 'bossB', fill: 'fillC', crash: true,
                  stab: 'x..x..x.x..x..x.', harm: true, duty: 0.125 },
            bridge: { prog: B('Bb C A A'), lead: B_BR, arp: 'sparse', bass: 'r . . . . . . . r . . . . . . .', drums: 'lull', fill: 'roll', duty: 0.5, stab: null },
            B2: { prog: B('Gm A Dm Bb Gm A Dm A'), lead: B_B, arp: 'run', bass: 'r r o r r r o r r r o r r o r o', drums: 'bossB', fill: 'fillD', crash: true,
                  harm: true, duty: 0.25, stab: 'x.x.x.x.x.x.x.x.' },
        },
    };

    /* ---------- TITLE (a-moll, heroiczny) ---------- */
    const T_A = [
        B('A4 - - - C5 - E5 - A5 - - - G5 - E5 -'),
        B('F5 - - - A5 - C6 - A5 - - - F5 - E5 -'),
        B('E5 - - - G5 - C6 - B5 - G5 - E5 - D5 -'),
        B('D5 - - - G5 - B5 - A5 - G5 - D5 - . .'),
        B('C6 - - B5 A5 - - E5 A5 - B5 - C6 - - -'),
        B('A5 - - G5 F5 - - A5 C6 - - A5 F5 - - -'),
        B('G5 - - A5 B5 - - D6 B5 - - G5 D5 - - -'),
        B('B5 - - G#5 E5 - - G#5 B5 - - - . . . .'),
    ];
    const T_B = [
        B('A5 - C6 - F6 - - - E6 - C6 - A5 - - -'),
        B('B5 - D6 - G6 - - - F6 - D6 - B5 - - -'),
        B('C6 - E6 - A6 - - - G6 - E6 - C6 - - -'),
        B('E6 - - - D6 - C6 - B5 - A5 - E5 - - -'),
        B('A5 - C6 - F6 - A6 - G6 - F6 - E6 - C6 -'),
        B('D6 - G6 - B6 - - - A6 - G6 - D6 - B5 -'),
        B('C6 - E6 - G6 - C7 - B6 - G6 - E6 - C6 -'),
        B('B5 - - G#5 - E5 - G#5 B5 - . . E5 . . .'),
    ];
    const TITLE = {
        bpm: 116, loopFrom: 1, leadVol: 0.15, duty: 0.25, arpVol: 0.05, bassVol: 0.24, stabVol: 0.05, drumVol: 0.85, echo: 0.4,
        order: ['intro', 'A', 'A2', 'B'],
        sec: {
            intro: { prog: B('Am E'), arp: 'slow', bass: 'r . . . . . . . r . . . . . . .', drums: null },
            A:  { prog: B('Am F C G Am F G E'), lead: T_A, arp: 'up', bass: 'r . . . r . . o r . . . r . o .', drums: 'half', fill: 'fillA', crash: true },
            A2: { prog: B('Am F C G Am F G E'), lead: T_A, arp: 'wide', bass: 'r . r . r . o . r . r . r . o .', drums: 'titleB', fill: 'fillB', crash: true, harm: true, duty: 0.125 },
            B:  { prog: B('F G Am Am F G C E'), lead: T_B, arp: 'run', bass: 'r . o . r . o . r . o . r . o .', drums: 'four', fill: 'fillC', crash: true, duty: 0.5,
                  stab: 'x.....x.....x...', harm: true },
        },
    };

    /* ---------- INTRO (spokojne, lekko niepokojące) ---------- */
    const I_L = [
        B('E5 - - - - - - - G5 - - - B5 - - -'),
        B('E5 - - - - - - - G5 - - - . . . .'),
        B('F#5 - - - - - - - A5 - - - . . . .'),
        B('D#5 - - - F#5 - - - A5 - - - B5 - - -'),
    ];
    const INTRO = {
        bpm: 92, loopFrom: 0, leadVol: 0.12, duty: 0.5, leadWave: 'triangle', arpVol: 0.09, arpWave: 'triangle', bassVol: 0.18, drumVol: 1, echo: 0.45,
        order: ['A'],
        sec: { A: { prog: B('Em C D B7'), lead: I_L, arp: 'slow', bass: 'r . . . . . . . . . . . . . . .', drums: null } },
    };

    /* ---------- VICTORY (C-dur, fanfara, jednorazowa) i CREDITS (pętla) ---------- */
    const V_L = [
        B('C5 . E5 . G5 . C6 - E6 - - - G6 - - -'),
        B('A5 . C6 . F6 - - - E6 - D6 - C6 - A5 -'),
        B('B5 . D6 . G6 - - - F6 - E6 - D6 - B5 -'),
        B('C6 - E6 - G6 - C7 - - - - - G6 - E6 -'),
        B('A5 - C6 - F6 - A6 - G6 - F6 - E6 - C6 -'),
        B('D6 - G6 - B6 - D7 - . . . . . . . .'),
        B('C7 - - - - - - - - - - - . . . .'),
    ];
    const VICTORY = {
        bpm: 132, loop: false, next: 'credits', leadVol: 0.16, duty: 0.5, arpVol: 0.05, bassVol: 0.24, stabVol: 0.07, drumVol: 0.95, echo: 0.3,
        order: ['V'],
        sec: { V: { prog: B('C F G C F G C'), lead: V_L, arp: 'up', bass: 'r . . r r . . r r . . r r . r .', drums: 'march', fill: 'roll', crash: true,
                    stab: 'x.....x.x.....x.', harm: true } },
    };
    const C_L1 = [
        B('E5 - - - G5 - - - A5 - G5 - E5 - - -'),
        B('E5 - - - A5 - - - C6 - B5 - A5 - - -'),
        B('A5 - - - F5 - - - A5 - C6 - A5 - - -'),
        B('B5 - - - D6 - - - B5 - G5 - D5 - - -'),
    ];
    const C_L2 = [
        B('G5 - - - C6 - - - E6 - D6 - C6 - - -'),
        B('E6 - - - C6 - - - A5 - C6 - E6 - - -'),
        B('C6 - - - A5 - - - F5 - A5 - C6 - - -'),
        B('D6 - - - B5 - G5 - D6 - - - . . . .'),
    ];
    const CREDITS = {
        bpm: 100, loopFrom: 0, leadVol: 0.13, duty: 0.5, leadWave: 'triangle', arpVol: 0.07, bassVol: 0.21, drumVol: 0.6, echo: 0.5,
        order: ['A', 'B'],
        sec: {
            A: { prog: B('C Am F G'), lead: C_L1, arp: 'slow', bass: 'r . . . . . r . r . . . . . . .', drums: null },
            B: { prog: B('C Am F G'), lead: C_L2, arp: 'wide', bass: 'r . . . . . r . r . . . . . o .', drums: 'lull', harm: true, duty: 0.5 },
        },
    };
    const OVER = {
        bpm: 76, loop: false, leadVol: 0.16, duty: 0.25, arpVol: 0, bassVol: 0.24, drumVol: 1, echo: 0.5,
        order: ['A'],
        sec: { A: { prog: B('Am Dm Am'), lead: [B('A5 - - - G5 - - - F5 - - - E5 - - -'), B('D5 - - - C5 - - - A4 - - - - - - -'), B('A4 - - - - - - - - - - - - - - -')],
                    bass: 'r . . . . . . . . . . . . . . .', drums: null, arp: null } },
    };

    /* ---------- warianty: poziom 2, finałowy boss, szał ---------- */
    function variant(base, over, secOver) {
        const v = Object.assign({}, base, over);
        v.sec = {};
        Object.keys(base.sec).forEach(k => { v.sec[k] = Object.assign({}, base.sec[k], secOver && secOver['*'], secOver && secOver[k]); });
        return v;
    }
    const SONGS = {
        title: TITLE, intro: INTRO, level: LEVEL, boss: BOSS, victory: VICTORY, credits: CREDITS, gameover: OVER,
        level2: variant(LEVEL, { bpm: 164, tp: 2, drumVol: 1.05, arpVol: 0.06, leadVol: 0.155 }, { A: { harm: true, stab: '..x...x...x...x.', drums: 'rock16' }, '*': {} }),
        finalboss: variant(BOSS, { bpm: 186, tp: 1, drumVol: 1.15, arpVol: 0.065, stabVol: 0.085 }, { '*': { harm: true }, A: { duty: 0.125 }, B: { drums: 'fury' } }),
        fury: variant(BOSS, { bpm: 210, tp: 3, drumVol: 1.2, arpVol: 0.075, stabVol: 0.09, leadVol: 0.16 },
            { '*': { harm: true, oct: true, drums: 'fury', bass: 'r r r r r r o r r r r r r o r o', stab: 'x.x.x.x.x.x.x.x.', arp: 'run' }, intro: { drums: 'fury' }, bridge: { drums: 'bossB', oct: false } }),
    };

    /* ---------- kompilacja utworu do taktów ze zdarzeniami na kroki ---------- */
    function compile(song) {
        if (song.bars) return song.bars;
        const tp = song.tp || 0, bars = [];
        song.loopFromBar = 0;
        song.order.forEach((name, si) => {
            const S = song.sec[name];
            if (si === (song.loopFrom || 0)) song.loopFromBar = bars.length;
            S.prog.forEach((cn, i) => {
                const ch = chord(cn), bar = { lead: {}, arp: {}, bass: {}, stab: null, drums: {}, duty: S.duty || song.duty, oct: !!S.oct, harm: !!S.harm };
                if (S.lead) {
                    const toks = S.lead[i % S.lead.length];
                    if (toks.length !== STEPS) throw new Error('takt ' + name + ' ' + i + ' ma ' + toks.length);
                    for (let s = 0; s < STEPS; s++) {
                        const t = toks[s];
                        if (t === '.' || t === '-') continue;
                        let len = 1;
                        while (s + len < STEPS && toks[s + len] === '-') len++;
                        const m = midi(t) + tp;
                        let hm = null;
                        if (S.harm) for (const d of [3, 4, 5, 7, 8, 9]) { if (ch.pcs.includes((((m - d - tp) % 12) + 12) % 12)) { hm = m - d; break; } }
                        bar.lead[s] = { m, n: len, hm };
                    }
                }
                if (S.arp && ARP[S.arp]) {
                    const tones = ch.tones.concat(ch.tones.map(x => x + 12));
                    ARP[S.arp].forEach((idx, s) => { if (idx !== null) bar.arp[s] = tones[idx % tones.length] + tp; });
                }
                if (S.bass) {
                    const r = ch.bass + tp, off = { r: 0, o: 12, f: 7, b: 10 };
                    B(S.bass).forEach((tk, s) => { if (off[tk] !== undefined) bar.bass[s] = r + off[tk]; });
                }
                if (S.stab) bar.stab = { steps: S.stab, tones: ch.tones.map(x => x + 12 + tp) };
                if (S.drums) {
                    let d = DR[S.drums];
                    if (S.fill && i === S.prog.length - 1) d = Object.assign({}, d, DR[S.fill]);
                    for (let s = 0; s < STEPS; s++) {
                        const hit = [];
                        const chk = (key, type) => { const c = d[key] && d[key][s]; if (c && c !== '.') hit.push({ type: type || key, acc: c === c.toUpperCase() && /[A-Z]/.test(c), c }); };
                        chk('k'); chk('s'); chk('h'); chk('o');
                        if (d.t && d.t[s] && d.t[s] !== '.') hit.push({ type: 't', tom: +d.t[s], acc: false });
                        if (s === 0 && i === 0 && S.crash) hit.push({ type: 'crash', acc: true });
                        if (hit.length) bar.drums[s] = hit;
                    }
                } else if (i === 0 && S.crash) bar.drums[0] = [{ type: 'crash', acc: true }];
                bars.push(bar);
            });
        });
        song.bars = bars;
        return bars;
    }

    /* =================================================================
       SILNIK (działa na dowolnym kontekście: żywym i offline)
       ================================================================= */
    function makeEngine(ctx) {
        const eng = { ctx, waves: {}, noise: null };
        const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = nb.getChannelData(0);
        let seed = 12345;
        for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }
        eng.noise = nb;
        eng.wave = (duty) => {                                  // fala prostokątna o zadanym wypełnieniu
            duty = Math.round(duty * 1000) / 1000;
            if (eng.waves[duty]) return eng.waves[duty];
            const N = 48, re = new Float32Array(N), im = new Float32Array(N);
            for (let n = 1; n < N; n++) {
                re[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
                im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
            }
            return (eng.waves[duty] = ctx.createPeriodicWave(re, im));
        };
        eng.pan = (v) => {
            if (!ctx.createStereoPanner) return null;
            const p = ctx.createStereoPanner(); p.pan.value = v; return p;
        };
        return eng;
    }
    /** Łączy węzły po kolei; zwraca ostatni. */
    function chain(...nodes) { for (let i = 0; i < nodes.length - 1; i++) nodes[i].connect(nodes[i + 1]); return nodes[nodes.length - 1]; }
    function biq(c, type, f, q) { const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q) b.Q.value = q; return b; }

    /** Master: kompresor "klejący" + limiter + głośność. Zwraca {input, master}. */
    function makeMaster(ctx, level) {
        const input = ctx.createGain();
        const glue = ctx.createDynamicsCompressor();
        glue.threshold.value = -20; glue.knee.value = 14; glue.ratio.value = 3.5; glue.attack.value = 0.006; glue.release.value = 0.16;
        const lim = ctx.createDynamicsCompressor();
        lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
        const master = ctx.createGain(); master.gain.value = level;
        chain(input, glue, lim, master, ctx.destination);
        return { input, master };
    }

    /** Szyna muzyki: głośność + półka basowa (nie dotyczy SFX). */
    function makeMusicBus(ctx, dest) {
        const bus = ctx.createGain(); bus.gain.value = 0.55;
        const shelf = ctx.createBiquadFilter(); shelf.type = 'lowshelf'; shelf.frequency.value = 150; shelf.gain.value = 5;
        bus.connect(shelf); shelf.connect(dest);
        bus._shelf = shelf;
        return bus;
    }

    /** Szyna utworu: lead (+echo), harmonia, arpeggio, bas, sub, stabsy, perkusja. */
    function makeTrackGraph(ctx, eng, out, song) {
        const g = {};
        const echoIn = ctx.createGain();
        const dly = ctx.createDelay(1); dly.delayTime.value = 60 / song.bpm * 0.75;     // ósemka z kropką
        const fb = ctx.createGain(); fb.gain.value = 0.38;
        const fbf = biq(ctx, 'lowpass', 2800);
        const echoOut = ctx.createGain(); echoOut.gain.value = 0.9;
        const ep = eng.pan(0.3);
        echoIn.connect(dly); dly.connect(fbf); fbf.connect(fb); fb.connect(dly); fbf.connect(echoOut);
        if (ep) { echoOut.connect(ep); ep.connect(out); } else echoOut.connect(out);
        const send = (bus, amt) => { const s = ctx.createGain(); s.gain.value = amt; bus.connect(s); s.connect(echoIn); };
        g.lead = ctx.createGain(); chain(g.lead, biq(ctx, 'highpass', 90), out); send(g.lead, song.echo);
        g.harm = ctx.createGain(); { const p = eng.pan(-0.4); chain(...[g.harm, p, out].filter(Boolean)); send(g.harm, song.echo * 0.6); }
        g.arp = ctx.createGain(); { const p = eng.pan(0.4); chain(...[g.arp, p, out].filter(Boolean)); send(g.arp, song.echo * 0.5); }
        g.bass = ctx.createGain(); g.bass.connect(out);
        g.sub = ctx.createGain(); g.sub.gain.value = 1;
        const subLp = biq(ctx, 'lowpass', 160, 0.65); g.sub.connect(subLp); subLp.connect(out);
        g.stab = ctx.createGain(); { const p = eng.pan(-0.25); chain(...[g.stab, biq(ctx, 'lowpass', 4200), p, out].filter(Boolean)); }
        g.drum = ctx.createGain(); g.drum.connect(out);
        g.dispose = () => { [g.lead, g.harm, g.arp, g.bass, g.sub, subLp, g.stab, g.drum, echoIn, dly, fb, fbf, echoOut].forEach(n => { try { n.disconnect(); } catch (e) { /* ok */ } }); };
        return g;
    }

    /* ---------- instrumenty ---------- */
    function adsr(g, t, peak, sus, dur, att, dec, rel) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + att);
        g.gain.linearRampToValueAtTime(peak * sus, t + att + dec);
        g.gain.setValueAtTime(peak * sus, t + Math.max(att + dec, dur));
        g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    }
    /** Prawdziwy puls z PWM: piła minus opóźniona, odwrócona piła; czas opóźnienia (wypełnienie) moduluje LFO. */
    function pwmVoice(c, dest, t, dur, f, duty, cents, pwmRate, pwmDepth, vibCents, vibDelay) {
        const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = f; osc.detune.value = cents;
        const inv = c.createGain(); inv.gain.value = -1;
        const dl = c.createDelay(0.05); dl.delayTime.value = duty / f;
        const mix = c.createGain(); mix.gain.value = 0.5;
        osc.connect(mix); osc.connect(inv); inv.connect(dl); dl.connect(mix); mix.connect(dest);
        const lfo = c.createOscillator(); lfo.frequency.value = pwmRate;
        const lg = c.createGain(); lg.gain.value = pwmDepth * duty / f;
        lfo.connect(lg); lg.connect(dl.delayTime);
        lfo.start(t); lfo.stop(t + dur + 0.1);
        if (vibCents) {
            const v = c.createOscillator(); v.frequency.value = 5.6;
            const vg = c.createGain(); vg.gain.setValueAtTime(0, t); vg.gain.setValueAtTime(0, t + vibDelay); vg.gain.linearRampToValueAtTime(vibCents, t + vibDelay + 0.18);
            v.connect(vg); vg.connect(osc.detune); v.start(t); v.stop(t + dur + 0.1);
        }
        osc.start(t); osc.stop(t + dur + 0.1);
    }
    function leadNote(eng, bus, t, m, dur, vol, o) {
        const c = eng.ctx, f = mtof(m);
        if (o.wave === 'triangle') { basic(eng, bus, t, m, dur, vol * 1.4, 'triangle'); return; }
        const env = c.createGain(); adsr(env, t, vol, 0.8, dur, 0.007, 0.09, 0.07);
        const lp = biq(c, 'lowpass', Math.min(9000, f * 5 + 1800), 0.7);
        chain(lp, env, bus);
        const duty = o.duty || 0.25, rate = 3 + (m % 5) * 0.4;
        pwmVoice(c, lp, t, dur + 0.07, f, duty, -6, rate, 0.4, dur > 0.25 ? 13 : 0, 0.1);
        pwmVoice(c, lp, t, dur + 0.07, f, Math.min(0.5, duty * 1.6), +6, rate * 1.3, 0.3, dur > 0.25 ? 10 : 0, 0.12);
    }
    function pluck(eng, bus, t, m, dur, vol, duty) {
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain();
        o.setPeriodicWave(eng.wave(duty)); o.frequency.value = mtof(m);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(vol * 0.28, t + dur * 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.03);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    }
    function basic(eng, bus, t, m, dur, vol, type) {
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = mtof(m);
        adsr(g, t, vol, 0.8, dur, 0.01, 0.1, 0.12); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.2);
    }
    function bassNote(eng, bus, t, m, dur, vol, subBus) {
        const c = eng.ctx, f = biq(c, 'lowpass', 2600, 1.2);
        f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(650, t + 0.12);
        const g = c.createGain(); adsr(g, t, vol, 0.78, dur, 0.003, 0.08, 0.03); chain(f, g, bus);
        [[eng.wave(0.3), 1, 0], [null, 0.75, -12]].forEach(([w, v, off]) => {
            const o = c.createOscillator(), og = c.createGain(); if (w) o.setPeriodicWave(w); else o.type = 'triangle';
            o.frequency.value = mtof(m + off); og.gain.value = v; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.06);
        });
        if (subBus) {                                          // osobny sub: sine oktawę niżej, ciasny dolnoprzepust
            const lp = biq(c, 'lowpass', 140, 0.7);
            const sg = c.createGain(); adsr(sg, t, vol * 0.7, 0.9, dur, 0.006, 0.1, 0.06);
            chain(lp, sg, subBus);
            const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = mtof(m - 12);
            o.connect(lp); o.start(t); o.stop(t + dur + 0.08);
        }
    }
    /** Lekkie przyciszenie suba pod stopę (miejsce na kick, bez dziury w basie). */
    function duckSub(bus, t) {
        if (!bus) return;
        const g = bus.gain, att = 0.012, rel = 0.1;
        try { g.cancelAndHoldAtTime(t); } catch (e) { g.cancelScheduledValues(t); g.setValueAtTime(1, t); }
        g.linearRampToValueAtTime(0.32, t + att);
        g.linearRampToValueAtTime(1, t + att + rel);
    }
    function stabHit(eng, bus, t, tones, dur, vol) {
        const c = eng.ctx, f = biq(c, 'lowpass', 3200, 1);
        f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + dur);
        const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.02); chain(f, g, bus);
        tones.forEach((m) => {
            const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = (m % 3 - 1) * 7;
            const og = c.createGain(); og.gain.value = 1 / tones.length; o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05);
        });
    }

    /* ---------- perkusja ---------- */
    function noiseHit(eng, bus, t, dur, vol, ftype, f0, f1, q, att) {
        const c = eng.ctx, s = c.createBufferSource(); s.buffer = eng.noise;
        const f = biq(c, ftype, f0, q || 0.8); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
        const g = c.createGain();
        if (att) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); } else g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 1.2); s.stop(t + dur + 0.02);
    }
    function tone(eng, bus, t, type, f0, f1, dur, vol, att) {
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain();
        if (type) o.type = type;
        o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
        if (att) { g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + att); } else g.gain.setValueAtTime(vol, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.03);
    }
    function kick(eng, bus, t, vol) {
        tone(eng, bus, t, 'sine', 175, 46, 0.14, vol);                         // ciało (opadająca wysokość)
        tone(eng, bus, t, 'sine', 62, 44, 0.24, vol * 0.7);                    // dudnienie
        noiseHit(eng, bus, t, 0.012, vol * 0.5, 'highpass', 2500);             // klik uderzenia
    }
    function snare(eng, bus, t, vol) {
        noiseHit(eng, bus, t, 0.17, vol * 0.55, 'bandpass', 2200, 1500, 0.6);  // druty
        noiseHit(eng, bus, t, 0.05, vol * 0.4, 'highpass', 5000);              // trzask
        tone(eng, bus, t, 'triangle', 235, 140, 0.09, vol * 0.45);             // ciało
    }
    function hat(eng, bus, t, vol, open) {
        noiseHit(eng, bus, t, open ? 0.2 : 0.035, vol, 'highpass', open ? 6200 : 7500, 0, 0.7);
        if (!open) noiseHit(eng, bus, t, 0.02, vol * 0.5, 'bandpass', 10000, 0, 1.2);
    }
    function tom(eng, bus, t, vol, n) {
        const f = [215, 160, 115][n - 1] || 160;
        tone(eng, bus, t, 'sine', f * 1.35, f * 0.75, 0.2, vol);
        noiseHit(eng, bus, t, 0.03, vol * 0.3, 'bandpass', 900);
    }
    function crash(eng, bus, t, vol) {
        noiseHit(eng, bus, t, 1.5, vol * 0.4, 'highpass', 4800, 0, 0.5);
        noiseHit(eng, bus, t, 0.5, vol * 0.3, 'bandpass', 8000, 0, 1.5);
    }

    /** Planuje jeden krok utworu. Zwraca false, gdy utwór jednorazowy dobiegł końca. */
    function scheduleStep(eng, B, song, g, t, stepDur) {
        const bars = compile(song), n = bars.length, lf = song.loopFromBar;
        let bi = Math.floor(g / STEPS);
        const s = g % STEPS;
        if (bi >= n) { if (song.loop === false) return false; bi = lf + ((bi - lf) % (n - lf)); }
        const e = bars[bi];
        const L = e.lead[s];
        if (L) {
            const dur = Math.max(0.07, L.n * stepDur * (L.n > 1 ? 0.95 : 0.8));
            const opt = { duty: e.duty, wave: song.leadWave };
            leadNote(eng, B.lead, t, L.m, dur, song.leadVol, opt);
            if (e.oct) leadNote(eng, B.lead, t, L.m - 12, dur, song.leadVol * 0.7, { duty: 0.5 });
            if (L.hm !== null && L.hm !== undefined) leadNote(eng, B.harm, t, L.hm, dur, song.leadVol * 0.5, { duty: 0.5, wave: song.leadWave });
        }
        if (e.arp[s] !== undefined) {
            if (song.arpWave) basic(eng, B.arp, t, e.arp[s], stepDur * 2.6, song.arpVol, song.arpWave);
            else pluck(eng, B.arp, t, e.arp[s], stepDur * 0.9, song.arpVol, 0.125);
        }
        if (e.bass[s] !== undefined) bassNote(eng, B.bass, t, e.bass[s], stepDur * 0.9, song.bassVol, B.sub);
        if (e.stab && e.stab.steps[s] === 'x') stabHit(eng, B.stab, t, e.stab.tones, stepDur * 1.7, song.stabVol || 0.06);
        const dv = song.drumVol || 1;
        (e.drums[s] || []).forEach((h) => {
            const a = h.acc ? 1.25 : 1;
            if (h.type === 'k') { kick(eng, B.drum, t, 0.5 * dv * a); duckSub(B.sub, t); }
            else if (h.type === 's') snare(eng, B.drum, t, 0.4 * dv * a * (h.c === 'g' ? 0.4 : 1));
            else if (h.type === 'h') hat(eng, B.drum, t, 0.075 * dv * a * (s % 4 === 0 ? 1 : s % 2 === 0 ? 0.75 : 0.5), false);
            else if (h.type === 'o') hat(eng, B.drum, t, 0.08 * dv, true);
            else if (h.type === 't') tom(eng, B.drum, t, 0.45 * dv, h.tom);
            else if (h.type === 'crash') crash(eng, B.drum, t, 0.5 * dv);
        });
        return true;
    }

    /* =================================================================
       EFEKTY: gra, transformacja (ładowanie -> grzmot -> iskry -> power chord), auto
       ================================================================= */
    function sfxCharge(eng, bus, t, dur) {                            // narastające ładowanie, kończy się dokładnie w t+dur
        const c = eng.ctx, end = t + dur;
        const lp = biq(c, 'lowpass', 250, 2); lp.frequency.setValueAtTime(250, t); lp.frequency.exponentialRampToValueAtTime(7000, end);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.26, end - 0.02); g.gain.linearRampToValueAtTime(0.0001, end + 0.03);
        chain(lp, g, bus);
        [['sawtooth', 70, 1500, 0.7, 0], ['square', 105, 2250, 0.32, 14], ['sawtooth', 35, 750, 0.5, -9]].forEach(([type, f0, f1, v, det]) => {
            const o = c.createOscillator(), og = c.createGain(); o.type = type; o.detune.value = det; og.gain.value = v;
            o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, end);
            o.connect(og); og.connect(lp); o.start(t); o.stop(end + 0.05);
        });
        noiseHit(eng, bus, t, dur, 0.34, 'bandpass', 250, 5500, 1.6, dur * 0.9);                       // świst
        const sh = c.createOscillator(), sg = c.createGain(), tr = c.createGain(), lf = c.createOscillator(), lg = c.createGain();   // mieniący się pisk z tremolem
        sh.type = 'sine'; sh.frequency.setValueAtTime(1500, t); sh.frequency.exponentialRampToValueAtTime(5400, end);
        sg.gain.setValueAtTime(0.0001, t); sg.gain.exponentialRampToValueAtTime(0.1, end - 0.02); sg.gain.linearRampToValueAtTime(0.0001, end + 0.02);
        tr.gain.value = 0.55; lf.frequency.setValueAtTime(12, t); lf.frequency.linearRampToValueAtTime(34, end); lg.gain.value = 0.45;
        lf.connect(lg); lg.connect(tr.gain); chain(sh, tr, sg, bus); sh.start(t); sh.stop(end + 0.05); lf.start(t); lf.stop(end + 0.05);
        const sub = c.createOscillator(), subg = c.createGain(); sub.type = 'sine'; sub.frequency.setValueAtTime(40, t); sub.frequency.exponentialRampToValueAtTime(140, end);
        subg.gain.setValueAtTime(0.0001, t); subg.gain.exponentialRampToValueAtTime(0.4, end - 0.02); subg.gain.linearRampToValueAtTime(0.0001, end + 0.03);
        chain(sub, subg, bus); sub.start(t); sub.stop(end + 0.05);
    }
    function sfxThunder(eng, bus, t) {                                  // trzask + dudniący grom
        noiseHit(eng, bus, t, 0.1, 0.85, 'highpass', 1500, 0, 0.7);                                  // trzask
        noiseHit(eng, bus, t, 0.38, 0.6, 'bandpass', 3200, 900, 1.2);
        tone(eng, bus, t, 'sawtooth', 4800, 180, 0.28, 0.2);                                         // elektryczny "zap"
        noiseHit(eng, bus, t + 0.03, 2.6, 0.75, 'lowpass', 520, 45, 0.7, 0.05);                      // grzmot
        noiseHit(eng, bus, t + 0.5, 1.2, 0.42, 'lowpass', 380, 50, 0.7, 0.08);                       // odbicia
        noiseHit(eng, bus, t + 1.0, 1.3, 0.3, 'lowpass', 300, 45, 0.7, 0.1);
        tone(eng, bus, t, 'sine', 64, 26, 1.9, 0.6, 0.03);                                           // sub
    }
    function sfxSparkle(eng, bus, t, dur) {                             // błyszczące arpeggio w górę (pentatonika E-dur)
        const sc = [76, 79, 83, 86, 88, 91, 95, 98, 100, 103], n = Math.max(3, Math.round(dur / 0.055));
        for (let i = 0; i < n; i++) {
            const m = sc[Math.min(sc.length - 1, Math.floor(i * sc.length / n * 1.0))] + (i % 2 ? 0 : 0), tt = t + i * dur / n;
            const o = eng.ctx.createOscillator(), g = eng.ctx.createGain(), o2 = eng.ctx.createOscillator(), g2 = eng.ctx.createGain();
            o.setPeriodicWave(eng.wave(0.125)); o.frequency.value = mtof(m); o2.type = 'sine'; o2.frequency.value = mtof(m + 12);
            g.gain.setValueAtTime(0.0001, tt); g.gain.linearRampToValueAtTime(0.1, tt + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.22);
            g2.gain.setValueAtTime(0.0001, tt); g2.gain.linearRampToValueAtTime(0.05, tt + 0.004); g2.gain.exponentialRampToValueAtTime(0.0001, tt + 0.3);
            o.connect(g); o2.connect(g2); [g, g2].forEach(x => { x.connect(bus); if (eng.fx) x.connect(eng.fx); });
            o.start(tt); o.stop(tt + 0.26); o2.start(tt); o2.stop(tt + 0.34);
        }
    }
    function sfxReveal(eng, bus, t) {                                   // power chord przy odsłonięciu
        const c = eng.ctx;
        kick(eng, bus, t, 0.95); tone(eng, bus, t, 'sine', 95, 34, 0.7, 0.6);
        noiseHit(eng, bus, t, 1.5, 0.42, 'highpass', 3500, 0, 0.5);
        const lp = biq(c, 'lowpass', 7000, 1); lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(1100, t + 1.3);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.26, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
        chain(lp, g, bus); if (eng.fx) g.connect(eng.fx);
        [40, 47, 52, 56, 59, 64].forEach((m, i) => {
            [['sawtooth', 0.7, -7], ['square', 0.45, 7]].forEach(([type, v, det]) => {
                const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = mtof(m); o.detune.value = det; og.gain.value = v / 4;
                o.connect(og); og.connect(lp); o.start(t); o.stop(t + 1.8);
            });
        });
        sfxSparkle(eng, bus, t + 0.05, 0.4);
    }
    function sfxBrake(eng, bus, t, dur) {                               // pisk hamulców + poślizg opon
        const c = eng.ctx, end = t + dur;
        const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(2700, t); o.frequency.exponentialRampToValueAtTime(1750, end);
        const wob = c.createOscillator(), wg = c.createGain(); wob.frequency.value = 38; wg.gain.value = 55; wob.connect(wg); wg.connect(o.frequency);
        const bp = biq(c, 'bandpass', 2700, 14); bp.frequency.setValueAtTime(2700, t); bp.frequency.exponentialRampToValueAtTime(1750, end);
        const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.16, t + 0.06); g.gain.setValueAtTime(0.16, end - 0.2); g.gain.linearRampToValueAtTime(0.0001, end);
        chain(o, bp, g, bus); o.start(t); o.stop(end + 0.02); wob.start(t); wob.stop(end + 0.02);
        const o2 = c.createOscillator(); o2.type = 'square'; o2.frequency.setValueAtTime(3500, t); o2.frequency.exponentialRampToValueAtTime(2300, end);
        const b2 = biq(c, 'bandpass', 3500, 18); b2.frequency.setValueAtTime(3500, t); b2.frequency.exponentialRampToValueAtTime(2300, end);
        const g2 = c.createGain(); g2.gain.setValueAtTime(0.0001, t + 0.05); g2.gain.linearRampToValueAtTime(0.06, t + 0.12); g2.gain.linearRampToValueAtTime(0.0001, end - 0.05);
        chain(o2, b2, g2, bus); o2.start(t); o2.stop(end + 0.02);
        noiseHit(eng, bus, t, dur, 0.26, 'bandpass', 1400, 700, 0.9, 0.05);
        noiseHit(eng, bus, t, dur, 0.18, 'lowpass', 500, 200, 0.7);
    }
    function sfxSlam(eng, bus, t) {                                     // trzaśnięcie drzwiami
        tone(eng, bus, t, 'sine', 150, 48, 0.2, 0.75);
        noiseHit(eng, bus, t, 0.11, 0.6, 'bandpass', 450, 0, 1);
        noiseHit(eng, bus, t, 0.03, 0.6, 'highpass', 2500);
        tone(eng, bus, t, 'square', 2400, 1100, 0.04, 0.12);
        noiseHit(eng, bus, t + 0.012, 0.22, 0.12, 'bandpass', 3200, 0, 6);                            // metal
        noiseHit(eng, bus, t + 0.08, 0.025, 0.35, 'highpass', 3500);                                 // zatrzask
    }

    /** Silnik auta: piła + prostokąt (sub) + piła 2x -> przester -> filtr; AM "dudnienie", szum powietrza/opon.
        set(t, {speed 0..1.3, pan -1..1, vol, pitch}) - płynne przejścia; stop(t, fade). */
    function carVoice(eng, dest, t0) {
        const c = eng.ctx;
        const out = c.createGain(); out.gain.value = 0.0001;
        const pan = eng.pan(0), amp = c.createGain(); amp.gain.value = 1;
        if (pan) chain(out, pan, dest); else out.connect(dest);
        const curve = new Float32Array(512); for (let i = 0; i < 512; i++) { const x = i / 256 - 1; curve[i] = Math.tanh(x * 3.2); }
        const sh = c.createWaveShaper(); sh.curve = curve;
        const lp = biq(c, 'lowpass', 600, 3);
        const am = c.createGain(); am.gain.value = 0.72;
        const mix = c.createGain(); mix.gain.value = 0.5;
        chain(mix, sh, lp, am, out);
        const oscs = [['sawtooth', 1, 0.8, 0], ['square', 0.5, 0.7, 0], ['sawtooth', 2, 0.3, 11]].map(([type, mul, v, det]) => {
            const o = c.createOscillator(); o.type = type; o.detune.value = det; o.frequency.value = 40 * mul;
            const og = c.createGain(); og.gain.value = v; o.connect(og); og.connect(mix); o.start(t0);
            return { o, mul, det };
        });
        const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 10; lg.gain.value = 0.26; lfo.connect(lg); lg.connect(am.gain); lfo.start(t0);
        const ns = c.createBufferSource(); ns.buffer = eng.noise; ns.loop = true;
        const nf = biq(c, 'bandpass', 700, 0.8), ng = c.createGain(); ng.gain.value = 0;
        chain(ns, nf, ng, out); ns.start(t0);
        const st = { speed: 0.1, pan: 0, vol: 1, pitch: 1 };
        const T = 0.07;
        const v = {
            set(t, o) {
                Object.assign(st, o);
                const sp = Math.max(0, Math.min(1.4, st.speed));
                const f0 = 36 + 78 * sp, cents = 1200 * Math.log2(st.pitch || 1);
                oscs.forEach(x => { x.o.frequency.setTargetAtTime(f0 * x.mul, t, T); x.o.detune.setTargetAtTime(x.det + cents, t, T); });
                lp.frequency.setTargetAtTime(360 + 1900 * sp, t, T);
                lfo.frequency.setTargetAtTime(7 + 15 * sp, t, T);
                nf.frequency.setTargetAtTime(500 + 900 * sp, t, T);
                ng.gain.setTargetAtTime(0.05 + 0.2 * sp, t, T);
                out.gain.setTargetAtTime(Math.max(0.0001, 0.3 * st.vol), t, T);
                if (pan) pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, st.pan)), t, T);
            },
            stop(t, fade) {
                fade = fade || 0.3;
                out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0.0001, t, fade / 3);
                oscs.forEach(x => x.o.stop(t + fade * 2 + 0.2)); lfo.stop(t + fade * 2 + 0.2); ns.stop(t + fade * 2 + 0.2);
                v.endTime = t + fade * 2 + 0.3;
            },
            node: out,
        };
        v.set(t0, {});
        return v;
    }

    function playSfx(eng, bus, name, t, o) {
        o = o || {};
        const sweep = (type, f0, f1, dur, vol, wave) => {
            const c = eng.ctx, os = c.createOscillator(), g = c.createGain();
            if (wave) os.setPeriodicWave(eng.wave(wave)); else os.type = type;
            os.frequency.setValueAtTime(f0, t); os.frequency.exponentialRampToValueAtTime(f1, t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            os.connect(g); g.connect(bus); os.start(t); os.stop(t + dur + 0.02);
        };
        switch (name) {
            case 'jump': sweep(null, 280, 760, 0.13, 0.13, 0.25); break;
            case 'sword': noiseHit(eng, bus, t, 0.13, 0.22, 'bandpass', 3200, 800, 1.2); break;
            case 'hurt': sweep('square', 330, 70, 0.3, 0.16); noiseHit(eng, bus, t, 0.18, 0.18, 'lowpass', 1500, 200); break;
            case 'kill': sweep(null, 700, 180, 0.16, 0.14, 0.125); noiseHit(eng, bus, t, 0.08, 0.1, 'highpass', 3000); break;
            case 'heart': [660, 880, 1320].forEach((f, i) => { const c = eng.ctx, os = c.createOscillator(), g = c.createGain(); os.setPeriodicWave(eng.wave(0.5)); os.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t + i * 0.06); g.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.1);
                os.connect(g); g.connect(bus); os.start(t + i * 0.06); os.stop(t + i * 0.06 + 0.12); }); break;
            case 'boost': sweep('square', 330, 1320, 0.22, 0.12, 0.25); sweep(null, 660, 2640, 0.2, 0.08, 0.125); noiseHit(eng, bus, t, 0.14, 0.12, 'highpass', 4000); break;
            case 'lifelost': {                                  // "smutna trąbka": wah-wah-wah-waaah, pulsowa fala + vibrato + filtr "wah"
                const notes = [[233, 0.00, 0.17, 220], [220, 0.19, 0.17, 207], [208, 0.38, 0.17, 196], [196, 0.57, 0.62, 150]];
                notes.forEach(([f, st, d, fEnd], i) => {
                    const c = eng.ctx, os = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(), t0 = t + st, last = i === notes.length - 1;
                    os.setPeriodicWave(eng.wave(0.3));
                    os.frequency.setValueAtTime(f, t0);
                    if (last) os.frequency.setValueAtTime(f, t0 + 0.12); os.frequency.exponentialRampToValueAtTime(fEnd, t0 + d);   // ostatnia nuta zjeżdża w dół
                    const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = last ? 6.5 : 0.1; lg.gain.value = last ? f * 0.035 : 0;
                    lfo.connect(lg); lg.connect(os.frequency); lfo.start(t0); lfo.stop(t0 + d + 0.05);
                    lp.type = 'lowpass'; lp.Q.value = 5;                                        // "wah": filtr otwiera się i przymyka
                    lp.frequency.setValueAtTime(350, t0); lp.frequency.exponentialRampToValueAtTime(last ? 1500 : 1900, t0 + d * 0.45); lp.frequency.exponentialRampToValueAtTime(last ? 300 : 600, t0 + d);
                    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.2, t0 + 0.02); g.gain.setValueAtTime(0.2, t0 + d * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.04);
                    os.connect(lp); lp.connect(g); g.connect(bus); os.start(t0); os.stop(t0 + d + 0.06);
                });
                break;
            }
            case 'haha': [0, 0.15, 0.3].forEach((st, i) => {                                // "ha ha ha": krótkie pulsy z szumem, lekko opadająca wysokość
                const c = eng.ctx, os = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(), t0 = t + st;
                os.setPeriodicWave(eng.wave(0.5)); os.frequency.setValueAtTime(300 - i * 25, t0); os.frequency.exponentialRampToValueAtTime(230 - i * 25, t0 + 0.1);
                bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 1.4;
                g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.16, t0 + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
                os.connect(bp); bp.connect(g); g.connect(bus); os.start(t0); os.stop(t0 + 0.13);
                noiseHit(eng, bus, t0, 0.08, 0.07, 'bandpass', 2200, 900, 1);
            }); break;
            case 'bossHit': kick(eng, bus, t, 0.9); noiseHit(eng, bus, t, 0.3, 0.3, 'lowpass', 2500, 150); sweep('sawtooth', 220, 60, 0.3, 0.12); break;
            case 'cross': sweep(null, 1100, 420, 0.22, 0.1, 0.125); sweep('triangle', 550, 210, 0.22, 0.1); break;
            case 'carHit': noiseHit(eng, bus, t, 0.12, 0.3, 'bandpass', 2400, 700, 2); sweep('triangle', 520, 380, 0.15, 0.12); break;
            case 'explosion': noiseHit(eng, bus, t, 1.3, 0.55, 'lowpass', 2200, 90, 0.7); sweep('sine', 90, 28, 0.9, 0.5); noiseHit(eng, bus, t, 0.25, 0.3, 'highpass', 2500); break;
            case 'rush': noiseHit(eng, bus, t, 2.0, 0.25, 'bandpass', 250, 3200, 1.5); break;
            case 'stomp': sweep('sine', 320, 90, 0.14, 0.4); break;
            case 'click': sweep(null, 900, 700, 0.05, 0.1, 0.5); break;
            case 'charge': sfxCharge(eng, bus, t, o.dur || 1.2); break;
            case 'lightning': case 'thunder': sfxThunder(eng, bus, t); break;
            case 'sparkle': sfxSparkle(eng, bus, t, o.dur || 0.5); break;
            case 'reveal': sfxReveal(eng, bus, t); break;
            case 'brake': sfxBrake(eng, bus, t, o.dur || 0.75); break;
            case 'slam': sfxSlam(eng, bus, t); break;
            case 'punch': noiseHit(eng, bus, t, 0.09, 0.34, 'lowpass', 1800, 180, 0.8); sweep('sine', 190, 70, 0.12, 0.34); break;        // gluchy cios piescia
            case 'throw': sweep('triangle', 420, 1500, 0.2, 0.1); noiseHit(eng, bus, t, 0.2, 0.12, 'bandpass', 1800, 4200, 1.4); break;   // swist rzutu kastetu
            case 'clang': sweep('square', 1500, 1100, 0.12, 0.1, 0.25); sweep('triangle', 2300, 1700, 0.18, 0.08); noiseHit(eng, bus, t, 0.06, 0.2, 'highpass', 3500); break;   // miecz odbija kastet
            default: break;
        }
    }

    /* =================================================================
       ŻYWY KONTEKST, wyciszenie, odblokowanie, sekwencer
       ================================================================= */
    const KEY = 'fibi_muted';
    let muted = false;
    try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* brak localStorage */ }
    const listeners = new Set();
    let ctx = null, eng = null, master = null, musicBus = null, sfxBus = null;
    let want = null, cur = null, timer = null, unlocked = false;
    const LEVEL_MASTER = 0.8;

    /** Szyna efektów: sfxBus (+echo dla iskier) -> wejście mastera. */
    function makeSfxBus(c, e, input) {
        const bus = c.createGain(); bus.gain.value = 0.8; bus.connect(input);
        const fx = c.createGain(), dl = c.createDelay(1); dl.delayTime.value = 0.13;
        const fb = c.createGain(); fb.gain.value = 0.38; const f = biq(c, 'lowpass', 3500);
        const fo = c.createGain(); fo.gain.value = 0.55;
        fx.connect(dl); dl.connect(f); f.connect(fb); fb.connect(dl); f.connect(fo); fo.connect(bus);
        e.fx = fx;
        return bus;
    }

    function ensure() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        eng = makeEngine(ctx);
        const M = makeMaster(ctx, muted ? 0 : LEVEL_MASTER);
        master = M.master;
        musicBus = makeMusicBus(ctx, M.input);
        sfxBus = makeSfxBus(ctx, eng, M.input);
        return ctx;
    }

    function tick() {
        const c = cur;
        if (!c || !ctx) return;
        const stepDur = 60 / c.song.bpm / 4;
        if (c.time < ctx.currentTime - 0.3) c.time = ctx.currentTime + 0.03;       // po wstrzymaniu karty
        while (c.time < ctx.currentTime + 0.25) {
            if (!scheduleStep(eng, c.graph, c.song, c.step, c.time, stepDur)) {
                clearInterval(timer); timer = null;
                const nx = c.song.next, g = c.graph; cur = null;
                setTimeout(() => g.dispose(), 4000);
                if (nx) startTrack(nx);
                return;
            }
            c.step++; c.time += stepDur;
        }
    }
    function stopTrack(fade) {
        if (timer) { clearInterval(timer); timer = null; }
        if (cur && ctx) {
            const b = cur.bus, g = cur.graph, t = ctx.currentTime, f = fade || 0.12;
            b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0.0001, t + f);
            setTimeout(() => { try { b.disconnect(); g.dispose(); } catch (e) { /* ok */ } }, f * 1000 + 1500);
        }
        cur = null;
    }
    function startTrack(name) {
        const song = SONGS[name];
        if (!song || !ctx) return;
        stopTrack(0.12);
        const bus = ctx.createGain(); bus.connect(musicBus);
        const graph = makeTrackGraph(ctx, eng, bus, song);
        compile(song);
        cur = { name, song, bus, graph, step: 0, time: ctx.currentTime + 0.08 };
        timer = setInterval(tick, 30);
        tick();
    }

    const NOOP_ENGINE = { set() {}, stop() {} };
    const api = {
        SONGS,
        get ctx() { return ctx; },
        get muted() { return muted; },
        get current() { return cur ? cur.name : null; },
        get wanted() { return want; },
        get master() { return master; },
        unlock() {
            ensure();
            if (!ctx) return;
            const go = () => {
                unlocked = ctx.state === 'running';
                if (unlocked && want && (!cur || cur.name !== want)) startTrack(want);
            };
            if (ctx.state === 'running') go(); else ctx.resume().then(go, () => {});
        },
        play(name) {
            want = name;
            if (ctx && ctx.state === 'running') { if (!cur || cur.name !== name) startTrack(name); }
        },
        stop(fade) { want = null; stopTrack(fade); },
        sfx(name, opts) {
            if (!ctx || ctx.state !== 'running' || muted) return;
            const o = typeof opts === 'number' ? { dur: opts } : (opts || {});
            try {
                playSfx(eng, sfxBus, name, ctx.currentTime + 0.005, o);
                if (name === 'thunder' || name === 'lightning') api.duck(0.3, 2.0);
                else if (name === 'reveal') api.duck(0.4, 1.4);
            } catch (e) { /* dźwięk nie może wywalić gry */ }
        },
        /** Silnik auta: uchwyt z set({speed,pan,vol,pitch}) i stop(fade). */
        carEngine() {
            if (!ctx || ctx.state !== 'running') return NOOP_ENGINE;
            try {
                const v = carVoice(eng, sfxBus, ctx.currentTime + 0.005);
                return { set(o) { try { v.set(ctx.currentTime, o); } catch (e) { /* ok */ } }, stop(fade) { try { v.stop(ctx.currentTime, fade); } catch (e) { /* ok */ } } };
            } catch (e) { return NOOP_ENGINE; }
        },
        duck(level, dur) {
            if (!ctx || !musicBus) return;
            const t = ctx.currentTime, g = musicBus.gain;
            g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.55 * level, t + 0.04);
            g.setValueAtTime(0.55 * level, t + dur * 0.5); g.linearRampToValueAtTime(0.55, t + dur);
        },
        setMuted(v) {
            muted = !!v;
            try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ok */ }
            if (master) master.gain.setTargetAtTime(muted ? 0 : LEVEL_MASTER, ctx.currentTime, 0.02);
            listeners.forEach(fn => fn(muted));
        },
        toggleMute() { api.setMuted(!muted); return muted; },
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        /** Renderuje offline: Promise<[L, R]> (Float32Array) o długości `seconds`. Utwór albo sfx_transform / sfx_car_arrive / sfx_car_passby / sfx_lifelost. */
        render(name, seconds, sampleRate) {
            const sr = sampleRate || 44100;
            const isSfx = /^sfx_/.test(name);
            const len = isSfx ? ({ sfx_transform: 6.2, sfx_car_arrive: 4.3, sfx_car_passby: 5.3, sfx_lifelost: 2.0 }[name] || 5) : seconds;
            const oc = new OfflineAudioContext(2, Math.round(len * sr), sr);
            const e = makeEngine(oc);
            const M = makeMaster(oc, LEVEL_MASTER);
            if (isSfx) {
                const bus = makeSfxBus(oc, e, M.input);
                if (name === 'sfx_transform') {                          // jak w intro: ładowanie 1,45 s -> grzmot -> iskry -> power chord
                    playSfx(e, bus, 'charge', 0.2, { dur: 1.45 }); playSfx(e, bus, 'thunder', 1.65, {});
                    playSfx(e, bus, 'sparkle', 2.25, { dur: 0.45 }); playSfx(e, bus, 'reveal', 2.7, {});
                } else if (name === 'sfx_car_arrive') {                  // wjazd na arenę (Quad.out 1,7 s), hamowanie, wysiadanie
                    const v = carVoice(e, bus, 0.1), T = 1.7;
                    for (let t = 0; t <= T + 0.4; t += 0.04) {
                        const p = Math.min(1, t / T), vel = 1 - p;
                        v.set(0.1 + t, { speed: Math.max(0.1, Math.min(1.3, vel * 1.5)), pan: -1 + 1.4 * (1 - vel * vel), vol: 0.55 + 0.45 * p, pitch: 1 });
                    }
                    playSfx(e, bus, 'brake', 0.1 + T - 0.55, { dur: 0.8 });
                    v.stop(0.1 + T + 0.5, 0.4);
                    playSfx(e, bus, 'slam', 2.75, {});
                } else if (name === 'sfx_lifelost') {                    // jak w grze: puzon wah-wah (0,05 s) -> śmiech Kamila (0,85 s po utracie życia)
                    playSfx(e, bus, 'lifelost', 0.05, {}); playSfx(e, bus, 'haha', 0.95, {});
                } else if (name === 'sfx_car_passby') {                  // przejazd w intro: 170 px/s przez cały ekran
                    const v = carVoice(e, bus, 0.1);
                    for (let t = 0; t <= 4.5; t += 0.04) {
                        const x = -130 + 170 * t, rel = (x - 284) / 284;
                        v.set(0.1 + t, { speed: 0.85, pan: Math.max(-1, Math.min(1, rel * 0.9)), vol: Math.max(0.35, 1 - 0.55 * Math.min(1, Math.abs(rel))), pitch: 1 - 0.09 * Math.tanh(2.4 * rel) });
                    }
                    v.stop(4.7, 0.3);
                }
            } else {
                const song = SONGS[name], mus = makeMusicBus(oc, M.input);
                const B = makeTrackGraph(oc, e, mus, song), stepDur = 60 / song.bpm / 4;
                for (let g = 0, t = 0.02; t < len; g++, t += stepDur) if (!scheduleStep(e, B, song, g, t, stepDur)) break;
            }
            return oc.startRendering().then(b => [b.getChannelData(0), b.getChannelData(1)]);
        },
    };
    window.FibiAudio = api;

    /* odblokowanie po pierwszym geście + skrót M + wstrzymanie w tle */
    const gesture = () => { api.unlock(); if (unlocked) ['pointerdown', 'keydown', 'touchend', 'mousedown'].forEach(n => window.removeEventListener(n, gesture, true)); };
    ['pointerdown', 'keydown', 'touchend', 'mousedown'].forEach(n => window.addEventListener(n, gesture, true));
    window.addEventListener('keydown', (ev) => {
        const typing = ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.id === 'fibi-nick-input');
        if (!typing && (ev.key === 'm' || ev.key === 'M') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.repeat) api.toggleMute();
    }, true);
    document.addEventListener('visibilitychange', () => {
        if (!ctx || !unlocked) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
    });
})();
