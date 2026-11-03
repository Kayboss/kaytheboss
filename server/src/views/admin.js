import { esc } from "../lib/html.js";
import { navCounts } from "../lib/content.js";

/* ---------------- inline icons ---------------- */

const ICONS = {
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  layers: '<svg viewBox="0 0 24 24"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/></svg>',
  file: '<svg viewBox="0 0 24 24"><path d="M14 3v5h5"/><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z"/><path d="M9 13h6M9 17h6"/></svg>',
  settings: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1A1.6 1.6 0 0 0 17 2.6a1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>',
  grip: '<svg viewBox="0 0 24 24"><circle cx="9" cy="6" r="1.4"/><circle cx="15" cy="6" r="1.4"/><circle cx="9" cy="12" r="1.4"/><circle cx="15" cy="12" r="1.4"/><circle cx="9" cy="18" r="1.4"/><circle cx="15" cy="18" r="1.4"/></svg>',
  external: '<svg viewBox="0 0 24 24"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
  logout: '<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></svg>',
  menu: '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
  image: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg>',
  mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>',
  inbox: '<svg viewBox="0 0 24 24"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/></svg>',
  arrowLeft: '<svg viewBox="0 0 24 24"><path d="M19 12H5"/><path d="m12 19-7-7 7-7"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  copy: '<svg viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>',
  reply: '<svg viewBox="0 0 24 24"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v5"/></svg>',
  send: '<svg viewBox="0 0 24 24"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7Z"/></svg>',
};

export const icon = (name) => ICONS[name] || "";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "grid", match: "dashboard" },
  { href: "/admin/work", label: "Work", icon: "layers", match: "work", count: "work" },
  { href: "/admin/journal", label: "Journal", icon: "file", match: "journal", count: "journal" },
  { href: "/admin/media", label: "Media", icon: "image", match: "media" },
  { href: "/admin/emails", label: "Emails", icon: "mail", match: "emails", count: "emails" },
  { href: "/admin/mail", label: "Mail", icon: "inbox", match: "mail" },
  { href: "/admin/settings", label: "Settings", icon: "settings", match: "settings" },
];

function navHtml(active, counts) {
  return NAV.map((n) => {
    const on = n.match === active ? " active" : "";
    const val = n.count ? counts[n.count] : null;
    const badge =
      val != null && val !== 0
        ? `<span class="count${n.count === "emails" ? " count-new" : ""}">${val}</span>`
        : "";
    return `<a class="nav-item${on}" href="${n.href}">${icon(n.icon)}<span>${n.label}</span>${badge}</a>`;
  }).join("");
}

export function layout({ title, subtitle = "", active = "", actions = "", body, user = null, counts = {}, flash = null }) {
  const initial = (user?.email || "A").slice(0, 1).toUpperCase();
  const email = user?.email || "";
  const nav = { ...navCounts() };
  for (const [k, v] of Object.entries(counts)) if (v != null) nav[k] = v;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — KAYTHEBOSS Admin</title>
  <link rel="stylesheet" href="/admin/assets/admin.css" />
</head>
<body>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">K</span>
        <span>
          <span class="name">KAYTHEBOSS</span><br />
          <span class="sub">Studio Admin</span>
        </span>
      </div>
      <nav class="nav">
        <div class="nav-label">Manage</div>
        ${navHtml(active, nav)}
        <div class="nav-label">Site</div>
        <a class="nav-item" href="http://localhost:4321" target="_blank" rel="noopener">${icon("external")}<span>View site</span></a>
      </nav>
      <div class="sidebar-foot">
        <div class="who">
          <span class="avatar">${esc(initial)}</span>
          <span class="email">${esc(email)}</span>
        </div>
        <form method="post" action="/admin/logout">
          <button class="btn btn-ghost btn-sm" type="submit" style="width:100%">${icon("logout")} Log out</button>
        </form>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div style="display:flex;align-items:center;gap:14px">
          <button class="btn btn-ghost btn-icon menu-toggle" type="button" data-menu-toggle aria-label="Menu">${icon("menu")}</button>
          <div>
            <div class="title">${esc(title)}</div>
            ${subtitle ? `<div class="subtitle">${esc(subtitle)}</div>` : ""}
          </div>
        </div>
        <div class="topbar-actions">${actions}</div>
      </header>
      <div class="content">${body}</div>
    </div>
  </div>

  ${flash ? `<div hidden data-flash="${esc(flash.message)}" data-flash-type="${esc(flash.type)}"></div>` : ""}
  <div class="toasts"></div>
  <script src="/admin/assets/admin.js" defer></script>
</body>
</html>`;
}

export function loginLayout(title, bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)} — KAYTHEBOSS Admin</title>
  <link rel="stylesheet" href="/admin/assets/admin.css" />
</head>
<body>
  <div class="login-wrap">
    <div class="login-card">
      <div class="brand">
        <span class="mark">K</span>
        <span>
          <span class="name">KAYTHEBOSS</span><br />
          <span class="sub">Studio Admin</span>
        </span>
      </div>
      ${bodyHtml}
    </div>
  </div>
  <script src="/admin/assets/admin.js" defer></script>
</body>
</html>`;
}
