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
FACE_SRC = os.path.join(ROOT, 'assets', 'portraits', 'face_portrait.png')

FRAME_H_GAME = 64      # wysokość klatki Arka w grze (px) po przeskalowaniu
FACE_H_GAME = 170      # wysokość twarzy na ekranie powitalnym
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


def main():
    os.makedirs(OUT, exist_ok=True)
    # ---- Arek
    cut = {}
    for n in ARCHIVE_FRAMES:
        im = remove_checkerboard(Image.open(os.path.join(ARCHIVE_DIR, n + '.png')))
        cut[n] = im.crop(bbox(im))
        print(n, 'bbox size', cut[n].size)
    # wspólna skala: najwyższa klatka (bez miecza przy idle) -> FRAME_H_GAME
    max_h = max(c.height for n, c in cut.items())
    scale = FRAME_H_GAME / max_h
    max_w = max(c.width for c in cut.values())
    fw, fh = int(round(max_w * scale)), FRAME_H_GAME
    print('scale', scale, 'frame', fw, fh)
    items = []
    for n in ARCHIVE_FRAMES:
        c = cut[n]
        sw, sh = max(1, round(c.width * scale)), max(1, round(c.height * scale))
        rgb, mask = to_game(c, (sw, sh))
        frame_rgb = Image.new('RGB', (fw, fh))
        frame_mask = np.zeros((fh, fw), bool)
        # stopy na dole, środek sylwetki (bez miecza) przybliżony środkiem bbox
        x0 = (fw - sw) // 2
        y0 = fh - sh
        frame_rgb.paste(rgb, (x0, y0))
        frame_mask[y0:y0 + sh, x0:x0 + sw] = mask
        items.append((frame_rgb, frame_mask))
    for n, im in zip(ARCHIVE_FRAMES, quantize(items)):
        im.save(os.path.join(OUT, f'arek_{n}.png'))
    # ---- twarz
    face = remove_checkerboard(Image.open(FACE_SRC))
    face = face.crop(bbox(face))
    fs = FACE_H_GAME / face.height
    size = (round(face.width * fs), FACE_H_GAME)
    rgb, mask = to_game(face, size)
    quantize([(rgb, mask)], 64)[0].save(os.path.join(OUT, 'face.png'))
    print('face', size)
    write_bundle()


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
