#!/usr/bin/env python3
"""Generate chart images for programming/post 1."""

from __future__ import annotations

from pathlib import Path

import matplotlib.pyplot as plt

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "content" / "programming" / "post 1"

BG     = "#12141a"
PURPLE = "#6d28d9"
BLUE   = "#1d4ed8"
GREEN  = "#047857"
TEXT   = "#e2e8f0"
MUTED  = "#64748b"


def save(fig: plt.Figure, name: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / name
    fig.savefig(path, dpi=150, bbox_inches="tight", facecolor=fig.get_facecolor())
    plt.close(fig)
    print(f"  ✓  {path}")


# ── 1. Android / Linux / Google relationship ─────────────────────────────────

def graph_android_linux() -> None:
    fig, ax = plt.subplots(figsize=(7.5, 3.5))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 4)
    ax.axis("off")

    nodes = [
        (1.5, 2.0, "Linux\nKernel",  PURPLE),
        (4.5, 2.0, "Android",        BLUE),
        (7.5, 2.0, "Google",         GREEN),
    ]
    labels_below = [
        "Open-source OS kernel",
        "Built on Linux (2003)",
        "bitch ass company",
    ]

    for (x, y, label, color), note in zip(nodes, labels_below):
        circle = plt.Circle((x, y), 0.75, color=color, zorder=3, alpha=0.85)
        ax.add_patch(circle)
        ax.text(
            x, y, label,
            ha="center", va="center",
            fontsize=9.5, fontweight="bold", color="#ffffff",
            zorder=4,
        )
        ax.text(
            x, y - 1.05, note,
            ha="center", va="top",
            fontsize=8, color=MUTED,
        )

    # Arrows
    for x0, x1 in [(2.25, 3.75), (5.25, 6.75)]:
        ax.annotate(
            "", xy=(x1, 2.0), xytext=(x0, 2.0),
            arrowprops=dict(arrowstyle="->", color=MUTED, lw=1.5),
        )

    ax.set_title(
        "Linux  →  Android  →  Google",
        color=TEXT, fontsize=12, fontweight="bold", pad=8,
    )
    save(fig, "android-linux-graph.png")


# ── 2. Pie — how Android users customise ─────────────────────────────────────

def graph_customization_pie1() -> None:
    labels = ["Themes, Launchers\n& Plugins  (99%)", "OS / Kernel\nChange  (1%)"]
    sizes  = [99, 1]
    colors = [BLUE, PURPLE]

    fig, ax = plt.subplots(figsize=(5.5, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    wedges, _, autotexts = ax.pie(
        sizes,
        labels=None,
        autopct="%1.0f%%",
        startangle=140,
        colors=colors,
        explode=(0.0, 0.12),
        pctdistance=0.68,
        wedgeprops={"linewidth": 2, "edgecolor": BG, "width": 0.55},
    )
    for at in autotexts:
        at.set_fontsize(11)
        at.set_fontweight("bold")
        at.set_color("#ffffff")

    ax.legend(
        wedges, labels,
        loc="lower center",
        bbox_to_anchor=(0.5, -0.15),
        ncol=2,
        fontsize=8.5,
        frameon=False,
        labelcolor=TEXT,
    )
    ax.set_title(
        "How Android Users Actually Customise",
        color=TEXT, fontsize=11, fontweight="bold", pad=12,
    )
    save(fig, "customization-pie1.png")


# ── 3. Pie — mobile OS market share ──────────────────────────────────────────

def graph_customization_pie2() -> None:
    labels = ["Android + iOS  (99%)", "GrapheneOS / LineageOS\n/ Arch / Ubuntu  (1%)"]
    sizes  = [99, 1]
    colors = [GREEN, PURPLE]

    fig, ax = plt.subplots(figsize=(5.5, 4))
    fig.patch.set_facecolor(BG)
    ax.set_facecolor(BG)

    wedges, _, autotexts = ax.pie(
        sizes,
        labels=None,
        autopct="%1.0f%%",
        startangle=160,
        colors=colors,
        explode=(0.0, 0.14),
        pctdistance=0.68,
        wedgeprops={"linewidth": 2, "edgecolor": BG, "width": 0.55},
    )
    for at in autotexts:
        at.set_fontsize(11)
        at.set_fontweight("bold")
        at.set_color("#ffffff")

    ax.legend(
        wedges, labels,
        loc="lower center",
        bbox_to_anchor=(0.5, -0.15),
        ncol=1,
        fontsize=8.5,
        frameon=False,
        labelcolor=TEXT,
    )
    ax.set_title(
        "Mobile OS Market: Mainstream vs Alternative",
        color=TEXT, fontsize=11, fontweight="bold", pad=12,
    )
    save(fig, "customization-pie2.png")


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print("Generating charts …")
    graph_android_linux()
    graph_customization_pie1()
    graph_customization_pie2()
    print("Done.")


if __name__ == "__main__":
    main()
