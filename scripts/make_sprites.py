"""Pixel art for the site, drawn as text. Run: python3 scripts/make_sprites.py

Writes crisp SVGs to static/sprites/. One character per pixel, "." is transparent.
Letters map to the PICO-8 palette below. Rows are merged into runs so files stay tiny.
"""
from pathlib import Path

PICO = {
    "K": "#1d2b53",  # navy (outlines)
    "U": "#7e2553",  # plum
    "F": "#008751",  # forest
    "N": "#ab5236",  # brown
    "D": "#5f574f",  # slate
    "S": "#c2c3c7",  # silver
    "W": "#fff1e8",  # cream
    "R": "#ff004d",  # red
    "O": "#ffa300",  # orange
    "Y": "#ffec27",  # yellow
    "G": "#00e436",  # green
    "B": "#29adff",  # blue
    "L": "#83769c",  # lavender
    "P": "#ff77a8",  # pink
    "E": "#ffccaa",  # peach
    "X": "#000000",
}

SPRITES = {
    # World icons
    "programming": """
................
.KKKKKKKKKKKKKK.
.KDDDDDDDDDDDDK.
.KDGDDDDDDDDDDK.
.KDDGDDDDDDDDDK.
.KDDDGDDDDDDDDK.
.KDDGDDDDDDDDDK.
.KDGDDGGGGDDDDK.
.KDDDDDDDDDDDDK.
.KKKKKKKKKKKKKK.
......KSSK......
....KKKKKKKK....
....KSSSSSSK....
....KKKKKKKK....
""",
    "gamedev": """
................
...KKKK..KKKK...
..KSSSSKKSSSSK..
.KSSSSSSSSSSSSK.
.KSSKSSSSSSRSSK.
.KSKKKSSSSRSRSK.
.KSSKSSSSSSRSSK.
.KSSSSSSSSSSSSK.
.KSSSSKKKKSSSSK.
..KSSK....KSSK..
...KK......KK...
""",
    "books": """
................
.KKKKKK..KKKKKK.
.KWWWWWKKWWWWWK.
.KWDDDWKKWDDDWK.
.KWWWWWKKWWWWWK.
.KWDDDWKKWDDDWK.
.KWWWWWKKWWWWWK.
.KWDDWWKKWDDDWK.
.KWWWWWKKWWWWWK.
.KKKKKKKKKKKKKK.
.KRRRRRKKRRRRRK.
..KKKKKKKKKKKK..
""",
    "mylife": """
..KKKK...KKKK...
.KRRRRK.KRRRRK..
KRRWWRRKRRRRRRK.
KRRWRRRRRRRRRRK.
KRRRRRRRRRRRRRK.
.KRRRRRRRRRRRK..
..KRRRRRRRRRK...
...KRRRRRRRK....
....KRRRRRK.....
.....KRRRK......
......KRK.......
.......K........
""",
    "lock": """
...KKKK...
..KSSSSK..
.KSK..KSK.
.KSK..KSK.
KKKKKKKKKK
KOOOOOOOOK
KOOOKKOOOK
KOOOKKOOOK
KOOOOOOOOK
KKKKKKKKKK
""",
    "trophy": """
.KKKKKKKKKK.
KKYYYYYYYYKK
KYKYYYYWYKYK
KYKYYYYWYKYK
.KKYYYYYYKK.
..KOYYYYOK..
...KOYYOK...
....KOOK....
....KYYK....
...KOOOOK...
..KKKKKKKK..
""",
    "coin": """
..KKKK..
.KYYYYK.
KYYWYYOK
KYYWYYOK
KYYWYYOK
KYYYYYOK
.KOOOOK.
..KKKK..
""",
    "heart": """
.KK.KK.
KRRKRRK
KRWRRRK
KRRRRRK
.KRRRK.
..KRK..
...K...
""",
    # Cursors: arrow, and the same arrow in gold for things you can click
    "cursor": """
K..........
KK.........
KWK........
KWWK.......
KWWWK......
KWWWWK.....
KWWWWWK....
KWWWWWWK...
KWWWWWWWK..
KWWWWWWWWK.
KWWWWWKKKKK
KWWKWWK....
KWK.KWWK...
KK..KWWK...
K....KWWK..
.....KWWK..
......KK...
""",
    "cursor-hand": """
K..........
KK.........
KYK........
KYYK.......
KYYYK......
KYYYYK.....
KYYYYYK....
KYYYYYYK...
KYYYYYYYK..
KYYYYYYYYK.
KYYYYYKKKKK
KYYKYYK....
KYK.KYYK...
KK..KYYK...
K....KYYK..
.....KYYK..
......KK...
""",
}

# Single-colour icons; CSS masks them so they follow the text colour
ICONS = {
    "sound-on": """
....##.....
...###...#.
####.#.#..#
#....#..#.#
#....#..#.#
####.#.#..#
...###...#.
....##.....
""",
    "sound-off": """
....##.....
...###.....
####.#.#..#
#....#..##.
#....#..##.
####.#.#..#
...###.....
....##.....
""",
    "pause": """
##..##
##..##
##..##
##..##
##..##
##..##
##..##
""",
}


def rows_of(art):
    rows = [r for r in art.strip("\n").split("\n")]
    width = max(len(r) for r in rows)
    return [r.ljust(width, ".") for r in rows], width, len(rows)


def runs(rows, colour_of):
    """Yield (x, y, w, colour) for horizontal runs of one colour."""
    for y, row in enumerate(rows):
        x = 0
        while x < len(row):
            ch = row[x]
            if ch == ".":
                x += 1
                continue
            start = x
            while x < len(row) and row[x] == ch:
                x += 1
            yield start, y, x - start, colour_of(ch)


def svg(art, scale=1, colour_of=PICO.get, extra=""):
    rows, w, h = rows_of(art)
    rects = "".join(
        f'<rect x="{x}" y="{y}" width="{rw}" height="1" fill="{c}"/>'
        for x, y, rw, c in runs(rows, colour_of)
    )
    size = f' width="{w * scale}" height="{h * scale}"' if scale != 1 else ""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"{size}'
        f' shape-rendering="crispEdges"{extra}>{rects}</svg>'
    )


def main():
    out = Path(__file__).resolve().parent.parent / "static" / "sprites"
    out.mkdir(parents=True, exist_ok=True)
    for name, art in SPRITES.items():
        scale = 2 if name.startswith("cursor") else 1
        (out / f"{name}.svg").write_text(svg(art, scale) + "\n")
    print("wrote", len(SPRITES), "sprites to", out)
    # Mono icons are used as CSS masks, so the fill colour doesn't matter
    for name, art in ICONS.items():
        (out / f"icon-{name}.svg").write_text(svg(art, colour_of=lambda _: "#000") + "\n")
    print("wrote", len(ICONS), "icons")


if __name__ == "__main__":
    main()
