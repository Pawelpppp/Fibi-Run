#!/usr/bin/env python3
"""Fibi Run: przycisk i klawisz F przełączają pełny ekran we wszystkich scenach.
API tablicy jest mockowane — nigdy nie wołamy żywego Azure."""
from playwright.sync_api import sync_playwright
import http.server, json, os, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT = '/workspace/shots'
errs, posts, live_hits = [], [], []
G = "window.__arekGame"

def noisy(t):
    return any(s in t for s in ('GPU stall', 'AudioContext', 'ReadPixels', 'Fullscreen', 'fullscreen'))

def mock(route):
    req = route.request
    if req.method == 'POST':
        posts.append(req.post_data)
        route.fulfill(status=201, body='{}', headers={'access-control-allow-origin': '*'})
    elif req.method == 'GET':
        route.fulfill(status=200, content_type='application/json',
                      headers={'access-control-allow-origin': '*'},
                      body=json.dumps([]))
    else:
        route.fulfill(status=204, headers={
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
        })

def serve(root):
    os.chdir(root)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

def wait_scene(page, key, t=8000):
    page.wait_for_function(f"() => {G} && {G}.scene.isActive('{key}')", timeout=t)

def install_spy(page):
    return page.evaluate(f"""() => {{
        const g = {G};
        if (!g._fsSpy) {{
            window.__fsCalls = 0;
            window.__fsErr = null;
            const orig = g.scale.toggleFullscreen.bind(g.scale);
            g.scale.toggleFullscreen = function () {{
                window.__fsCalls++;
                try {{ return orig(); }} catch (e) {{ window.__fsErr = String(e); }}
            }};
            g._fsSpy = true;
        }}
        return window.__fsCalls;
    }}""")

def fs_info(page):
    return page.evaluate(f"""() => {{
        const g = {G};
        const scenes = g.scene.getScenes(true).map(s => {{
            const icons = s.children.list.filter(c => c.texture && (c.texture.key === 'fs_enter' || c.texture.key === 'fs_exit'))
                .map(i => ({{ key: i.texture.key, x: i.x, y: i.y, vis: i.visible, active: i.active }}));
            return {{ scene: s.scene.key, icons }};
        }});
        const el = document.getElementById('fibi-nick-input');
        return {{
            available: !!(g.device && g.device.fullscreen && g.device.fullscreen.available),
            isFs: !!g.scale.isFullscreen,
            calls: window.__fsCalls || 0,
            err: window.__fsErr || null,
            scenes: g.scene.getScenes(true).map(s => s.scene.key),
            icons: scenes,
            nick: el ? el.value : null,
            nickFocus: !!(el && document.activeElement === el),
        }};
    }}""")

def click_game(page, gx, gy):
    page.mouse.click(gx * 2, gy * 2)

def main():
    os.makedirs(SHOT, exist_ok=True)
    httpd, port = serve(ROOT)
    base = f'http://127.0.0.1:{port}/index.html'
    console = []
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = br.new_page(viewport={'width': 1136, 'height': 640})
        page.route('**/api/scores', mock)
        page.add_init_script("""
            try {
                Object.defineProperty(Document.prototype, 'fullscreenEnabled', { configurable: true, get() { return true; } });
            } catch (e) {}
        """)
        page.on('pageerror', lambda e: errs.append(f'PAGEERR {e}'))
        page.on('console', lambda m: console.append(m.type + ': ' + m.text) if m.type in ('error',) and not noisy(m.text) else None)

        # --- title ---
        page.goto(base, wait_until='domcontentloaded')
        wait_scene(page, 'Title')
        page.wait_for_timeout(500)
        install_spy(page)
        info = fs_info(page)
        print('TITLE', info)
        title_icons = [s for s in info['icons'] if s['scene'] == 'Title' and s['icons']]
        if not title_icons:
            errs.append(f'no fs button on Title: {info}')
        else:
            ic = title_icons[0]['icons'][0]
            if not ic['vis']:
                errs.append('fs button hidden on Title')
        page.screenshot(path=f'{SHOT}/fs_title.png')
        print('screenshot:', f'{SHOT}/fs_title.png')

        before = info['calls']
        click_game(page, 78, 22)   # środek przycisku na tytule (56+22, 6+16)
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('TITLE click', info)
        if info['calls'] < before + 1:
            errs.append(f'click on Title did not call toggleFullscreen (calls={info["calls"]}, before={before})')
        if 'Title' not in info['scenes'] or 'Play' in info['scenes'] or 'Intro' in info['scenes']:
            errs.append(f'click on fs button started the game: {info["scenes"]}')
        if info.get('err') and 'user gesture' not in (info['err'] or '').lower():
            # headless często odrzuca requestFullscreen — to nie jest błąd gry
            print('toggle err (ok if headless):', info['err'])

        before = info['calls']
        page.keyboard.press('f')
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('TITLE F', info)
        if info['calls'] < before + 1:
            errs.append(f'F on Title did not call toggleFullscreen (calls={info["calls"]}, before={before})')

        # --- gameplay (?nointro pomija intro po START) ---
        page.goto(base + '?nointro', wait_until='domcontentloaded')
        wait_scene(page, 'Title')
        page.wait_for_timeout(400)
        page.keyboard.press('Space')
        wait_scene(page, 'Play')
        page.wait_for_timeout(600)
        install_spy(page)
        info = fs_info(page)
        print('PLAY', info)
        play_icons = [s for s in info['icons'] if s['scene'] == 'Play' and s['icons']]
        if not play_icons:
            errs.append(f'no fs button on Play: {info}')
        page.screenshot(path=f'{SHOT}/fs_play.png')
        print('screenshot:', f'{SHOT}/fs_play.png')

        before = info['calls']
        click_game(page, 196, 20)  # środek przycisku w grze (174+22, 4+16)
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('PLAY click', info)
        if info['calls'] < before + 1:
            errs.append(f'click on Play did not call toggleFullscreen (calls={info["calls"]})')
        if 'Play' not in info['scenes']:
            errs.append(f'left Play after fs click: {info["scenes"]}')

        before = info['calls']
        page.keyboard.press('f')
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('PLAY F', info)
        if info['calls'] < before + 1:
            errs.append(f'F on Play did not call toggleFullscreen (calls={info["calls"]})')

        # --- nick: F ma być literą, nie przełącznikiem ---
        page.evaluate(f"""() => {{
            const g = {G};
            const play = g.scene.getScene('Play');
            play.scene.launch('Board', {{ mode: 'nick', from: 'Play', score: 123, time_ms: 5000 }});
        }}""")
        wait_scene(page, 'Board', 5000)
        page.wait_for_selector('#fibi-nick-input', timeout=4000)
        page.wait_for_timeout(300)
        page.locator('#fibi-nick-input').click()
        page.wait_for_timeout(150)
        install_spy(page)
        before = fs_info(page)['calls']
        page.keyboard.type('Fibi', delay=40)
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('NICK', info)
        page.screenshot(path=f'{SHOT}/fs_nick.png')
        print('screenshot:', f'{SHOT}/fs_nick.png')
        nick = (info.get('nick') or '').upper()
        if 'F' not in nick:
            errs.append(f'nick typing F failed, value={info.get("nick")!r}')
        if info['calls'] != before:
            errs.append(f'F during nick toggled fullscreen (calls {before} -> {info["calls"]})')
        board_icons = [s for s in info['icons'] if s['scene'] == 'Board' and s['icons']]
        if not board_icons:
            errs.append(f'no fs button on Board: {info}')

        # --- Board view (WYNIKI z tytułu) ---
        page.goto(base, wait_until='domcontentloaded')
        wait_scene(page, 'Title')
        page.wait_for_timeout(400)
        click_game(page, 284, 261)  # WYNIKI
        wait_scene(page, 'Board', 4000)
        page.wait_for_timeout(400)
        install_spy(page)
        info = fs_info(page)
        print('BOARD view', info)
        page.screenshot(path=f'{SHOT}/fs_board.png')
        print('screenshot:', f'{SHOT}/fs_board.png')
        board_icons = [s for s in info['icons'] if s['scene'] == 'Board' and s['icons']]
        if not board_icons:
            errs.append(f'no fs button on Board view: {info}')
        before = info['calls']
        page.keyboard.press('f')
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('BOARD F', info)
        if info['calls'] < before + 1:
            errs.append(f'F on Board view did not call toggleFullscreen (calls={info["calls"]})')

        if live_hits:
            errs.append('HIT LIVE API: ' + '; '.join(live_hits))
        if posts:
            print('mock POSTs (ok):', len(posts))
        if console:
            errs.extend('CONSOLE ' + c for c in console)

        br.close()
    httpd.shutdown()
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()
