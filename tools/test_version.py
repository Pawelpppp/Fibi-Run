#!/usr/bin/env python3
"""Fibi Run: na ekranie tytułowym widać v1.N z window.FIBI_VERSION. API tablicy jest mockowane."""
from playwright.sync_api import sync_playwright
import http.server, json, os, socket, sys, threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
errs = []

def mock(route):
    req = route.request
    if req.method == 'POST':
        route.fulfill(status=201, body='{}', headers={'access-control-allow-origin': '*'})
    elif req.method == 'GET':
        route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'},
                      body=json.dumps([]))
    else:
        route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})

def serve(root):
    os.chdir(root)
    class H(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), H)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, httpd.server_address[1]

def main():
    httpd, port = serve(ROOT)
    base = f'http://127.0.0.1:{port}/index.html'
    shot = sys.argv[1] if len(sys.argv) > 1 else ''
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        page = br.new_page(viewport={'width': 1136, 'height': 640})
        page.route('**/api/scores', mock)
        page.on('pageerror', lambda e: errs.append(f'PAGEERR {e}'))
        page.goto(base, wait_until='domcontentloaded')
        page.wait_for_function("() => window.__arekGame && window.__arekGame.scene.isActive('Title')", timeout=8000)
        page.wait_for_timeout(600)
        info = page.evaluate("""() => {
            const g = window.__arekGame;
            const s = g.scene.getScene('Title');
            const labels = s.children.list.filter(c => c._str).map(c => c._str);
            return { version: window.FIBI_VERSION || null, sha: window.FIBI_VERSION_SHA || '', labels };
        }""")
        print('FIBI_VERSION:', info['version'], 'SHA:', info['sha'] or '-')
        print('labels:', info['labels'])
        expected = 'v' + (info['version'] or '1.dev').upper()
        if expected not in info['labels']:
            errs.append(f'missing {expected} on title, have {info["labels"]}')
        if shot:
            os.makedirs(os.path.dirname(shot) or '.', exist_ok=True)
            page.screenshot(path=shot)
            print('screenshot:', shot)
        br.close()
    httpd.shutdown()
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)

if __name__ == '__main__':
    main()
