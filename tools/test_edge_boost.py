#!/usr/bin/env python3
"""Fibi Run: przy prawej krawędzi ekran przyspiesza (CFG.EDGE_BOOST), wraca w środku,
składa się z błyskawicą bez przekraczania CAP, tylko w biegu. API i GoatCounter zablokowane."""
from playwright.sync_api import sync_playwright
import http.server, json, os, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT = '/workspace/shots'
G = "window.__arekGame"
S = G + ".scene.getScene('Play')"
errs = []

def noisy(t):
    return any(s in t for s in ('GPU stall', 'AudioContext', 'ReadPixels', 'Fullscreen', 'fullscreen',
                                'Failed to load resource', 'boostHud'))

def mock(route):
    req = route.request
    h = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if req.method == 'POST':
        route.fulfill(status=201, body='{}', headers=h)
    elif req.method == 'GET':
        route.fulfill(status=200, content_type='application/json', headers=h, body=json.dumps([]))
    else:
        route.fulfill(status=204, headers=h)

def block_goat(route):
    route.abort()

def serve(root):
    os.chdir(root)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

def fail(msg):
    errs.append(msg)
    print('ERR', msg)

def ev(pg, js):
    return pg.evaluate(js)

def pin(pg, sx):
    ev(pg, f"""() => {{
        const s = {S};
        if (s._unpin) {{ s.events.off('update', s._unpin); s._unpin = null; }}
        const fn = () => {{ if (s.sys && s.sys.isActive()) s.a.x = s.camX + {sx} * 568; }};
        s._unpin = fn;
        s.events.on('update', fn);
        fn();
    }}""")

def unpin(pg):
    ev(pg, f"""() => {{
        const s = {S};
        if (s._unpin) {{ s.events.off('update', s._unpin); s._unpin = null; }}
    }}""")

def settle(pg, ms=900):
    pg.wait_for_timeout(ms)

def cam_speed(pg, ms=400):
    a = ev(pg, f"{S}.camX")
    pg.wait_for_timeout(ms)
    b = ev(pg, f"{S}.camX")
    return (b - a) / (ms / 1000.0)

def st(pg):
    return ev(pg, f"""() => {{
        const s = {S}, E = s.sys.game.cache ? null : null;
        const cfg = (typeof CFG !== 'undefined') ? CFG.EDGE_BOOST : null;
        return {{
            mode: s.mode, cam: s.camX, ax: s.a.x, sx: (s.a.x - s.camX) / 568,
            edgeMul: s.edgeMul, boostMul: s.boostMul, boostT: s.boostT,
            scrollCur: s.scrollCur, margin: (s.a.x - s.camX),
            right: 568 - (s.a.x - s.camX),
            cfg: cfg,
            onScreen: s.a.x >= s.camX - 0.5 && s.a.x <= s.camX + 568 + 0.5
        }};
    }}""")

def main():
    os.makedirs(SHOT, exist_ok=True)
    httpd, port = serve(ROOT)
    base = f'http://127.0.0.1:{port}/index.html'
    console = []
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = br.new_page(viewport={'width': 1136, 'height': 640})
        page.route('**/api/scores', mock)
        page.route('**/*azurewebsites.net/**', mock)
        page.route('**/*goatcounter*', block_goat)
        page.route('**/gc.zgo.at/**', block_goat)
        page.on('pageerror', lambda e: errs.append(f'PAGEERR {e}'))
        page.on('console', lambda m: console.append(m.type + ': ' + m.text)
                if m.type in ('error',) and not noisy(m.text) else None)

        page.goto(base + '?nointro&mission=1', wait_until='domcontentloaded')
        page.wait_for_function(f"() => {G} && {G}.scene.isActive('Title')", timeout=20000)
        page.wait_for_timeout(300)
        page.keyboard.press('Space')
        page.wait_for_function(f"() => {G} && {G}.scene.isActive('Play')", timeout=15000)
        page.wait_for_timeout(400)
        ev(page, f"""() => {{
            const s = {S};
            s.lives = 9; s.invuln = 999; s.spawning = false;
            s.barrels.forEach(o => o.s.destroy()); s.monsters.forEach(o => o.s.destroy());
            s.bolts.forEach(o => o.s.destroy()); s.hearts.forEach(o => {{ if (o.s) o.s.destroy(); }});
            s.barrels = []; s.monsters = []; s.bolts = []; s.hearts = [];
            s.boostT = 0; s.boostMul = 1;
        }}""")

        cfg = ev(page, "CFG.EDGE_BOOST")
        print('CFG.EDGE_BOOST', cfg)
        if not cfg or cfg['START'] != 0.6 or cfg['MAX'] != 1.6 or cfg['CAP'] != 2.2:
            fail(f'unexpected EDGE_BOOST: {cfg}')
        base_scroll = ev(page, f"{S}.L.scroll")

        # --- środek ekranu: normalna prędkość ---
        pin(page, 0.40)
        settle(page, 900)
        v_mid = cam_speed(page, 450)
        info = st(page)
        print('MID', v_mid, info)
        if abs(v_mid - base_scroll) > 20:
            fail(f'mid scroll {v_mid:.1f} far from base {base_scroll}')
        if info['edgeMul'] > 1.05:
            fail(f'edgeMul should be ~1 at mid, got {info["edgeMul"]:.3f}')
        page.screenshot(path=f'{SHOT}/edge_mid.png')

        # --- prawa krawędź: szybciej ---
        pin(page, (568 - 20) / 568)
        settle(page, 1000)
        v_edge = cam_speed(page, 450)
        info = st(page)
        print('EDGE', v_edge, info)
        page.screenshot(path=f'{SHOT}/edge_right.png')
        if v_edge < v_mid * 1.35:
            fail(f'right edge did not speed up enough: mid={v_mid:.1f} edge={v_edge:.1f}')
        if info['edgeMul'] < 1.4:
            fail(f'edgeMul too low at right edge: {info["edgeMul"]:.3f}')
        if not info['onScreen']:
            fail(f'hero left the screen at edge: {info}')
        expected = base_scroll * cfg['MAX']
        if abs(v_edge - expected) > expected * 0.15:
            fail(f'edge speed {v_edge:.1f} not near expected {expected:.1f}')

        # --- powrót do środka ---
        pin(page, 0.40)
        settle(page, 1000)
        v_back = cam_speed(page, 450)
        info = st(page)
        print('BACK', v_back, info)
        page.screenshot(path=f'{SHOT}/edge_back.png')
        if v_back > v_mid * 1.15:
            fail(f'speed did not return after dropping back: mid={v_mid:.1f} back={v_back:.1f}')
        if info['edgeMul'] > 1.08:
            fail(f'edgeMul did not return: {info["edgeMul"]:.3f}')

        # --- błyskawica w środku nadal działa ---
        ev(page, f"{S}.boostT = 6")
        settle(page, 900)
        v_bolt = cam_speed(page, 450)
        info = st(page)
        print('BOLT MID', v_bolt, info)
        if info['boostMul'] < 1.3:
            fail(f'speed item boostMul did not rise: {info["boostMul"]:.3f}')
        if v_bolt < v_mid * 1.3:
            fail(f'speed item did not speed the screen: mid={v_mid:.1f} bolt={v_bolt:.1f}')

        # --- błyskawica + krawędź: szybciej, ale pod CAP ---
        pin(page, (568 - 20) / 568)
        ev(page, f"{S}.boostT = 6")
        settle(page, 1000)
        v_both = cam_speed(page, 450)
        info = st(page)
        print('BOLT EDGE', v_both, info)
        page.screenshot(path=f'{SHOT}/edge_bolt.png')
        cap = base_scroll * cfg['CAP']
        if v_both < v_bolt * 1.08:
            fail(f'edge+item should be faster than item alone: bolt={v_bolt:.1f} both={v_both:.1f}')
        if v_both > cap * 1.08:
            fail(f'edge+item exceeded CAP: {v_both:.1f} cap={cap:.1f}')
        if not info['onScreen']:
            fail(f'hero left the screen with item+edge: {info}')

        ev(page, f"{S}.boostT = 0")
        pin(page, 0.40)
        settle(page, 1200)

        # --- restart zeruje edgeMul ---
        unpin(page)
        ev(page, f"{S}.restartLevel()")
        page.wait_for_timeout(800)
        ev(page, f"""() => {{
            const s = {S}; s.lives = 9; s.invuln = 999; s.spawning = false;
        }}""")
        info = st(page)
        print('RESTART', info)
        if abs(info['edgeMul'] - 1) > 0.05:
            fail(f'edgeMul not reset after restart: {info["edgeMul"]:.3f}')

        # --- poza biegiem (rush) nie działa ---
        ev(page, f"""() => {{
            const s = {S}; s.invuln = 999; s.score = s.L.goal; s.startRush();
        }}""")
        page.wait_for_timeout(200)
        info = st(page)
        print('RUSH', info)
        if info['mode'] == 'run':
            fail('startRush did not leave run mode')
        if abs(info['edgeMul'] - 1) > 0.02:
            fail(f'edgeMul not cleared outside run: {info["edgeMul"]:.3f} mode={info["mode"]}')

        if console:
            errs.extend('CONSOLE ' + c for c in console)
        br.close()
    httpd.shutdown()
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()
