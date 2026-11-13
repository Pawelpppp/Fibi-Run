#!/usr/bin/env python3
"""Fibi Run: regresja - po końcu gry przyciski menu (START / WYNIKI) muszą działać. API tablicy jest mockowane."""
from playwright.sync_api import sync_playwright
import json, sys

BASE = 'http://127.0.0.1:8893/index.html'
errs, posts, hits_live = [], [], []
G = "window.__arekGame"

def noisy(t): return any(s in t for s in ('GPU stall', 'AudioContext', 'ReadPixels'))

def scenes(page): return page.evaluate(f"{G}.scene.getScenes(true).map(s=>s.scene.key)")
def wait_scene(page, key, t=8000): page.wait_for_function(f"() => {G}.scene.isActive('{key}')", timeout=t)
def wait_only(page, key, t=8000):
    page.wait_for_function(f"() => {{const a={G}.scene.getScenes(true).map(s=>s.scene.key); return a.length===1 && a[0]==='{key}'}}", timeout=t)

def mock(route):
    req = route.request
    if req.method == 'POST':
        posts.append(req.post_data); route.fulfill(status=201, body='{}', headers={'access-control-allow-origin': '*'})
    elif req.method == 'GET':
        route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'},
                      body=json.dumps([{'nick': 'TEST', 'score': 500, 'time_ms': 60000, 'created_at': '2026-01-01T00:00:00Z'}]))
    else:
        route.fulfill(status=204, headers={'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'})

def tap(page, touch, gx, gy):
    # gra 568x320 FIT w viewport 1136x640 => skala 2
    if touch: page.touchscreen.tap(gx * 2, gy * 2)
    else: page.mouse.click(gx * 2, gy * 2)

def check_title(page, how, touch):
    """WYNIKI otwiera tablicę (i WSTECZ wraca), a START rusza grę - wybranym sposobem."""
    wait_only(page, 'Title'); page.wait_for_timeout(500)
    # WYNIKI
    if how == 'kbd':
        tap(page, False, 284, 261)  # klawiatura nie ma skrótu do WYNIKI - kliknij myszą
    else: tap(page, touch, 284, 261)
    wait_scene(page, 'Board', 3000); page.wait_for_timeout(500)
    page.keyboard.press('Escape'); wait_only(page, 'Title', 3000); page.wait_for_timeout(300)
    # START
    if how == 'kbd': page.keyboard.press('Enter')
    else: tap(page, touch, 284, 227)
    wait_scene(page, 'Play', 6000); page.wait_for_timeout(600)

def to_title_via(page, path, submit):
    if path == 'over':
        page.evaluate(f"() => {{const s={G}.scene.getScene('Play'); s.score=420; s.totalScore=420; s.gameOver();}}")
    else:
        page.evaluate(f"() => {{const s={G}.scene.getScene('Play'); s.score=900; s.totalScore=900; s.showFinal();}}")
    wait_scene(page, 'Board', 5000); page.wait_for_timeout(500)
    if submit:
        page.evaluate(f"() => {{const b={G}.scene.getScene('Board'); b.nick='ABC'; b.submit();}}")
    else:
        page.evaluate(f"() => {G}.scene.getScene('Board').skip()")
    page.wait_for_function(f"() => {G}.scene.getScene('Board').mode==='view'", timeout=5000)
    page.wait_for_timeout(500)
    page.keyboard.press('Enter')   # WSTECZ
    page.wait_for_function(f"() => !{G}.scene.isActive('Board')", timeout=8000)
    page.wait_for_timeout(1200)
    page.evaluate(f"() => {{const s={G}.scene.getScene('Play'); s.endReady=true; s.toMenu();}}")

def run(variant, touch, how):
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
        ctx = br.new_context(viewport={'width': 1136, 'height': 640}, has_touch=touch)
        page = ctx.new_page()
        page.route('**/api/scores', mock)
        page.on('console', lambda m: errs.append(f'{variant}/{how}: {m.type}: {m.text}') if m.type in ('error', 'warning') and not noisy(m.text) else None)
        page.on('pageerror', lambda e: errs.append(f'{variant}/{how}: PAGEERR {e}'))
        page.goto(BASE + '?nointro', wait_until='domcontentloaded')
        wait_scene(page, 'Title'); page.wait_for_timeout(500)
        page.mouse.click(5, 5) if not touch else None
        tap_start = lambda: (page.keyboard.press('Enter') if how == 'kbd' else tap(page, touch, 284, 227))
        tap_start(); wait_scene(page, 'Play', 8000); page.wait_for_timeout(800)
        for rnd in range(2):
            for path, submit in (('over', True), ('over', False), ('final', True), ('final', False)):
                if path == 'final' and rnd == 1 and False: pass
                to_title_via(page, path, submit)
                check_title(page, how, touch)
                print(f'  [{variant}/{how}] round {rnd+1} {path} submit={submit}: OK ->', scenes(page))
        br.close()

if __name__ == '__main__':
    for variant, touch, how in (('desktop', False, 'kbd'), ('desktop', False, 'mouse'), ('mobile', True, 'touch')):
        try: run(variant, touch, how)
        except Exception as e:
            import traceback; print(f'FAIL {variant}/{how}:', str(e).splitlines()[0], [l.strip() for l in traceback.format_exc().splitlines() if 'test_menu' in l][-2:]); errs.append('FAIL ' + variant)
    print('POSTs (mock):', len(posts))
    print('ERRORS:', errs or 'none')
    sys.exit(1 if errs else 0)
