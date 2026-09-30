const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ------------------------------------------------------------------ */
/* Scroll reveal                                                       */
/* ------------------------------------------------------------------ */

const revealTargets = document.querySelectorAll(
  ".reveal-item, .reveal-mask, .reveal-line"
);

if (REDUCED || !("IntersectionObserver" in window)) {
  revealTargets.forEach((el) => el.classList.add("revealed"));
} else {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("revealed");
        io.unobserve(entry.target);
      });
    },
    { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
  );
  revealTargets.forEach((el) => io.observe(el));
}

/* ------------------------------------------------------------------ */
/* Scroll progress bar                                                 */
/* ------------------------------------------------------------------ */

const bar = document.getElementById("scroll-progress-bar");
if (bar) {
  let ticking = false;
  const update = () => {
    const h = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = `${h > 0 ? (window.scrollY / h) * 100 : 0}%`;
    ticking = false;
  };
  addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
}

/* ------------------------------------------------------------------ */
/* Mobile navigation                                                   */
/* ------------------------------------------------------------------ */

const toggle = document.getElementById("menu-toggle");
const mobileNav = document.getElementById("mobile-nav");

if (toggle && mobileNav) {
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    toggle.setAttribute("aria-label", open ? "Open menu" : "Close menu");
    mobileNav.hidden = open;
    toggle.querySelector("span").textContent = open ? "menu" : "close";
  });
}

/* ------------------------------------------------------------------ */
/* Custom cursor ring                                                  */
/* ------------------------------------------------------------------ */

const ring = document.getElementById("cursor-ring");

if (ring && !REDUCED && matchMedia("(pointer: fine)").matches) {
  let x = 0;
  let y = 0;
  let tx = 0;
  let ty = 0;

  addEventListener(
    "pointermove",
    (e) => {
      tx = e.clientX;
      ty = e.clientY;
      ring.style.opacity = "1";
    },
    { passive: true }
  );

  const loop = () => {
    x += (tx - x) * 0.18;
    y += (ty - y) * 0.18;
    ring.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const hoverables = "a, button, [role='button'], input, select, textarea, [data-tilt], [data-tilt-3d]";
  document.addEventListener("pointerover", (e) => {
    if (e.target.closest?.(hoverables)) ring.dataset.hover = "true";
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest?.(hoverables)) ring.dataset.hover = "false";
  });
  document.addEventListener("pointerleave", () => (ring.style.opacity = "0"));
}

/* ------------------------------------------------------------------ */
/* Magnetic controls — 40px radius, 15px pull                         */
/* ------------------------------------------------------------------ */

if (!REDUCED && matchMedia("(pointer: fine)").matches) {
  const RADIUS = 40;
  const PULL = 15;

  document.querySelectorAll(".btn-magnetic, .gold-cta").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > RADIUS + Math.max(r.width, r.height) / 2) {
        el.style.transform = "";
        return;
      }

      const falloff = Math.max(0, 1 - dist / (RADIUS * 4));
      el.style.transform = `translate(${(dx / dist) * PULL * falloff}px, ${
        (dy / dist) * PULL * falloff
      }px) scale(1.02)`;
    });

    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

/* ------------------------------------------------------------------ */
/* Subtle card tilt (data-tilt)                                       */
/* ------------------------------------------------------------------ */

if (!REDUCED && matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll("[data-tilt]").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(900px) rotateX(${-py * 5}deg) rotateY(${
        px * 5
      }deg) translateY(-4px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });

  /* 3D label / packaging tilt (data-tilt-3d) */
  document.querySelectorAll("[data-tilt-3d]").forEach((el) => {
    const inner = el.querySelector(".tilt-3d__inner");
    if (!inner) return;

    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      inner.style.transform = `rotateX(${-py * 12}deg) rotateY(${px * 14}deg) translateZ(8px)`;
    });

    el.addEventListener("pointerleave", () => {
      inner.style.transform = "";
    });
  });
}

/* ------------------------------------------------------------------ */
/* Brand identity playground                                           */
/* ------------------------------------------------------------------ */

if (!REDUCED && matchMedia("(pointer: fine)").matches) {
  document.querySelectorAll("[data-identity-stage]").forEach((stage) => {
    const mark = stage.querySelector("[data-mark]");
    const glyph = stage.querySelector("[data-mark-glyph]");
    const sub = stage.querySelector("[data-sub]");

    stage.addEventListener("pointermove", (e) => {
      const r = stage.getBoundingClientRect();
      const px = e.clientX - (r.left + r.width / 2);
      const py = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(px, py) || 1;

      if (mark) {
        mark.style.transform = `translate(${px * 0.04}px, ${py * 0.04}px) scale(${
          1 + Math.max(0, 1 - dist / 420) * 0.12
        })`;
      }
      if (glyph) {
        glyph.style.transform = `translate(${px * 0.02}px, ${py * 0.02}px)`;
      }
      if (sub) {
        sub.style.transform = `translate(${(px / dist) * 18}px, ${(py / dist) * 18}px)`;
      }
    });

    stage.addEventListener("pointerleave", () => {
      [mark, glyph, sub].forEach((el) => el && (el.style.transform = ""));
    });
  });
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Full-height hero offset                                             */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */

/* Tell CSS how much chrome sits above a .hero-fullscreen block, so it can
   fill exactly the remaining viewport. Measured rather than hard-coded
   because the header and the telemetry strip both change height, and this
   runs on every page that has one - not only the 3D home hero. */
const fullHero = document.querySelector(".hero-fullscreen");

if (fullHero) {
  const measure = () => {
    const top = fullHero.getBoundingClientRect().top + window.scrollY;
    document.documentElement.style.setProperty("--hero-offset", `${Math.round(top)}px`);
  };
  measure();
  addEventListener("resize", measure);
  addEventListener("load", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
}

/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */
/* Commission form                                                     */
/* ------------------------------------------------------------------ */
/* ------------------------------------------------------------------ */


const form = document.getElementById("commission-form");
const status = document.getElementById("form-status");
const brief = document.getElementById("brief");
const counter = document.getElementById("brief-count");

if (brief && counter) {
  brief.addEventListener("input", () => {
    if (brief.value.length > 1200) brief.value = brief.value.slice(0, 1200);
    counter.textContent = `${brief.value.length} / 1200`;
  });
}

if (form && status) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const required = [...form.querySelectorAll("[required]")];
    const missing = required.filter((el) => !el.value.trim());

    if (missing.length) {
      status.textContent = `Please fill in ${missing.length} more field${missing.length > 1 ? "s" : ""}`;
      status.classList.add("text-[#ffb4ab]");
      status.classList.remove("text-[#F5C842]");
      missing[0].focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());
    const subject = `Project enquiry — ${data.discipline} — ${data.name}`;
    const body = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Company: ${data.company || "—"}`,
      `Project type: ${data.discipline}`,
      `Budget: ${data.budget}`,
      `Timeline: ${data.timeline || "—"}`,
      `Needs an NDA first: ${data.nda ? "yes" : "no"}`,
      "",
      data.brief,
    ].join("\n");

    status.classList.remove("text-[#ffb4ab]");
    status.classList.add("text-[#F5C842]");
    status.textContent = "Opening your email app…";

    location.href = `mailto:commissions@kaytheboss.studio?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;
  });
}
