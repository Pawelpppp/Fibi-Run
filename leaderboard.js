'use strict';
/* =====================================================================
   Fibi Run - tablica wyników
   Domyślnie wspólny serwer (CFG.LEADERBOARD.API_URL, Azure Function
   albo dowolny REST: GET/POST /api/scores). Opcjonalnie Supabase
   (SUPABASE_URL + SUPABASE_ANON_KEY). Zawsze kopia w localStorage
   (klucz fibi_leaderboard). Przy błędzie sieci zapis zostaje lokalny.
   ===================================================================== */
(function (global) {
    const STORE_KEY = 'fibi_leaderboard';
    const NICK_KEY = 'fibi_nick';

    const cfg = () => (typeof CFG !== 'undefined' && CFG.LEADERBOARD) ? CFG.LEADERBOARD : {};
    const limit = () => cfg().LIMIT || 20;
    const nickMax = () => cfg().NICK_MAX || 12;
    const scoreMax = () => cfg().SCORE_MAX || 999999;
    const timeMax = () => cfg().TIME_MAX_MS || 86400000;
    const timeMin = () => cfg().TIME_MIN_MS || 1000;

    const PL = {
        ą: 'Ą', ć: 'Ć', ę: 'Ę', ł: 'Ł', ń: 'Ń', ó: 'Ó', ś: 'Ś', ź: 'Ź', ż: 'Ż',
        Ą: 'Ą', Ć: 'Ć', Ę: 'Ę', Ł: 'Ł', Ń: 'Ń', Ó: 'Ó', Ś: 'Ś', Ź: 'Ź', Ż: 'Ż',
    };

    function sanitizeNick(raw) {
        let out = '';
        for (const ch of String(raw || '')) {
            const u = PL[ch] || ch.toUpperCase();
            if (!/[A-Z0-9 \-]/.test(u) && !PL[u]) continue;
            if (u === ' ' && (!out || out.endsWith(' '))) continue;
            out += u;
            if (out.length >= nickMax()) break;
        }
        return out.trim().slice(0, nickMax());
    }

    function formatTime(ms) {
        const s = Math.max(0, Math.floor(Number(ms) / 1000) || 0);
        const m = Math.floor(s / 60);
        return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    }

    function sortEntries(list) {
        return list.slice().sort((a, b) => (b.score - a.score) || (a.time_ms - b.time_ms));
    }

    function validEntry(e) {
        if (!e) return null;
        const nick = sanitizeNick(e.nick);
        const score = Math.floor(Number(e.score));
        const time_ms = Math.floor(Number(e.time_ms));
        if (!nick) return null;
        if (!Number.isFinite(score) || score < 0 || score > scoreMax()) return null;
        if (!Number.isFinite(time_ms) || time_ms < 0 || time_ms > timeMax()) return null;
        return { nick, score, time_ms };
    }

    /* API wymaga time_ms >= 1000; lokalnie zostawiamy prawdziwy czas. */
    function forRemote(entry) {
        const e = validEntry(entry);
        if (!e) return null;
        return { nick: e.nick, score: e.score, time_ms: Math.max(timeMin(), e.time_ms) };
    }

    function localList() {
        try {
            const raw = JSON.parse(localStorage.getItem(STORE_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            return sortEntries(raw.map(validEntry).filter(Boolean)).slice(0, limit());
        } catch (err) { return []; }
    }

    function localSave(list) {
        try { localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, limit()))); } catch (err) { /* prywatny tryb / brak storage */ }
    }

    function localSubmit(entry) {
        const e = validEntry(entry);
        if (!e) return localList();
        const out = sortEntries(localList().concat([e])).slice(0, limit());
        localSave(out);
        return out;
    }

    function apiEnabled() {
        return !!(cfg().API_URL || '').trim();
    }

    function supabaseEnabled() {
        const u = (cfg().SUPABASE_URL || '').trim();
        const k = (cfg().SUPABASE_ANON_KEY || '').trim();
        return !!(u && k);
    }

    function remoteEnabled() {
        return apiEnabled() || supabaseEnabled();
    }

    function apiUrl() { return cfg().API_URL.trim().replace(/\/$/, ''); }

    function restList() {
        return fetch(apiUrl(), { headers: { Accept: 'application/json' } }).then(r => {
            if (!r.ok) throw new Error('api ' + r.status);
            return r.json();
        }).then(rows => sortEntries((Array.isArray(rows) ? rows : []).map(validEntry).filter(Boolean)));
    }

    function restInsert(entry) {
        const e = forRemote(entry);
        if (!e) return restList();
        return fetch(apiUrl(), {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify(e),
        }).then(r => {
            if (!r.ok) throw new Error('api ' + r.status);
            return restList();
        });
    }

    function sbHeaders(extra) {
        const k = cfg().SUPABASE_ANON_KEY.trim();
        const h = {
            apikey: k,
            Authorization: 'Bearer ' + k,
            Accept: 'application/json',
            'Content-Type': 'application/json',
        };
        if (extra) Object.assign(h, extra);
        return h;
    }

    function sbUrl() { return cfg().SUPABASE_URL.replace(/\/$/, '') + '/rest/v1/scores'; }

    function sbList() {
        const q = sbUrl() + '?select=nick,score,time_ms,created_at&order=score.desc,time_ms.asc&limit=' + limit();
        return fetch(q, { headers: sbHeaders() }).then(r => {
            if (!r.ok) throw new Error('supabase ' + r.status);
            return r.json();
        }).then(rows => sortEntries((Array.isArray(rows) ? rows : []).map(validEntry).filter(Boolean)));
    }

    function sbInsert(entry) {
        const e = forRemote(entry);
        if (!e) return sbList();
        return fetch(sbUrl(), {
            method: 'POST',
            headers: sbHeaders({ Prefer: 'return=minimal' }),
            body: JSON.stringify(e),
        }).then(r => {
            if (!r.ok) throw new Error('supabase ' + r.status);
            return sbList();
        });
    }

    function fetchRemoteList() {
        if (apiEnabled()) return restList();
        if (supabaseEnabled()) return sbList();
        return Promise.resolve(localList());
    }

    function insertRemote(entry) {
        if (apiEnabled()) return restInsert(entry);
        if (supabaseEnabled()) return sbInsert(entry);
        return Promise.resolve(localList());
    }

    let runStartedAt = 0;

    const api = {
        sanitizeNick,
        formatTime,
        apiEnabled,
        supabaseEnabled,
        remoteEnabled,
        lastNick() {
            try { return sanitizeNick(localStorage.getItem(NICK_KEY) || ''); } catch (err) { return ''; }
        },
        rememberNick(n) {
            try { localStorage.setItem(NICK_KEY, n); } catch (err) { /* ok */ }
        },
        startRun() { runStartedAt = Date.now(); },
        elapsedMs() {
            if (!runStartedAt) runStartedAt = Date.now();
            return Math.max(0, Date.now() - runStartedAt);
        },
        startedAt() { return runStartedAt; },
        list() {
            if (!remoteEnabled()) return Promise.resolve({ rows: localList(), offline: false, remote: false });
            return fetchRemoteList()
                .then(rows => ({ rows, offline: false, remote: true }))
                .catch(() => ({ rows: localList(), offline: true, remote: false }));
        },
        submit(entry) {
            const e = validEntry(entry);
            if (!e) return api.list().then(res => Object.assign({ saved: 'none' }, res));
            api.rememberNick(e.nick);
            const localRows = localSubmit(e);
            if (!remoteEnabled()) return Promise.resolve({ rows: localRows, saved: 'local', remote: false, offline: false });
            return insertRemote(e)
                .then(rows => ({ rows, saved: 'remote', remote: true, offline: false }))
                .catch(() => ({ rows: localRows, saved: 'local', remote: false, offline: true }));
        },
    };

    global.FibiLeaderboard = api;
})(typeof window !== 'undefined' ? window : globalThis);
