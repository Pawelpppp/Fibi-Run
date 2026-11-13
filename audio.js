'use strict';
/* =====================================================================
   Fibi Run - muzyka i efekty dźwiękowe (Web Audio API, bez plików dźwiękowych)
   Oryginalna kompozycja w duchu 16-bitowych gier akcji (SNES / Genesis):
   pulsowy lead (z lekkim "detune" dla zadziorności), bas kwadratowy + trójkątny,
   perkusja z szumu (stopa, werbel, hi-hat). Działa z file:// i http.

   API (window.FibiAudio):
     unlock()            - odblokowanie po pierwszym geście (klik / klawisz / dotyk)
     play(nazwa)         - title | intro | level | level2 | boss | finalboss | fury | victory | credits | gameover
     stop()              - cisza (krótkie wyciszenie)
     sfx(nazwa)          - jump | sword | hurt | kill | heart | bossHit | cross | carHit | explosion | lightning | rush | stomp | click
     muted / setMuted(v) / toggleMute() / onChange(fn)  - wyciszenie (zapamiętane w localStorage)
     render(nazwa, sek)  - offline (OfflineAudioContext) -> Promise<Float32Array> (podgląd / eksport WAV)
   Wszystkie ustawienia utworów (tempo, tonacja, głośności) są w TRACKS poniżej.
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

    /* ---------- notacja: takt = 16 tokenów: nuta | '.' pauza | '-' przedłużenie ---------- */
    const B = (s) => s.trim().split(/\s+/);

    /* ---------- LEVEL (e-moll, zadziorny, napędzający) ---------- */
    const LEVEL_LEAD = [
        B('E5 - . G5 . B5 - A5 G5 . E5 - . . B4 .'),
        B('E5 - . G5 . B5 - D6 B5 - . A5 G5 - . .'),
        B('C6 - . B5 . G5 - E5 G5 . A5 G5 E5 - . .'),
        B('D5 . F#5 . A5 - . F#5 D5 . E5 F#5 A5 - B5 .'),
        B('B5 - . A5 G5 - . E5 G5 - A5 B5 . . E6 .'),
        B('D6 - . B5 G5 - . B5 D6 - E6 D6 B5 - . .'),
        B('E6 - . D6 C6 - . B5 C6 . D6 E6 G6 - . .'),
        B('D#6 - F#6 - B5 - . A5 F#5 . A5 B5 D#6 - . .'),
    ];
    const LEVEL_CHORDS = [['E4', 'G4', 'B4'], ['E4', 'G4', 'B4'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4'],
        ['E4', 'G4', 'B4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4'], ['B3', 'D#4', 'F#4']];
    const LEVEL_ROOTS = ['E2', 'E2', 'C2', 'D2', 'E2', 'G2', 'C2', 'B1'];
    const LEVEL_DRUMS = {
        main: { k: 'K.....K...K..K..', s: '....S.......S...', h: 'h.h.h.h.h.h.h.hH' },
        fill: { k: 'K.....K...K.K.K.', s: '....S...S.S.SSSS', h: 'h.h.h.h.h.h.....' },
    };

    /* ---------- BOSS (d-moll, szybki, agresywny) ---------- */
    const BOSS_LEAD = [
        B('D5 . D5 F5 . A5 . G5 F5 . D5 F5 G5 - A5 .'),
        B('A5 - A5 . C6 - A5 G5 F5 . E5 F5 D5 - . .'),
        B('Bb5 - . A5 G5 . F5 G5 A5 - Bb5 A5 G5 - F5 .'),
        B('C6 - . Bb5 A5 . G5 A5 Bb5 . C6 D6 E6 - . .'),
        B('D6 . D6 F6 . E6 D6 C6 D6 - A5 - F5 . A5 D6'),
        B('C6 - . A5 F5 . A5 C6 F6 - E6 C6 A5 - . .'),
        B('D6 - Bb5 - D6 - F6 - E6 . D6 C6 Bb5 - A5 -'),
        B('A5 . C#6 E6 A6 - . G6 F6 . E6 C#6 A5 - . .'),
    ];
    const BOSS_CHORDS = [['D4', 'F4', 'A4'], ['D4', 'F4', 'A4'], ['Bb3', 'D4', 'F4'], ['C4', 'E4', 'G4'],
        ['D4', 'F4', 'A4'], ['F3', 'A3', 'C4'], ['Bb3', 'D4', 'F4'], ['A3', 'C#4', 'E4']];
    const BOSS_ROOTS = ['D2', 'D2', 'Bb1', 'C2', 'D2', 'F2', 'Bb1', 'A1'];
    const BOSS_DRUMS = {
        main: { k: 'K.K.K.K.K.K.K.KK', s: '....S.......S...', h: 'hhhhhhhhhhhhhhhh' },
        fill: { k: 'K.K.K.K.K.K.KKKK', s: '....S...S.S.SSSS', h: 'hhhhhhhh........' },
    };

    /* ---------- TITLE (a-moll, heroiczny) ---------- */
    const TITLE_LEAD = [
        B('A4 - - - C5 - E5 - A5 - - - G5 - E5 -'),
        B('F5 - - - A5 - C6 - A5 - - - F5 - E5 -'),
        B('E5 - - - G5 - C6 - B5 - G5 - E5 - D5 -'),
        B('D5 - - - G5 - B5 - A5 - G5 - D5 - . .'),
        B('C6 - - B5 A5 - - E5 A5 - B5 - C6 - - -'),
        B('A5 - - G5 F5 - - A5 C6 - - A5 F5 - - -'),
        B('G5 - - A5 B5 - - D6 B5 - - G5 D5 - - -'),
        B('B5 - - G#5 E5 - - G#5 B5 - - - . . . .'),
    ];
    const TITLE_CHORDS = [['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['C4', 'E4', 'G4'], ['G3', 'B3', 'D4'],
        ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['E3', 'G#3', 'B3']];
    const TITLE_ROOTS = ['A2', 'F2', 'C3', 'G2', 'A2', 'F2', 'G2', 'E2'];

    /* ---------- INTRO (spokojne, lekko niepokojące arpeggio) ---------- */
    const INTRO_CHORDS = [['E4', 'G4', 'B4'], ['C4', 'E4', 'G4'], ['D4', 'F#4', 'A4'], ['B3', 'D#4', 'F#4']];
    const INTRO_ROOTS = ['E2', 'C2', 'D2', 'B1'];

    /* ---------- VICTORY (C-dur, fanfara, jednorazowa) i CREDITS (pętla) ---------- */
    const VICT_LEAD = [
        B('C5 . E5 . G5 . C6 - E6 - - - . . . .'),
        B('F5 . A5 . C6 . F6 - E6 - D6 - C6 - - -'),
        B('G5 . B5 . D6 . G6 - F6 - E6 - D6 - B5 -'),
        B('C6 - - - E6 - - - G6 - - - C7 - - -'),
    ];
    const VICT_CHORDS = [['C4', 'E4', 'G4'], ['F4', 'A4', 'C5'], ['G4', 'B4', 'D5'], ['C4', 'E4', 'G4']];
    const CRED_LEAD = [
        B('E5 - - - G5 - - - A5 - G5 - E5 - - -'),
        B('E5 - - - A5 - - - C6 - B5 - A5 - - -'),
        B('A5 - - - F5 - - - A5 - C6 - A5 - - -'),
        B('B5 - - - D6 - - - B5 - G5 - D5 - - -'),
    ];
    const CRED_CHORDS = [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']];
    const CRED_ROOTS = ['C3', 'A2', 'F2', 'G2'];
    const OVER_LEAD = [B('A5 - - - G5 - - - F5 - - - E5 - - -'), B('D5 - - - C5 - - - A4 - - - - - - -')];

    const ARP_UP = [0, 1, 2, 3, 2, 1, 0, 1, 2, 3, 2, 1, 0, 1, 2, 3];
    const ARP_SLOW = [0, null, 1, null, 2, null, 3, null, 2, null, 1, null, 0, null, 1, null];

    /* ---------- definicje utworów ---------- */
    const TRACKS = {
        title: { bpm: 112, loop: true, lead: TITLE_LEAD, leadVol: 0.15, duty: 0.25, chords: TITLE_CHORDS, arp: ARP_UP, arpVol: 0.05,
            roots: TITLE_ROOTS, bass: 'r . . . r . . o r . . . r . o .', bassVol: 0.2,
            drums: { main: { k: 'K.......K.......', s: '........S.......', h: '..h...h...h...h.' } }, drumVol: 0.8 },
        intro: { bpm: 92, loop: true, lead: null, chords: INTRO_CHORDS, arp: ARP_SLOW, arpVol: 0.1, arpWave: 'triangle',
            roots: INTRO_ROOTS, bass: 'r . . . . . . . . . . . . . . .', bassVol: 0.14, drums: null },
        level: { bpm: 148, loop: true, lead: LEVEL_LEAD, leadVol: 0.15, duty: 0.25, chords: LEVEL_CHORDS, arp: ARP_UP, arpVol: 0.045,
            roots: LEVEL_ROOTS, bass: 'r . r r o . r o r . r r o . f o', bassVol: 0.22,
            drums: LEVEL_DRUMS, fillBars: [7], drumVol: 1 },
        level2: { bpm: 160, transpose: 2, loop: true, lead: LEVEL_LEAD, leadVol: 0.15, duty: 0.125, chords: LEVEL_CHORDS, arp: ARP_UP, arpVol: 0.06,
            roots: LEVEL_ROOTS, bass: 'r r r r o . r o r r r r o . f o', bassVol: 0.22,
            drums: LEVEL_DRUMS, fillBars: [3, 7], drumVol: 1.05 },
        boss: { bpm: 172, loop: true, lead: BOSS_LEAD, leadVol: 0.16, duty: 0.25, chords: BOSS_CHORDS, arp: ARP_UP, arpVol: 0.06,
            roots: BOSS_ROOTS, bass: 'r r o r r r o r r r o r r o r o', bassVol: 0.24,
            drums: BOSS_DRUMS, fillBars: [3, 7], drumVol: 1.1 },
        finalboss: { bpm: 184, transpose: 2, loop: true, lead: BOSS_LEAD, leadVol: 0.16, duty: 0.125, chords: BOSS_CHORDS, arp: ARP_UP, arpVol: 0.07,
            roots: BOSS_ROOTS, bass: 'r r o r r r o r r r o r r o r o', bassVol: 0.25,
            drums: BOSS_DRUMS, fillBars: [1, 3, 5, 7], drumVol: 1.15 },
        fury: { bpm: 206, transpose: 3, loop: true, lead: BOSS_LEAD, leadVol: 0.17, duty: 0.125, chords: BOSS_CHORDS, arp: ARP_UP, arpVol: 0.08,
            roots: BOSS_ROOTS, bass: 'r r o r r o r r o r r o r o r o', bassVol: 0.26,
            drums: BOSS_DRUMS, fillBars: [1, 3, 5, 7], drumVol: 1.2 },
        victory: { bpm: 132, loop: false, next: 'credits', lead: VICT_LEAD, leadVol: 0.17, duty: 0.5, chords: VICT_CHORDS, arp: ARP_UP, arpVol: 0.05,
            roots: ['C3', 'F3', 'G3', 'C3'], bass: 'r . . . r . . . r . . . r . . .', bassVol: 0.2,
            drums: { main: { k: 'K...K...K...K...', s: '....S.......SSSS', h: 'h.h.h.h.h.h.h.h.' } }, drumVol: 0.9 },
        credits: { bpm: 96, loop: true, lead: CRED_LEAD, leadVol: 0.13, duty: 0.5, leadWave: 'triangle', chords: CRED_CHORDS, arp: ARP_SLOW, arpVol: 0.07,
            roots: CRED_ROOTS, bass: 'r . . . . . r . r . . . . . . .', bassVol: 0.16, drums: null },
        gameover: { bpm: 80, loop: false, lead: OVER_LEAD, leadVol: 0.16, duty: 0.25, chords: [['A3', 'C4', 'E4'], ['D3', 'F3', 'A3']], arp: null,
            roots: ['A2', 'D2'], bass: 'r . . . . . . . . . . . . . . .', bassVol: 0.2, drums: null },
    };

    /* ---------- kompilacja utworów do zdarzeń na krok ---------- */
    function compile(tr) {
        if (tr.c) return tr.c;
        const tp = tr.transpose || 0;
        const nBars = Math.max(tr.lead ? tr.lead.length : 0, tr.chords.length, tr.roots.length);
        tr.bars = nBars;
        tr.c = [];
        const bassPat = tr.bass ? B(tr.bass) : null;
        for (let b = 0; b < nBars; b++) {
            const bar = { lead: {}, arp: {}, bass: {}, drums: {} };
            if (tr.lead) {                                                // lead: nuty z długościami
                const toks = tr.lead[b % tr.lead.length];
                for (let s = 0; s < STEPS; s++) {
                    const t = toks[s];
                    if (t === '.' || t === '-') continue;
                    let len = 1;
                    while (s + len < STEPS && toks[s + len] === '-') len++;
                    bar.lead[s] = { m: midi(t) + tp, n: len };
                }
            }
            const chord = tr.chords[b % tr.chords.length].map(midi);
            if (tr.arp) {
                const tones = chord.concat(chord.map(m => m + 12));
                tr.arp.forEach((idx, s) => { if (idx !== null) bar.arp[s] = tones[idx % tones.length] + tp; });
            }
            if (bassPat) {
                const root = midi(tr.roots[b % tr.roots.length]) + tp;
                bassPat.forEach((tk, s) => {
                    if (tk === 'r') bar.bass[s] = root; else if (tk === 'o') bar.bass[s] = root + 12; else if (tk === 'f') bar.bass[s] = root + 7;
                });
            }
            if (tr.drums) {
                const d = (tr.fillBars && tr.fillBars.includes(b) && tr.drums.fill) ? tr.drums.fill : tr.drums.main;
                for (let s = 0; s < STEPS; s++) {
                    const hit = [];
                    if (d.k[s] === 'K') hit.push('k');
                    if (d.s[s] === 'S') hit.push('s');
                    if (d.h[s] === 'h') hit.push('h'); else if (d.h[s] === 'H') hit.push('H');
                    if (hit.length) bar.drums[s] = hit;
                }
            }
            tr.c.push(bar);
        }
        return tr.c;
    }

    /* ---------- silnik (działa na dowolnym kontekście: żywym i offline) ---------- */
    function makeEngine(ctx) {
        const eng = { ctx, waves: {}, noise: null };
        // bufor szumu 1 s
        const nb = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = nb.getChannelData(0);
        let seed = 12345;
        for (let i = 0; i < d.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; d[i] = (seed / 4294967296) * 2 - 1; }
        eng.noise = nb;
        // fala prostokątna o zadanym wypełnieniu (szereg Fouriera)
        eng.wave = (duty) => {
            if (eng.waves[duty]) return eng.waves[duty];
            const N = 48, re = new Float32Array(N), im = new Float32Array(N);
            for (let n = 1; n < N; n++) {
                re[n] = Math.sin(2 * Math.PI * n * duty) / (n * Math.PI);
                im[n] = (1 - Math.cos(2 * Math.PI * n * duty)) / (n * Math.PI);
            }
            return (eng.waves[duty] = ctx.createPeriodicWave(re, im));
        };
        return eng;
    }

    function env(g, t, peak, dur, att, rel) {
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(peak, t + att);
        g.gain.setValueAtTime(peak * 0.8, t + Math.min(att + 0.09, dur));
        g.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
    }
    function pulse(eng, bus, t, m, dur, vol, duty, fat, vib) {
        const c = eng.ctx, f = mtof(m);
        const g = c.createGain(); env(g, t, vol, dur, 0.006, 0.05); g.connect(bus);
        const voices = fat ? [[duty, 0], [Math.min(0.5, duty * 2), 9]] : [[duty, 0]];
        voices.forEach(([du, cents], i) => {
            const o = c.createOscillator(); o.setPeriodicWave(eng.wave(du)); o.frequency.value = f; o.detune.value = cents;
            const og = c.createGain(); og.gain.value = i ? 0.55 : 1; o.connect(og); og.connect(g);
            if (vib && dur > 0.22) {                                       // vibrato po chwili
                const l = c.createOscillator(), lg = c.createGain();
                l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.007, t + 0.16);
                l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.06);
            }
            o.start(t); o.stop(t + dur + 0.07);
        });
    }
    function basic(eng, bus, t, m, dur, vol, type) {
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = mtof(m);
        env(g, t, vol, dur, 0.004, 0.03); o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
    }
    function bassNote(eng, bus, t, m, dur, vol) {
        const c = eng.ctx, f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
        const g = c.createGain(); env(g, t, vol, dur, 0.004, 0.03); f.connect(g); g.connect(bus);
        [['square', 1, 0], ['triangle', 0.7, -12]].forEach(([type, v, off]) => {
            const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = mtof(m + off); og.gain.value = v;
            o.connect(og); og.connect(f); o.start(t); o.stop(t + dur + 0.05);
        });
    }
    function noiseHit(eng, bus, t, dur, vol, ftype, f0, f1, q) {
        const c = eng.ctx, s = c.createBufferSource(); s.buffer = eng.noise;
        const f = c.createBiquadFilter(); f.type = ftype; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur); f.Q.value = q || 0.8;
        const g = c.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.4); s.stop(t + dur + 0.02);
    }
    function kick(eng, bus, t, vol) {
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain();
        o.frequency.setValueAtTime(170, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.11);
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.22);
    }
    function snare(eng, bus, t, vol) {
        noiseHit(eng, bus, t, 0.15, vol * 0.5, 'bandpass', 1900, 1200, 0.7);
        const c = eng.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'triangle';
        o.frequency.setValueAtTime(210, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.07);
        g.gain.setValueAtTime(vol * 0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        o.connect(g); g.connect(bus); o.start(t); o.stop(t + 0.1);
    }

    /** Planuje jeden krok utworu. Zwraca false, gdy utwór jednorazowy dobiegł końca. */
    function scheduleStep(eng, tr, g, t, bus, stepDur) {
        const cb = compile(tr);
        let bar = Math.floor(g / STEPS);
        const s = g % STEPS;
        if (tr.loop) bar %= tr.bars; else if (bar >= tr.bars) return false;
        const e = cb[bar];
        const L = e.lead[s];
        if (L) {
            const dur = Math.max(0.06, L.n * stepDur * (L.n > 1 ? 0.94 : 0.85));
            if (tr.leadWave === 'triangle') basic(eng, bus, t, L.m, dur, tr.leadVol * 1.3, 'triangle');
            else pulse(eng, bus, t, L.m, dur, tr.leadVol, tr.duty || 0.25, true, true);
        }
        if (e.arp[s] !== undefined) {
            if (tr.arpWave) basic(eng, bus, t, e.arp[s], stepDur * 2.4, tr.arpVol, tr.arpWave);
            else pulse(eng, bus, t, e.arp[s], stepDur * 0.8, tr.arpVol, 0.125, false, false);
        }
        if (e.bass[s] !== undefined) bassNote(eng, bus, t, e.bass[s], stepDur * 0.88, tr.bassVol);
        const dv = tr.drumVol || 1;
        (e.drums[s] || []).forEach((h) => {
            if (h === 'k') kick(eng, bus, t, 0.55 * dv);
            else if (h === 's') snare(eng, bus, t, 0.42 * dv);
            else if (h === 'h') noiseHit(eng, bus, t, 0.035, 0.07 * dv, 'highpass', 7000);
            else if (h === 'H') noiseHit(eng, bus, t, 0.14, 0.07 * dv, 'highpass', 6500);
        });
        return true;
    }

    /* ---------- efekty dźwiękowe ---------- */
    function playSfx(eng, bus, name, t) {
        const c = eng.ctx;
        const sweep = (type, f0, f1, dur, vol, wave) => {
            const o = c.createOscillator(), g = c.createGain();
            if (wave) o.setPeriodicWave(eng.wave(wave)); else o.type = type;
            o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.02);
        };
        switch (name) {
            case 'jump': sweep(null, 280, 760, 0.13, 0.13, 0.25); break;
            case 'sword': noiseHit(eng, bus, t, 0.13, 0.22, 'bandpass', 3200, 800, 1.2); break;
            case 'hurt': sweep('square', 330, 70, 0.3, 0.16); noiseHit(eng, bus, t, 0.18, 0.18, 'lowpass', 1500, 200); break;
            case 'kill': sweep(null, 700, 180, 0.16, 0.14, 0.125); noiseHit(eng, bus, t, 0.08, 0.1, 'highpass', 3000); break;
            case 'heart': [660, 880, 1320].forEach((f, i) => { const o = c.createOscillator(), g = c.createGain(); o.setPeriodicWave(eng.wave(0.5)); o.frequency.value = f;
                g.gain.setValueAtTime(0.0001, t + i * 0.06); g.gain.linearRampToValueAtTime(0.12, t + i * 0.06 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.06 + 0.1);
                o.connect(g); g.connect(bus); o.start(t + i * 0.06); o.stop(t + i * 0.06 + 0.12); }); break;
            case 'bossHit': kick(eng, bus, t, 0.9); noiseHit(eng, bus, t, 0.3, 0.3, 'lowpass', 2500, 150); sweep('sawtooth', 220, 60, 0.3, 0.12); break;
            case 'cross': sweep(null, 1100, 420, 0.22, 0.1, 0.125); sweep('triangle', 550, 210, 0.22, 0.1); break;
            case 'carHit': noiseHit(eng, bus, t, 0.12, 0.3, 'bandpass', 2400, 700, 2); sweep('triangle', 520, 380, 0.15, 0.12); break;
            case 'explosion': noiseHit(eng, bus, t, 1.3, 0.55, 'lowpass', 2200, 90, 0.7); sweep('sine', 90, 28, 0.9, 0.5); noiseHit(eng, bus, t, 0.25, 0.3, 'highpass', 2500); break;
            case 'lightning': noiseHit(eng, bus, t, 0.18, 0.5, 'highpass', 1800); noiseHit(eng, bus, t + 0.05, 1.4, 0.45, 'lowpass', 900, 60, 0.6); sweep('sine', 70, 30, 1.0, 0.4); break;
            case 'rush': noiseHit(eng, bus, t, 2.0, 0.25, 'bandpass', 250, 3200, 1.5); break;
            case 'stomp': sweep('sine', 320, 90, 0.14, 0.4); break;
            case 'click': sweep(null, 900, 700, 0.05, 0.1, 0.5); break;
            default: break;
        }
    }

    /* ---------- żywy kontekst, wyciszenie, odblokowanie ---------- */
    const KEY = 'fibi_muted';
    let muted = false;
    try { muted = localStorage.getItem(KEY) === '1'; } catch (e) { /* brak localStorage */ }
    const listeners = new Set();
    let ctx = null, eng = null, master = null, musicBus = null, sfxBus = null;
    let want = null, cur = null, timer = null, unlocked = false;

    function ensure() {
        if (ctx) return ctx;
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        eng = makeEngine(ctx);
        master = ctx.createGain(); master.gain.value = muted ? 0 : 0.8;
        const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
        musicBus = ctx.createGain(); musicBus.gain.value = 0.55;
        sfxBus = ctx.createGain(); sfxBus.gain.value = 0.8;
        musicBus.connect(comp); sfxBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
        return ctx;
    }

    function tick() {
        const c = cur;
        if (!c || !ctx) return;
        const stepDur = 60 / c.tr.bpm / 4;
        if (c.time < ctx.currentTime - 0.3) c.time = ctx.currentTime + 0.03;       // po wstrzymaniu karty
        while (c.time < ctx.currentTime + 0.25) {
            if (!scheduleStep(eng, c.tr, c.step, c.time, c.bus, stepDur)) {
                clearInterval(timer); timer = null;
                const nx = c.tr.next; cur = null;
                if (nx) startTrack(nx);
                return;
            }
            c.step++; c.time += stepDur;
        }
    }
    function stopTrack(fade) {
        if (timer) { clearInterval(timer); timer = null; }
        if (cur && ctx) {
            const b = cur.bus, t = ctx.currentTime;
            b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0.0001, t + (fade || 0.12));
            setTimeout(() => { try { b.disconnect(); } catch (e) { /* ok */ } }, (fade || 0.12) * 1000 + 400);
        }
        cur = null;
    }
    function startTrack(name) {
        const tr = TRACKS[name];
        if (!tr || !ctx) return;
        stopTrack(0.12);
        const bus = ctx.createGain(); bus.connect(musicBus);
        cur = { name, tr, bus, step: 0, time: ctx.currentTime + 0.08 };
        compile(tr);
        timer = setInterval(tick, 30);
        tick();
    }

    const api = {
        TRACKS,
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
        sfx(name) {
            if (!ctx || ctx.state !== 'running' || muted) return;
            try { playSfx(eng, sfxBus, name, ctx.currentTime + 0.005); } catch (e) { /* dźwięk nie może wywalić gry */ }
        },
        setMuted(v) {
            muted = !!v;
            try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) { /* ok */ }
            if (master) master.gain.setTargetAtTime(muted ? 0 : 0.8, ctx.currentTime, 0.02);
            listeners.forEach(fn => fn(muted));
        },
        toggleMute() { api.setMuted(!muted); return muted; },
        onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
        /** Renderuje utwór offline: Promise<Float32Array> (mono) o długości `seconds`. */
        render(name, seconds, sampleRate) {
            const sr = sampleRate || 44100;
            const oc = new OfflineAudioContext(1, Math.round(seconds * sr), sr);
            const e = makeEngine(oc), tr = TRACKS[name];
            const comp = oc.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 6;
            const mus = oc.createGain(); mus.gain.value = 0.55 * 0.8; mus.connect(comp); comp.connect(oc.destination);
            const stepDur = 60 / tr.bpm / 4;
            for (let g = 0, t = 0.02; t < seconds; g++, t += stepDur) if (!scheduleStep(e, tr, g, t, mus, stepDur)) break;
            return oc.startRendering().then(b => b.getChannelData(0));
        },
    };
    window.FibiAudio = api;

    /* odblokowanie po pierwszym geście + skrót M + wstrzymanie w tle */
    const gesture = () => { api.unlock(); if (unlocked) ['pointerdown', 'keydown', 'touchend', 'mousedown'].forEach(n => window.removeEventListener(n, gesture, true)); };
    ['pointerdown', 'keydown', 'touchend', 'mousedown'].forEach(n => window.addEventListener(n, gesture, true));
    window.addEventListener('keydown', (ev) => {
        if ((ev.key === 'm' || ev.key === 'M') && !ev.ctrlKey && !ev.metaKey && !ev.altKey && !ev.repeat) api.toggleMute();
    }, true);
    document.addEventListener('visibilitychange', () => {
        if (!ctx || !unlocked) return;
        if (document.hidden) ctx.suspend(); else ctx.resume();
    });
})();
