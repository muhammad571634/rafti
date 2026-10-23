"""Cut the Sigmazam mascot poses out of their flat cool-grey backgrounds.

Background = pixels reachable from the border that are close to the border colour or cool
(blue >= red), which also removes the soft ground shadow. Edges are feathered and the grey
spill is taken back out of the edge colours.

Usage (any Python with numpy, scipy and Pillow):
    python scripts/cut-mascot-poses.py docs/branding/art <out-dir> hop sticker reaction-love
assets/brand/sigmazam-hop.png, -wink.png (from sticker) and -love.png were made this way.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2])
OUT.mkdir(parents=True, exist_ok=True)
NAMES = sys.argv[3:]
MAX = 640

for name in NAMES:
    im = np.asarray(Image.open(SRC / f'{name}.png').convert('RGB')).astype(np.float32)
    h, w, _ = im.shape
    border = np.concatenate([im[0], im[-1], im[:, 0], im[:, -1]])
    bg = np.median(border, axis=0)
    dist = np.linalg.norm(im - bg, axis=2)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    cool = (b - r) > -6
    candidate = (dist < 34) | (cool & (dist < 120))
    # Only what touches the border is background: eyes and cheeks inside the body stay.
    labels, _ = ndimage.label(candidate)
    edge_labels = np.unique(np.concatenate([labels[0], labels[-1], labels[:, 0], labels[:, -1]]))
    bgmask = np.isin(labels, edge_labels[edge_labels > 0])
    fg = ~bgmask
    fg = ndimage.binary_opening(fg, iterations=1)
    fg = ndimage.binary_fill_holes(fg)
    # Keep the largest piece (the mascot) and anything close to it (the waving hand's dashes).
    lab, n = ndimage.label(fg)
    if n > 1:
        sizes = ndimage.sum(fg, lab, range(1, n + 1))
        keep = sizes >= max(400, sizes.max() * 0.004)
        fg = np.isin(lab, np.nonzero(keep)[0] + 1)
    alpha = ndimage.gaussian_filter(fg.astype(np.float32), 1.1)
    alpha = np.clip((alpha - 0.15) / 0.7, 0, 1)
    # Take the grey back out of half-transparent edge pixels.
    a = np.maximum(alpha, 1e-3)[..., None]
    rgb = np.clip((im - (1 - a) * bg) / a, 0, 255)
    rgb = np.where(alpha[..., None] > 0.98, im, rgb)
    rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
    out = Image.fromarray(rgba, 'RGBA')
    box = out.getbbox()
    out = out.crop(box)
    pad = 12
    canvas = Image.new('RGBA', (out.width + pad * 2, out.height + pad * 2), (0, 0, 0, 0))
    canvas.paste(out, (pad, pad))
    canvas.thumbnail((MAX, MAX), Image.LANCZOS)
    canvas.save(OUT / f'{name}.png', optimize=True)
    print(name, canvas.size, 'bg', bg.round().tolist())
