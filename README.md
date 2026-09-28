# Gravity Lab

A pocket universe you carry on your phone. Every dot is a real body with mass,
and they all pull on each other with Newtonian gravity — orbits, chaos, and
collisions emerge from just a few lines of math.

Built as a mobile-first web toy: no installs, no desktop, runs entirely in the
browser.

## How to play

- **Tap anywhere** — a new planet appears and immediately starts falling towards whatever is nearby.
- **Drag and release** — slingshot a planet in the direction you dragged.
- **New Galaxy** — respawn a sun with six rings of orbiting planets.
- **Clear** — wipe the universe and start from a blank, starless void.

Things to try: create a planet and let it slingshot around the sun; smash two
planets into each other and watch them merge into one bigger body; fling a
planet fast enough that it escapes the galaxy forever.

## What's inside

- `index.html` — page structure (a full-screen canvas and the control bar)
- `style.css` — the dark-space theme and glowing control buttons
- `script.js` — everything that moves: the N-body physics engine, the
  collision-and-merge rules, the trail rendering, and the touch input

## The physics (short version)

Every frame, every body pulls every other body with an inverse-square force
(softened slightly so nothing divides by zero). Bodies that touch merge into
one, conserving momentum — that's why big survivors slowly get bigger. The
glowing trails are just the previous frames never quite fading away.

Built with plain HTML, CSS, and JavaScript. No frameworks, no build step, no
server.
