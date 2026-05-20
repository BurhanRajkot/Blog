import plotly.graph_objects as go
import plotly.io as pio

# ── Color Palette ─────────────────────────────────────────────────────────────
BG          = "#000000"
GRID        = "#222222"
AXIS_LINE   = "#333333"
TEXT_WHITE  = "#ffffff"
TEXT_GREY   = "#a0a0a0"
BLUE        = "#4da6ff"
ACCENT      = "#ff6b6b"

# ── Blog Template ─────────────────────────────────────────────────────────────
BLOG_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        paper_bgcolor=BG,
        plot_bgcolor=BG,
        font=dict(family="Inter, -apple-system, sans-serif", color=TEXT_WHITE, size=13),
        title=dict(font=dict(size=20, color=TEXT_WHITE), x=0, xanchor="left"),
        xaxis=dict(
            gridcolor=GRID,
            linecolor=AXIS_LINE,
            tickcolor=AXIS_LINE,
            tickfont=dict(color=TEXT_GREY),
            title_font=dict(color=TEXT_GREY),
            showgrid=True,
            zeroline=False,
        ),
        yaxis=dict(
            gridcolor=GRID,
            linecolor=AXIS_LINE,
            tickcolor=AXIS_LINE,
            tickfont=dict(color=TEXT_GREY),
            title_font=dict(color=TEXT_GREY),
            showgrid=True,
            zeroline=False,
        ),
        legend=dict(
            bgcolor="rgba(0,0,0,0)",
            bordercolor=AXIS_LINE,
            borderwidth=1,
            font=dict(color=TEXT_GREY),
        ),
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor="#111111",
            bordercolor=AXIS_LINE,
            font=dict(color=TEXT_WHITE),
        ),
        margin=dict(l=60, r=30, t=60, b=60),
    )
)
pio.templates["blog"] = BLOG_TEMPLATE
pio.templates.default = "blog"

# ── Example: Line Chart ───────────────────────────────────────────────────────
months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]
perf   = [112, 145, 133, 178, 202, 195]
bench  = [100, 118, 125, 140, 158, 170]

fig = go.Figure()

fig.add_trace(go.Scatter(
    x=months, y=perf,
    mode="lines+markers",
    name="My Result",
    line=dict(color=BLUE, width=2),
    marker=dict(size=5, color=BLUE),
))

fig.add_trace(go.Scatter(
    x=months, y=bench,
    mode="lines",
    name="Baseline",
    line=dict(color=TEXT_GREY, width=1.5, dash="dot"),
))

fig.update_layout(
    title="Performance vs Baseline",
    xaxis_title="Month",
    yaxis_title="Score",
)

fig.write_html(
    "test_plotly.html",
    include_plotlyjs="cdn",
    full_html=True,
    config={"displayModeBar": False},
)
print("Done — open test_plotly.html in your browser.")
