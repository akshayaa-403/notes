#!/usr/bin/env python3
"""
Generate every PWA / favicon asset from one vector-ish description.

The icons are committed to the repo — this script exists so they can be
regenerated when the mark changes, not as a build step. Run it with:

    python tools/make-icons.py

Art is drawn at 4x into a 1000x1000 design space and downsampled with LANCZOS,
which is what gives the curves their antialiasing without any font or SVG
dependency.
"""

from PIL import Image, ImageDraw

ACCENT = (35, 131, 226, 255)   # --accent  #2383e2
PAPER  = (255, 255, 255, 255)

D = 1000        # design space
SS = 4          # supersample factor
OUT = "icons"


def _glyph_layer(simple=False):
    """The white note-sheet glyph, centred in the design space."""
    layer = Image.new("RGBA", (D * SS, D * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    # Boxes are written in design coords and scaled on the way through.
    def rect(box, radius, fill):
        d.rounded_rectangle([v * SS for v in box], radius=radius * SS, fill=fill)

    rect((290, 250, 710, 750), 48, PAPER)
    # At favicon sizes the ruled lines collapse into grey mush, so the small
    # variant is the bare sheet.
    if not simple:
        for top, right in ((360, 640), (470, 640), (580, 555)):
            rect((360, top, right, top + 34), 17, ACCENT)
    return layer


def _base(maskable=False):
    """Accent ground: rounded for `any`, full-bleed square for `maskable`."""
    img = Image.new("RGBA", (D * SS, D * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle((0, 0, D * SS, D * SS), fill=ACCENT)
    else:
        d.rounded_rectangle((0, 0, D * SS - 1, D * SS - 1), radius=220 * SS, fill=ACCENT)
    return img


def build(size, maskable=False, simple=False):
    img = _base(maskable)
    glyph = _glyph_layer(simple)
    if maskable:
        # Everything that matters must sit inside the central 80% safe zone,
        # because Android crops the icon to whatever shape the launcher uses.
        safe = int(D * SS * 0.8)
        glyph = glyph.resize((safe, safe), Image.LANCZOS)
        pad = (D * SS - safe) // 2
        img.alpha_composite(glyph, (pad, pad))
    else:
        img.alpha_composite(glyph)
    return img.resize((size, size), Image.LANCZOS)


def main():
    jobs = [
        (f"{OUT}/icon-192.png",          192, False, False),
        (f"{OUT}/icon-512.png",          512, False, False),
        (f"{OUT}/icon-maskable-192.png", 192, True,  False),
        (f"{OUT}/icon-maskable-512.png", 512, True,  False),
        # Safari reads this from the markup, never from the manifest, and it
        # gets no rounding of its own — iOS applies the squircle.
        ("apple-touch-icon.png",         180, False, False),
        (f"{OUT}/favicon-32.png",         32, False, True),
        (f"{OUT}/favicon-16.png",         16, False, True),
    ]
    for path, size, maskable, simple in jobs:
        build(size, maskable, simple).save(path)
        print(f"  {path}  {size}x{size}")

    # Multi-resolution .ico for browsers and Windows pinning.
    build(48, simple=True).save(
        "favicon.ico",
        sizes=[(16, 16), (32, 32), (48, 48)],
    )
    print("  favicon.ico  16/32/48")


if __name__ == "__main__":
    main()
