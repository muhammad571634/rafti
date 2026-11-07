"""
Renders the aurora ground into assets/images/aurora-light.png and aurora-dark.png.

    python scripts/build-aurora.py

The app draws the aurora as one still picture: four soft colour fields on the base colour. Drawing
them live (four SVG discs per screen) cost a software render and ~33 MB of textures for every
screen, and their slow drift kept Android redrawing at 60 fps while the phone sat idle.

The colours come from `auroraLight` / `auroraDark` in src/theme/colors.ts, so after a palette
change just re-run this. The geometry is the approved canvas's: four discs on a 390 x 844 phone,
each solid to ~r-70 and gone at r+70 (a 46px CSS blur), the same stops the SVG gradients used.

Needs Pillow + numpy.
"""

import os
import re

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLORS = os.path.join(ROOT, 'src', 'theme', 'colors.ts')
OUT = os.path.join(ROOT, 'assets', 'images')

DESIGN_W, DESIGN_H = 390, 844
# Pixels per design point. The fields are soft, so the phone scales this up without visible loss.
SCALE = 1.5
# Centre and radius in design points, painted in this order.
BLOBS = [(70, 100, 190), (330, 320, 200), (120, 650, 180), (320, 794, 170)]
# How far past the circle's edge the 46px blur still shows colour.
BLUR_REACH = 70
# Opacity along the radius (0 = centre, 1 = r + BLUR_REACH).
STOPS = [(0.0, 1.0), (0.45, 1.0), (0.6, 0.86), (0.73, 0.5), (0.86, 0.16), (1.0, 0.0)]


def palette(name):
    """`base` and `blobs` of one aurora object in colors.ts."""
    source = open(COLORS, encoding='utf-8').read()
    block = re.search(r'const ' + name + r'\b[^=]*=\s*\{(.*?)\n\};', source, re.S).group(1)
    base = re.search(r"base:\s*'(#[0-9A-Fa-f]{6})'", block).group(1)
    blobs = re.findall(r"'(#[0-9A-Fa-f]{6})'", re.search(r'blobs:\s*\[(.*?)\]', block, re.S).group(1))
    return base, blobs


def rgb(hex_color):
    return np.array([int(hex_color[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)


def render(base, blobs):
    w, h = round(DESIGN_W * SCALE), round(DESIGN_H * SCALE)
    ys, xs = np.mgrid[0:h, 0:w].astype(np.float64)
    # Pixel centres in design points.
    xs = (xs + 0.5) / SCALE
    ys = (ys + 0.5) / SCALE
    out = np.empty((h, w, 3))
    out[:] = rgb(base)
    at, opacity = zip(*STOPS)
    for (cx, cy, r), color in zip(BLOBS, blobs):
        reach = r + BLUR_REACH
        alpha = np.interp(np.hypot(xs - cx, ys - cy) / reach, at, opacity)[..., None]
        out = out * (1 - alpha) + rgb(color) * alpha
    return Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8), 'RGB')


def main():
    for name, file in (('auroraLight', 'aurora-light.png'), ('auroraDark', 'aurora-dark.png')):
        base, blobs = palette(name)
        image = render(base, blobs)
        path = os.path.join(OUT, file)
        image.save(path, optimize=True)
        print(f'{file}: {image.size[0]}x{image.size[1]}, {os.path.getsize(path) // 1024} KB, base {base}, blobs {blobs}')


if __name__ == '__main__':
    main()
