#!/usr/bin/env python3
"""Fibi Run: pełny ekran na pointerup (gest Androida) i pauza po obrocie w pion.
API tablicy jest mockowane — nigdy nie wołamy żywego Azure."""
from playwright.sync_api import sync_playwright
import http.server, json, os, sys, threading, time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOT = '/workspace/shots'
errs, posts, live_hits = [], [], []
G = "window.__arekGame"
UA_PIXEL = ("Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36")
UA_IPHONE = ("Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 "
             "(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1")
NO_FS_API = ("for (const k of ['requestFullscreen','webkitRequestFullscreen','webkitRequestFullScreen']) "
             "{ delete Element.prototype[k]; delete HTMLElement.prototype[k]; } "
             "for (const k of ['exitFullscreen','webkitExitFullscreen','webkitCancelFullScreen']) delete Document.prototype[k]; "
             "Object.defineProperty(Document.prototype,'fullscreenEnabled',{configurable:true,get:()=>false});"
             "Object.defineProperty(Document.prototype,'webkitFullscreenEnabled',{configurable:true,get:()=>false});")

def noisy(t):
    return any(s in t for s in ('GPU stall', 'AudioContext', 'ReadPixels', 'Fullscreen', 'fullscreen',
                                'Permissions check failed', 'not allowed'))

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

def game_xy(page, gx, gy):
    return page.evaluate(f"""() => {{
        const c = document.querySelector('canvas').getBoundingClientRect();
        return [c.x + {gx} / 568 * c.width, c.y + {gy} / 320 * c.height];
    }}""")

def install_spy(page):
    return page.evaluate("""() => {
        if (window.__fsSpy) return window.__fsReq || 0;
        window.__fsReq = 0;
        window.__fsTag = null;
        window.__locks = [];
        const wrap = (orig, kind) => function () {
            if (kind === 'req') { window.__fsReq++; window.__fsTag = this && this.tagName; }
            else window.__fsExit = (window.__fsExit || 0) + 1;
            if (typeof orig === 'function') {
                try {
                    const p = orig.apply(this, arguments);
                    if (p && p.catch) p.catch(() => {});
                    return p || Promise.resolve();
                } catch (e) { return Promise.resolve(); }
            }
            return Promise.resolve();
        };
        const ep = Element.prototype, dp = Document.prototype;
        // nie dokładaj API, jeśli go nie było (test iPhone)
        if (typeof ep.requestFullscreen === 'function') ep.requestFullscreen = wrap(ep.requestFullscreen, 'req');
        if (typeof ep.webkitRequestFullscreen === 'function') ep.webkitRequestFullscreen = wrap(ep.webkitRequestFullscreen, 'req');
        if (typeof dp.exitFullscreen === 'function') dp.exitFullscreen = wrap(dp.exitFullscreen, 'exit');
        if (typeof dp.webkitExitFullscreen === 'function') dp.webkitExitFullscreen = wrap(dp.webkitExitFullscreen, 'exit');
        try {
            if (screen.orientation) {
                const lo = screen.orientation.lock ? screen.orientation.lock.bind(screen.orientation) : null;
                screen.orientation.lock = (o) => {
                    window.__locks.push(o);
                    return lo ? Promise.resolve(lo(o)).catch(() => {}) : Promise.resolve();
                };
            }
        } catch (e) {}
        window.__fsSpy = true;
        return 0;
    }""")

def fs_info(page):
    return page.evaluate(f"""() => {{
        const g = {G};
        const scenes = g.scene.getScenes(true).map(s => {{
            const icons = s.children.list.filter(c => c.texture && (c.texture.key === 'fs_enter' || c.texture.key === 'fs_exit'))
                .map(i => ({{ key: i.texture.key, x: i.x, y: i.y, vis: i.visible, active: i.active }}));
            return {{ scene: s.scene.key, icons }};
        }});
        const el = document.getElementById('fibi-nick-input');
        const rot = document.getElementById('rotate');
        return {{
            isFs: !!g.scale.isFullscreen,
            req: window.__fsReq || 0,
            exit: window.__fsExit || 0,
            tag: window.__fsTag || null,
            locks: window.__locks || [],
            scenes: g.scene.getScenes(true).map(s => s.scene.key),
            icons: scenes,
            paused: !!g.isPaused,
            orient: window.__fibiOrientation ? __fibiOrientation() : null,
            rotate: rot ? {{ show: rot.classList.contains('show'), text: rot.innerText,
                              vis: getComputedStyle(rot).display !== 'none' }} : null,
            nick: el ? el.value : null,
            rotateCount: document.querySelectorAll('#rotate').length,
        }};
    }}""")

def overlay(page):
    return page.evaluate("""() => {
        const o = document.getElementById('rotate');
        if (!o) return null;
        const r = o.getBoundingClientRect();
        return { vis: o.classList.contains('show') && getComputedStyle(o).display !== 'none',
                 w: r.width, h: r.height, text: o.innerText };
    }""")

def click_game(page, gx, gy):
    x, y = game_xy(page, gx, gy)
    page.mouse.click(x, y)

def fail(msg):
    errs.append(msg)
    print('ERR', msg)

def main():
    os.makedirs(SHOT, exist_ok=True)
    httpd, port = serve(ROOT)
    base = f'http://127.0.0.1:{port}/index.html'
    console = []
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])

        def hook(page):
            page.route('**/api/scores', mock)
            page.route('**/*azurewebsites.net/**', mock)
            page.on('pageerror', lambda e: errs.append(f'PAGEERR {e}'))
            page.on('console', lambda m: console.append(m.type + ': ' + m.text)
                    if m.type in ('error',) and not noisy(m.text) else None)

        # ========== desktop: F i klik wołają requestFullscreen ==========
        page = br.new_page(viewport={'width': 1136, 'height': 640})
        hook(page)
        page.goto(base, wait_until='domcontentloaded')
        wait_scene(page, 'Title')
        page.wait_for_timeout(400)
        install_spy(page)
        info = fs_info(page)
        print('TITLE', info)
        if not any(s['scene'] == 'Title' and s['icons'] for s in info['icons']):
            fail(f'no fs button on Title: {info}')
        page.screenshot(path=f'{SHOT}/mfs_title.png')
        print('screenshot:', f'{SHOT}/mfs_title.png')

        before = info['req']
        click_game(page, 78, 22)
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('TITLE click', info)
        if info['req'] < before + 1:
            fail(f'click on Title did not call requestFullscreen (req={info["req"]}, before={before})')
        if info.get('tag') and info['tag'] not in ('HTML', 'html'):
            fail(f'fullscreen target was {info["tag"]}, expected HTML')
        if 'Title' not in info['scenes'] or 'Play' in info['scenes'] or 'Intro' in info['scenes']:
            fail(f'click on fs button started the game: {info["scenes"]}')

        # po kliku jesteśmy w pełnym ekranie — F ma wyjść
        before_exit = info['exit']
        page.keyboard.press('f')
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('TITLE F exit', info)
        if info['exit'] < before_exit + 1 and info['isFs']:
            fail(f'F on Title did not exit fullscreen (exit={info["exit"]}, isFs={info["isFs"]})')
        before = info['req']
        page.keyboard.press('f')
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('TITLE F enter', info)
        if info['req'] < before + 1:
            fail(f'F on Title did not call requestFullscreen (req={info["req"]}, before={before})')

        # gameplay
        page.goto(base + '?nointro', wait_until='domcontentloaded')
        wait_scene(page, 'Title')
        page.wait_for_timeout(300)
        page.keyboard.press('Space')
        wait_scene(page, 'Play')
        page.wait_for_timeout(500)
        install_spy(page)
        info = fs_info(page)
        print('PLAY', info)
        if not any(s['scene'] == 'Play' and s['icons'] for s in info['icons']):
            fail(f'no fs button on Play: {info}')
        page.screenshot(path=f'{SHOT}/mfs_play.png')
        print('screenshot:', f'{SHOT}/mfs_play.png')
        before = info['req']
        click_game(page, 196, 20)
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('PLAY click', info)
        if info['req'] < before + 1:
            fail(f'click on Play did not call requestFullscreen (req={info["req"]})')
        if 'Play' not in info['scenes']:
            fail(f'left Play after fs click: {info["scenes"]}')
        before_exit = info['exit']
        page.keyboard.press('f')
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('PLAY F exit', info)
        if info['exit'] < before_exit + 1 and info['isFs']:
            fail(f'F on Play did not exit fullscreen (exit={info["exit"]}, isFs={info["isFs"]})')
        before = info['req']
        page.keyboard.press('f')
        page.wait_for_timeout(250)
        info = fs_info(page)
        print('PLAY F enter', info)
        if info['req'] < before + 1:
            fail(f'F on Play did not call requestFullscreen (req={info["req"]})')

        # nick: F = litera
        page.evaluate(f"""() => {{
            const play = {G}.scene.getScene('Play');
            play.scene.launch('Board', {{ mode: 'nick', from: 'Play', score: 123, time_ms: 5000 }});
        }}""")
        wait_scene(page, 'Board', 5000)
        page.wait_for_selector('#fibi-nick-input', timeout=4000)
        page.wait_for_timeout(200)
        page.locator('#fibi-nick-input').click()
        page.wait_for_timeout(150)
        install_spy(page)
        before = fs_info(page)['req']
        page.keyboard.type('Fibi', delay=40)
        page.wait_for_timeout(200)
        info = fs_info(page)
        print('NICK', info)
        page.screenshot(path=f'{SHOT}/mfs_nick.png')
        nick = (info.get('nick') or '').upper()
        if 'F' not in nick:
            fail(f'nick typing F failed, value={info.get("nick")!r}')
        if info['req'] != before:
            fail(f'F during nick toggled fullscreen (req {before} -> {info["req"]})')
        page.close()

        # desktop wąskie okno: bez overlayu
        desk = br.new_page(viewport={'width': 400, 'height': 800})
        hook(desk)
        desk.goto(base, wait_until='domcontentloaded')
        wait_scene(desk, 'Title', 15000)
        desk.wait_for_timeout(400)
        info = fs_info(desk)
        print('DESKTOP narrow', info)
        if info['rotate'] is not None and info['rotate'].get('show'):
            fail('desktop narrow window showed rotate overlay')
        if info['paused']:
            fail('desktop narrow window paused the game')
        desk.close()

        # ========== telefon: pointerup, nie pointerdown ==========
        mobile = br.new_page(viewport={'width': 915, 'height': 412}, device_scale_factor=2.625,
                             is_mobile=True, has_touch=True, user_agent=UA_PIXEL)
        hook(mobile)
        mobile.goto(base, wait_until='domcontentloaded')
        wait_scene(mobile, 'Title', 15000)
        mobile.wait_for_timeout(500)
        install_spy(mobile)
        info = fs_info(mobile)
        print('MOBILE title', info)
        if not any(s['scene'] == 'Title' and s['icons'] for s in info['icons']):
            fail(f'no fs button on mobile Title: {info}')
        mobile.screenshot(path=f'{SHOT}/mfs_mobile_title.png')
        print('screenshot:', f'{SHOT}/mfs_mobile_title.png')

        x, y = game_xy(mobile, 78, 22)
        cdp = mobile.context.new_cdp_session(mobile)
        before = fs_info(mobile)['req']
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x, 'y': y}]})
        mobile.wait_for_timeout(350)
        mid = fs_info(mobile)
        print('MOBILE touchstart', mid)
        if mid['req'] != before:
            fail(f'fullscreen already on touchstart (req {before} -> {mid["req"]})')
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        mobile.wait_for_timeout(400)
        after = fs_info(mobile)
        print('MOBILE touchend', after)
        if after['req'] < before + 1:
            fail(f'touchend on Title did not call requestFullscreen (req={after["req"]}, before={before})')
        if after.get('tag') and after['tag'] not in ('HTML', 'html'):
            fail(f'mobile fullscreen target was {after["tag"]}, expected HTML')
        if 'Title' not in after['scenes'] or 'Play' in after['scenes'] or 'Intro' in after['scenes']:
            fail(f'touch on fs button started the game: {after["scenes"]}')
        # blokada orientacji — wołana po faktycznym wejściu w FS; w headless często nie wejdzie,
        # więc lock sprawdzamy przez ręczne emitowanie zdarzenia Phasera
        mobile.evaluate(f"{G}.scale.emit(Phaser.Scale.Events.ENTER_FULLSCREEN)")
        mobile.wait_for_timeout(150)
        locks = mobile.evaluate('window.__locks')
        print('LOCKS', locks)
        if 'landscape' not in locks:
            fail(f'enterfullscreen did not lock landscape: {locks}')

        # obrót w pion na tytule
        mobile.set_viewport_size({'width': 412, 'height': 915})
        mobile.wait_for_timeout(450)
        o = overlay(mobile)
        ori = mobile.evaluate('__fibiOrientation()')
        print('PORTRAIT title', o, ori)
        mobile.screenshot(path=f'{SHOT}/mfs_portrait.png')
        print('screenshot:', f'{SHOT}/mfs_portrait.png')
        if not (o and o['vis'] and 'OBRÓĆ TELEFON' in o['text'] and 'ZATRZYMANA' in o['text']):
            fail(f'portrait overlay missing on title: {o}')
        if not ori['gamePaused']:
            fail(f'game not paused in portrait: {ori}')

        mobile.set_viewport_size({'width': 915, 'height': 412})
        mobile.wait_for_timeout(550)
        o = overlay(mobile)
        ori = mobile.evaluate('__fibiOrientation()')
        print('LANDSCAPE title', o, ori)
        mobile.screenshot(path=f'{SHOT}/mfs_landscape.png')
        print('screenshot:', f'{SHOT}/mfs_landscape.png')
        if o and o['vis']:
            fail(f'overlay still visible in landscape: {o}')
        if ori['gamePaused']:
            fail(f'game still paused in landscape: {ori}')

        # gameplay + pauza fizyki
        mobile.goto(base + '?nointro', wait_until='domcontentloaded')
        wait_scene(mobile, 'Title', 15000)
        mobile.wait_for_timeout(300)
        # tap START NEW GAME (środek przycisku 284, 227)
        sx, sy = game_xy(mobile, 284, 227)
        mobile.touchscreen.tap(sx, sy)
        wait_scene(mobile, 'Play', 10000)
        mobile.wait_for_timeout(700)
        install_spy(mobile)
        a = mobile.evaluate(f"""() => {{
            const s = {G}.scene.getScene('Play');
            return {{ cam: s.camX, x: s.a.x, scenes: {G}.scene.getScenes(true).map(sc => sc.scene.key) }};
        }}""")
        print('PLAY start', a)
        mobile.set_viewport_size({'width': 412, 'height': 915})
        mobile.wait_for_timeout(450)
        o = overlay(mobile)
        ori = mobile.evaluate('__fibiOrientation()')
        b = mobile.evaluate(f"""() => {{
            const s = {G}.scene.getScene('Play');
            return {{ cam: s.camX, x: s.a.x }};
        }}""")
        mobile.wait_for_timeout(800)
        c = mobile.evaluate(f"""() => {{
            const s = {G}.scene.getScene('Play');
            return {{ cam: s.camX, x: s.a.x }};
        }}""")
        print('PORTRAIT play', o, ori, b, c)
        mobile.screenshot(path=f'{SHOT}/mfs_play_portrait.png')
        print('screenshot:', f'{SHOT}/mfs_play_portrait.png')
        if not (o and o['vis']):
            fail(f'portrait overlay missing in Play: {o}')
        if not ori['gamePaused']:
            fail(f'Play not paused in portrait: {ori}')
        if b != c:
            fail(f'Play still moving while paused: {b} -> {c}')
        if 'Play' not in mobile.evaluate(f"{G}.scene.getScenes(true).map(s => s.scene.key)"):
            fail('left Play after portrait rotate')

        mobile.set_viewport_size({'width': 915, 'height': 412})
        mobile.wait_for_timeout(600)
        o = overlay(mobile)
        ori = mobile.evaluate('__fibiOrientation()')
        mobile.wait_for_timeout(500)
        d = mobile.evaluate(f"""() => {{
            const s = {G}.scene.getScene('Play');
            return {{ cam: s.camX, x: s.a.x }};
        }}""")
        print('LANDSCAPE play', o, ori, d)
        mobile.screenshot(path=f'{SHOT}/mfs_play_landscape.png')
        print('screenshot:', f'{SHOT}/mfs_play_landscape.png')
        if o and o['vis']:
            fail(f'overlay still visible after resume: {o}')
        if ori['gamePaused']:
            fail(f'Play still paused after landscape: {ori}')
        if d['cam'] == c['cam']:
            fail(f'Play did not resume scrolling: paused={c} resumed={d}')

        # restart sceny nie dubluje overlayu
        mobile.evaluate(f"{G}.scene.getScene('Play').scene.start('Title')")
        wait_scene(mobile, 'Title', 8000)
        mobile.wait_for_timeout(300)
        n = mobile.evaluate("document.querySelectorAll('#rotate').length")
        if n != 1:
            fail(f'scene restart duplicated rotate overlay: count={n}')
        mobile.set_viewport_size({'width': 412, 'height': 915})
        mobile.wait_for_timeout(450)
        o = overlay(mobile)
        if not (o and o['vis']):
            fail(f'overlay broken after scene restart: {o}')
        mobile.set_viewport_size({'width': 915, 'height': 412})
        mobile.wait_for_timeout(550)
        if overlay(mobile)['vis']:
            fail('overlay stuck after restart + landscape')
        mobile.close()

        # iPhone bez API: przycisk jest, pokazuje podpowiedź
        iph = br.new_page(viewport={'width': 667, 'height': 375}, is_mobile=True, has_touch=True, user_agent=UA_IPHONE)
        hook(iph)
        iph.add_init_script(NO_FS_API)
        iph.goto(base, wait_until='domcontentloaded')
        wait_scene(iph, 'Title', 15000)
        iph.wait_for_timeout(400)
        install_spy(iph)
        iph.evaluate(f"window.__unsup=0; {G}.scale.on('fullscreenunsupported',()=>window.__unsup++)")
        info = fs_info(iph)
        if not any(s['scene'] == 'Title' and s['icons'] for s in info['icons']):
            fail(f'fs button hidden on iPhone: {info}')
        x, y = game_xy(iph, 78, 22)
        iph.touchscreen.tap(x, y)
        iph.wait_for_timeout(400)
        unsup = iph.evaluate('window.__unsup')
        print('IPHONE unsup', unsup)
        if unsup != 1:
            fail(f'iPhone tap did not emit fullscreenunsupported (unsup={unsup})')
        # podpowiedź w tekście sceny
        has_hint = iph.evaluate(f"""() => {{
            const s = {G}.scene.getScene('Title');
            return s.children.list.filter(o => o.texture && o.texture.key && String(o.texture.key).indexOf('UDOST') >= 0 || (o._str && o._str.indexOf('UDOST') >= 0) || (o._str && o._str.indexOf('EKRANU') >= 0)).length > 0
                || s.children.list.some(o => o._str && o._str.indexOf('EKRANU') >= 0);
        }}""")
        print('IPHONE hint', has_hint)
        if not has_hint:
            fail('iPhone tap did not show home-screen hint')
        iph.screenshot(path=f'{SHOT}/mfs_iphone_hint.png')
        print('screenshot:', f'{SHOT}/mfs_iphone_hint.png')
        iph.close()

        if live_hits:
            fail('HIT LIVE API: ' + '; '.join(live_hits))
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
