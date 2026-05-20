#!/usr/bin/env python3
"""Generate interactive Plotly charts for programming/post 1.

Matches the original post 1 chart style (donut charts, flow diagram)
using the blog's slate theme colors. Outputs .html files to charts/.
"""

from __future__ import annotations
import math
from pathlib import Path

import plotly.graph_objects as go
import plotly.io as pio

# ── Color Palette (blog's slate theme) ────────────────────────────────────────
BG         = "#0f172a"
CARD       = "#1e293b"
GRID       = "#1e293b"
AXIS_LINE  = "#334155"
TEXT_PRIM  = "#f8fafc"
TEXT_SEC   = "#cbd5e1"
INDIGO     = "#6366f1"
TEAL       = "#14b8a6"
AMBER      = "#f59e0b"
ROSE       = "#f43f5e"

# Original-style accent colors (vibrant on dark)
ACCENT_A   = "#6366f1"  # indigo → replaces blue in original
ACCENT_B   = "#8b5cf6"  # violet → replaces purple in original
ACCENT_C   = "#14b8a6"  # teal  → replaces green in original

# ── Blog Template ─────────────────────────────────────────────────────────────
BLOG_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        paper_bgcolor=BG,
        plot_bgcolor=BG,
        font=dict(family="Inter, -apple-system, sans-serif", color=TEXT_PRIM, size=13),
        title=dict(font=dict(size=18, color=TEXT_PRIM), x=0.5, xanchor="center"),
        xaxis=dict(
            gridcolor=GRID, linecolor=AXIS_LINE, tickcolor=AXIS_LINE,
            tickfont=dict(color=TEXT_SEC), title_font=dict(color=TEXT_SEC),
            showgrid=True, zeroline=False, automargin=True,
        ),
        yaxis=dict(
            gridcolor=GRID, linecolor=AXIS_LINE, tickcolor=AXIS_LINE,
            tickfont=dict(color=TEXT_SEC), title_font=dict(color=TEXT_SEC),
            showgrid=True, zeroline=False, automargin=True,
        ),
        legend=dict(
            bgcolor="rgba(0,0,0,0)", bordercolor=AXIS_LINE, borderwidth=1,
            font=dict(color=TEXT_SEC, size=12),
        ),
        hoverlabel=dict(bgcolor=CARD, bordercolor=AXIS_LINE, font=dict(color=TEXT_PRIM)),
        margin=dict(l=40, r=40, t=70, b=60),
    )
)
pio.templates["blog"] = BLOG_TEMPLATE
pio.templates.default = "blog"

OUTPUT_DIR = Path(__file__).resolve().parents[1] / "content" / "programming" / "post 1" / "charts"


def save(fig: go.Figure, name: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUTPUT_DIR / name
    fig.write_html(str(path), include_plotlyjs="cdn", full_html=False,
                   config={"displayModeBar": False, "responsive": True})
    print(f"  \u2713  {path}")


# ── 1. Flow Diagram: Linux → Android → Google ─────────────────────────────────

def graph_android_linux() -> None:
    fig = go.Figure()

    nodes = [
        (1.5, 2.0, "Linux\nKernel",  ACCENT_A, "Open-source OS kernel"),
        (4.5, 2.0, "Android",        ACCENT_B, "Built on Linux (2003)"),
        (7.5, 2.0, "Google",         ACCENT_C, "Controls the platform"),
    ]

    for cx, cy, label, color, note in nodes:
        theta = [i * 2 * math.pi / 64 for i in range(65)]
        fig.add_trace(go.Scatter(
            x=[cx + 0.75 * math.cos(t) for t in theta],
            y=[cy + 0.75 * math.sin(t) for t in theta],
            mode="lines",
            line=dict(color=color, width=2.5),
            fill="toself", fillcolor=BG,
            showlegend=False, hoverinfo="skip",
            opacity=1,
        ))
        fig.add_annotation(x=cx, y=cy, text=label, showarrow=False,
                            font=dict(size=13, color="#ffffff", family="Inter, sans-serif"),
                            align="center")
        fig.add_annotation(x=cx, y=cy - 1.05, text=note, showarrow=False,
                            font=dict(size=10.5, color=TEXT_SEC, family="Inter, sans-serif"),
                            align="center")

    for x0, x1 in [(2.25, 3.75), (5.25, 6.75)]:
        fig.add_annotation(
            x=x1, y=2.0, ax=x0, ay=2.0,
            xref="x", yref="y", axref="x", ayref="y",
            showarrow=True, arrowhead=2, arrowsize=1.3,
            arrowwidth=2, arrowcolor=TEXT_SEC, text="",
        )

    fig.update_layout(
        title=dict(
            text="Linux \u2192  Android  \u2192  Google",
            font=dict(size=16, color=TEXT_PRIM),
            x=0.5, y=0.95,
        ),
        xaxis=dict(visible=False, range=[0, 9]),
        yaxis=dict(visible=False, range=[0, 4]),
        height=350,
        margin=dict(l=20, r=20, t=60, b=40),
        plot_bgcolor=BG,
        paper_bgcolor=BG,
    )
    save(fig, "android-linux-graph.html")


# ── 2. Donut Chart: How Android Users Customise ───────────────────────────────

def graph_customization_pie1() -> None:
    labels  = ["Themes, Launchers & Plugins", "OS / Kernel Change"]
    values  = [99, 1]
    colors  = [ACCENT_A, ACCENT_B]
    explode = [0, 0.10]

    fig = go.Figure()
    fig.add_trace(go.Pie(
        labels=labels,
        values=values,
        marker=dict(colors=colors, line=dict(color=BG, width=3)),
        textinfo="percent",
        textfont=dict(size=16, color="#ffffff", family="Inter, sans-serif"),
        textposition="inside",
        insidetextorientation="auto",
        hole=0.40,
        pull=explode,
        sort=False,
        direction="clockwise",
        rotation=140,
        hovertemplate="%{label}: %{percent}%<extra></extra>",
        showlegend=True,
        legendgroup="",
        legendgrouptitle=dict(text=""),
    ))

    fig.update_layout(
        title=dict(
            text="How Android Users Actually Customise",
            font=dict(size=16, color=TEXT_PRIM, family="Inter, sans-serif"),
            x=0.5, y=0.97,
        ),
        height=400,
        margin=dict(l=30, r=30, t=60, b=100),
        legend=dict(
            orientation="h",
            y=-0.12,
            x=0.5,
            xanchor="center",
            yanchor="top",
            font=dict(size=12, color=TEXT_SEC),
            bgcolor="rgba(0,0,0,0)",
        ),
    )
    save(fig, "customization-bar1.html")


# ── 3. Donut Chart: Mobile OS Market Share ────────────────────────────────────

def graph_customization_pie2() -> None:
    labels  = ["Android + iOS", "GrapheneOS / LineageOS / Arch / Ubuntu"]
    values  = [99, 1]
    colors  = [ACCENT_C, ACCENT_B]
    explode = [0, 0.12]

    fig = go.Figure()
    fig.add_trace(go.Pie(
        labels=labels,
        values=values,
        marker=dict(colors=colors, line=dict(color=BG, width=3)),
        textinfo="percent",
        textfont=dict(size=16, color="#ffffff", family="Inter, sans-serif"),
        textposition="inside",
        insidetextorientation="auto",
        hole=0.40,
        pull=explode,
        sort=False,
        direction="clockwise",
        rotation=160,
        hovertemplate="%{label}: %{percent}%<extra></extra>",
        showlegend=True,
    ))

    fig.update_layout(
        title=dict(
            text="Mobile OS Market: Mainstream vs Alternative",
            font=dict(size=16, color=TEXT_PRIM, family="Inter, sans-serif"),
            x=0.5, y=0.97,
        ),
        height=400,
        margin=dict(l=30, r=30, t=60, b=100),
        legend=dict(
            orientation="h",
            y=-0.12,
            x=0.5,
            xanchor="center",
            yanchor="top",
            font=dict(size=12, color=TEXT_SEC),
            bgcolor="rgba(0,0,0,0)",
        ),
    )
    save(fig, "customization-bar2.html")


# ── Entry Point ───────────────────────────────────────────────────────────────

def main() -> None:
    print("Generating charts (matching original post style)\u2026")
    graph_android_linux()
    graph_customization_pie1()
    graph_customization_pie2()
    print("Done.")


if __name__ == "__main__":
    main()
