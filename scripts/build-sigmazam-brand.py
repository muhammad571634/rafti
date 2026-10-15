"""Sigmazam brand assets from the owner's logo and the generated icon art.

Sources (owner, 2026-10-15):
  docs/branding/download.png     the full logo, "SiGMAZAM" with the mascot over the G, on cream
  docs/branding/icon-art.png     the mascot over the G alone, 1024px (Higgsfield, from the logo)

Both sit on a cream background and the mascot's body is the same cream, so a colour key
would eat it. The cut: pixels that differ from the background form a barrier, a flood fill
from the border marks the background, and whatever it cannot reach (the body inside its
outline) stays opaque. Edge pixels get a soft alpha and are un-mixed from the cream so they
keep no fringe on dark screens. The logo's soft shadow under the letters is dropped.

Writes:
  assets/brand/sigmazam-logo.png           wordmark, transparent (header, splash)
  assets/brand/sigmazam-mark.png           mascot over the G, transparent
  assets/images/icon.png                   iOS / store icon, 1024, opaque cream
  assets/images/android-icon-foreground.png  adaptive foreground, mark inside the safe zone
  assets/images/android-icon-background.png  adaptive background, flat cream
  assets/images/android-icon-monochrome.png  themed icon and notification icon, white silhouette
  assets/images/splash-icon.png            wordmark for the splash screen
  assets/images/favicon.png                web, 48px

usage: python scripts/build-sigmazam-brand.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
LOGO = ROOT / 'docs/branding/download.png'
ICON_ART = ROOT / 'docs/branding/icon-art.png'
BRAND = ROOT / 'assets/brand'
IMAGES = ROOT / 'assets/images'
CREAM = (253, 246, 238)


def cut(path, barrier_t=18, lo=22, hi=70, drop_shadow_below=None):
    """Return (RGBA image, background colour) with the background removed."""
    a = np.asarray(Image.open(path).convert('RGB')).astype(np.float32)
    h, w, _ = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border, axis=0)
    diff = np.abs(a - bg).max(axis=2)

    mask = Image.fromarray(((diff > barrier_t) * 255).astype(np.uint8), 'L').copy()
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if mask.getpixel((x, y)) == 0:
                ImageDraw.floodfill(mask, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if mask.getpixel((x, y)) == 0:
                ImageDraw.floodfill(mask, (x, y), 128)
    m = np.asarray(mask)
    reached = m == 128

    soft = np.clip((diff - lo) / (hi - lo), 0, 1)
    alpha = np.ones((h, w), np.float32)
    alpha[reached] = soft[reached]
    near = np.zeros_like(reached)
    near[1:, :] |= reached[:-1, :]
    near[:-1, :] |= reached[1:, :]
    near[:, 1:] |= reached[:, :-1]
    near[:, :-1] |= reached[:, 1:]
    edge = (m == 255) & near
    alpha[edge] = soft[edge]

    if drop_shadow_below is not None:
        # Below each column's lowest solid-orange pixel only the letter's own soft edge stays.
        strong = diff > 100
        ramp = np.clip((diff - 60) / 50, 0, 1)
        floor = int(h * drop_shadow_below)
        for x in range(w):
            ys = np.where(strong[:, x])[0]
            start = max((ys.max() + 1) if ys.size else floor, floor)
            alpha[start:, x] = ramp[start:, x]

    al = alpha[..., None]
    col = np.where(al > 0.02, (a - (1 - al) * bg) / np.maximum(al, 0.02), a)
    rgba = np.dstack([np.clip(col, 0, 255), alpha * 255]).astype(np.uint8)
    img = Image.fromarray(rgba, 'RGBA')
    return img.crop(img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()), tuple(int(v) for v in bg)


def fit(img, box):
    """Scale `img` to fit a `box` x `box` square (Lanczos)."""
    s = box / max(img.size)
    return img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)


def on_square(img, size, fill, share):
    """Centre `img` on a `size` square so its longer side is `share` of the square."""
    sq = Image.new('RGBA', (size, size), fill)
    art = fit(img, round(size * share))
    sq.alpha_composite(art, ((size - art.width) // 2, (size - art.height) // 2))
    return sq


def main():
    logo, _ = cut(LOGO, drop_shadow_below=0.66)
    logo.save(BRAND / 'sigmazam-logo.png', optimize=True)

    mark, art_bg = cut(ICON_ART)
    mark.save(BRAND / 'sigmazam-mark.png', optimize=True)

    # iOS / store icon: the art on its own cream, a little breathing room round it.
    on_square(mark, 1024, CREAM + (255,), 0.80).convert('RGB').save(IMAGES / 'icon.png', optimize=True)

    # Android adaptive: 108dp layers, launcher masks show the middle 72dp (66%).
    on_square(mark, 1024, (0, 0, 0, 0), 0.60).save(IMAGES / 'android-icon-foreground.png', optimize=True)
    Image.new('RGB', (1024, 1024), CREAM).save(IMAGES / 'android-icon-background.png', optimize=True)

    # Monochrome: one colour, so shape comes from alpha. The orange (G, hair, sparks) is solid,
    # the cream body half, the eyes and mouth open: the G and the face both read at 24dp.
    a = np.asarray(mark).astype(np.float32)
    lum = a[..., :3] @ np.array([0.299, 0.587, 0.114])
    warmth = np.clip((a[..., 0] - a[..., 2] - 45) / 50, 0, 1)
    sil = a[..., 3] * (0.42 + 0.58 * warmth)
    sil = np.where(lum < 110, 0, sil)
    sil_img = Image.fromarray(sil.astype(np.uint8), 'L').filter(ImageFilter.GaussianBlur(0.6))
    white = Image.new('RGBA', mark.size, (255, 255, 255, 0))
    white.putalpha(sil_img)
    on_square(white, 1024, (0, 0, 0, 0), 0.60).save(IMAGES / 'android-icon-monochrome.png', optimize=True)

    # Splash: the wordmark; app.json sets its width.
    fit(logo, 1200).save(IMAGES / 'splash-icon.png', optimize=True)

    on_square(mark, 48, CREAM + (255,), 0.92).convert('RGB').save(IMAGES / 'favicon.png', optimize=True)
    print('logo', logo.size, 'mark', mark.size, 'icon art background', art_bg)


if __name__ == '__main__':
    main()
