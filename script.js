"use strict";

// ---------------------------------------------------------------------------
// Gravity Lab — a pocket universe you control with your finger.
// Every dot is a real body: they all pull on each other, and when two
// collide they merge into one bigger body (momentum is conserved).
// ---------------------------------------------------------------------------

const canvas = document.getElementById("space");
const ctx = canvas.getContext("2d");

const G = 1;            // gravitational constant (tuned for fun, not physics class)
const SOFTEN = 25;      // avoids divide-by-zero when bodies get very close
const DRAG_SCALE = 0.03; // how fast a flung body moves per pixel of drag
const MAX_BODIES = 240; // keeps phones fast

let W = 0;
let H = 0;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Fresh background so resizing does not leave trails hanging
  ctx.fillStyle = "#06081a";
  ctx.fillRect(0, 0, W, H);
}
window.addEventListener("resize", resize);
resize();

// ----------------------------- bodies --------------------------------------

let bodies = [];

function radiusFor(mass) {
  return Math.max(2.2, Math.cbrt(mass) * 1.7);
}

function makeBody(x, y, vx, vy, mass, hue) {
  return { x, y, vx, vy, m: mass, r: radiusFor(mass), hue };
}

// ----------------------------- galaxy preset -------------------------------

function seedGalaxy() {
  bodies = [];
  const cx = W / 2;
  const cy = H / 2;
  const sunMass = 1400;
  bodies.push(makeBody(cx, cy, 0, 0, sunMass, 45));

  // Rings of planets, evenly spaced so nobody starts on top of a neighbour.
  // Light planets barely disturb each other, so the galaxy lives for minutes.
  const maxR = Math.min(W, H) * 0.46;
  const rings = 6;
  for (let ring = 0; ring < rings; ring++) {
    const dist = 60 + (maxR - 60) * (ring / (rings - 1));
    const perRing = 5 + Math.floor(ring / 2); // more planets further out
    const offset = Math.random() * Math.PI * 2; // rotate each ring randomly
    for (let k = 0; k < perRing; k++) {
      const angle = offset + (k / perRing) * Math.PI * 2;
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist;

      // Speed for a (roughly) circular orbit around the sun: v = sqrt(G*M/r)
      const speed = Math.sqrt((G * sunMass) / dist) * (0.99 + Math.random() * 0.02);
      // Tangential direction (perpendicular to the line towards the sun)
      const vx = -Math.sin(angle) * speed;
      const vy = Math.cos(angle) * speed;

      // Light enough that planets barely tug on each other (the sun rules),
      // but they still merge with a satisfying flash when they do collide.
      const mass = 0.3 + Math.random() * 0.3;
      // Cool blues/purples with the occasional warm rebel
      const hue = Math.random() < 0.85 ? 190 + Math.random() * 110 : 20 + Math.random() * 30;
      bodies.push(makeBody(x, y, vx, vy, mass, hue));
    }
  }
}

// ----------------------------- physics --------------------------------------

function step() {
  const n = bodies.length;

  // 1. Compute accelerations from every pair (O(n^2) but n stays small)
  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d2 = dx * dx + dy * dy + SOFTEN;
      const inv = 1 / Math.sqrt(d2);
      const fx = (dx * inv) / d2; // direction / distance^2, times G*m applied later
      const fy = (dy * inv) / d2;
      a.vx += fx * G * b.m;
      a.vy += fy * G * b.m;
      b.vx -= fx * G * a.m;
      b.vy -= fy * G * a.m;
    }
  }

  // 2. Move everything
  for (const body of bodies) {
    body.x += body.vx;
    body.y += body.vy;
  }

  // 3. Merge bodies that touch: the bigger one absorbs the smaller one
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      if (dx * dx + dy * dy <= (a.r + b.r) * (a.r + b.r)) {
        const total = a.m + b.m;
        // Conserve momentum and take the centre of mass
        const keep = a.m >= b.m ? a : b;
        const gone = a.m >= b.m ? b : a;
        keep.vx = (a.vx * a.m + b.vx * b.m) / total;
        keep.vy = (a.vy * a.m + b.vy * b.m) / total;
        keep.x = (a.x * a.m + b.x * b.m) / total;
        keep.y = (a.y * a.m + b.y * b.m) / total;
        keep.m = total;
        keep.r = radiusFor(total);
        bodies.splice(bodies.indexOf(gone), 1);
        addFlash(gone.x, gone.y, gone.hue);
        j = i; // re-check this slot against the rest
      }
    }
  }

  // 4. Remove runaways so the list stays small and fast
  const margin = Math.max(W, H);
  bodies = bodies.filter(
    (b) => b.x > -margin && b.x < W + margin && b.y > -margin && b.y < H + margin
  );
}

// ----------------------------- rendering ------------------------------------

// Short-lived flashes where bodies merged
let flashes = [];

function addFlash(x, y, hue) {
  flashes.push({ x, y, hue, life: 1 });
  if (flashes.length > 40) flashes.shift();
}

function drawFlashes() {
  flashes = flashes.filter((f) => f.life > 0);
  for (const f of flashes) {
    const r = 6 + (1 - f.life) * 26;
    ctx.beginPath();
    ctx.strokeStyle = "hsla(" + f.hue + ", 95%, 75%, " + (f.life * 0.8).toFixed(3) + ")";
    ctx.lineWidth = 2;
    ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
    ctx.stroke();
    f.life -= 0.06;
  }
}

// A soft field of background stars, redrawn every frame
const stars = [];
function makeStars() {
  stars.length = 0;
  const count = Math.round((W * H) / 9000);
  for (let i = 0; i < count; i++) {
    stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.4 + 0.3 });
  }
}
makeStars();
window.addEventListener("resize", makeStars);

function drawBody(body) {
  const { x, y, r, hue } = body;
  // Outer glow
  ctx.beginPath();
  ctx.fillStyle = "hsla(" + hue + ", 90%, 65%, 0.18)";
  ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
  ctx.fill();
  // Core
  ctx.beginPath();
  ctx.fillStyle = "hsla(" + hue + ", 95%, 70%, 1)";
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

let time = 0;

function render() {
  // Fade instead of clear: this is what creates the glowing trails
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = "rgba(6, 8, 26, 0.16)";
  ctx.fillRect(0, 0, W, H);

  ctx.globalCompositeOperation = "lighter";

  for (const s of stars) {
    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }

  for (const body of bodies) drawBody(body);

  drawFlashes();

  // Aiming preview while the finger is down
  if (drag.active) {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(220, 228, 255, 0.9)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(drag.x0, drag.y0);
    ctx.lineTo(drag.x, drag.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.strokeStyle = "rgba(220, 228, 255, 0.9)";
    ctx.fillStyle = "rgba(120, 140, 255, 0.35)";
    ctx.arc(drag.x0, drag.y0, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

// ----------------------------- input ----------------------------------------

const drag = { active: false, x0: 0, y0: 0, x: 0, y: 0 };

function pointerPos(event) {
  return { x: event.clientX, y: event.clientY };
}

canvas.addEventListener("pointerdown", (event) => {
  event.preventDefault();
  const p = pointerPos(event);
  drag.active = true;
  drag.x0 = p.x;
  drag.y0 = p.y;
  drag.x = p.x;
  drag.y = p.y;
});

canvas.addEventListener("pointermove", (event) => {
  if (!drag.active) return;
  event.preventDefault();
  const p = pointerPos(event);
  drag.x = p.x;
  drag.y = p.y;
});

function endDrag(event) {
  if (!drag.active) return;
  if (event.cancelable) event.preventDefault();
  drag.active = false;

  const dx = drag.x - drag.x0;
  const dy = drag.y - drag.y0;
  const vx = dx * DRAG_SCALE;
  const vy = dy * DRAG_SCALE;

  // A plain tap (no drag) just drops the planet in place
  const mass = 6 + Math.random() * 10;
  const hue = 190 + Math.random() * 110;

  if (bodies.length >= MAX_BODIES) {
    // Drop the oldest small body instead of growing forever
    let smallest = 0;
    for (let i = 1; i < bodies.length; i++) {
      if (bodies[i].m < bodies[smallest].m) smallest = i;
    }
    bodies.splice(smallest, 1);
  }
  bodies.push(makeBody(drag.x0, drag.y0, vx, vy, mass, hue));
}

canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", () => {
  drag.active = false;
});

// ----------------------------- buttons --------------------------------------

document.getElementById("btn-galaxy").addEventListener("click", seedGalaxy);
document.getElementById("btn-clear").addEventListener("click", () => {
  bodies = [];
});

// ----------------------------- main loop ------------------------------------

function loop() {
  step();
  render();
  time += 1;
  requestAnimationFrame(loop);
}

seedGalaxy();
loop();
