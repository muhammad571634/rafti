"""Compress raw live-scene clips into the app and rewrite their registry.

Raw clips (Higgsfield image-to-video, first frame = last frame) go in
`assets/raw/live/<character id>.mp4`, e.g. `assets/raw/live/c_kai.mp4`. Each one becomes
`assets/live/<character id>.mp4`: 960x540, H.264, no audio, at most 5 seconds, fast start,
small enough to ship in the app. Then `assets/live/registry.ts` lists every clip.

Usage: python scripts/build-live-scenes.py
Needs ffmpeg on the PATH.
"""

import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW = ROOT / "assets" / "raw" / "live"
OUT = ROOT / "assets" / "live"

HEADER = '''/**
 * Live scenes: a few seconds of silent, seamlessly looping video made from a character's
 * wide scene (`assets/heroes`), so the Today card feels alive (blinks, breath, wind).
 * Made with Higgsfield image-to-video (first frame = last frame, so the loop has no seam),
 * then trimmed and compressed by scripts/build-live-scenes.py. Characters without a clip
 * keep the still scene.
 */
'''


def build(src: pathlib.Path, dst: pathlib.Path) -> None:
    subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(src),
            "-t", "5",
            "-an",
            "-vf", "scale=960:540:force_original_aspect_ratio=increase,crop=960:540,fps=24",
            "-c:v", "libx264", "-profile:v", "main", "-pix_fmt", "yuv420p",
            "-crf", "27", "-preset", "slow",
            "-movflags", "+faststart",
            str(dst),
        ],
        check=True,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for src in sorted(RAW.glob("c_*.mp4")):
        dst = OUT / src.name
        build(src, dst)
        print(f"{dst.relative_to(ROOT)}  {dst.stat().st_size / 1024:.0f} KB")

    clips = sorted(p.stem for p in OUT.glob("c_*.mp4"))
    lines = [f"  {cid}: require('./{cid}.mp4')," for cid in clips]
    body = "export const LIVE_SCENES: Record<string, number> = {" + ("\n" + "\n".join(lines) + "\n" if lines else "") + "};\n"
    (OUT / "registry.ts").write_text(HEADER + body)
    print(f"registry: {len(clips)} clips")


if __name__ == "__main__":
    main()
