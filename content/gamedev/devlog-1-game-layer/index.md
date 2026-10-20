+++
title = "Devlog #1: How the Noitas Game Layer Works"
date = 2026-10-20T20:00:00+05:30
draft = false
slug = "devlog-1-game-layer"
description = "Behind the scenes of this blog's game: the runner's physics, sprites drawn as text, the coin economy and how secret levels stay locked."
tags = ["gamedev", "devlog", "javascript", "pixel-art", "hugo"]
categories = ["Game Dev"]
# Secret level: readers unlock this post with coins earned around the site
price = 60
+++

You spent coins to get in here, so this level is about the coins.

This blog is a static Hugo site, but on top of it sits a small game layer: a runner on the title screen, a wallet, an item shop, trophies and locked posts like this one. Here is how each piece works.

## The runner

The title screen is a single `<canvas>` drawn at a quarter of the screen's resolution and scaled up with `image-rendering: pixelated`, so every art pixel is a crisp 4×4 block (3×3 on phones).

The physics are a handful of numbers:

| Value | Number | What it does |
|---|---|---|
| Gravity | 300 px/s² | Pulls the hero down every frame |
| Jump | −118 px/s | Full jump while the button is held |
| Jump cut | −72 px/s | Letting go early clamps upward speed, so taps give short hops |
| Speed | 42 → 100 px/s | The world speeds up the longer you survive |

Variable jump height comes from that cut: when you release the button and the hero is still rising faster than the cut value, the speed is clamped to it. Short tap, small hop; long press, high jump. Crate stacks need the long press.

Obstacles never spawn closer than about 0.85 seconds apart, which is just longer than a full jump's airtime. Every gap is survivable.

## Sprites as text

Every sprite is a list of strings where each character is one pixel and each letter is a colour from the PICO-8 palette:

```js
const CRATE = [
  'NNNNNN',
  'NOOOON',
  'NONNON',
  'NNOONN',
  'NONNON',
  'NOOOON',
  'NNNNNN',
];
```

Skins in the shop are just colour swaps on the hero's letters: the Ninja maps the red cap `R` to black, the Knight maps it to silver. The world icons, trophies and the cursor are generated the same way by a small Python script into SVG files.

## The economy

Coins live in your browser's `localStorage`. You earn them by:

- grabbing coins in the runner (1 each, plus 1 for every 100 points at game over)
- reading a post to the end (25, the first time)
- unlocking trophies (10 each)
- coming back on a new day (5)

Prices are tuned so a couple of decent runs and one cleared post buy a secret level.

## How secret levels stay locked

A post becomes a secret level by adding `price = 60` to its front matter. At build time the post's HTML is base64-encoded into the page instead of being rendered, and the search index only gets its title and description. When you pay, the browser decodes it and drops it into the page. Your purchase is remembered, so it opens straight away next time.

To be clear, this is a game mechanic, not security. Anyone determined can decode the page. It's there to make reading feel like a reward, not to keep anything secret.
