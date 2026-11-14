#!/usr/bin/env python3
"""Przetwarza oryginalne grafiki (RGB z namalowaną szachownicą zamiast
przezroczystości, duże rozmiary) na gotowe do gry sprite'y RGBA w assets/game/.

Oryginały w assets/sprites i assets/portraits NIE są zmieniane.

Kroki:
 1. usunięcie szachownicy (flood-fill od krawędzi po jasnych, nienasyconych
    pikselach + usunięcie dużych wysp w środku, np. między ręką a korpusem),
 2. czyszczenie jasnej obwódki przy krawędzi sylwetki,
 3. przycięcie do sylwetki; wszystkie klatki Arka skalowane tą samą skalą
    i zakotwiczone do wspólnej ramki (stopy na dole, środek poziomo),
 4. zmniejszenie do rozmiaru gry (uśrednianie obszarem + binarna alfa +
    kwantyzacja palety => ostre piksele bez rozmycia).

Użycie:  python3 tools/process_assets.py
Wymaga:  pip install pillow numpy scipy
"""
import base64
import os
from collections import deque
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'game')

ARCHIVE_FRAMES = ['run_1', 'run_2', 'run_3', 'jump', 'attack']
ARCHIVE_DIR = os.path.join(ROOT, 'assets', 'sprites')
CASUAL_H_GAME = 60     # wysokość Arka casual (px) - zbliżona do Arka w zbroi (64 px)
CASUAL_STAND = ['arek_casual_stand']
CASUAL_RUN6 = [f'arek_casual_run6_{i}' for i in range(1, 7)]
CASUAL_JUMP = [f'arek_casual_jump_{i}' for i in range(1, 6)]
ARMOR_RUN6 = [f'arek_run6_{i}' for i in range(1, 7)]
ARMOR_JUMP = [f'arek_jump_{i}' for i in range(1, 6)]
KAMIL_H_GAME = 64      # wysokość księdza Kamila w grze (px) - jak Arek
KAMIL_FRAMES = ['ksiadz_kamil_walk_1', 'ksiadz_kamil_walk_2', 'ksiadz_kamil_stand']
KAMIL_LAUGH = [f'ksiadz_kamil_laugh_walk_{i}' for i in range(1, 5)]   # śmiejący się chód (wyskakuje po utracie życia)
KAMIL_HAHA_BUBBLE = 'ksiadz_kamil_bubble_haha'                        # dymek "HA HA!" (96x50 -> 48x25)
RAFAL_H_GAME = 64      # wysokość Rafała dresa w grze (px) - jak Arek / Kamil (stand = 160 px w oryginale)
RAFAL_FRAMES = (['rafal_dres_stand'] + [f'rafal_dres_walk_{i}' for i in range(1, 5)]
                + [f'rafal_dres_punch_{i}' for i in range(1, 4)] + [f'rafal_dres_throw_{i}' for i in range(1, 3)])
RAFAL_KASTET = ['rafal_dres_kastet', 'rafal_dres_kastet_spin_1', 'rafal_dres_kastet_spin_2']
RAFAL_KASTET_SCALE = 0.85   # kastet w grze: 30 px -> ~26 px
RAFAL_PORTRAIT = os.path.join(ROOT, 'assets', 'portraits', 'rafal_dres_portrait_front.png')
RAFAL_PORTRAIT_GAME = 64    # portret w ramce dialogowej (px)
KAMIL_PORTRAIT = os.path.join(ROOT, 'assets', 'portraits', 'ksiadz_kamil_portrait_front.png')
# --- grafiki sceny zamrożenia po Rafale (misja 2) i odzyskania miecza (misja 3) ---
FREEZE_FROZEN = 'arek_frozen'                                  # Arek w bryle lodu (221x228, lód półprzezroczysty)
FREEZE_ICE = [f'ice_shatter_{i}' for i in range(1, 4)]         # kruszenie lodu (3 klatki, ta sama płótno 221x228 i pozycja bryły co arek_frozen)
FREEZE_ARMOR = [f'armor_shatter_{i}' for i in range(1, 4)]     # Arek casual wśród lecących części zbroi (264x232)
FREEZE_SPELL = [f'freeze_spell_{i}' for i in range(1, 3)]      # pocisk czaru (32x25, grot zwrócony w PRAWO; w grze flipX - leci w lewo)
SWORD_PICKUP = 'sword_pickup'                                  # miecz wbity w ziemię (40x98, dół = ziemia)
FREEZE_SPELL_SCALE = 0.75   # pocisk jest mały - skala większa niż klatek biegu
DOG_H_GAME = 28        # wysokość Fibi w grze (px) - wyraźnie mniejsza od Arka (64 px)
DOG_FRAMES = ['fibi_walk_1', 'fibi_walk_2', 'fibi_stand']
FACE_SRC = os.path.join(ROOT, 'assets', 'portraits', 'fibi_portrait_front.png')   # portret Fibi na ekranie powitalnym

FRAME_H_GAME = 64      # wysokość klatki Arka w grze (px) po przeskalowaniu

# Korekta skali głowy między klatkami (źródłowe grafiki były rysowane w trochę różnych skalach:
# głowa w skoku ~12 px, w ataku ~18 px, w biegu ~15 px). Wartości zmierzone ręcznie na przetworzonych
# klatkach (szerokość głowy / 15.4 px); 1.0 = bez zmian. Dzięki temu głowa nie "pulsuje" przy zmianie pozy.
HEAD_SCALE = {'run_1': 1.0, 'run_2': 1.0, 'run_3': 1.0, 'jump': 1.2, 'attack': 0.88}
HEAD_ROWS = 11         # ile górnych rzędów sylwetki bierzemy do wyznaczenia kotwicy (głowa)
HEAD_WIN = 14          # szerokość okna "głowy" (px w grze)
PALETTE_COLORS = 48


def is_bg(a):
    mn = a.min(axis=2)
    sp = a.max(axis=2) - mn
    return (mn > 200) & (sp < 22)


def remove_checkerboard(img):
    a = np.array(img.convert('RGB')).astype(int)
    h, w, _ = a.shape
    bg = is_bg(a)
    lab, n = ndimage.label(bg)
    # tło = wszystkie jasne obszary dotykające krawędzi obrazu
    edge_labels = set(np.unique(np.concatenate(
        [lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    mask = np.isin(lab, list(edge_labels))
    # wyspy szachownicy w środku (duże, jasne, nienasycone)
    sizes = ndimage.sum(bg, lab, range(1, n + 1))
    for i, s in enumerate(sizes, start=1):
        if i not in edge_labels and s > 600:
            mask |= lab == i
    # szachownica ma 2 odcienie - szum JPEG zostawia pojedyncze piksele, wiec domknij
    mask = ndimage.binary_closing(mask, iterations=2) | mask
    fg = ~mask
    # usuń drobne pyłki i wypełnij dziurki w sylwetce
    fg = ndimage.binary_opening(fg, iterations=2)
    lab2, n2 = ndimage.label(fg)
    if n2 > 1:
        sz = ndimage.sum(fg, lab2, range(1, n2 + 1))
        keep = [i + 1 for i, s in enumerate(sz) if s > 0.002 * h * w]
        fg = np.isin(lab2, keep)
    # jasna obwódka: zdejmij 2 px krawędzi, jeśli piksel jest jasny i szary
    for _ in range(3):
        er = ndimage.binary_erosion(fg)
        edge = fg & ~er
        light = (a.min(axis=2) > 170) & ((a.max(axis=2) - a.min(axis=2)) < 30)
        fg = fg & ~(edge & light)
    fg = ndimage.binary_fill_holes(fg) if False else fg
    rgba = np.dstack([a, fg * 255]).astype('uint8')
    return Image.fromarray(rgba, 'RGBA')


def bbox(img):
    return img.getchannel('A').point(lambda v: 255 if v > 0 else 0).getbbox()


def to_game(img, size):
    """Zmniejsza RGBA do size (w,h): średnia obszarowa na premultiplied, alfa binarna."""
    a = np.array(img).astype(float)
    al = a[..., 3:] / 255.0
    pm = Image.fromarray((a[..., :3] * al).astype('uint8'), 'RGB')
    pm = pm.resize(size, Image.BOX)
    alpha = Image.fromarray((al[..., 0] * 255).astype('uint8')).resize(size, Image.BOX)
    p = np.array(pm).astype(float)
    av = np.array(alpha).astype(float) / 255.0
    rgb = np.where(av[..., None] > 0, p / np.maximum(av[..., None], 1e-3), 0)
    rgb = np.clip(rgb, 0, 255).astype('uint8')
    mask = av > 0.5
    rgb_img = Image.fromarray(rgb, 'RGB')
    return rgb_img, mask


def quantize(imgs_masks, colors=PALETTE_COLORS):
    """Jedna wspólna paleta dla wszystkich klatek -> spójny, 16-bitowy wygląd."""
    tiles = []
    for rgb, mask in imgs_masks:
        a = np.array(rgb)
        tiles.append(a[mask])
    allpx = np.concatenate(tiles)
    side = int(np.ceil(np.sqrt(len(allpx))))
    pad = np.zeros((side * side, 3), 'uint8')
    pad[:len(allpx)] = allpx
    pal_src = Image.fromarray(pad.reshape(side, side, 3), 'RGB')
    pal = pal_src.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    out = []
    for rgb, mask in imgs_masks:
        q = rgb.quantize(palette=pal, dither=Image.NONE).convert('RGB')
        rgba = np.dstack([np.array(q), (mask * 255).astype('uint8')])
        out.append(Image.fromarray(rgba, 'RGBA'))
    return out


def head_anchor(rgb, mask):
    """Kotwica poziomna klatki = środek głowy. Pomija czerwoną pelerynę i cienkie wystające
    elementy (uniesiony miecz, dłonie nad głową), szukając pierwszego szerszego pasa sylwetki.
    Zwraca (ax, top_y)."""
    a = np.array(rgb).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = (r > 85) & (r > g * 1.7) & (r > b * 1.7)
    m = mask & ~red
    ys, xs = np.where(m)
    if len(ys) == 0:
        ys, xs = np.where(mask)
        return int(mask.shape[1] // 2), int(ys.min())
    row_w = m.sum(1)
    max_w = int(row_w.max())
    # Pomijamy cienki "kolec" nad głową (uniesiony miecz, szer. kilka px).
    # Próg musi być niższy niż HEAD_WIN: po odjęciu czerwonej koszulki / peleryny
    # sama głowa casual ma często tylko ~9–13 px i nie może zostać przeskoczona.
    thresh = max(8, min(HEAD_WIN, int(0.22 * max_w)))
    rows = np.where(row_w > 0)[0]
    top = int(rows[0])
    for y in rows:
        band = row_w[y:y + HEAD_ROWS]
        if row_w[y] >= thresh and band.mean() >= thresh * 0.65:
            top = int(y)
            break
    w = m.shape[1]
    win = min(HEAD_WIN, w)
    prof = m[top:top + HEAD_ROWS].sum(0)
    best = max(range(0, w - win + 1), key=lambda x: int(prof[x:x + win].sum()))
    return best + win // 2, top


def align_set(cut, names, base_scale, key_of=lambda n: n):
    """Wspólna ramka dla zestawu klatek jednej postaci:
      * skala = base_scale * HEAD_SCALE[klatka] (spójny rozmiar głowy),
      * środek głowy (kotwica) w tej samej kolumnie - ramka jest symetryczna wokół kotwicy,
        więc sprite z originX 0.5 ma głowę dokładnie w punkcie x postaci (także po flipX),
      * stopy (najniższy piksel) na dolnej krawędzi ramki = wspólna linia podłoża.
    Zwraca listę (rgb, mask) w kolejności names."""
    parts = []
    for n in names:
        c = cut[n]
        sc = base_scale * HEAD_SCALE.get(key_of(n), 1.0)
        sw, sh = max(1, round(c.width * sc)), max(1, round(c.height * sc))
        rgb, mask = to_game(c, (sw, sh))
        ax, _ = head_anchor(rgb, mask)
        parts.append((n, rgb, mask, ax, sw, sh))
    half = max(max(ax, sw - ax) for _, _, _, ax, sw, _ in parts)
    fw, fh = 2 * half + 1, max(sh for *_, sh in parts)
    items = []
    for n, rgb, mask, ax, sw, sh in parts:
        frame = Image.new('RGB', (fw, fh)); fm = np.zeros((fh, fw), bool)
        x0, y0 = half - ax, fh - sh
        frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
        items.append((frame, fm))
        print('  %-20s head anchor x=%d  size %dx%d' % (n, ax, sw, sh))
    return items


def load_sprite(name):
    """Wczytuje oryginał z assets/sprites: RGBA z prawdziwą alfą albo RGB z szachownicą."""
    im = Image.open(os.path.join(ARCHIVE_DIR, name + '.png'))
    has_alpha = im.mode in ('RGBA', 'LA') and (np.array(im.convert('RGBA'))[..., 3] < 128).any()
    im = im.convert('RGBA') if has_alpha else remove_checkerboard(im)
    return im.crop(bbox(im))


def process_armor_anims():
    """Nowe klatki biegu (6) i skoku (5) Arka w zbroi -> assets/game/arek_run_1..6, arek_jump_1..5.
    Skala liczona z mediany wysokości klatek biegu, żeby sylwetka miała ten sam rozmiar
    co dotychczasowy bieg (~FRAME_H_GAME). Wyższe klatki (uniesiony miecz, peleryna)
    dostają wyższą ramkę; stopy na wspólnej linii, kotwica w głowie."""
    names = ARMOR_RUN6 + ARMOR_JUMP
    cut = {n: load_sprite(n) for n in names}
    for n in names:
        print(n, 'bbox size', cut[n].size)
    run_hs = [cut[n].height for n in ARMOR_RUN6]
    scale = FRAME_H_GAME / float(np.median(run_hs))
    print('armor anim scale %.4f (median run h=%s -> %d px)' % (scale, int(np.median(run_hs)), FRAME_H_GAME))
    items = align_set(cut, names, scale)
    print('armor anim frame', items[0][0].size)
    out_names = [f'arek_run_{i}' for i in range(1, 7)] + [f'arek_jump_{i}' for i in range(1, 6)]
    for n, im in zip(out_names, quantize(items)):
        im.save(os.path.join(OUT, n + '.png'))
    stale = os.path.join(OUT, 'arek_jump.png')
    if os.path.exists(stale):
        os.remove(stale)
        print('removed stale arek_jump.png')


def main():
    os.makedirs(OUT, exist_ok=True)
    # ---- Arek: stary zestaw tylko dla ataku (bieg/skok pochodzą z nowych klatek)
    cut = {}
    for n in ARCHIVE_FRAMES:
        im = remove_checkerboard(Image.open(os.path.join(ARCHIVE_DIR, n + '.png')))
        cut[n] = im.crop(bbox(im))
        print(n, 'bbox size', cut[n].size)
    # wspólna skala: najwyższa klatka (bez miecza przy idle) -> FRAME_H_GAME
    max_h = max(c.height for n, c in cut.items())
    scale = FRAME_H_GAME / max_h
    items = align_set(cut, ARCHIVE_FRAMES, scale)
    print('arek archive frame', items[0][0].size)
    for n, im in zip(ARCHIVE_FRAMES, quantize(items)):
        if n == 'attack':
            im.save(os.path.join(OUT, f'arek_{n}.png'))
    process_armor_anims()
    process_title_face()
    process_casual()
    process_kamil()
    process_kamil_laugh()
    process_rafal()
    process_kamil_portrait()
    process_freeze_art()
    copy_car()
    process_dog()
    write_bundle()


def process_title_face():
    """Portret Fibi na ekran powitalny -> assets/game/fibi_face.png.
    Portret jest już RGBA (192x192 z przezroczystym tłem) - sprawdzamy alfę; gdyby to było RGB
    z namalowaną szachownicą, usuwamy ją jak w sprite'ach Arka. Przycinamy do sylwetki i
    zostawiamy rozmiar 1:1 (ok. 117x153 px) - skalowanie o ułamek zepsułoby piksele."""
    im = Image.open(FACE_SRC)
    has_alpha = im.mode == 'RGBA' and (np.array(im)[..., 3] == 0).any()
    im = im.convert('RGBA') if has_alpha else remove_checkerboard(im)
    a = np.array(im)
    a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)   # alfa binarna (pixel art)
    im = Image.fromarray(a, 'RGBA')
    im = im.crop(bbox(im))
    im.save(os.path.join(OUT, 'fibi_face.png'))
    print('fibi_face', im.size, 'alpha ok' if has_alpha else 'checkerboard removed')


def process_casual():
    """Arek casual (t-shirt, spodenki) do intro -> assets/game/arek_casual_*.png.
    Sprite'y są już RGBA; skala z klatek biegu/stania -> CASUAL_H_GAME (skok może być
    niższy przez przysiad albo trochę wyższy przez uniesione ręce). Stopy na dole,
    kotwica w głowie, wspólna paleta. Bieg: arek_casual_run_1..6, skok: arek_casual_jump_1..5."""
    names = CASUAL_RUN6 + CASUAL_JUMP + CASUAL_STAND
    cut = {n: load_sprite(n) for n in names}
    scale = CASUAL_H_GAME / max(cut[n].height for n in CASUAL_RUN6 + CASUAL_STAND)
    print('casual scale %.4f' % scale)
    items = align_set(cut, names, scale)
    out_names = [f'arek_casual_run_{i}' for i in range(1, 7)] + [f'arek_casual_jump_{i}' for i in range(1, 6)] + CASUAL_STAND
    for n, im in zip(out_names, quantize(items, 48)):
        im.save(os.path.join(OUT, n + '.png'))
    print('casual frame', items[0][0].size)


def process_kamil():
    """Ksiądz Kamil (boss) -> assets/game/kamil_walk_1/2.png, kamil_stand.png (RGBA 160 px -> 64 px)."""
    cut = {}
    for n in KAMIL_FRAMES:
        im = Image.open(os.path.join(ARCHIVE_DIR, n + '.png'))
        im = im.convert('RGBA') if im.mode == 'RGBA' and (np.array(im)[..., 3] == 0).any() else remove_checkerboard(im)
        cut[n] = im.crop(bbox(im))
    scale = KAMIL_H_GAME / max(c.height for c in cut.values())
    walk_w = max(round(cut[n].width * scale) for n in KAMIL_FRAMES if 'walk' in n)
    items = []
    for n in KAMIL_FRAMES:
        c = cut[n]
        sw, sh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        rgb, mask = to_game(c, (sw, sh))
        fw = walk_w if 'walk' in n else sw
        frame = Image.new('RGB', (fw, KAMIL_H_GAME)); fm = np.zeros((KAMIL_H_GAME, fw), bool)
        x0, y0 = (fw - sw) // 2, KAMIL_H_GAME - sh
        frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
        items.append((frame, fm))
    for n, im in zip(KAMIL_FRAMES, quantize(items, 40)):
        im.save(os.path.join(OUT, n.replace('ksiadz_kamil', 'kamil') + '.png'))
    print('kamil frames', walk_w, 'x', KAMIL_H_GAME)


def process_kamil_laugh():
    """Śmiejący się Kamil (4 klatki chodu) -> assets/game/kamil_laugh_walk_1..4.png (ta sama skala co kamil_*),
    dymek HA HA -> assets/game/kamil_bubble_haha.png (połowa rozmiaru oryginału)."""
    ref = Image.open(os.path.join(ARCHIVE_DIR, 'ksiadz_kamil_stand.png'))
    ref = ref.convert('RGBA') if ref.mode == 'RGBA' and (np.array(ref)[..., 3] == 0).any() else remove_checkerboard(ref)
    scale = KAMIL_H_GAME / float(ref.crop(bbox(ref)).height)          # jak process_kamil (stand = najwyższa klatka)
    cut = {}
    for n in KAMIL_LAUGH:
        im = Image.open(os.path.join(ARCHIVE_DIR, n + '.png')).convert('RGBA')
        cut[n] = im.crop(bbox(im))
    fw = max(round(c.width * scale) for c in cut.values())
    items = []
    for n in KAMIL_LAUGH:
        c = cut[n]
        sw, sh = max(1, round(c.width * scale)), min(KAMIL_H_GAME, max(1, round(c.height * scale)))
        rgb, mask = to_game(c, (sw, sh))
        frame = Image.new('RGB', (fw, KAMIL_H_GAME)); fm = np.zeros((KAMIL_H_GAME, fw), bool)
        x0, y0 = (fw - sw) // 2, KAMIL_H_GAME - sh
        frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
        items.append((frame, fm))
    for n, im in zip(KAMIL_LAUGH, quantize(items, 40)):
        im.save(os.path.join(OUT, n.replace('ksiadz_kamil', 'kamil') + '.png'))
    b = Image.open(os.path.join(ARCHIVE_DIR, KAMIL_HAHA_BUBBLE + '.png')).convert('RGBA')
    b.resize((b.width // 2, b.height // 2), Image.NEAREST).save(os.path.join(OUT, 'kamil_bubble_haha.png'))
    print('kamil laugh frames', fw, 'x', KAMIL_H_GAME)


def process_rafal():
    """Rafał dres (boss misji 2) -> assets/game/rafal_*.png.
    Sprite'y są RGBA (prawdziwa alfa, zwrócone w prawo; w grze flipX w lewo). Jedna skala dla
    wszystkich klatek (stand 160 px -> RAFAL_H_GAME), stopy na dole ramki, kotwica poziomna w
    głowie (jak u Arka) - sprite z originem (0.5, 1) stoi stopami na ziemi, a głowa jest w punkcie x
    bossa także podczas wyprowadzania ciosu / rzutu. Kastet (pocisk) i klatki obrotu w jednej
    ramce wyśrodkowane, plus lustrzana klatka 45 st. -> pełny cykl obrotu przód-45-bok-45.
    Portret do okienka dialogowego: przycięty i zmniejszony do RAFAL_PORTRAIT_GAME."""
    cut = {n: load_sprite(n) for n in RAFAL_FRAMES}
    scale = RAFAL_H_GAME / float(cut['rafal_dres_stand'].height)
    print('rafal scale %.4f' % scale)
    items = align_set(cut, RAFAL_FRAMES, scale)
    for n, im in zip(RAFAL_FRAMES, quantize(items, 48)):
        im.save(os.path.join(OUT, n.replace('rafal_dres', 'rafal') + '.png'))
    print('rafal frame', items[0][0].size)

    k = {n: load_sprite(n) for n in RAFAL_KASTET}
    parts = []
    for n in RAFAL_KASTET + ['rafal_dres_kastet_spin_1m']:
        c = k['rafal_dres_kastet_spin_1'].transpose(Image.FLIP_LEFT_RIGHT) if n.endswith('_1m') else k[n]
        sw, sh = max(1, round(c.width * RAFAL_KASTET_SCALE)), max(1, round(c.height * RAFAL_KASTET_SCALE))
        parts.append((n, *to_game(c, (sw, sh)), sw, sh))
    fw, fh = max(p[3] for p in parts), max(p[4] for p in parts)
    fw += fw % 2; fh += fh % 2
    kitems = []
    for n, rgb, mask, sw, sh in parts:
        frame = Image.new('RGB', (fw, fh)); fm = np.zeros((fh, fw), bool)
        x0, y0 = (fw - sw) // 2, (fh - sh) // 2
        frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
        kitems.append((frame, fm))
    for (n, *_), im in zip(parts, quantize(kitems, 24)):
        im.save(os.path.join(OUT, n.replace('rafal_dres', 'rafal') + '.png'))
    print('kastet frame', fw, 'x', fh)

    im = Image.open(RAFAL_PORTRAIT).convert('RGBA')
    im = im.crop(bbox(im))
    sc = RAFAL_PORTRAIT_GAME / float(max(im.size))
    sw, sh = max(1, round(im.width * sc)), max(1, round(im.height * sc))
    rgb, mask = to_game(im, (sw, sh))
    frame = Image.new('RGB', (RAFAL_PORTRAIT_GAME, RAFAL_PORTRAIT_GAME)); fm = np.zeros((RAFAL_PORTRAIT_GAME,) * 2, bool)
    x0, y0 = (RAFAL_PORTRAIT_GAME - sw) // 2, RAFAL_PORTRAIT_GAME - sh
    frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
    quantize([(frame, fm)], 48)[0].save(os.path.join(OUT, 'rafal_portrait.png'))
    print('rafal portrait', sw, 'x', sh)


def _save_group(names, imgs):
    for n, im in zip(names, imgs):
        im.save(os.path.join(OUT, n + '.png'))
        print('  %-18s %dx%d' % (n, im.width, im.height))


def _fit(img, scale):
    sw, sh = max(1, round(img.width * scale)), max(1, round(img.height * scale))
    return to_game(img, (sw, sh))


def _canvas_rgba(names, scale, keep_alpha):
    """Zmniejsza CAŁE płótno (bez przycinania do bbox: pozycja na płótnie = punkt zakotwiczenia w grze).
    keep_alpha=True zachowuje półprzezroczystość (lód); inaczej alfa binarna jak u reszty sprite'ów.
    Wspólna paleta dla zestawu. Zwraca listę RGBA."""
    out_items, alphas = [], []
    for n in names:
        im = Image.open(os.path.join(ARCHIVE_DIR, n + '.png')).convert('RGBA')
        sw, sh = max(1, round(im.width * scale)), max(1, round(im.height * scale))
        a = np.array(im).astype(float)
        al = a[..., 3:] / 255.0
        pm = Image.fromarray((a[..., :3] * al).astype('uint8'), 'RGB').resize((sw, sh), Image.BOX)
        alpha = np.array(Image.fromarray((al[..., 0] * 255).astype('uint8')).resize((sw, sh), Image.BOX)).astype(float)
        av = alpha / 255.0
        rgb = np.clip(np.where(av[..., None] > 0, np.array(pm).astype(float) / np.maximum(av[..., None], 1e-3), 0), 0, 255).astype('uint8')
        if keep_alpha:
            mask = av > 0.08
            alphas.append(np.where(mask, alpha, 0).astype('uint8'))
        else:
            mask = av > 0.5
            alphas.append((mask * 255).astype('uint8'))
        out_items.append((Image.fromarray(rgb, 'RGB'), mask))
    res = []
    for q, al in zip(quantize(out_items, 48), alphas):
        arr = np.array(q); arr[..., 3] = al
        res.append(Image.fromarray(arr, 'RGBA'))
    return res


def armor_scale():
    """Skala klatek biegu w zbroi (arek_run6_*), ta sama co w process_armor_anims."""
    hs = [load_sprite(n).height for n in ARMOR_RUN6]
    return FRAME_H_GAME / float(np.median(hs))


def casual_scale():
    """Skala klatek Arka casual (ta sama co w process_casual)."""
    return CASUAL_H_GAME / max(load_sprite(n).height for n in CASUAL_RUN6 + CASUAL_STAND)


def process_freeze_art():
    """Scena zamrożenia (misja 2) i miecza (misja 3) -> assets/game/.
      arek_frozen, ice_shatter_1..3: skala klatek biegu w zbroi (armor_scale), całe płótno 221x228, lód półprzezroczysty;
      armor_shatter_1..3: skala Arka casual (casual_scale) - w płótnie stoi Arek w T-shircie, więc po podmianie jest tak samo duży jak w biegu;
      freeze_spell_1..2: FREEZE_SPELL_SCALE; sword_pickup: armor_scale.
    Punkty zakotwiczenia (stopy/dół bryły na ziemi) są w CFG.FREEZE.ORIGIN_* w game.js (ułamek wysokości płótna)."""
    sa, sc = armor_scale(), casual_scale()
    print('freeze: scale armor %.4f casual %.4f' % (sa, sc))
    _save_group([FREEZE_FROZEN] + FREEZE_ICE, _canvas_rgba([FREEZE_FROZEN] + FREEZE_ICE, sa, True))
    _save_group(FREEZE_ARMOR, _canvas_rgba(FREEZE_ARMOR, sc, False))
    _save_group(FREEZE_SPELL, _canvas_rgba(FREEZE_SPELL, FREEZE_SPELL_SCALE, False))
    _save_group([SWORD_PICKUP], _canvas_rgba([SWORD_PICKUP], sa, False))


def process_kamil_portrait():
    """Portret Kamila do okienka dialogowego (scena po pokonaniu Rafała) -> assets/game/kamil_portrait.png (64x64)."""
    im = Image.open(KAMIL_PORTRAIT).convert('RGBA')
    im = im.crop(bbox(im))
    sc = RAFAL_PORTRAIT_GAME / float(max(im.size))
    rgb, mask = _fit(im, sc)
    S = RAFAL_PORTRAIT_GAME
    frame = Image.new('RGB', (S, S)); fm = np.zeros((S, S), bool)
    x0, y0 = (S - rgb.width) // 2, S - rgb.height
    frame.paste(rgb, (x0, y0)); fm[y0:y0 + rgb.height, x0:x0 + rgb.width] = mask
    quantize([(frame, fm)], 48)[0].save(os.path.join(OUT, 'kamil_portrait.png'))
    print('kamil portrait', rgb.size)


def process_dog():
    """Pies Fibi (intro): sprite'y RGBA zwrócone w prawo -> assets/game/fibi_*.png.
    Wspólna skala (wysokość klatki 72 px -> DOG_H_GAME), stopy na dole, wspólna paleta.
    Jeśli plik ma szachownicę zamiast alfy (RGB), usuwamy ją jak w sprite'ach Arka."""
    cut = {}
    for n in DOG_FRAMES:
        im = Image.open(os.path.join(ARCHIVE_DIR, n + '.png'))
        im = im.convert('RGBA') if im.mode == 'RGBA' and (np.array(im)[..., 3] < 255).any() else remove_checkerboard(im)
        cut[n] = im.crop(bbox(im))
    scale = DOG_H_GAME / max(c.height for c in cut.values())
    walk_w = max(round(cut[n].width * scale) for n in DOG_FRAMES[:2])
    items = []
    for n in DOG_FRAMES:
        c = cut[n]
        sw, sh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        rgb, mask = to_game(c, (sw, sh))
        fw = walk_w if n != 'fibi_stand' else sw
        frame = Image.new('RGB', (fw, DOG_H_GAME)); fm = np.zeros((DOG_H_GAME, fw), bool)
        x0, y0 = (fw - sw) // 2, DOG_H_GAME - sh
        frame.paste(rgb, (x0, y0)); fm[y0:y0 + sh, x0:x0 + sw] = mask
        items.append((frame, fm))
    for n, im in zip(DOG_FRAMES, quantize(items, 40)):
        im.save(os.path.join(OUT, n + '.png'))
    print('dog frames', [im.size for _, im in zip(DOG_FRAMES, [Image.open(os.path.join(OUT, n + '.png')) for n in DOG_FRAMES])])


def copy_car():
    """Samochód księdza Kamila (intro): już RGBA 219x100 z czystą alfą, w skali 1:1.
    Kopiujemy klatki animacji do assets/game/ jako car_1.png / car_2.png."""
    for n in ('1', '2'):
        im = Image.open(os.path.join(ARCHIVE_DIR, f'ksiadz_kamil_car_{n}.png')).convert('RGBA')
        a = np.array(im)
        a[..., 3] = np.where(a[..., 3] >= 128, 255, 0)   # alfa binarna (pixel art)
        Image.fromarray(a, 'RGBA').save(os.path.join(OUT, f'car_{n}.png'))
        Image.fromarray(empty_seat(a), 'RGBA').save(os.path.join(OUT, f'car_empty_{n}.png'))
    print('car frames copied (+ wersje z pustym fotelem kierowcy: car_empty_*.png)')


def empty_seat(a):
    """Wersja auta BEZ kierowcy (na sprite'cie auta Kamil siedzi za szybą, więc gdy ksiądz
    stoi obok, byłby 'podwójny Kamil'). Zamalowujemy okolice kierowcy w przedniej szybie
    kolorem szyby; zostają słupki, fotel i obramowanie. Zmiana tylko pikseli w oknie."""
    a = a.copy().astype(int)
    G1, G2 = np.array([139, 163, 183]), np.array([120, 129, 151])    # kolory szyby na sprite'cie

    def glass(p):
        return abs(p[:3] - G1).sum() < 12 or abs(p[:3] - G2).sum() < 12
    for y in range(8, 41):
        xr = next((x for x in range(150, 100, -1) if glass(a[y, x])), None)   # prawa krawędź szyby w tym rzędzie
        if xr is None:
            continue
        for x in range(80 if y < 20 else 84, xr + 1):
            a[y, x, :3] = G1                                                 # kierowca, kierownica, refleksy -> szyba
    for y in range(40, 44):                                                  # dłoń / mankiet na krawędzi okna -> ciemny próg
        for x in range(100, 140):
            r, g, b = a[y, x, :3]
            if (r > 140 and g > 90 and r - b > 50) or (r > 200 and g > 200 and b > 190):
                a[y, x, :3] = (38, 43, 35)
    return a.astype('uint8')


def write_bundle():
    """assets/game/assets.js - te same PNG-i jako data-URI. Dzięki temu gra działa
    też po otwarciu index.html z dysku (file://), gdzie przeglądarki blokują XHR/WebGL
    dla zewnętrznych plików graficznych."""
    lines = ['// WYGENEROWANE przez tools/process_assets.py - nie edytuj ręcznie',
             'window.AREK_ASSETS = {']
    names = sorted(f[:-4] for f in os.listdir(OUT) if f.endswith('.png'))
    for n in names:
        with open(os.path.join(OUT, n + '.png'), 'rb') as fh:
            b64 = base64.b64encode(fh.read()).decode()
        lines.append(f"  '{n}': 'data:image/png;base64,{b64}',")
    lines.append('};')
    with open(os.path.join(OUT, 'assets.js'), 'w') as fh:
        fh.write('\n'.join(lines) + '\n')
    print('assets.js:', names)


if __name__ == '__main__':
    main()
