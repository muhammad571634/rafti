"""
Turns the raw Gemini renders into app-ready PNGs in assets/brand/.

    python scripts/build-brand-art.py [RAW_DIR]

RAW_DIR defaults to ../BIMOBIMOdesignraw. Every `<name>.png` there is a FOLDER
holding one or more .jpg renders; the newest file wins, so re-rendering an
asset is just "drop the new jpg in and re-run". `_fixed/<name>.png` overrides it.

Needs Pillow + numpy.
"""

import glob
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(ROOT), 'BIMOBIMOdesignraw')
OUT = os.path.join(ROOT, 'assets', 'brand')
IMAGES = os.path.join(ROOT, 'assets', 'images')

# Home launcher tiles: raw folder -> output name. The tile is part of the render.
TILES = {
    'icon_store': 'tile-store',
    'icon_dating': 'tile-dating',
    'icon_diary': 'tile-diary',
    'icon_photo': 'tile-photo',
    'icon_contacts': 'tile-contacts',
    'icon_radio': 'tile-radio',
    'icon_gifts': 'tile-gifts',
    'icon_calls': 'tile-calls',
    'icon_board': 'tile-board',
    'icon_bedtime': 'tile-bedtime',
}

# Renders whose tile is drawn as a thick slab with a side face: auto-detection
# would include the side, so the front face (left, top, size) in source px is given.
TILE_FACES = {
    'icon_board': (130, 128, 765),
}

# Characters on a plain backdrop: the backdrop is keyed out, then trimmed.
# Only for backdrops that differ from Rafti's cream face — see SCENES otherwise.
CUTOUTS = {
    'sticker_call': ('rafti-sticker', 640),
    'empty_state': ('rafti-empty', 720),
}

# Full-bleed scenes: optional crop box as fractions (l, t, r, b), then resized.
# reward_daily / levelup sit on cream, which a key would eat into Rafti's face,
# so they ship as framed pictures on the cream UI instead.
SCENES = {
    'banner_home': ('banner-home', 1200, None),
    'bedtime': ('bedtime-scene', 1200, None),
    'diary_cover': ('diary-cover', 900, None),
    'reward_daily': ('rafti-reward', 720, (0.2, 0.0, 0.8, 1.0)),
    'levelup': ('rafti-levelup', 800, (0.12, 0.08, 0.88, 1.0)),
}


def save(img, path, **options):
    """Write next to the target, then swap it in: Metro never sees a half-written asset."""
    fmt = 'JPEG' if path.lower().endswith('.jpg') else 'PNG'
    part = path + '.part'
    img.save(part, format=fmt, **options)
    os.replace(part, path)


def newest(name):
    fixed = os.path.join(RAW, '_fixed', name + '.png')
    if os.path.isfile(fixed):
        return fixed
    files = [f for f in glob.glob(os.path.join(RAW, name + '.png', '*')) if os.path.isfile(f)]
    if not files:
        raise SystemExit(f'missing render: {name}')
    return max(files, key=os.path.getmtime)


def fit(img, longest):
    scale = longest / max(img.size)
    if scale >= 1:
        return img
    return img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)


def backdrop_color(a):
    """Median of the four corner patches — the page behind the tile or character."""
    p = 12
    corners = np.concatenate([
        a[:p, :p].reshape(-1, 3), a[:p, -p:].reshape(-1, 3),
        a[-p:, :p].reshape(-1, 3), a[-p:, -p:].reshape(-1, 3),
    ])
    return np.median(corners, axis=0)


def find_tile(a):
    """Bounding square of the rounded tile, probed along straight edges only."""
    h, w, _ = a.shape
    ai = a.astype(int)
    # Tile = differs from the page AND is coloured; the grey drop shadow is neither.
    saturated = (ai.max(axis=2) - ai.min(axis=2)) > 25
    diff = (np.abs(ai - backdrop_color(a)).max(axis=2) > 22) & saturated

    def first(line):
        idx = np.flatnonzero(line)
        return idx[0] if idx.size else None

    lefts, rights, tops = [], [], []
    for f in (0.4, 0.5, 0.6):
        row = diff[int(h * f)]
        l, r = first(row), first(row[::-1])
        if l is not None:
            lefts.append(l)
            rights.append(w - 1 - r)
        t = first(diff[:, int(w * f)])
        if t is not None:
            tops.append(t)
    left, right, top = int(np.median(lefts)), int(np.median(rights)), int(np.median(tops))
    size = right - left
    # Drop shadows only grow downward, so the square is anchored on the top edge.
    return left, top, size


def rounded_mask(size, radius):
    big = size * 4
    m = Image.new('L', (big, big), 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, big - 1, big - 1], radius * 4, fill=255)
    return m.resize((size, size), Image.LANCZOS)


def build_tile(src, dst, face=None):
    img = Image.open(src).convert('RGB')
    left, top, size = face or find_tile(np.asarray(img))
    # Step inside the painted bevel so our own corner radius is the only edge.
    inset = round(size * 0.02)
    box = (left + inset, top + inset, left + size - inset, top + size - inset)
    tile = img.crop(box).resize((512, 512), Image.LANCZOS).convert('RGBA')
    tile.putalpha(rounded_mask(512, round(512 * 0.23)))
    save(tile, dst, optimize=True)
    return box


def key_out(img, tolerance=30):
    """Flood the backdrop in from the border; anything it cannot reach is the subject."""
    a = np.asarray(img).astype(int)
    h, w, _ = a.shape
    bg = backdrop_color(a.astype(np.uint8))
    # Backdrops are soft gradients, so compare against a blurred copy of the image
    # itself (local colour) as well as the corner colour.
    near = np.abs(a - bg).max(axis=2) < tolerance * 1.8
    smooth = np.asarray(img.filter(ImageFilter.BoxBlur(6))).astype(int)
    flat = np.abs(a - smooth).max(axis=2) < tolerance * 0.5
    candidate = near & flat

    reach = np.zeros((h, w), bool)
    reach[0, :] = reach[-1, :] = reach[:, 0] = reach[:, -1] = True
    reach &= candidate
    while True:
        grown = reach.copy()
        grown[1:] |= reach[:-1]
        grown[:-1] |= reach[1:]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= candidate
        if (grown == reach).all():
            break
        reach = grown

    alpha = Image.fromarray(np.where(reach, 0, 255).astype(np.uint8))
    # Close pinholes the flood left inside the subject, then soften the cut edge.
    alpha = alpha.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    # Opening wipes thin leftovers such as the sticker's shadow rim.
    alpha = alpha.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(9))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.1))
    out = img.convert('RGBA')
    out.putalpha(alpha)
    bbox = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    pad = 8
    bbox = (max(bbox[0] - pad, 0), max(bbox[1] - pad, 0), min(bbox[2] + pad, w), min(bbox[3] + pad, h))
    return out.crop(bbox)


def fill_holes(mask):
    """Everything the outside cannot reach becomes solid."""
    outside = np.zeros_like(mask)
    outside[0, :] = outside[-1, :] = outside[:, 0] = outside[:, -1] = True
    outside &= ~mask
    while True:
        grown = outside.copy()
        grown[1:] |= outside[:-1]
        grown[:-1] |= outside[1:]
        grown[:, 1:] |= outside[:, :-1]
        grown[:, :-1] |= outside[:, 1:]
        grown &= ~mask
        if (grown == outside).all():
            return ~outside
        outside = grown


def shell_from_store_tile():
    """
    Stand-in currency mark: the pearl shell Rafti hugs in icon_store, lifted off
    the tile. The envelope and paw zones are hand-placed for that render.
    """
    img = Image.open(newest('icon_store')).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    a = np.asarray(img).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    brown = (r - b > 70) & (a.sum(axis=2) < 600)

    envelope = Image.new('L', img.size, 0)
    ImageDraw.Draw(envelope).polygon(
        [(150, 190), (300, 230), (400, 320), (470, 370), (540, 410), (640, 470), (720, 560),
         (745, 700), (700, 900), (640, 950), (420, 930), (200, 860), (110, 650), (120, 380)],
        fill=255)
    inside = np.asarray(envelope) > 0

    seed = (np.abs(a - [250, 190, 120]).max(axis=2) > 38) & ~brown & (g <= r) & inside
    seed = Image.fromarray((seed * 255).astype(np.uint8))
    seed = seed.filter(ImageFilter.MaxFilter(31)).filter(ImageFilter.MinFilter(31))
    solid = fill_holes(np.asarray(seed) > 127) & inside

    paws = Image.new('L', img.size, 0)
    draw = ImageDraw.Draw(paws)
    for box in [(640, 560, 760, 700), (60, 490, 150, 630), (120, 750, 280, 910)]:
        draw.ellipse(box, fill=255)
    solid &= ~((np.asarray(paws) > 0) & brown)

    alpha = Image.fromarray((solid * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(1.3))
    out = img.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.getbbox())


def key_out_sky(img):
    """
    Key for renders on the flat sky-blue backdrop (#CFE6FF prompt). The pearly shell
    shares the backdrop's brightness, so it is split by hue instead: backdrop and
    its contact shadow have green well above red, the shell never does.
    """
    a = np.asarray(img).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    bluish = (g - r > 16) & (b - r > 36)

    reach = np.zeros_like(bluish)
    reach[0, :] = reach[-1, :] = reach[:, 0] = reach[:, -1] = True
    reach &= bluish
    while True:
        grown = reach.copy()
        grown[1:] |= reach[:-1]
        grown[:-1] |= reach[1:]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= bluish
        if (grown == reach).all():
            break
        reach = grown

    solid = fill_holes(~reach)
    alpha = Image.fromarray((solid * 255).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(1.2))
    out = img.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 24 else 0).getbbox())


def build_currency():
    """assets/icons/shell.png — a dedicated `currency_shell` render wins once it exists."""
    if glob.glob(os.path.join(RAW, 'currency_shell.png', '*')):
        shell = key_out_sky(Image.open(newest('currency_shell')).convert('RGB'))
    else:
        shell = shell_from_store_tile()
    shell = fit(shell, 240)
    canvas = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    canvas.alpha_composite(shell, ((256 - shell.width) // 2, (256 - shell.height) // 2))
    save(canvas, os.path.join(ROOT, 'assets', 'icons', 'shell.png'), optimize=True)


def build_app_icons(src):
    icon = Image.open(src).convert('RGB').resize((1024, 1024), Image.LANCZOS)
    save(icon, os.path.join(IMAGES, 'icon.png'), optimize=True)
    save(icon.resize((48, 48), Image.LANCZOS), os.path.join(IMAGES, 'favicon.png'))

    # Android adaptive: the launcher masks to the middle ~66%, so the art is shrunk
    # onto a backdrop painted in the render's own edge colour (seam disappears).
    edge = tuple(int(v) for v in backdrop_color(np.asarray(icon)))
    save(Image.new('RGB', (1024, 1024), edge), os.path.join(IMAGES, 'android-icon-background.png'))
    fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    inner = icon.resize((700, 700), Image.LANCZOS).convert('RGBA')
    inner.putalpha(rounded_mask(700, 700 // 2))
    fg.alpha_composite(inner, (162, 162))
    save(fg, os.path.join(IMAGES, 'android-icon-foreground.png'), optimize=True)
    return '#%02X%02X%02X' % edge


# Rafti reaction stickers: one 3x3 Nano Banana sheet; (row, col) per reaction.
REACTION_SHEET = os.path.join(ROOT, 'assets', 'raw', 'reactions-sheet.jpg')
REACTIONS = {
    'love': (0, 0),
    'laugh': (0, 1),
    'wow': (0, 2),
    'sad': (1, 0),
    'hyped': (2, 1),
    'thumbs': (2, 2),
}


def cut_sticker(cell):
    """The paper backdrop is grey and grainy; the die-cut rim is pure white, so the flood stops there."""
    a = np.asarray(cell).astype(int)
    h, w, _ = a.shape
    grey = (a.max(axis=2) - a.min(axis=2)) < 14
    candidate = grey & (a.min(axis=2) < 250)

    reach = np.zeros((h, w), bool)
    reach[0, :] = reach[-1, :] = reach[:, 0] = reach[:, -1] = True
    reach &= candidate
    while True:
        grown = reach.copy()
        grown[1:] |= reach[:-1]
        grown[:-1] |= reach[1:]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= candidate
        if (grown == reach).all():
            break
        reach = grown

    solid = ~reach
    # Bits of a neighbouring sticker poke into the cell at its edge. Each piece that
    # touches the edge is grown on its own and dropped only if it is small.
    total = solid.sum()
    seen = np.zeros((h, w), bool)
    for y, x in zip(*np.nonzero(solid & ~seen & _edge(h, w))):
        if seen[y, x]:
            continue
        piece = np.zeros((h, w), bool)
        piece[y, x] = True
        while True:
            grown = piece.copy()
            grown[1:] |= piece[:-1]
            grown[:-1] |= piece[1:]
            grown[:, 1:] |= piece[:, :-1]
            grown[:, :-1] |= piece[:, 1:]
            grown &= solid
            if (grown == piece).all():
                break
            piece = grown
        seen |= piece
        if piece.sum() < total * 0.05:
            solid &= ~piece

    alpha = Image.fromarray(np.where(solid, 255, 0).astype(np.uint8))
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    out = cell.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 24 else 0).getbbox())


def _edge(h, w):
    edge = np.zeros((h, w), bool)
    edge[0, :] = edge[-1, :] = edge[:, 0] = edge[:, -1] = True
    return edge


def build_reactions():
    if not os.path.exists(REACTION_SHEET):
        return
    sheet = Image.open(REACTION_SHEET).convert('RGB')
    step = sheet.width / 3
    for name, (row, col) in REACTIONS.items():
        box = (round(col * step), round(row * step), round((col + 1) * step), round((row + 1) * step))
        sticker = fit(cut_sticker(sheet.crop(box)), 240)
        save(sticker, os.path.join(OUT, f'reaction-{name}.png'), optimize=True)


# 3D clay icons: Nano Banana sheets, 4 columns x 3 rows on flat light grey.
# Per sheet: its file, the names row by row, and the row bands (fractions of its
# height; the rows are not evenly spaced).
ICON_SHEETS = [
    (
        os.path.join(ROOT, 'assets', 'raw', 'icons-3d-sheet.jpg'),
        [
            'voice', 'photo', 'secret-note', 'quiz',
            'truth-or-dare', 'date', 'calls', 'diary',
            # Spare art kept for later screens.
            'ball', 'planner', 'play', 'play-stack',
        ],
        [(0.10, 0.40), (0.40, 0.65), (0.65, 0.93)],
    ),
    (
        os.path.join(ROOT, 'assets', 'raw', 'icons-3d-sheet-2.jpg'),
        [
            'gift', 'store', 'contacts', 'radio',
            'board', 'bedtime', 'camera', 'calendar',
            'search', 'compass', 'music', 'lock',
        ],
        [(0.10, 0.375), (0.38, 0.635), (0.64, 0.92)],
    ),
    (
        os.path.join(ROOT, 'assets', 'raw', 'icons-3d-sheet-3.jpg'),
        [
            'umbrella', 'fish', 'fireworks', 'headphones',
            'night-sky', 'cake', 'house', 'sun',
            'plane', 'invite', 'sparkles', 'level-up',
        ],
        [(0.10, 0.33), (0.38, 0.62), (0.67, 0.89)],
    ),
    (
        # A wide sheet (1024 x 559); the bands stop above each row's floor shadow.
        os.path.join(ROOT, 'assets', 'raw', 'icons-3d-sheet-4.jpg'),
        [
            'fireplace', 'wave', 'film', 'wand',
            'polaroids', 'jar', 'alarm', 'palette',
            'trophy', 'hourglass', 'pencil', 'bubbles',
        ],
        [(0.04, 0.33), (0.355, 0.65), (0.67, 0.955)],
    ),
]

def drop_edge_scraps(solid):
    """
    Bits of a neighbouring icon poke into a cell at its side. A piece touching the
    border stays only if it reaches the middle third of the cell, where this cell's
    own icon sits; loose bits inside (steam, sparkles) never touch it and stay.
    """
    h, w = solid.shape
    middle = np.zeros((h, w), bool)
    middle[:, w // 3 : 2 * w // 3] = True
    seen = np.zeros((h, w), bool)
    for y, x in zip(*np.nonzero(solid & _edge(h, w))):
        if seen[y, x]:
            continue
        piece = np.zeros((h, w), bool)
        piece[y, x] = True
        while True:
            grown = piece.copy()
            grown[1:] |= piece[:-1]
            grown[:-1] |= piece[1:]
            grown[:, 1:] |= piece[:, :-1]
            grown[:, :-1] |= piece[:, 1:]
            grown &= solid
            if (grown == piece).all():
                break
            piece = grown
        seen |= piece
        if not (piece & middle).any():
            solid = solid & ~piece
    return solid


def drop_thin_bands(solid, min_rows=6):
    """
    The tight glass test keeps a faint line of floor shadow under the object; it is
    a short run of rows with an empty gap above it, so runs that thin are dropped.
    """
    filled = solid.any(axis=1)
    y = 0
    while y < len(filled):
        if not filled[y]:
            y += 1
            continue
        end = y
        while end < len(filled) and filled[end]:
            end += 1
        if end - y < min_rows:
            solid[y:end] = False
        y = end
    return solid


def cut_icon(cell, glass=False):
    """
    Flood the grey backdrop and the grey drop shadow in from the border; colour stops it.
    Clear glass is grey too, so for `glass` icons only pixels almost exactly the
    backdrop's colour flood, and the glass rim stops it.
    """
    a = np.asarray(cell).astype(int)
    h, w, _ = a.shape
    chroma = a.max(axis=2) - a.min(axis=2)
    if glass:
        edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
        backdrop = np.median(edge, axis=0)
        candidate = np.abs(a - backdrop).max(axis=2) < 9
    else:
        candidate = (chroma < 12) & (a.min(axis=2) > 165)

    reach = np.zeros((h, w), bool)
    reach[0, :] = reach[-1, :] = reach[:, 0] = reach[:, -1] = True
    reach &= candidate
    while True:
        grown = reach.copy()
        grown[1:] |= reach[:-1]
        grown[:-1] |= reach[1:]
        grown[:, 1:] |= reach[:, :-1]
        grown[:, :-1] |= reach[:, 1:]
        grown &= candidate
        if (grown == reach).all():
            break
        reach = grown

    solid = fill_holes(~reach)
    solid = drop_edge_scraps(solid)
    if glass:
        solid = drop_thin_bands(solid)
    alpha = Image.fromarray(np.where(solid, 255, 0).astype(np.uint8))
    # One pixel in from the cut: the sheet's light rim must not show on darker tiles.
    alpha = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.9))
    out = cell.convert('RGBA')
    out.putalpha(alpha)
    return out.crop(alpha.point(lambda v: 255 if v > 24 else 0).getbbox())


# Icons with clear glass, cut with the tighter backdrop test.
GLASS_ICONS = {'jar', 'hourglass'}


def build_icons_3d():
    names = []
    for path, sheet_names, rows in ICON_SHEETS:
        if not os.path.exists(path):
            continue
        sheet = Image.open(path).convert('RGB')
        w, h = sheet.size
        col = w / 4
        for i, name in enumerate(sheet_names):
            top, bottom = rows[i // 4]
            c = i % 4
            # Cells overlap a little so no icon is clipped; the neighbour's scraps are dropped.
            box = (max(0, round(c * col) - 16), round(top * h), min(w, round((c + 1) * col) + 16), round(bottom * h))
            icon = fit(cut_icon(sheet.crop(box), glass=name in GLASS_ICONS), 192)
            save(icon, os.path.join(OUT, f'icon3d-{name}.png'), optimize=True)
            names.append(name)
    return names

def build_sticker_derivatives():
    sticker = Image.open(os.path.join(OUT, 'rafti-sticker.png'))
    # Splash: the sticker centred on transparent, sized by expo-splash-screen.
    save(sticker, os.path.join(IMAGES, 'splash-icon.png'), optimize=True)
    # Android themed icon: white silhouette of the sticker.
    mono = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
    s = fit(sticker, 560)
    white = Image.new('RGBA', s.size, (255, 255, 255, 255))
    white.putalpha(s.getchannel('A'))
    mono.alpha_composite(white, ((1024 - s.width) // 2, (1024 - s.height) // 2))
    save(mono, os.path.join(IMAGES, 'android-icon-monochrome.png'), optimize=True)


def build_avatars():
    """
    Seed character portraits: `avatar_<name>.png/` render folders become
    assets/avatars/c_<name>.png (square, 512px) and the registry is rewritten
    to list exactly the portraits that exist.
    """
    folder = os.path.join(ROOT, 'assets', 'avatars')
    os.makedirs(folder, exist_ok=True)
    names = []
    for raw in sorted(glob.glob(os.path.join(RAW, 'avatar_*.png'))):
        if not os.path.isdir(raw):
            continue
        name = os.path.basename(raw)[len('avatar_'):-len('.png')]
        img = Image.open(newest('avatar_' + name)).convert('RGB')
        # Portraits are framed head-and-shoulders; keep the top of a tall render.
        side = min(img.size)
        left = (img.width - side) // 2
        top = 0 if img.height > img.width else (img.height - side) // 2
        square = img.crop((left, top, left + side, top + side)).resize((512, 512), Image.LANCZOS)
        save(square, os.path.join(folder, f'c_{name}.png'), optimize=True)
        names.append(name)

    lines = ''.join(f"  c_{n}: require('./c_{n}.png'),\n" for n in names)
    registry = f"""/**
 * Seed character portraits (2D anime-style originals), looked up by character id.
 * Generated by scripts/build-brand-art.py from `avatar_<name>.png/` renders; characters
 * without one render a pastel monogram. User-created characters use `avatarUri`.
 */
export const AVATARS: Record<string, number> = {{
{lines}}};
"""
    with open(os.path.join(folder, 'registry.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(registry)
    return names


def build_heroes():
    """
    Wide character scenes for the Today hero card: `hero_<name>.png/` render folders
    (16:9, generated on Higgsfield) become assets/heroes/c_<name>.jpg, 1600px wide,
    and the registry is rewritten to list exactly the scenes that exist.
    """
    folder = os.path.join(ROOT, 'assets', 'heroes')
    os.makedirs(folder, exist_ok=True)
    names = []
    for raw in sorted(glob.glob(os.path.join(RAW, 'hero_*.png'))):
        if not os.path.isdir(raw):
            continue
        name = os.path.basename(raw)[len('hero_'):-len('.png')]
        scene = fit(Image.open(newest('hero_' + name)).convert('RGB'), 1600)
        save(scene, os.path.join(folder, f'c_{name}.jpg'), quality=84, optimize=True, progressive=True)
        names.append(name)

    lines = ''.join(f"  c_{n}: require('./c_{n}.jpg'),\n" for n in names)
    registry = f"""/**
 * Wide character scenes for the Today hero card, looked up by character id.
 * Generated by scripts/build-brand-art.py from `hero_<name>.png/` renders; characters
 * without one fall back to their portrait.
 */
export const HEROES: Record<string, number> = {{
{lines}}};
"""
    with open(os.path.join(folder, 'registry.ts'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(registry)
    return names


def main():
    os.makedirs(OUT, exist_ok=True)

    portraits = build_avatars()
    print(f'avatars {len(portraits)}: {", ".join(portraits) or "none yet"}')

    heroes = build_heroes()
    print(f'heroes  {len(heroes)}: {", ".join(heroes) or "none yet"}')

    for raw, name in TILES.items():
        box = build_tile(newest(raw), os.path.join(OUT, name + '.png'), TILE_FACES.get(raw))
        print(f'tile   {name:16} crop {box}')

    for raw, (name, longest) in CUTOUTS.items():
        cut = fit(key_out(Image.open(newest(raw)).convert('RGB')), longest)
        save(cut, os.path.join(OUT, name + '.png'), optimize=True)
        print(f'cutout {name:16} {cut.size}')

    for raw, (name, longest, crop) in SCENES.items():
        scene = Image.open(newest(raw)).convert('RGB')
        if crop:
            w, h = scene.size
            scene = scene.crop((round(crop[0] * w), round(crop[1] * h), round(crop[2] * w), round(crop[3] * h)))
        scene = fit(scene, longest)
        save(scene, os.path.join(OUT, name + '.jpg'), quality=88, optimize=True)
        print(f'scene  {name:16} {scene.size}')

    build_currency()
    print('currency shell done')

    edge = build_app_icons(newest('app_icon'))
    build_sticker_derivatives()
    build_reactions()
    print(f'app icon done, android background {edge}')
    print(f'icons3d {", ".join(build_icons_3d()) or "none yet"}')


if __name__ == '__main__':
    # `python scripts/build-brand-art.py icons` rebuilds only the 3D icons.
    if sys.argv[1:] == ['icons']:
        print(f'icons3d {", ".join(build_icons_3d()) or "none yet"}')
    else:
        main()
