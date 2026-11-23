// Niewidoczne statystyki odwiedzin (GoatCounter). Kod konta tylko tutaj.
// Zamień TWOJ-KOD na kod z panelu GoatCounter (adres: https://KOD.goatcounter.com).
// Dopóki jest placeholder, skrypt się nie ładuje. localhost / 127.0.0.1 / file:// nie są liczone.
window.FIBI_STATS = window.FIBI_STATS || { GOATCOUNTER_CODE: 'TWOJ-KOD' };

(function () {
    var PLACEHOLDER = 'TWOJ-KOD';
    var cfg = window.FIBI_STATS || {};
    var code = String(cfg.GOATCOUNTER_CODE || '').trim();
    var pendingStart = false;

    function isLocalOrigin() {
        if (location.protocol === 'file:' || location.protocol === 'about:') return true;
        var h = String(location.hostname || '').toLowerCase().replace(/\.$/, '');
        return !h || h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]' || h === '0.0.0.0';
    }

    function isConfigured() {
        return !!(code && code !== PLACEHOLDER && /^[A-Za-z0-9-]+$/.test(code));
    }

    function shouldLoad() {
        return isConfigured() && !isLocalOrigin();
    }

    function sendStart() {
        try {
            if (window.goatcounter && typeof window.goatcounter.count === 'function') {
                window.goatcounter.count({ path: 'start-gry', title: 'Start gry', event: true });
                pendingStart = false;
            }
        } catch (e) {
            pendingStart = false;
        }
    }

    window.FibiStats = {
        startGame: function () {
            pendingStart = true;
            sendStart();
        }
    };

    if (!shouldLoad()) return;

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
    s.onload = function () { if (pendingStart) sendStart(); };
    s.onerror = function () { pendingStart = false; };
    (document.head || document.documentElement).appendChild(s);
})();
