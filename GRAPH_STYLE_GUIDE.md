# Graph & Visual Style Guide: Minimal Professional Plotly

> Single source of truth for all charts and data visuals on this blog.
> Goal: **clean, readable, professional** — black background, precise data, zero noise.

---

## 0. The Vibe

Think Bloomberg terminal. Think Apple Keynote. Think engineering presentation.

- **Black** background. Always.
- **White** text. Always legible.
- Subtle grid. Never overpowering.
- Data is the focus. Decoration is zero.

---

## 1. The Color Palette

| Role            | Value       | Usage                              |
|-----------------|-------------|------------------------------------|
| Background      | `#0f172a`   | Plot & paper bg (matches website)  |
| Primary Text    | `#f8fafc`   | Titles, axis labels, tick text     |
| Secondary Text  | `#cbd5e1`   | Annotations, secondary labels      |
| Grid Lines      | `#1e293b`   | Subtle horizontal/vertical guides  |
| Data — Indigo   | `#6366f1`   | Primary series (matches blog accent)|
| Data — Teal     | `#14b8a6`   | Secondary series / positive values  |
| Data — Accent   | `#f59e0b`   | Highlight / alert values only      |

No neons. No gradients. No more than 2–3 data colors per chart.

---

## 2. The Plotly Standard

Use `plotly.graph_objects` for all charts. Configure via a shared template so every chart is consistent.

```python
import plotly.graph_objects as go
import plotly.io as pio

BLOG_TEMPLATE = go.layout.Template(
    layout=go.Layout(
        paper_bgcolor="#0f172a",
        plot_bgcolor="#0f172a",
        font=dict(family="Inter, -apple-system, sans-serif", color="#f8fafc", size=13),
        title=dict(font=dict(size=20, color="#f8fafc"), x=0, xanchor="left"),
        xaxis=dict(
            gridcolor="#1e293b",
            linecolor="#334155",
            tickcolor="#334155",
            tickfont=dict(color="#cbd5e1"),
            title_font=dict(color="#cbd5e1"),
            showgrid=True,
            zeroline=False,
        ),
        yaxis=dict(
            gridcolor="#1e293b",
            linecolor="#334155",
            tickcolor="#334155",
            tickfont=dict(color="#cbd5e1"),
            title_font=dict(color="#cbd5e1"),
            showgrid=True,
            zeroline=False,
        ),
        legend=dict(
            bgcolor="rgba(0,0,0,0)",
            bordercolor="#334155",
            borderwidth=1,
            font=dict(color="#cbd5e1"),
        ),
        hovermode="x unified",
        hoverlabel=dict(
            bgcolor="#1e293b",
            bordercolor="#334155",
            font=dict(color="#f8fafc"),
        ),
        margin=dict(l=60, r=40, t=70, b=60),
    )
)

pio.templates["blog"] = BLOG_TEMPLATE
pio.templates.default = "blog"
```

---

## 3. Chart-Type Rules

### Line / Scatter
```python
fig.add_trace(go.Scatter(
    x=x, y=y,
    mode="lines",
    line=dict(color="#6366f1", width=2),
    name="Series Name"
))
```

### Bar Chart
```python
fig.add_trace(go.Bar(
    x=categories, y=values,
    marker_color="#6366f1",
    marker_line_width=0,
))
```

### No Pie Charts
Pie charts are banned. Use a horizontal bar chart instead — it is always more readable.

---

## 4. Typography

- **Font:** `Inter` (matches blog CSS). Fall back to `-apple-system, sans-serif`.
- **Title:** 20px, white, left-aligned (`x=0, xanchor="left"`).
- **Axis labels:** 13px, `#a0a0a0`.
- **Tick labels:** 12px, `#a0a0a0`.

---

## 5. Embedding in Hugo

Export as a self-contained HTML snippet and embed via Hugo's `rawhtml` shortcode:

```python
fig.write_html(
    "static/charts/my_chart.html",
    include_plotlyjs="cdn",
    full_html=False,
    config={"displayModeBar": False}   # hide the Plotly toolbar
)
```

In Markdown:
```
{{< rawhtml >}}
<div style="width:100%;overflow:hidden;">
  {{< include "static/charts/my_chart.html" >}}
</div>
{{< /rawhtml >}}
```

---

## 6. DOs and DON'Ts

### DO
- Slate backgrounds (`#0f172a`) on every chart — matches the blog.
- Keep titles short and descriptive.
- Use `displayModeBar=False` for clean embeds.
- Use `hovermode="x unified"` for all time-series.
- Always set `cliponaxis: False` on bar text to prevent clipping.
- Add `5-10%` padding to axis ranges so labels don't overflow.

### DON'T
- No pie charts.
- No yellow, green, teal, or neon palettes.
- No chart borders or outer frames.
- No Matplotlib. No xkcd mode.
