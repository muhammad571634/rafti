"""Cut the Sigmazam wordmark into three layers for Today's folding logo.

Today shows only the mascot on its G; a tap unfolds "Si" to its left and "MAZAM" to its right,
and they fold back after a while (owner, 2026-11-04). The layers are cut from the finished
wordmark, so put together they are the wordmark pixel for pixel and the mascot never moves.

  sigmazam-logo-si.png      "Si"
  sigmazam-logo-mascot.png  the mascot on its G, with its two motion lines
  sigmazam-logo-mazam.png   "MAZAM"
  logo-layers.ts            where each layer sits on the wordmark (in wordmark pixels)

Each layer is scaled to 3x of the 48 pt header (Lanczos on premultiplied alpha, so edges keep
no dark fringe) and carries a soft warm shadow, so the orange still reads on a bright photo.

usage: python scripts/build-logo-layers.py   (after build-sigmazam-brand.py)
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
BRAND = ROOT / 'assets/brand'
SRC = BRAND / 'sigmazam-logo.png'

# Where the letters part (wordmark pixels, 1670 x 356). The "i" ends at 284 and the motion
# lines start at 293; the M's stem starts at 557 and touches the mascot's cream body only
# above row 180, while the mascot's hair crosses x 557 above row 145.
SI_END = 290
M_START = 556
M_TOP = 145

OUT_HEIGHT = 48 * 3  # 3x of the header's tallest wordmark
PAD = 14  # wordmark pixels of room for the shadow on every side
SHADOW = dict(blur=4, dy=3, alpha=0.24, rgb=(96, 42, 14))


def is_cream(px):
    r, g, b = px[..., 0], px[..., 1], px[..., 2]
    return (r > 225) & (g > 200) & (b > 170) & (r - b < 70)


def blur(x, sigma):
    """Separable Gaussian blur of a float array (numpy only)."""
    r = int(sigma * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma) ** 2)
    k /= k.sum()
    x = np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 0, x)
    return np.apply_along_axis(lambda v: np.convolve(np.pad(v, r, mode='edge'), k, 'valid'), 1, x)


def heal_seam(layer):
    """Round the mascot's body where the M's stem used to cover it.

    In the wordmark the stem hides the body's right edge, so the cut leaves stair steps and a
    stray dot there. The outline in that patch is redrawn from a blurred mask (an anti-aliased,
    rounded contour), new pixels take the colour of the cream next to them, and the patch fades
    into the untouched art at its border.
    """
    y0, y1, x0, x1 = 118, 228, 515, 590
    patch = layer[y0:y1, x0:x1]
    alpha = patch[..., 3] / 255
    soft = blur(alpha, 2.6)
    t = np.clip((soft - 0.38) / 0.24, 0, 1)
    rounded = t * t * (3 - 2 * t)

    # Fade the redraw into the original art over 10 px at the patch's edges.
    hh, ww = alpha.shape
    yy, xx = np.mgrid[0:hh, 0:ww]
    edge = np.minimum.reduce([yy, hh - 1 - yy, xx, ww - 1 - xx]).astype(np.float32)
    w = np.clip(edge / 10, 0, 1)
    new_alpha = w * rounded + (1 - w) * alpha

    # Colour for pixels that were empty: the alpha-weighted blur of their neighbours.
    weight = blur(alpha, 3.5) + 1e-6
    fill = np.stack([blur(patch[..., c] * alpha, 3.5) / weight for c in range(3)], axis=-1)
    grow = new_alpha > alpha + 0.02
    patch[..., :3][grow] = fill[grow]
    patch[..., 3] = new_alpha * 255
    layer[y0:y1, x0:x1] = patch


def main():
    img = Image.open(SRC).convert('RGBA')
    a = np.asarray(img).astype(np.float32)
    h, w, _ = a.shape
    ys, xs = np.mgrid[0:h, 0:w]

    si = xs < SI_END
    # The mascot's cream body touches the M's stem; those few pixels stay with the mascot.
    mazam = (xs >= M_START) & (ys >= M_TOP) & ~(is_cream(a) & (xs < M_START + 24) & (ys < 200))
    mascot = ~si & ~mazam
    masks = {'si': si, 'mascot': mascot, 'mazam': mazam}

    scale = OUT_HEIGHT / (h + 2 * PAD)
    boxes = {}
    for name, mask in masks.items():
        layer = a.copy()
        layer[..., 3] *= mask
        if name == 'mascot':
            heal_seam(layer)
        alpha = layer[..., 3]
        cols = np.where(alpha.max(axis=0) > 0)[0]
        x0, x1 = int(cols[0]) - PAD, int(cols[-1]) + 1 + PAD

        canvas = Image.new('RGBA', (x1 - x0, h + 2 * PAD), (0, 0, 0, 0))
        art = Image.fromarray(layer.astype(np.uint8), 'RGBA').crop((max(x0, 0), 0, min(x1, w), h))
        canvas.paste(art, (max(x0, 0) - x0, PAD))

        # Soft warm shadow from the layer's own alpha, under the art.
        sh_alpha = canvas.getchannel('A').filter(ImageFilter.GaussianBlur(SHADOW['blur']))
        sh_alpha = sh_alpha.point(lambda v: int(v * SHADOW['alpha']))
        shadow = Image.new('RGBA', canvas.size, SHADOW['rgb'] + (0,))
        shadow.putalpha(sh_alpha)
        shadow = shadow.transform(canvas.size, Image.AFFINE, (1, 0, 0, 0, 1, -SHADOW['dy']))
        out = Image.alpha_composite(shadow, canvas)

        size = (round(out.width * scale), OUT_HEIGHT)
        out = out.convert('RGBa').resize(size, Image.LANCZOS).convert('RGBA')
        part = BRAND / f'sigmazam-logo-{name}.png.part'
        out.save(part, 'PNG', optimize=True)
        part.replace(BRAND / f'sigmazam-logo-{name}.png')
        boxes[name] = (x0, x1 - x0)
        print(f'{name}: x {x0}..{x1} -> {size[0]}x{size[1]}')

    lines = [
        '/** Generated by scripts/build-logo-layers.py; do not edit. Wordmark pixels (the art is 1670 x 356). */',
        'export const LOGO_ART = { width: %d, height: %d, pad: %d } as const;' % (w, h, PAD),
        '',
        '/** Each layer\'s left edge and width on the wordmark; every layer spans the art\'s height plus `pad` above and below. */',
        'export const LOGO_LAYERS = {',
    ]
    for name, (x0, width) in boxes.items():
        lines.append(f'  {name}: {{ x: {x0}, width: {width}, source: require(\'./sigmazam-logo-{name}.png\') }},')
    lines += ['} as const;', '']
    (BRAND / 'logo-layers.ts').write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    main()
