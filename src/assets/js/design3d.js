/* ------------------------------------------------------------------ */
/* KAYTHEBOSS — Hero background: 3D graphic-design tableau            */
/* A hand-rolled 3D projection (no libraries): an extruded "K"        */
/* letterform wireframe slowly turning in dark space, a pen-tool      */
/* bezier curve drawing itself beside it, floating anchor sparkles.   */
/* Pure 2D canvas with manual perspective — respects reduced motion,  */
/* pauses when off-screen, reacts to the pointer.                     */
/* ------------------------------------------------------------------ */
(function () {
  "use strict";

  const canvas = document.getElementById("hero-3d");
  const section = document.getElementById("hero-section");
  if (!canvas || !section) {
    if (section) section.classList.add("hero-anim-failed");
    return;
  }
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    section.classList.add("hero-anim-failed");
    return;
  }

  const PAPER = "#08080a";
  const GOLD = "#f5c842";
  const GOLD_SOFT = "rgba(245, 200, 66, 0.55)";
  const GOLD_DIM = "rgba(245, 200, 66, 0.22)";
  const EDGE_BACK = "rgba(245, 200, 66, 0.14)";
  const FACE = "rgba(20, 16, 8, 0.85)";

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paused = () => document.body.classList.contains("motion-paused");

  /* K letterform outline (unit box, 0..1) */
  const K_PTS = [
    [0.0, 0.0], [0.0, 1.0], [0.34, 1.0], [0.34, 0.64],
    [0.6, 1.0], [0.97, 1.0], [0.62, 0.5], [0.97, 0.0],
    [0.6, 0.0], [0.34, 0.36], [0.34, 0.0]
  ];

  /* Cubic bezier control points (scene space, right of the letter) */
  const BEZ = {
    p0: [0.28, -0.38, 0.05], p1: [0.92, -0.5, 0.28],
    p2: [0.05, 0.5, 0.34], p3: [0.86, 0.4, 0.12]
  };

  /* Floating sparkles (scene space) */
  const SPARKS = [];
  for (let i = 0; i < 16; i++) {
    SPARKS.push({
      x: (Math.random() - 0.5) * 2.6,
      y: (Math.random() - 0.5) * 2.2,
      z: (Math.random() - 0.5) * 1.6,
      ph: Math.random() * Math.PI * 2,
      size: 3 + Math.random() * 6
    });
  }

  let width = 0;
  let height = 0;
  let dpr = 1;
  let cx = 0;
  let cy = 0;
  let tmx = 0;
  let tmy = 0;
  let mx = 0;
  let my = 0;
  let start = performance.now();
  let visible = true;
  let raf = 0;
  let painted = false;
  let scale = 1;

  function resize() {
    const r = section.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.round(r.width * dpr));
    height = Math.max(1, Math.round(r.height * dpr));
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = r.width + "px";
    canvas.style.height = r.height + "px";
    cx = r.width / 2;
    cy = r.height / 2;
    scale = Math.min(r.width, r.height);
  }

  /* ---- tiny 3D engine ---- */
  const FOCAL = 3.4;
  function project(p, ry, rxc) {
    const cY = Math.cos(ry);
    const sY = Math.sin(ry);
    let x = p[0] * cY - p[2] * sY;
    let z0 = p[0] * sY + p[2] * cY;
    const cX = Math.cos(rxc);
    const sX = Math.sin(rxc);
    let y = p[1] * cX - z0 * sX;
    let z = p[1] * sX + z0 * cX + FOCAL;
    return [cx + (x * FOCAL * scale * 0.9) / z, cy - (y * FOCAL * scale * 0.9) / z];
  }

  function pointOnBez(u, ry, rxc) {
    const b = BEZ;
    const v = 1 - u;
    const x =
      v * v * v * b.p0[0] + 3 * v * v * u * b.p1[0] +
      3 * v * u * u * b.p2[0] + u * u * u * b.p3[0];
    const y =
      v * v * v * b.p0[1] + 3 * v * v * u * b.p1[1] +
      3 * v * u * u * b.p2[1] + u * u * u * b.p3[1];
    const z =
      v * v * v * b.p0[2] + 3 * v * v * u * b.p1[2] +
      3 * v * u * u * b.p2[2] + u * u * u * b.p3[2];
    return project([x, y, z], ry, rxc);
  }

  function drawLetter(t, ry, rxc) {
    const h = scale * 0.5;
    const w = h * 0.62;
    const d = h * 0.16;
    const lift = Math.sin(t * 0.7) * h * 0.03;

    const front = K_PTS.map(function (pt) {
      return project([
        (pt[0] - 0.48) * w - scale * 0.16,
        (0.5 - pt[1]) * h + lift,
        d
      ], ry, rxc);
    });
    const back = K_PTS.map(function (pt) {
      return project([
        (pt[0] - 0.48) * w - scale * 0.16,
        (0.5 - pt[1]) * h + lift,
        -d
      ], ry, rxc);
    });

    /* back face */
    ctx.beginPath();
    back.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    ctx.fillStyle = "rgba(10, 8, 12, 0.9)";
    ctx.fill();
    ctx.strokeStyle = EDGE_BACK;
    ctx.lineWidth = 1;
    ctx.stroke();

    /* extrusion sides (dim) */
    ctx.strokeStyle = EDGE_BACK;
    for (let i = 0; i < front.length; i++) {
      ctx.beginPath();
      ctx.moveTo(front[i][0], front[i][1]);
      ctx.lineTo(back[i][0], back[i][1]);
      ctx.stroke();
    }

    /* front face: fill + glowing gold edges */
    ctx.beginPath();
    front.forEach(function (p, i) { i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    ctx.fillStyle = FACE;
    ctx.fill();
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = scale * 0.03;
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1.4, scale * 0.004);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawBez(t, ry, rxc) {
    /* anchor endpoints */
    const a0 = project(BEZ.p0, ry, rxc);
    const a3 = project(BEZ.p3, ry, rxc);

    /* progress: draw over 3s, hold, retract */
    const cycle = 7;
    const u = (t % cycle) / cycle;
    let prog;
    if (u < 0.45) prog = u / 0.45;
    else if (u < 0.8) prog = 1;
    else prog = 1 - (u - 0.8) / 0.2;
    prog = Math.max(0.001, prog);

    /* curve */
    ctx.beginPath();
    const steps = 42;
    for (let i = 0; i <= steps * prog; i++) {
      const p = pointOnBez((i / steps) * prog, ry, rxc);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.strokeStyle = prog < 0.999 ? GOLD_SOFT : GOLD_DIM;
    ctx.lineWidth = Math.max(1.2, scale * 0.003);
    ctx.lineCap = "round";
    ctx.shadowColor = GOLD;
    ctx.shadowBlur = prog < 0.999 ? scale * 0.02 : 0;
    ctx.stroke();
    ctx.shadowBlur = 0;

    /* anchor squares */
    [a0, a3].forEach(function (p) {
      const s = scale * 0.011;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.rect(p[0] - s, p[1] - s, s * 2, s * 2);
      ctx.fill();
    });

    /* pen nib travelling the curve */
    if (prog < 0.999) {
      const p = pointOnBez(prog, ry, rxc);
      const s = scale * 0.02;
      ctx.fillStyle = GOLD;
      ctx.beginPath();
      ctx.moveTo(p[0], p[1] - s * 1.3);
      ctx.lineTo(p[0] + s * 0.9, p[1] + s);
      ctx.lineTo(p[0], p[1] + s * 0.45);
      ctx.lineTo(p[0] - s * 0.9, p[1] + s);
      ctx.closePath();
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = scale * 0.02;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function drawSparks(t, ry, rxc) {
    SPARKS.forEach(function (s0, i) {
      const wob = Math.sin(t * 0.8 + s0.ph) * 0.08;
      const p = project([s0.x, s0.y + wob, s0.z], ry, rxc);
      const tw = 0.5 + 0.5 * Math.sin(t * 2.1 + s0.ph);
      const sz = s0.size * (0.5 + tw * 0.7) * (scale / 900);
      ctx.strokeStyle = "rgba(245, 200, 66, " + (0.18 + tw * 0.4) + ")";
      ctx.lineWidth = Math.max(1, scale * 0.0015);
      ctx.beginPath();
      ctx.moveTo(p[0] - sz, p[1]);
      ctx.lineTo(p[0] + sz, p[1]);
      ctx.moveTo(p[0], p[1] - sz);
      ctx.lineTo(p[0], p[1] + sz);
      ctx.stroke();
    });
  }

  function draw() {
    const t = (performance.now() - start) / 1000;
    mx += (tmx - mx) * 0.035;
    my += (tmy - my) * 0.035;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.restore();

    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, width, height);

    const ry = t * 0.32 + mx * 0.25;
    const rxc = 0.12 + my * 0.18;

    drawSparks(t, ry, rxc);
    drawLetter(t, ry, rxc);
    drawBez(t, ry, rxc);

    if (!painted) {
      painted = true;
      section.classList.add("hero-anim-ready");
    }

    if (visible && !reduced && !paused()) {
      raf = requestAnimationFrame(draw);
    }
  }

  function pointerMove(e) {
    const r = section.getBoundingClientRect();
    tmx = ((e.clientX - r.left) / r.width) * 2 - 1;
    tmy = -(((e.clientY - r.top) / r.height) * 2 - 1);
  }
  function pointerLeave() {
    tmx = 0;
    tmy = 0;
  }

  if (!reduced) {
    section.addEventListener("pointermove", pointerMove, { passive: true });
    section.addEventListener("pointerleave", pointerLeave);
  }

  if (!reduced && "IntersectionObserver" in window) {
    new IntersectionObserver(
      function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !paused() && !raf) {
          raf = requestAnimationFrame(draw);
        }
      },
      { threshold: 0.01 }
    ).observe(section);
  }

  window.addEventListener("resize", function () {
    resize();
    if (reduced || paused() || !visible) draw();
  });

  resize();
  if (reduced || paused()) {
    draw();
    section.classList.add("hero-anim-ready");
  } else {
    raf = requestAnimationFrame(draw);
  }
})();
