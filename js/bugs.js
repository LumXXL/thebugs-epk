// Swooping bug animation — Motion-powered sine-wave paths, click-to-splat,
// Web Audio squish sound, session-persistent splats, viewport counter.

const BUG_SRCS = ['Graphics/liam-bug.png', 'Graphics/nicole-bug.png'];
const MAX_BUGS   = 2;
const SPLAT_HALF = 45; // half of 90px splat SVG

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
    scheduleNext(3000 + Math.random() * 2500);
  }, delay);
}

// ─── Spawn a single bug ───────────────────────────────────────────────────────

function spawnBug() {
  const layer = document.getElementById('bug-layer');
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Direction: left-to-right or right-to-left
  const ltr  = Math.random() > 0.5;
  const startX = ltr ? -80 : vw + 80;
  const endX   = ltr ? vw + 80 : -80;

  // Vertical: random start position with slight overall drift
  const startY = 80 + Math.random() * (vh - 160);
  const endY   = startY + (Math.random() - 0.5) * 140;

  // Per-bug variation in speed, swing height, oscillation frequency
  const duration  = 6 + Math.random() * 4;        // 6–10s
  const amplitude = 55 + Math.random() * 70;      // vertical swing px
  const frequency = 1.8 + Math.random() * 1.5;   // sine cycles across trip

  // Build dense keyframe arrays for a smooth sine-wave arc
  const STEPS = 60;
  const xFrames = [];
  const yFrames = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    xFrames.push(startX + (endX - startX) * t);
    yFrames.push(startY + (endY - startY) * t + Math.sin(t * Math.PI * frequency) * amplitude);
  }

  // Build DOM element
  const bug = document.createElement('div');
  bug.className = 'bug';
  bug.style.left = '0';
  bug.style.top  = '0';

  const img = document.createElement('img');
  img.src = BUG_SRCS[Math.floor(Math.random() * BUG_SRCS.length)];
  img.alt = '';
  img.setAttribute('draggable', 'false');
  if (!ltr) img.style.transform = 'scaleX(-1)'; // flip for RTL travel

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

  // Animate along the sine-wave path (Motion individual transforms)
  bug._anim = motionAnimate(bug, { x: xFrames, y: yFrames }, { duration, ease: 'linear' });

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
