#!/usr/bin/env python3
"""Fibi Run: niewidoczne statystyki GoatCounter.
API tablicy i GoatCounter są mockowane — nigdy nie wołamy żywego Azure ani gc.zgo.at."""
from playwright.sync_api import sync_playwright
import http.server, json, os, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []
# stub: udaje count.js, zapisuje wywołania, nic nie wysyła
STUB_JS = """
window.__gcCalls = window.__gcCalls || [];
window.goatcounter = window.goatcounter || {};
window.goatcounter.count = function (opts) {
    window.__gcCalls.push(opts || {});
};
if (!window.goatcounter.no_onload) {
    window.goatcounter.count({ path: location.pathname, title: document.title, event: false });
}
"""
FAKE_HOST = 'fibi.stats.test'
FAKE_CODE = 'test-kod-fibi'
CHROME = '/usr/bin/google-chrome'
G = "window.__arekGame"

def noisy(t):
    return any(s in t for s in ('GPU stall', 'AudioContext', 'ReadPixels', 'Fullscreen', 'fullscreen',
                                'Permissions check failed', 'not allowed'))

def mock_scores(route):
    req = route.request
    if req.method == 'POST':
        route.fulfill(status=201, body='{}', headers={'access-control-allow-origin': '*'})
    elif req.method == 'GET':
        route.fulfill(status=200, content_type='application/json',
                      headers={'access-control-allow-origin': '*'}, body=json.dumps([]))
    else:
        route.fulfill(status=204, headers={
            'access-control-allow-origin': '*',
            'access-control-allow-headers': '*',
            'access-control-allow-methods': '*',
        })

def is_gc_url(url):
    u = url.lower()
    return 'gc.zgo.at' in u or 'goatcounter.com' in u

def serve(root):
    os.chdir(root)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

def wait_scene(page, key, t=8000):
    page.wait_for_function(f"() => {G} && {G}.scene.isActive('{key}')", timeout=t)

def gc_script_info(page):
    return page.evaluate("""() => {
        const nodes = [...document.querySelectorAll('script')].filter(s =>
            (s.getAttribute('src') || '').includes('gc.zgo.at') || s.hasAttribute('data-goatcounter'));
        return nodes.map(s => ({
            src: s.getAttribute('src') || '',
            endpoint: s.getAttribute('data-goatcounter') || '',
            async: !!s.async,
        }));
    }""")

def run_case(p, httpd_port, name, origin_host, code, expect_script, start_game=False):
    gc_hits = []
    case_errs = []
    launch_args = ['--no-sandbox']
    if origin_host != '127.0.0.1':
        launch_args.append(f'--host-resolver-rules=MAP {origin_host} 127.0.0.1')
    br = p.chromium.launch(executable_path=CHROME, args=launch_args)
    page = br.new_page(viewport={'width': 1136, 'height': 640})

    def on_gc(route):
        url = route.request.url
        gc_hits.append({'url': url, 'method': route.request.method})
        if 'gc.zgo.at' in url and 'count.js' in url:
            route.fulfill(status=200, content_type='application/javascript; charset=utf-8', body=STUB_JS)
        else:
            route.fulfill(status=204, body='')

    def on_any(route):
        if is_gc_url(route.request.url):
            on_gc(route)
        else:
            route.fallback()

    page.route('**/api/scores', mock_scores)
    page.route('**://gc.zgo.at/**', on_gc)
    page.route('**://*.goatcounter.com/**', on_gc)
    page.route('**://goatcounter.com/**', on_gc)
    # siatka bezpieczeństwa: gdyby coś ominęło powyższe
    page.route('**/*', on_any)

    page.on('console', lambda m: case_errs.append(f'{name}: {m.type}: {m.text}')
            if m.type in ('error', 'warning') and not noisy(m.text) else None)
    page.on('pageerror', lambda e: case_errs.append(f'{name}: PAGEERR {e}'))

    if code is not None:
        # ustawienie przed stats.js (stats.js nie nadpisuje istniejącego FIBI_STATS)
        page.add_init_script(f"window.FIBI_STATS = {{ GOATCOUNTER_CODE: {json.dumps(code)} }};")

    base = f'http://{origin_host}:{httpd_port}/index.html?nointro'
    page.goto(base, wait_until='domcontentloaded')
    wait_scene(page, 'Title')
    page.wait_for_timeout(500)

    scripts = gc_script_info(page)
    print(f'{name}: host={origin_host} code={code!r} scripts={scripts} gc_hits={len(gc_hits)}')

    if expect_script:
        if len(scripts) != 1:
            errs.append(f'{name}: expected 1 goatcounter script, got {scripts}')
        else:
            expected_ep = f'https://{code}.goatcounter.com/count'
            if scripts[0]['endpoint'] != expected_ep:
                errs.append(f'{name}: data-goatcounter={scripts[0]["endpoint"]!r}, expected {expected_ep}')
            if 'gc.zgo.at/count.js' not in scripts[0]['src']:
                errs.append(f'{name}: unexpected script src {scripts[0]["src"]!r}')
            if not scripts[0]['async']:
                errs.append(f'{name}: count.js should be async')
        # stub powinien się załadować (strona nie jest localhost)
        try:
            page.wait_for_function('() => window.goatcounter && typeof window.goatcounter.count === "function"', timeout=3000)
        except Exception as e:
            errs.append(f'{name}: stub count.js did not run: {e}')
    else:
        if scripts:
            errs.append(f'{name}: script should not load, got {scripts}')
        if gc_hits:
            errs.append(f'{name}: no GoatCounter requests expected, got {gc_hits}')

    if start_game and expect_script:
        page.keyboard.press('Enter')
        wait_scene(page, 'Play', 8000)
        page.wait_for_timeout(400)
        calls = page.evaluate('() => window.__gcCalls || []')
        print(f'{name}: gc calls={calls}')
        start_calls = [c for c in calls if c.get('path') == 'start-gry']
        if not start_calls:
            errs.append(f'{name}: missing start-gry event, calls={calls}')
        else:
            ev = start_calls[0]
            if ev.get('title') != 'Start gry' or ev.get('event') is not True:
                errs.append(f'{name}: bad start event {ev}')
        # gra ruszyła
        if not page.evaluate(f"() => {G} && {G}.scene.isActive('Play')"):
            errs.append(f'{name}: Play scene not active after NEW GAME')
    elif start_game:
        page.keyboard.press('Enter')
        wait_scene(page, 'Play', 8000)
        page.wait_for_timeout(200)
        if page.evaluate('() => window.__gcCalls && window.__gcCalls.length'):
            errs.append(f'{name}: start event must not fire when tracking is off')

    errs.extend(case_errs)
    # nic widocznego: brak widgetu / licznika
    visible = page.evaluate("""() => {
        const bad = document.querySelector('#gc-stats, .goatcounter, [id*="goatcounter"]');
        return bad ? bad.outerHTML.slice(0, 200) : '';
    }""")
    if visible:
        errs.append(f'{name}: visible counter DOM {visible}')

    br.close()
    return gc_hits

def main():
    httpd, port = serve(ROOT)
    with sync_playwright() as p:
        # 1) placeholder na 127.0.0.1 — nic się nie ładuje, gra startuje
        run_case(p, port, 'placeholder-local', '127.0.0.1', None, expect_script=False, start_game=True)
        # 2) placeholder na fałszywym hoście — też nic
        run_case(p, port, 'placeholder-host', FAKE_HOST, None, expect_script=False, start_game=False)
        # 3) kod na localhost — skrypt nie wstaje, brak requestów
        run_case(p, port, 'code-local', '127.0.0.1', FAKE_CODE, expect_script=False, start_game=True)
        # 4) kod na fałszywym hoście — skrypt z właściwym data-goatcounter, zdarzenie start-gry
        run_case(p, port, 'code-host', FAKE_HOST, FAKE_CODE, expect_script=True, start_game=True)
        # 5) jawny placeholder nadpisany na hoście
        run_case(p, port, 'explicit-placeholder-host', FAKE_HOST, 'TWOJ-KOD', expect_script=False, start_game=False)
    httpd.shutdown()
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()
