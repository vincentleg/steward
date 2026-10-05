/** A persistent view of observable Steward activity. No network, storage or provider access. */
export function createIntelligenceCore(host) {
  if (!host) return { update() {}, destroy() {} };
  host.innerHTML =
    '<canvas aria-hidden="true"></canvas><span class="core-caption">STEWARD IS WATCHING</span>';
  const canvas = host.querySelector('canvas'),
    ctx = canvas.getContext('2d'),
    caption = host.querySelector('span');
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const profiles = {
    stable: [0.12, 0.25, 3],
    observing: [0.2, 0.32, 3],
    signal: [0.6, 0.45, 4],
    deviation: [0.65, 0.55, 4],
    modeling: [0.8, 0.6, 7],
    simulating: [0.9, 0.7, 8],
    evaluating: [0.55, 0.5, 6],
    'needs-you': [0.15, 0.3, 2],
    acting: [0.65, 0.55, 5],
    verifying: [0.4, 0.4, 4],
    resolved: [0.15, 0.25, 3],
  };
  const labels = {
    stable: 'STEWARD IS WATCHING',
    observing: 'OBSERVING · NO ACTION',
    signal: 'SIGNAL RECEIVED',
    deviation: 'DEVIATION DETECTED',
    modeling: 'UNDERSTANDING IMPACT',
    simulating: 'COMPARING FUTURES',
    evaluating: 'EVALUATING WORTH TO YOU',
    'needs-you': 'CLARITY · YOUR DECISION',
    acting: 'ACTING WITHIN AUTHORITY',
    verifying: 'VERIFYING THE OUTCOME',
    resolved: 'OUTCOME RESTORED · WATCHING',
  };
  let target = { state: 'stable', consequences: 0, futures: 0, uncertainty: 0 },
    energy = 0.12,
    richness = 3,
    raf = 0,
    last = 0,
    phase = 0,
    width = 0,
    height = 0,
    visible = true,
    destroyed = false,
    pointer = { x: 0, y: 0 },
    pulse = 0;
  function size() {
    const r = host.getBoundingClientRect(),
      d = Math.min(devicePixelRatio || 1, 1.5);
    width = r.width;
    height = r.height - 24;
    canvas.width = Math.round(width * d);
    canvas.height = Math.round(height * d);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(d, 0, 0, d, 0, 0);
    draw();
  }
  function draw() {
    if (!width || !height) return;
    const t = phase,
      cx = width / 2 + pointer.x * 3,
      cy = height / 2 + pointer.y * 3,
      unit = Math.min(width, height) * 0.37;
    ctx.clearRect(0, 0, width, height);
    // Continuous asymmetric contour sheets, not rotating circles or particles.
    for (let layer = 0; layer < 10; layer++) {
      const radius = unit * (0.5 + layer * 0.056),
        alpha = 0.18 + (layer % 3) * 0.09;
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        const wave =
          Math.sin(a * 3 + t * 0.27 + layer * 0.34) * (0.085 + energy * 0.035) +
          Math.cos(a * 5 - t * 0.19 + layer * 0.39) * 0.024 +
          Math.sin(a * 2 + t * 0.11) * 0.045 +
          Math.sin(a * 7 + t * 0.4) * 0.012 * (target.uncertainty || 0);
        const r = radius * (1 + wave),
          tilt = Math.sin(t * 0.13 + layer * 0.23) * 0.1;
        const fold = Math.sin(a * 2 + layer * 0.18 + t * 0.13);
        const x = cx + Math.cos(a) * r + fold * unit * 0.095;
        const y =
          cy +
          Math.sin(a) * r * (0.76 + tilt) +
          Math.cos(a * 3 - t * 0.1 + layer * 0.13) * unit * 0.055;
        if (!i) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      const g = ctx.createLinearGradient(cx - unit, cy - unit, cx + unit, cy + unit);
      g.addColorStop(0, `rgba(38,81,177,${alpha})`);
      g.addColorStop(0.45, `rgba(63,111,233,${alpha + 0.15})`);
      g.addColorStop(0.75, `rgba(108,103,180,${alpha * 0.75})`);
      g.addColorStop(1, `rgba(108,168,205,${alpha})`);
      ctx.strokeStyle = g;
      ctx.lineWidth = layer % 4 === 0 ? 1.5 : 0.7;
      ctx.stroke();
    }
    // State richness controls trajectories. Needs-you converges to a single focal path.
    const paths = Math.round(richness);
    for (let j = 0; j < paths; j++) {
      ctx.beginPath();
      for (let k = 0; k <= 100; k++) {
        const u = k / 100,
          a = u * Math.PI * 2 + j * 2.399;
        const radius = unit * (0.18 + 0.6 * Math.sin(u * Math.PI));
        const x = cx + Math.cos(a + t * 0.035) * radius;
        const y =
          cy + Math.sin(a) * radius * 0.58 + Math.sin(u * Math.PI * 2 + t * 0.2 + j) * unit * 0.07;
        if (!k) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(${j % 2 ? '81,96,188' : '48,99,199'},${0.16 + energy * 0.14})`;
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
    const inward = ['verifying', 'signal', 'deviation', 'modeling'].includes(target.state);
    if (pulse > 0.005) {
      const r = unit * (inward ? 0.35 + pulse * 0.95 : 1.3 - pulse * 0.95);
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.87, 0, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(64,115,205,${pulse * 0.3})`;
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
    // Small breathing nucleus, with restrained depth rather than bloom.
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * 0.38);
    glow.addColorStop(0, 'rgba(58,100,192,.15)');
    glow.addColorStop(1, 'rgba(85,130,200,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - unit * 0.4, cy - unit * 0.4, unit * 0.8, unit * 0.8);
    ctx.beginPath();
    ctx.ellipse(
      cx,
      cy,
      unit * (0.05 + 0.006 * Math.sin(t * 0.8)),
      unit * 0.035,
      0.3,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(49,94,190,.72)';
    ctx.fill();
  }
  function frame(ms) {
    raf = 0;
    if (destroyed || document.hidden || !visible || media.matches) return;
    if (ms - last >= 1000 / 30) {
      const dt = Math.min((ms - last) / 1000, 0.05);
      last = ms;
      phase += dt;
      const p = profiles[target.state] || profiles.stable;
      energy += (p[0] - energy) * 0.045;
      const focused = target.state === 'needs-you';
      const branches = target.state === 'simulating' ? Math.min(target.futures || 0, 6) * 0.25 : 0;
      richness +=
        (Math.min(
          p[2] + (focused ? 0 : Math.min(target.consequences || 0, 12) * 0.08 + branches),
          9,
        ) -
          richness) *
        0.04;
      pulse *= 0.965;
      draw();
    }
    raf = requestAnimationFrame(frame);
  }
  function schedule() {
    cancelAnimationFrame(raf);
    raf = 0;
    if (!destroyed && !document.hidden && visible && !media.matches) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else draw();
  }
  function motion() {
    schedule();
  }
  function visibility() {
    schedule();
  }
  function restore() {
    size();
    schedule();
  }
  function move(e) {
    const r = host.getBoundingClientRect();
    pointer.x = (e.clientX - r.left) / r.width - 0.5;
    pointer.y = (e.clientY - r.top) / r.height - 0.5;
    if (media.matches) draw();
  }
  function leave() {
    pointer = { x: 0, y: 0 };
    if (media.matches) draw();
  }
  const resize = new ResizeObserver(size);
  resize.observe(host);
  const intersection = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    schedule();
  });
  intersection.observe(host);
  host.addEventListener('pointermove', move);
  host.addEventListener('pointerleave', leave);
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('pageshow', restore);
  media.addEventListener('change', motion);
  size();
  schedule();
  return {
    update(next = { state: 'stable' }) {
      if (next.state !== target.state || next.signalId !== target.signalId) pulse = 1;
      target = next;
      host.dataset.state = next.state;
      caption.textContent = labels[next.state] || labels.stable;
      if (media.matches) {
        energy = (profiles[next.state] || profiles.stable)[0];
        richness = (profiles[next.state] || profiles.stable)[2];
        draw();
      }
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pageshow', restore);
      media.removeEventListener('change', motion);
      host.removeEventListener('pointermove', move);
      host.removeEventListener('pointerleave', leave);
    },
  };
}
