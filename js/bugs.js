// Swooping bug animation — Motion-powered sine-wave paths, click-to-splat,
// Web Audio squish sound, session-persistent splats, viewport counter.

const BUG_SRCS  = ['Graphics/liam-bug.png', 'Graphics/nicole-bug.png'];
const MAX_BUGS  = 2;
const SPLAT_HALF = 45; // half of 90px splat SVG
const BUG_SIZE  = 96;  // matches .bug CSS width/height

let motionAnimate = null;
let activeBugs    = 0;
let squashCount   = 0;
let spawnTimer    = null;
let bookerInView  = false;

export async function initBugs() {
  // Respect prefers-reduced-motion — no bugs at all
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // Load Motion library from CDN
  try {
    const mod = await import('https://cdn.jsdelivr.net/npm/motion@11/+esm');
    motionAnimate = mod.animate;
  } catch (e) {
    // CDN unavailable — degrade silently, rest of page unaffected
    return;
  }

  // Watch booker section — pause spawning while it's visible
  const booker = document.querySelector('.bookers');
  if (booker) {
    new IntersectionObserver(entries => {
      bookerInView = entries[0].isIntersecting;
    }, { threshold: 0.1 }).observe(booker);
  }

  // Reset button
  document.getElementById('bug-reset').addEventListener('click', () => {
    document.querySelectorAll('.splat').forEach(el => el.remove());
    squashCount = 0;
    document.getElementById('squash-count').textContent = 0;
  });

  // Start the spawn loop
  scheduleNext(1800);
}

// ─── Spawn loop ───────────────────────────────────────────────────────────────

function scheduleNext(delay) {
  clearTimeout(spawnTimer);
  spawnTimer = setTimeout(() => {
    if (!bookerInView && activeBugs < MAX_BUGS) spawnBug();
    scheduleNext(3500 + Math.random() * 3000);
  }, delay);
}

// ─── Spawn a single bug ───────────────────────────────────────────────────────

function spawnBug() {
  const layer = document.getElementById('bug-layer');
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const margin = BUG_SIZE + 20; // start/end fully off-screen

  // Pick a random edge to enter from (weighted to prefer left/right — more natural)
  // 0=left, 1=right, 2=top, 3=bottom
  const edgeRoll = Math.random();
  const edge = edgeRoll < 0.35 ? 0 : edgeRoll < 0.70 ? 1 : edgeRoll < 0.85 ? 2 : 3;

  let startX, startY, endX, endY;
  const safeV = (size) => size * 0.1 + Math.random() * size * 0.8; // 10–90% of axis

  switch (edge) {
    case 0: // left → right
      startX = -margin;    endX = vw + margin;
      startY = safeV(vh);  endY = safeV(vh);
      break;
    case 1: // right → left
      startX = vw + margin; endX = -margin;
      startY = safeV(vh);   endY = safeV(vh);
      break;
    case 2: // top → bottom
      startY = -margin;    endY = vh + margin;
      startX = safeV(vw);  endX = safeV(vw);
      break;
    case 3: // bottom → top
      startY = vh + margin; endY = -margin;
      startX = safeV(vw);   endX = safeV(vw);
      break;
  }

  // Travel vector and its perpendicular (for sine-wave offset direction)
  const dx   = endX - startX;
  const dy   = endY - startY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx   = -dy / dist; // perpendicular unit vector
  const ny   =  dx / dist;

  // Per-bug variation
  const duration     = 10 + Math.random() * 8;       // 10–18s (was 6–10s)
  const amplitude    = 80 + Math.random() * 100;      // 80–180px swing (was 55–125px)
  const frequency    = 1.4 + Math.random() * 1.8;    // 1.4–3.2 sine cycles
  const phaseOffset  = Math.random() * Math.PI * 2;  // random starting phase

  // Build keyframe arrays — position + rotation following actual travel direction
  const STEPS = 60;
  const xFrames   = [];
  const yFrames   = [];
  const rotFrames = [];

  for (let i = 0; i <= STEPS; i++) {
    const t    = i / STEPS;
    const wave = Math.sin(t * Math.PI * frequency + phaseOffset) * amplitude;
    const cx   = startX + dx * t + nx * wave;
    const cy   = startY + dy * t + ny * wave;
    xFrames.push(cx);
    yFrames.push(cy);

    // Rotation: point bug in the direction it's actually moving this frame
    const t2    = Math.min(1, (i + 0.5) / STEPS);
    const wave2 = Math.sin(t2 * Math.PI * frequency + phaseOffset) * amplitude;
    const fx    = startX + dx * t2 + nx * wave2;
    const fy    = startY + dy * t2 + ny * wave2;
    const localAngle = Math.atan2(fy - cy, fx - cx) * (180 / Math.PI);
    rotFrames.push(localAngle);
  }

  // Build DOM element
  const bug = document.createElement('div');
  bug.className  = 'bug';
  bug.style.left = '0';
  bug.style.top  = '0';

  const img = document.createElement('img');
  img.src = BUG_SRCS[Math.floor(Math.random() * BUG_SRCS.length)];
  img.alt = '';
  img.setAttribute('draggable', 'false');

  bug.appendChild(img);
  layer.appendChild(bug);
  activeBugs++;

  // Click → splat
  bug.addEventListener('click', e => {
    if (bug._splatted) return;
    bug._splatted = true;
    try { if (bug._anim) bug._anim.stop(); } catch (_) {}
    bug.remove();
    activeBugs = Math.max(0, activeBugs - 1);
    doSplat(e.clientX, e.clientY);
  });

  // Animate along the sine-wave path with live rotation
  bug._anim = motionAnimate(
    bug,
    { x: xFrames, y: yFrames, rotate: rotFrames },
    { duration, ease: 'linear' }
  );

  // Natural exit — clean up after bug leaves screen
  bug._anim.then(() => {
    if (!bug._splatted && bug.parentNode) {
      bug.remove();
      activeBugs = Math.max(0, activeBugs - 1);
    }
  }).catch(() => {});
}

// ─── Splat ───────────────────────────────────────────────────────────────────

function doSplat(x, y) {
  playSquish();

  const layer = document.getElementById('bug-layer');
  const splat = document.createElement('img');
  splat.src = 'splat.svg';
  splat.className = 'splat';
  splat.alt = '';
  splat.setAttribute('aria-hidden', 'true');

  // Position centered on click point
  splat.style.left = (x - SPLAT_HALF) + 'px';
  splat.style.top  = (y - SPLAT_HALF) + 'px';
  layer.appendChild(splat);

  // Pop in with slight overshoot, random rotation
  const rot = Math.random() * 360;
  motionAnimate(
    splat,
    { scale: [0, 1.3, 1], rotate: [rot - 25, rot] },
    { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
  );

  squashCount++;
  document.getElementById('squash-count').textContent = squashCount;
}

// ─── Squish sound (Web Audio API) ────────────────────────────────────────────

function playSquish() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const dur = 0.22;

    // Filtered white noise burst — sounds like a wet splat
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf    = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      // Noise amplitude tapers off quickly (exponential decay envelope)
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.4);
    }

    const src    = ctx.createBufferSource();
    src.buffer   = buf;

    const filter = ctx.createBiquadFilter();
    filter.type  = 'lowpass';
    filter.frequency.setValueAtTime(900, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.55, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
    src.stop(ctx.currentTime + dur);
  } catch (_) {
    // AudioContext not available — fail silently
  }
}
