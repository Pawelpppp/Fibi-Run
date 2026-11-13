#!/usr/bin/env python3
"""Fibi Run: regresja - zebranie błyskawicy (SPEED UP) nie może zawieszać gry.

Błąd (44557c1): updateBoostHud trzymał zniszczone obiekty HUD po restarcie sceny -> TypeError w update
(Rectangle.setSize na zniszczonym obiekcie) -> wyjątek zabijał pętlę Phasera (RAF), gra stawała.
Sprawdza pageerror i "żywotność" pętli (game.loop.frame, s.clock, camX) w scenariuszach:
misje 1/3/5, naturalne zebranie skokiem, drugie zebranie, wygaśnięcie, utrata życia, restart po końcu gry,
PLAY AGAIN, przejście do następnej misji, bieg do areny bossa, mobile (dotyk). API tablicy jest mockowane (nic nie leci na Azure).
Użycie: python3 tools/test_speed_freeze.py [URL_BAZOWY]   (domyślnie lokalny index.html; np. https://pawelpppp.github.io/Fibi-Run/)
"""
from playwright.sync_api import sync_playwright
import os, sys, json, time

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'file://' + os.path.join(os.path.dirname(HERE), 'index.html')
G = "window.__arekGame"
S = G + ".scene.getScene('Play')"
errs, fails, posts = [], [], []
CHROME = next((c for c in ('/usr/bin/google-chrome', '/usr/bin/chromium', None) if c is None or os.path.exists(c)), None)

def ok(cond, msg):
    print(('  OK   ' if cond else '  FAIL ') + msg)
    if not cond: fails.append(msg)

def mock(route):
    r = route.request
    h = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*'}
    if r.method == 'POST': posts.append(r.post_data); route.fulfill(status=201, body='{}', headers=h)
    elif r.method == 'GET': route.fulfill(status=200, content_type='application/json', headers=h, body='[]')
    else: route.fulfill(status=204, headers=h)

def ev(pg, js): return pg.evaluate(js)

def alive(pg, label, ms=700, moving=True):
    """pętla gry musi dalej chodzić: rośnie frame i clock (a w trybie run także camX)."""
    a = ev(pg, f"(()=>{{const s={S}; return [{G}.loop.frame, s.clock, s.camX]}})()")
    pg.wait_for_timeout(ms)
    b = ev(pg, f"(()=>{{const s={S}; return [{G}.loop.frame, s.clock, s.camX]}})()")
    ok(b[0] > a[0] + 5 and b[1] > a[1], f'{label}: pętla chodzi (frame +{b[0]-a[0]}, clock +{b[1]-a[1]:.2f})')
    if moving: ok(b[2] > a[2] + 5, f'{label}: ekran się przewija (camX +{b[2]-a[2]:.0f})')

def new_page(br, touch=False, mission=1):
    ctx = br.new_context(viewport={'width': 1136, 'height': 640}, has_touch=touch, is_mobile=touch)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
    pg.on('console', lambda m: errs.append('console.error ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.route('**/api/scores', mock)
    sep = '&' if '?' in BASE else '?'
    pg.goto(f'{BASE}{sep}mission={mission}&nointro' + ('&touch' if touch else '')); pg.wait_for_timeout(1500)
    if touch: pg.touchscreen.tap(300, 300)
    else: pg.mouse.click(300, 300)
    pg.wait_for_timeout(300)
    if not ev(pg, f"{G}.scene.isActive('Play')"):
        pg.keyboard.press('Enter')
    pg.wait_for_function(f"{G}.scene.isActive('Play')", timeout=8000); pg.wait_for_timeout(1500)
    return pg

def god(pg): ev(pg, f"(()=>{{const s={S}; s.lives=9; s.invuln=999; s.spawning=false;}})()")

def jump(pg, touch):
    if touch: pg.touchscreen.tap(1136 - 64, 580)   # przycisk skoku (568-32, 290) x2
    else: pg.keyboard.press('Space')

def pickup(pg, touch=False, natural=True):
    """stawia błyskawicę przed Arkiem i zbiera ją skokiem (natural) albo wymusza podniesienie."""
    god(pg)
    ev(pg, f"(()=>{{const s={S}; s.spawnBolt(s.camX+330);}})()")
    if not natural:
        ev(pg, f"(()=>{{const s={S}; s.a.x=s.bolts[0].wx; s.a.y=s.bolts[0].y+10; }})()")
    prev = None
    for _ in range(500):
        if ev(pg, f"{S}.boostT>5"): return True
        d = ev(pg, f"(()=>{{const s={S}; return s.bolts.length? s.bolts[0].wx-s.a.x : -1}})()")
        now = time.time()
        if prev is not None and d > 0 and prev[0] > d:
            closing = (prev[0] - d) / (now - prev[1])       # px/s (zależy od misji)
            if ev(pg, f"{S}.a.onGround") and d < closing * 0.17: jump(pg, touch)   # stopy Arka muszą być w pasie 174-248 px (wznoszenie ~0.1-0.25 s po wybiciu)
        prev = (d, now) if d > 0 else None
        pg.wait_for_timeout(30)
    return False

def boost_state(pg): return ev(pg, f"(()=>{{const s={S}; return [s.boostT, s.boostMul]}})()")

def scenario_basic(br, mission, touch=False):
    tag = f'm{mission}{" touch" if touch else ""}'
    print(f'[{tag}] zebranie, wygaśnięcie, drugie zebranie')
    pg = new_page(br, touch, mission)
    ok(pickup(pg, touch), f'{tag}: błyskawica zebrana skokiem')
    pg.wait_for_timeout(1200); alive(pg, f'{tag} podczas boostu')
    ok(boost_state(pg)[1] > 1.3, f'{tag}: boostMul rośnie ({boost_state(pg)[1]:.2f})')
    ev(pg, f"{S}.boostT=0.4"); pg.wait_for_timeout(1800)
    ok(boost_state(pg) [1] < 1.1, f'{tag}: po wygaśnięciu prędkość wraca ({boost_state(pg)[1]:.2f})')
    alive(pg, f'{tag} po wygaśnięciu')
    ok(pickup(pg, touch, natural=False), f'{tag}: drugie zebranie')
    pg.wait_for_timeout(800); alive(pg, f'{tag} po drugim zebraniu')
    # utrata życia podczas boostu
    ev(pg, f"(()=>{{const s={S}; s.invuln=0; s.hurt();}})()"); pg.wait_for_timeout(1200)
    alive(pg, f'{tag} po utracie życia w boost')
    pg.context.close()

def scenario_restart(br):
    print('[restart] zebranie po restarcie sceny / następnej misji (pierwotny błąd)')
    pg = new_page(br, False, 1)
    ev(pg, f"{S}.restartLevel()"); pg.wait_for_timeout(1500)
    ok(pickup(pg), 'po restartLevel: zebrane'); pg.wait_for_timeout(900); alive(pg, 'po restartLevel + boost')
    # koniec gry -> restart
    ev(pg, f"(()=>{{const s={S}; s.invuln=0; s.lives=1; s.hurt();}})()"); pg.wait_for_timeout(2500)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(600); pg.keyboard.press('Escape'); pg.wait_for_timeout(600)   # zamknij tablicę wyników (wpis nicku) nad sceną Play
    ev(pg, f"{S}.restartLevel()"); pg.wait_for_timeout(1500)
    ok(pickup(pg), 'po game over + restart: zebrane'); pg.wait_for_timeout(900); alive(pg, 'po game over + restart + boost')
    # PLAY AGAIN
    ev(pg, f"{S}.playAgain()"); pg.wait_for_timeout(1500)
    ok(not ev(pg, f"{G}.scene.isActive('Board')"), 'tablica zamknięta przed kolejnym przebiegiem')
    ok(pickup(pg), 'po playAgain: zebrane'); pg.wait_for_timeout(900); alive(pg, 'po playAgain + boost')
    # boost -> bieg do areny bossa (rush) w trakcie boostu
    ev(pg, f"(()=>{{const s={S}; s.boostT=6; s.score=s.L.goal; s.invuln=999; s.startRush();}})()"); pg.wait_for_timeout(500)
    pg.wait_for_function(f"{S}.mode==='boss' || {S}.mode==='arrive'", timeout=30000); pg.wait_for_timeout(800)
    alive(pg, 'arena po rushu w boost', moving=False)
    ok(boost_state(pg)[1] == 1, 'boost wyzerowany w arenie')
    pg.context.close()

def scenario_next_mission(br):
    print('[next] boost -> kolejna misja bez restartu sceny, potem znowu boost')
    pg = new_page(br, False, 1)
    ok(pickup(pg), 'misja 1: zebrane'); pg.wait_for_timeout(600)
    ev(pg, f"(()=>{{const s={S}; s.mode='run'; s.startNextLevel();}})()"); pg.wait_for_timeout(1000)
    ok(pickup(pg, natural=False), 'po startNextLevel: zebrane'); pg.wait_for_timeout(900); alive(pg, 'po startNextLevel + boost')
    pg.context.close()

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    for m in (1, 3, 5): scenario_basic(br, m)
    scenario_basic(br, 1, touch=True)
    scenario_restart(br)
    scenario_next_mission(br)
    br.close()

errs = [e for e in errs if not any(s in e for s in ('GPU stall', 'AudioContext', 'ReadPixels'))]
ok(not errs, f'brak wyjątków / console.error ({len(errs)}) ' + '; '.join(errs[:3]))
ok(not posts, 'nic nie wysłano na API (mock)')
print('\nWYNIK:', 'OK' if not fails else f'{len(fails)} BŁĘDÓW'); sys.exit(1 if fails else 0)
