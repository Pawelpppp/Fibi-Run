#!/usr/bin/env python3
"""Fibi Run: test sceny po Rafale (zamrożenie -> Kamil -> piorun rozbija lód i zbroję), misji 3 w T-shircie bez miecza
i podniesienia miecza w połowie celu (piorun przywraca zbroję). Robi zrzuty /workspace/shots/freeze_*.png (lub $SHOTS).
API tablicy jest mockowane (nic nie leci na Azure). Użycie: python3 tools/test_freeze_sword.py [URL_BAZOWY]"""
from playwright.sync_api import sync_playwright
import os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = sys.argv[1] if len(sys.argv) > 1 else 'file://' + os.path.join(os.path.dirname(HERE), 'index.html')
SHOTS = os.environ.get('SHOTS', '/workspace/shots')
G = "window.__arekGame"
S = G + ".scene.getScene('Play')"
errs, fails, posts = [], [], []
CHROME = next((c for c in ('/usr/bin/google-chrome', '/usr/bin/chromium', None) if c is None or os.path.exists(c)), None)
os.makedirs(SHOTS, exist_ok=True)

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

def new_page(br, mission):
    ctx = br.new_context(viewport={'width': 1136, 'height': 640})
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)[:200]))
    pg.on('console', lambda m: errs.append('console.error ' + m.text[:200]) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
    pg.route('**/api/scores', mock)
    pg.goto(f'{BASE}{"&" if "?" in BASE else "?"}mission={mission}&nointro'); pg.wait_for_timeout(1500)
    pg.mouse.click(300, 300); pg.wait_for_timeout(300)
    if not ev(pg, f"{G}.scene.isActive('Play')"): pg.keyboard.press('Enter')
    pg.wait_for_function(f"{G}.scene.isActive('Play')", timeout=8000); pg.wait_for_timeout(1200)
    return pg

def shot(pg, name): pg.screenshot(path=f'{SHOTS}/freeze_{name}.png')
def until(pg, js, timeout=30000): pg.wait_for_function(js, timeout=timeout, polling=20)
def god(pg): ev(pg, f"(()=>{{const s={S}; s.lives=9; s.invuln=999;}})()")
HAS = lambda key: f"{S}.children.list.some(o=>o.active&&o.texture&&o.texture.key&&o.texture.key.startsWith('{key}'))"

def scenario_cutscene(br):
    print('[mission 2 -> 3] zamrożenie, Kamil, piorun, misja 3 w T-shircie, miecz')
    pg = new_page(br, 2)
    until(pg, f"{S}.mode==='boss' && {S}.boss && {S}.boss.kind==='rafal'", 40000); god(pg)
    ok(ev(pg, f"{S}.armored"), 'misja 2: Arek w zbroi')
    ev(pg, f"(()=>{{const s={S}; s.boss.hp=0; s.rafalDefeated();}})()")
    until(pg, HAS('freeze_spell'), 5000); shot(pg, '1_spell_hit_incoming')
    ok(ev(pg, f"{S}.spellFromRight===undefined && {S}.children.list.filter(o=>o.texture&&o.texture.key.startsWith('freeze_spell'))[0].x > {S}.a.x"), 'czar leci z prawej strony (x > Arek)')
    until(pg, f"{S}.frozen && {S}.iceSpr", 5000); pg.wait_for_timeout(120); shot(pg, '2_spell_hit_flash')
    pg.wait_for_timeout(700); shot(pg, '3_frozen')
    ok(ev(pg, f"{S}.mode==='bossend' && {S}.iceSpr.texture.key==='arek_frozen' && !{S}.arek.visible"), 'Arek zamrożony (arek_frozen), sterowanie zablokowane')
    x0 = ev(pg, f"{S}.a.x"); pg.keyboard.down('ArrowRight'); pg.keyboard.press('Space'); pg.wait_for_timeout(500); pg.keyboard.up('ArrowRight')
    ok(abs(ev(pg, f"{S}.a.x") - x0) < 1 and ev(pg, f"{S}.a.onGround"), 'zamrożony Arek nie reaguje na klawisze')
    until(pg, f"{S}.car && {S}.car.flipX", 8000)
    ok(ev(pg, f"{S}.car.x > {S}.camX + {S}.cameras.main.width*0.5"), 'auto Kamila nadjeżdża z prawej')
    until(pg, HAS('kamil_portrait'), 15000); pg.wait_for_timeout(350); shot(pg, '4_kamil_talking')
    pg.wait_for_timeout(2300); shot(pg, '4b_kamil_talking_line2')
    until(pg, f"{S}.car && !{S}.car.flipX && {S}.car.x > {S}.camX + 400", 15000); shot(pg, '5_car_leaves_right')
    until(pg, f"{S}.boltG && {S}.boltG.active", 20000); pg.wait_for_timeout(60); shot(pg, '6_lightning')
    until(pg, f"{S}.iceSpr && {S}.iceSpr.texture.key==='ice_shatter_2'", 3000); shot(pg, '7_ice_shatter')
    pg.wait_for_timeout(300); shot(pg, '7b_armor_flying')
    until(pg, f"{S}.mode==='run' && !{S}.armored && {S}.level===2", 15000)
    ok(ev(pg, f"!{S}.armored && {S}.level===2"), 'misja 3: Arek w T-shircie (armored=false)')
    pg.wait_for_timeout(1800); shot(pg, '8_casual_run')
    ok(ev(pg, f"{S}.arek.anims.currentAnim && {S}.arek.anims.currentAnim.key") == 'casual_run', 'animacja biegu casual (6 klatek)')
    god(pg); ev(pg, f"{S}.spawning=false")
    pg.keyboard.press('Alt'); pg.keyboard.press('x'); pg.wait_for_timeout(200)
    ok(ev(pg, f"{S}.attackT")==0, 'bez miecza atak nic nie robi')
    shot(pg, '8b_no_sword_hud')
    pg.keyboard.press('Space'); pg.wait_for_timeout(250); shot(pg, '8c_casual_jump')
    ok(ev(pg, f"{S}.arek.texture.key.startsWith('arek_casual_jump')"), 'skok casual (fazy casual_jump)')
    # w połowie celu pojawia się miecz
    ev(pg, f"(()=>{{const s={S}; s.score=Math.floor(s.L.goal*0.5); s.refreshHud();}})()")
    until(pg, f"{S}.swordItem", 5000)
    until(pg, f"{S}.swordItem && {S}.swordItem.wx - {S}.camX < 440", 15000); shot(pg, '9_sword_pickup_item')
    ok(ev(pg, f"{S}.swordItem.wx > {S}.a.x"), 'miecz leży przed Arkiem')
    until(pg, f"{S}.mode==='pickup'", 20000); god(pg); pg.wait_for_timeout(500); shot(pg, '10_pickup_lift')
    pg.wait_for_timeout(1100); shot(pg, '10b_dim')
    until(pg, f"{S}.boltG && {S}.boltG.active", 8000); pg.wait_for_timeout(60); shot(pg, '11_pickup_lightning')
    until(pg, f"{S}.armored", 8000); pg.wait_for_timeout(200); shot(pg, '12_armor_regained')
    until(pg, f"{S}.mode==='run'", 8000); god(pg); pg.wait_for_timeout(1500); shot(pg, '13_armored_run')
    ok(ev(pg, f"{S}.armored && {S}.arek.anims.currentAnim.key")=='run', 'po podniesieniu: bieg w zbroi')
    pg.keyboard.press('Alt'); pg.wait_for_timeout(120)
    ok(ev(pg, f"{S}.attackT")>0, 'po podniesieniu atak mieczem działa')
    pg.wait_for_timeout(500)
    # śmierć w misji 3 po odzyskaniu zbroi -> restart od misji 1 w zbroi
    ev(pg, f"(()=>{{const s={S}; s.invuln=0; s.lives=1; s.hurt();}})()"); pg.wait_for_timeout(2200)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ev(pg, f"{S}.restartLevel()"); pg.wait_for_timeout(1500)
    ok(ev(pg, f"{S}.armored && {S}.level===1"), 'po restarcie: misja 1, Arek w zbroi')
    pg.context.close()

def scenario_death_before_pickup(br):
    print('[mission 3] śmierć przed podniesieniem miecza, ?mission=3 / 4 / 5')
    pg = new_page(br, 3)
    ok(ev(pg, f"!{S}.armored && {S}.level===2 && {S}.arek.texture.key.startsWith('arek_casual')"), '?mission=3 startuje w T-shircie')
    shot(pg, '14_mission3_hud_nosword')
    ev(pg, f"(()=>{{const s={S}; s.invuln=0; s.lives=1; s.hurt();}})()"); pg.wait_for_timeout(2200)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500); pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    ev(pg, f"{S}.restartLevel()"); pg.wait_for_timeout(1500)
    # start debugowy ?mission=3 zachowuje dane startowe (Phaser nie zeruje ich przy restart(undefined)): restart = ta sama misja 3, znów w T-shircie
    ok(ev(pg, f"{S}.level===2 && !{S}.armored && {S}.arek.texture.key.startsWith('arek_casual')"), 'restart po śmierci w misji 3 przed mieczem: spójnie T-shirt, bez miecza')
    pg.context.close()
    pg = new_page(br, 5)
    ok(ev(pg, f"{S}.armored && {S}.level===3"), '?mission=5 w zbroi')
    pg.context.close()

with sync_playwright() as p:
    br = p.chromium.launch(executable_path=CHROME, args=['--no-sandbox'])
    scenario_cutscene(br)
    scenario_death_before_pickup(br)
    br.close()

errs = [e for e in errs if not any(s in e for s in ('GPU stall', 'AudioContext', 'ReadPixels'))]
ok(not errs, f'brak wyjątków / console.error ({len(errs)}) ' + '; '.join(errs[:3]))
ok(not posts, 'nic nie wysłano na API (mock)')
print('FAIL: %d' % len(fails) if fails else 'ALL OK')
sys.exit(1 if fails else 0)
