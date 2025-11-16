---
title: 'Unity 20th Anniversary Game Jam – My Experience'
description: 'My rushed, chaotic, and fun experience making a Unity endless game for the 20th Anniversary Game Jam.'
date: 2025-11-10
draft: false
categories: ['Game Dev']
tags: ['unity', 'game jam', 'endless runner', 'gamedev']
---

# Welcome to the Game Dev

So Unity had its big **20th Anniversary Game Jam**, and from what I saw, around **3k people** joined. Basically, everyone who wants to be a game dev — or has anything to do with development — seemed to be a part of it.

When I first heard about this, I was very confused, because except for **basic scripting** and some **Cinemachine stuff**, I don’t really know much. So I did what everyone does: I used **GPT** to help with the steps and planning.

All the **core code and logic was written by me**, and then I fed it into AI to refine, clean up, and improve it.

The jam was a **3-day Game Jam**, and on the day it actually started, I thought it was supposed to start the _next_ day. So yes, I wasted **one full day**. Ironically, that same day I was working on **making this blog** and putting stuff on **GitHub**, which is crazy in itself.

The theme was **“Timeless”**, and I didn’t really know what to do with that. The only endless games I’ve really played are **Subway Surfers** and the **no-internet dinosaur game**, so I had no idea how endless runners truly work under the hood.

So I did a quick GPT search about the **math and logic** behind building an endless game, and these were my initial plans:

**SPOILER:** I was not able to complete any of them. 😅

1. **Make 4 core levels**, then use a block/chunk system and integrate some AI where all the main prefabs would be sent, and further levels would be created by the AI itself.
2. **Make the game feel extremely long** by giving it the _illusion_ of being infinite, rather than actually making it infinite.
3. **Procedurally generate every single level** using AI, just by using prefabs.

These were the 3 roads I could take to finish the task. The one I _really_ wanted to do was **[1]**, but I wasn’t able to get the code and logic ready in time for submission. So I went with the **2nd option**, which I finished at the last minute and made “good enough” for myself.

---

## The Game Itself

The game is a **space game** where you control a **spaceship**. As a player, you can move:

- **Left**
- **Right**
- **Upwards** (using a thrust control system)

I also added a **coin system** and a **fuel system**:

- Every **10 seconds**, the fuel decreases.
- To keep moving, the player needs to **collect fuel packs**.
- If you don’t get fuel in time, you basically lose your ability to continue.

I used a **vector dot system** (dot product) to check if the ship has **crashed or landed safely**. This is also used for the **landing pads**:

- There are **different landing pads** (small and big).
- For **small landing pads**, the points **multiply more** depending on how accurate your landing is.
- For **bigger landing pads**, the points stay the same.

I wanted to play a lot more with landing pad variations, but I simply **ran out of time**. I was **copy-pasting prefabs** near the end, so going back and editing everything cleanly wasn’t really possible.

So the **core loop** of the game is:

- You **fly** the spaceship
- You **collect coins** → score increases
- You **pick up fuel** → you get more time to keep playing
- Levels get **harder and harder**
- Landing pads **change** and you have to carefully **maneuver and land**
- Depending on where you land, the **score gets multiplied**, and this is shown as text on top of each “bench” (landing zone) so you know how your score changes.

---

## What I Could Not Add

These are the things I really wanted but couldn’t finish in time:

1. **A weapon system** that continuously fires bullets, forcing the player to **dodge** them.
2. A **weight system**, where the rocket can pick up some cargo/weight and then has to maneuver with that extra mass and still complete the level.
3. A proper **level system** where it goes cleanly from one level to another.
   I had thought of this _before_ the theme “endless” came out, so I dropped it later. Not a total loss, but still something I wanted.
4. A proper **UI**.
   I think this is my **biggest loss** in this project:

   - No proper **front screen** or **end screen**
   - No proper **points UI** (like showing text popping up when you collect something)
   - No **crash UI** or game over UI

   I completely forgot about these during production, and near the end it was too late to build them nicely.

Right now, all the **points and debug info** are working in the **Unity Console**, but not in the on-screen UI. So technically the logic works, but visually it’s not ready for players. My last-minute resort was really bad, so I don’t even want to talk about that here.

When I complete the game properly, I’ll post the **link here** and update the blog with an **itch.io page**.

---

## What I Learned

What I learned from this Game Jam is that I **love game dev**.

With all these new AI tools, I think it’s amazing to use them for **art**, for **code**, and for **learning**. For this game, I **wrote the code myself**, as I said earlier, because I really want to **build my logic** and **coding skills** instead of just copy–pasting answers.

The plan is:

- The game will be **live on itch.io** in about **5 days** (once I fix the most important things).
- I’ll keep **improving** the game.
- The **final version** is something I want to release in about **15–20 days** — let’s see if I actually manage to finish what I originally wanted.

There was a lot to learn from this project, and this post is just about my **Game Jam / hackathon experience**.

Over the next **15 days**, I also want to publish a **dev diary**, documenting each day:

- What I learned
- What I managed to complete
- What I couldn’t figure out

Basically, a complete **15-day diary** that I’ll publish together with my game.

---

Thank you for reading, and have a nice day. 🙏

request-ca-depache
