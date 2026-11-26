#!/usr/bin/env python3
"""Fibi Run: naskok na zwykłego potworka zabija go (z mieczem i bez), odbija Arka, bez obrażeń.
Wejście z boku nadal rani. API tablicy i GoatCounter zablokowane."""
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

def clear_world(pg):
    ev(pg, f"""() => {{
        const s = {S};
        s.spawning = false; s.invuln = 0; s.lives = 9; s.boostT = 0; s.boostMul = 1;
        s.barrels.forEach(o => o.s.destroy());
        s.monsters.forEach(o => {{ if (o.s && o.s.destroy) o.s.destroy(); }});
        s.bolts.forEach(o => o.s.destroy());
        s.hearts.forEach(o => {{ if (o.s) o.s.destroy(); }});
        s.barrels = []; s.monsters = []; s.bolts = []; s.hearts = [];
        s.a.vy = 0; s.a.onGround = true; s.a.y = 258;
    }}""")

def snap(pg):
    return ev(pg, f"""() => {{
        const s = {S};
        return {{
            lives: s.lives, score: s.score, kills: s.stats.monstersKilled,
            n: s.monsters.length, dead: s.monsters.map(m => !!m.dead),
            types: s.monsters.map(m => m.type),
            vy: s.a.vy, y: s.a.y, onGround: s.a.onGround, armored: s.armored,
            state: s.state, mode: s.mode
        }};
    }}""")

def wait_kill(pg, timeout=2500):
    ev(pg, f"""() => {{
        const s = {S};
        window.__stompKills0 = s.stats.monstersKilled;
        window.__stompLives0 = s.lives;
    }}""")
    try:
        pg.wait_for_function(
            f"() => {S}.stats.monstersKilled > window.__stompKills0 || {S}.lives < window.__stompLives0",
            timeout=timeout)
    except Exception:
        pass
    pg.wait_for_timeout(80)
    return snap(pg)

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

        # --- naskok na ghoula z mieczem ---
        clear_world(page)
        ev(page, f"""() => {{
            const s = {S};
            s.armored = true;
            s.spawnMonster(s.camX + 240, 'ghoul'); s.monsters[0].speed = 0;
            const m = s.monsters[0], top = 258 - m.h;
            s.a.x = m.wx; s.a.y = top - 40; s.a.vy = 180; s.a.onGround = false; s.a.prevY = s.a.y;
            s.score = 0; s.stats.monstersKilled = 0; s.lives = 9; s.invuln = 0;
        }}""")
        after = wait_kill(page)
        print('STOMP GHOUL SWORD', after)
        page.screenshot(path=f'{SHOT}/stomp_ghoul.png')
        if after['kills'] < 1 or after['n'] == 1 and after['dead'] == [False]:
            fail(f'stomp did not kill ghoul: {after}')
        if after['lives'] != 9:
            fail(f'stomp dealt damage: {after}')
        if after['score'] < 50:
            fail(f'stomp did not add score: {after}')
        if after['vy'] >= 0:
            fail(f'stomp did not bounce (vy={after["vy"]:.1f})')

        # --- wejście z boku rani ---
        clear_world(page)
        ev(page, f"""() => {{
            const s = {S};
            s.armored = true;
            s.spawnMonster(s.camX + 240, 'ghoul'); s.monsters[0].speed = 0;
            const m = s.monsters[0];
            s.a.x = m.wx; s.a.y = 258; s.a.vy = 0; s.a.onGround = true; s.a.prevY = 258;
            s.lives = 9; s.invuln = 0; s.stats.monstersKilled = 0;
        }}""")
        page.wait_for_timeout(200)
        side = snap(page)
        print('SIDE HIT', side)
        page.screenshot(path=f'{SHOT}/stomp_side.png')
        if side['lives'] >= 9:
            fail(f'side bump should hurt, lives={side["lives"]}')
        if side['kills'] != 0:
            fail(f'side bump killed the monster: {side}')

        # --- naskok bez miecza (T-shirt) ---
        clear_world(page)
        ev(page, f"""() => {{
            const s = {S};
            s.armored = false;
            s.spawnMonster(s.camX + 240, 'imp'); s.monsters[0].speed = 0;
            const m = s.monsters[0], top = 258 - m.h;
            s.a.x = m.wx; s.a.y = top - 40; s.a.vy = 180; s.a.onGround = false; s.a.prevY = s.a.y;
            s.score = 0; s.stats.monstersKilled = 0; s.lives = 9; s.invuln = 0;
        }}""")
        after = wait_kill(page)
        print('STOMP IMP NO SWORD', after)
        page.screenshot(path=f'{SHOT}/stomp_nosword.png')
        if after['kills'] < 1:
            fail(f'stomp without sword did not kill imp: {after}')
        if after['lives'] != 9:
            fail(f'stomp without sword dealt damage: {after}')
        if after['vy'] >= 0:
            fail(f'stomp without sword did not bounce (vy={after["vy"]:.1f})')
        if after['armored']:
            fail('armored should stay false for no-sword test')

        # --- naskok na nietoperza ---
        clear_world(page)
        ev(page, f"""() => {{
            const s = {S};
            s.armored = true;
            s.spawnMonster(s.camX + 240, 'bat'); s.monsters[0].speed = 0;
            const m = s.monsters[0];
            const top = m.cy - m.h / 2;
            s.a.x = m.wx; s.a.y = top - 36; s.a.vy = 200; s.a.onGround = false; s.a.prevY = s.a.y;
            s.score = 0; s.stats.monstersKilled = 0; s.lives = 9; s.invuln = 0;
        }}""")
        after = wait_kill(page)
        print('STOMP BAT', after)
        page.screenshot(path=f'{SHOT}/stomp_bat.png')
        if after['kills'] < 1:
            fail(f'stomp did not kill bat: {after}')
        if after['lives'] != 9:
            fail(f'stomp on bat dealt damage: {after}')
        if after['score'] < 60:
            fail(f'bat stomp score missing: {after}')

        if console:
            errs.extend('CONSOLE ' + c for c in console)
        br.close()
    httpd.shutdown()
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()
