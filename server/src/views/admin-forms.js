import { layout, loginLayout, icon } from "./admin.js";
import { esc } from "../lib/html.js";

/* ---------------- helpers ---------------- */

const mediaUrl = (image) => {
  if (!image) return null;
  const v = String(image);
  if (/^https?:\/\//.test(v)) return v;
  if (v.startsWith("/")) return v;
  return "/admin/img/" + v;
};

const thumbHtml = (w) => {
  const src = mediaUrl(w.image);
  if (!src) return `<span class="thumb placeholder">—</span>`;
  return `<img class="thumb" src="${esc(src)}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'thumb placeholder',textContent:'—'}))" />`;
};

/* ---------------- media library ---------------- */

const fmtBytes = (n) => {
  if (n == null) return "";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
  return (n / (1024 * 1024)).toFixed(1) + " MB";
};

const mediaTile = (m) => `
  <div class="media-tile" data-media-tile data-name="${esc(m.name)}" data-url="${esc(m.url)}">
    <button type="button" class="media-tile-pick" data-media-pick title="${esc(m.name)}">
      <img src="${esc(m.url)}" alt="${esc(m.name)}" loading="lazy" />
    </button>
    <div class="media-tile-meta">
      <span class="media-tile-name" title="${esc(m.name)}">${esc(m.name)}</span>
      <span class="media-tile-size">${esc(fmtBytes(m.size))}</span>
    </div>
    <button type="button" class="media-tile-del" data-media-delete title="Delete this file">${icon("trash")}</button>
  </div>`;

const mediaField = (value) => {
  const v = value ? String(value) : "";
  return `<div class="media-field" data-media-field>
      <input type="hidden" name="image" value="${esc(v)}" data-image-input />
      <div class="media-drop" data-media-drop tabindex="0" role="button" aria-label="Upload an image">
        <img class="media-preview" data-image-preview alt=""${v ? ` src="${esc(mediaUrl(v))}"` : ""} />
        <div class="media-drop-hint">
          ${icon("plus")}
          <span><strong>Drop an image</strong> or click to upload</span>
          <span class="media-drop-sub">PNG · JPG · WEBP · GIF · SVG · AVIF — up to 12 MB</span>
        </div>
      </div>
      <div class="media-bar">
        <span class="media-value" data-media-value title="${esc(v)}">${v ? esc(v) : "No image selected"}</span>
        <span class="media-bar-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-media-choose>Library</button>
          <button type="button" class="btn btn-ghost btn-sm" data-media-clear>Clear</button>
        </span>
      </div>
      <input type="file" accept="image/*" multiple hidden data-media-file />
    </div>`;
};

const mediaPickerModal = () => `
  <div class="media-modal" data-media-modal hidden>
    <div class="media-modal-scrim" data-media-modal-close></div>
    <div class="media-modal-panel" role="dialog" aria-modal="true" aria-label="Media library">
      <div class="media-modal-head">
        <h3>Media library</h3>
        <div class="media-modal-head-actions">
          <button type="button" class="btn btn-primary btn-sm" data-media-upload-btn>${icon("plus")} Upload</button>
          <button type="button" class="btn btn-ghost btn-sm" data-media-modal-close>Close</button>
        </div>
      </div>
      <div class="media-grid" data-media-grid></div>
      <div class="media-empty" data-media-empty hidden>${icon("image")}<p>No media yet — upload your first image.</p></div>
      <input type="file" accept="image/*" multiple hidden data-media-file />
    </div>
  </div>`;

const fmtWhen = (ts) => {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
};

const field = (label, inner, help = "") =>
  `<div class="field"><label>${esc(label)}</label>${inner}${help ? `<div class="help">${esc(help)}</div>` : ""}</div>`;

const input = (name, value, attrs = "") =>
  `<input type="text" name="${name}" value="${esc(value ?? "")}" ${attrs} />`;

const textarea = (name, value, rows = 4, cls = "") =>
  `<textarea class="${cls}" name="${name}" rows="${rows}">${esc(value ?? "")}</textarea>`;

const lineText = (arr) => (Array.isArray(arr) && arr.length ? arr.join("\n") : "");
const outcomeText = (arr) =>
  Array.isArray(arr) && arr.length ? arr.map((o) => `${o.value || ""} | ${o.label || ""}`).join("\n") : "";

/* ---------------- login ---------------- */

export const login = (err) =>
  loginLayout(
    "Log in",
    `${err ? `<div class="alert">${esc(err)}</div>` : ""}
     <form method="post" action="/admin/login">
       <div class="field">
         <label for="email">Email</label>
         <input id="email" name="email" type="email" required autocomplete="email" autofocus />
       </div>
       <div class="field">
         <label for="password">Password</label>
         <input id="password" name="password" type="password" required autocomplete="current-password" />
       </div>
       <button class="btn btn-primary" type="submit" style="width:100%;justify-content:center">Log in</button>
     </form>`
  );

/* ---------------- dashboard ---------------- */

const recentWorkCard = (w) => `
  <a class="card recent-card" href="/admin/work/${esc(w.slug)}/edit" style="display:flex;gap:12px;align-items:center;padding:12px">
    ${thumbHtml(w)}
    <span style="min-width:0">
      <span class="rt" style="display:block;font-weight:600;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(w.title || w.slug)}</span>
      <span style="font-size:12px;color:var(--muted-2)">${esc(w.discipline || "—")} · ${esc(w.year || "")}</span>
    </span>
  </a>`;

const recentJournalRow = (p) => `
  <a class="row-item recent-row" href="/admin/journal/${esc(p.slug)}/edit">
    <span class="row-main">
      <span class="rt" style="display:block">${esc(p.title || p.slug)}</span>
      <span class="rs">${esc(p.category || "—")} · ${esc(p.date || "")}</span>
    </span>
    <span class="row-actions">${icon("edit")}</span>
  </a>`;

export const dashboard = ({ stats, work, journal }) =>
  layout({
    title: "Dashboard",
    subtitle: "Your studio content at a glance",
    active: "dashboard",
    counts: { work: stats.workCount, journal: stats.journalCount },
    user: stats.user,
    actions: `<a class="btn btn-primary" href="/admin/work/new">${icon("plus")} New work</a>`,
    body: `
    <div class="stats">
      <div class="stat">
        <div class="k">Work projects</div>
        <div class="v">${stats.workCount}</div>
        <div class="m">Case studies live on the site</div>
      </div>
      <div class="stat">
        <div class="k">Journal posts</div>
        <div class="v">${stats.journalCount}</div>
        <div class="m">Notes and articles</div>
      </div>
      <div class="stat">
        <div class="k">Last updated</div>
        <div class="v" style="font-size:16px;padding-top:8px">${esc(fmtWhen(stats.lastUpdated))}</div>
        <div class="m">Most recent content change</div>
      </div>
      <a class="stat" href="/admin/emails" style="text-decoration:none">
        <div class="k">New enquiries</div>
        <div class="v" style="color:${stats.enquiries?.new ? "var(--gold)" : "inherit"}">${stats.enquiries?.new ?? 0}</div>
        <div class="m">${stats.enquiries?.all ?? 0} total in the inbox</div>
      </a>
    </div>

    <div class="section-title">Recent work</div>
    ${
      work.length
        ? `<div class="stats" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))">${work.map(recentWorkCard).join("")}</div>`
        : `<div class="empty"><div class="icon">${icon("layers")}</div><h3>No work yet</h3><p>Add your first case study to see it here.</p><a class="btn btn-primary" href="/admin/work/new">${icon("plus")} New work</a></div>`
    }

    <div class="divider"></div>

    <div class="card-head">
      <h2>Recent journal</h2>
      <a class="btn btn-ghost btn-sm" href="/admin/journal">View all</a>
    </div>
    ${
      journal.length
        ? `<div class="list">${journal.map(recentJournalRow).join("")}</div>`
        : `<div class="empty"><div class="icon">${icon("file")}</div><h3>No journal posts</h3><p>Write your first note.</p><a class="btn btn-primary" href="/admin/journal/new">${icon("plus")} New journal</a></div>`
    }`,
  });

/* ---------------- work list ---------------- */

const workRow = (w) => `
  <div class="row-item" data-item data-id="${esc(w.slug)}"
       data-search-text="${esc((w.title + " " + w.slug + " " + w.index + " " + w.client).toLowerCase())}"
       data-year="${esc(w.year || "")}">
    <span class="drag-handle" title="Drag to reorder">${icon("grip")}</span>
    ${thumbHtml(w)}
    <span class="row-main">
      <span class="rt" style="display:block">${esc(w.title || w.slug)}</span>
      <span class="rs">
        <span class="chip gold">${esc(w.index || w.slug)}</span>
        <span class="chip">${esc(w.discipline || "—")}</span>
        ${w.series ? `<span class="chip">${esc(w.series)}</span>` : ""}
        <span class="chip raw">${esc(w.year || "")}</span>
      </span>
    </span>
    <span class="row-actions">
      <a class="btn btn-ghost btn-sm" href="/admin/work/${esc(w.slug)}/edit">${icon("edit")} Edit</a>
    </span>
  </div>`;

export const workList = ({ work, user, years, flash }) =>
  layout({
    title: "Work",
    subtitle: `${work.length} case stud${work.length === 1 ? "y" : "ies"}`,
    active: "work",
    counts: { work: work.length, journal: undefined },
    user,
    flash,
    actions: `<a class="btn btn-primary" href="/admin/work/new">${icon("plus")} New work</a>`,
    body: work.length
      ? `
      <div data-list-root>
        <div class="toolbar">
          <div class="search">${icon("search")}<input type="text" data-search placeholder="Search work by title, slug, client…" /></div>
          <div class="filters">
            <select data-filter="year" style="width:auto">
              <option value="">All years</option>
              ${years.map((y) => `<option value="${esc(y)}">${esc(y)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="list" data-reorder="/admin/work/reorder">${work.map(workRow).join("")}</div>
        <div class="empty hidden" data-no-results><h3>No matches</h3><p>Try a different search or filter.</p></div>
      </div>`
      : `<div class="empty"><div class="icon">${icon("layers")}</div><h3>No work yet</h3><p>Add your first case study.</p><a class="btn btn-primary" href="/admin/work/new">${icon("plus")} New work</a></div>`,
  });

/* ---------------- journal list ---------------- */

const journalRow = (p) => `
  <div class="row-item" data-item data-id="${esc(p.slug)}"
       data-search-text="${esc((p.title + " " + p.slug + " " + p.category).toLowerCase())}"
       data-category="${esc(p.category || "")}">
    <span class="drag-handle" title="Drag to reorder">${icon("grip")}</span>
    <span class="row-main">
      <span class="rt" style="display:block">${esc(p.title || p.slug)}</span>
      <span class="rs">
        <span class="chip gold">${esc(p.category || "—")}</span>
        <span class="chip raw">${esc(p.date || "")}</span>
        <span class="chip">${esc(p.readingTime || "")}</span>
      </span>
    </span>
    <span class="row-actions">
      <a class="btn btn-ghost btn-sm" href="/admin/journal/${esc(p.slug)}/edit">${icon("edit")} Edit</a>
    </span>
  </div>`;

export const journalList = ({ journal, user, categories, flash }) =>
  layout({
    title: "Journal",
    subtitle: `${journal.length} post${journal.length === 1 ? "" : "s"}`,
    active: "journal",
    counts: { journal: journal.length, work: undefined },
    user,
    flash,
    actions: `<a class="btn btn-primary" href="/admin/journal/new">${icon("plus")} New post</a>`,
    body: journal.length
      ? `
      <div data-list-root>
        <div class="toolbar">
          <div class="search">${icon("search")}<input type="text" data-search placeholder="Search journal by title, slug, category…" /></div>
          <div class="filters">
            <select data-filter="category" style="width:auto">
              <option value="">All categories</option>
              ${categories.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="list" data-reorder="/admin/journal/reorder">${journal.map(journalRow).join("")}</div>
        <div class="empty hidden" data-no-results><h3>No matches</h3><p>Try a different search or filter.</p></div>
      </div>`
      : `<div class="empty"><div class="icon">${icon("file")}</div><h3>No journal posts</h3><p>Write your first note.</p><a class="btn btn-primary" href="/admin/journal/new">${icon("plus")} New post</a></div>`,
  });

/* ---------------- work form ---------------- */

export const workForm = ({ w, isNew, err, user }) =>
  layout({
    title: isNew ? "New work" : "Edit work",
    subtitle: isNew ? "Add a case study" : esc(w.title || w.slug),
    active: "work",
    user,
    actions: `<a class="btn btn-ghost" href="/admin/work">Cancel</a>
      <button class="btn btn-primary" type="submit" form="work-form">Save</button>`,
    body: `
    ${err ? `<div class="alert">${esc(err)}</div>` : ""}
    <form id="work-form" method="post" action="${isNew ? "/admin/work" : `/admin/work/${esc(w.slug)}`}" data-track-dirty>
      <div class="form-layout">
        <div class="form-main">

          <section class="form-section">
            <header><span class="num">1</span><h3>Identity</h3><span class="desc">How the project is labelled</span></header>
            <div class="body">
              <div class="grid-2">
                ${isNew
                  ? field("Slug (URL)", `<input type="text" name="slug" value="${esc(w.slug || "")}" data-slug-target required placeholder="my-project" />`, "Used in the URL: /work/your-slug.html")
                  : field("Slug", `<input type="text" value="${esc(w.slug)}" disabled /><input type="hidden" name="_slug" value="${esc(w.slug)}" />`, "Slug cannot be changed after creation")}
                ${field("Internal index / code", input("index", w.index, 'placeholder="AXIOM VAULT"'))}
              </div>
              ${field("Title", input("title", w.title, isNew ? 'data-slug-source placeholder="Trading App for a Fast-Moving Investment Firm"' : ""))}
              <div class="grid-2">
                ${field("Year", input("year", w.year, 'placeholder="2025"'))}
                ${field("Client", input("client", w.client, 'placeholder="Axiom Vault"'))}
              </div>
              ${field("Sort order", `<input type="number" name="sortOrder" value="${esc(w.sortOrder ?? 0)}" />`, "Lower numbers appear first")}
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">2</span><h3>Classification</h3><span class="desc">Filters and grouping</span></header>
            <div class="body">
              <div class="grid-3">
                ${field("Discipline", input("discipline", w.discipline, 'placeholder="Packaging Design"'))}
                ${field("Series", input("series", w.series, 'placeholder="Spirits"'))}
                ${field("Size", `<select name="size">
                  ${["wide", "tall", "narrow"].map((s) => `<option value="${s}"${(w.size || "wide") === s ? " selected" : ""}>${s}</option>`).join("")}
                </select>`)}
              </div>
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">3</span><h3>Story</h3><span class="desc">The narrative on the case page</span></header>
            <div class="body">
              ${field("Summary", textarea("summary", w.summary, 3), "One or two lines shown on cards")}
              ${field("TL:DR", textarea("tldr", w.tldr, 3), "The one-paragraph version of the project")}
              ${field("Challenge", textarea("challenge", w.challenge, 4))}
              <div class="grid-2">
                ${field("Pull quote", textarea("pullQuote", w.pullQuote, 2))}
                <div>
                  ${field("Quote by", input("quoteBy", w.quoteBy, 'placeholder="Head of Trading, Axiom Vault"'))}
                  ${field("Next project (slug)", input("next", w.next, 'placeholder="leave blank if last"'))}
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">4</span><h3>Lists</h3><span class="desc">One item per line</span></header>
            <div class="body">
              <div class="grid-2">
                ${field("Role", textarea("role", lineText(w.role), 4))}
                ${field("Stack", textarea("stack", lineText(w.stack), 4))}
              </div>
              ${field("Approach", textarea("approach", lineText(w.approach), 6))}
              ${field("Outcome", textarea("outcome", outcomeText(w.outcome), 5), 'One per line as "value | label"')}
            </div>
          </section>

        </div>

        <div class="form-side">
          <section class="form-section">
            <header><span class="num">${icon("image")}</span><h3>Media</h3></header>
            <div class="body">
              ${field("Image", mediaField(w.image), "Drag & drop to upload, pick from your library, or paste a full URL.")}
              ${field("Alt text", `<input type="text" name="alt" value="${esc(w.alt || "")}" />`, "Describe the image for accessibility")}
            </div>
          </section>
        </div>
      </div>

      <div class="sticky-bar">
        <span class="grow"></span>
        <span class="dirty" data-dirty></span>
        <a class="btn btn-ghost" href="/admin/work">Cancel</a>
        <button class="btn btn-primary" type="submit">Save work</button>
      </div>
    </form>

    ${mediaPickerModal()}

    ${!isNew ? `<form method="post" action="/admin/work/${esc(w.slug)}/delete" data-confirm="Delete “${esc(w.title || w.slug)}”? This cannot be undone." style="margin-top:14px">
      <button class="btn btn-danger" type="submit">${icon("trash")} Delete work</button>
    </form>` : ""}`,
  });

/* ---------------- journal form ---------------- */

const bodyEditor = (value) => `
  <div class="editor" data-editor>
    <div class="editor-toolbar" data-editor-toolbar>
      <button type="button" data-cmd="formatBlock" data-arg="h2" title="Heading">H2</button>
      <button type="button" data-cmd="formatBlock" data-arg="h3" title="Subheading">H3</button>
      <button type="button" data-cmd="formatBlock" data-arg="p" title="Paragraph">Text</button>
      <span class="sep"></span>
      <button type="button" data-cmd="bold" title="Bold"><b>B</b></button>
      <button type="button" data-cmd="italic" title="Italic"><i>I</i></button>
      <span class="sep"></span>
      <button type="button" data-cmd="insertUnorderedList" title="Bulleted list">• List</button>
      <button type="button" data-cmd="insertOrderedList" title="Numbered list">1. List</button>
      <button type="button" data-cmd="formatBlock" data-arg="blockquote" title="Quote">“ Quote</button>
      <span class="sep"></span>
      <button type="button" data-cmd="createLink" title="Insert link">Link</button>
      <button type="button" data-cmd="insertHorizontalRule" title="Divider">Divider</button>
      <button type="button" data-cmd="removeFormat" title="Clear formatting">Clear</button>
      <span class="grow"></span>
      <button type="button" data-editor-source title="Edit raw HTML">HTML</button>
    </div>
    <div class="editor-surface" contenteditable="true" spellcheck="true" data-editor-surface data-placeholder="Start writing your post…"></div>
    <textarea class="mono editor-source" name="body" data-editor-input hidden>${esc(value ?? "")}</textarea>
  </div>`;

export const journalForm = ({ p, isNew, err, user }) =>
  layout({
    title: isNew ? "New post" : "Edit post",
    subtitle: isNew ? "Write a journal note" : esc(p.title || p.slug),
    active: "journal",
    user,
    actions: `<a class="btn btn-ghost" href="/admin/journal">Cancel</a>
      <button class="btn btn-primary" type="submit" form="journal-form">Save</button>`,
    body: `
    ${err ? `<div class="alert">${esc(err)}</div>` : ""}
    <form id="journal-form" method="post" action="${isNew ? "/admin/journal" : `/admin/journal/${esc(p.slug)}`}" data-track-dirty>
      <div class="form-layout">
        <div class="form-main">
          <section class="form-section">
            <header><span class="num">1</span><h3>Post</h3><span class="desc">Title and identity</span></header>
            <div class="body">
              <div class="grid-2">
                ${isNew
                  ? field("Slug (URL)", `<input type="text" name="slug" value="${esc(p.slug || "")}" data-slug-target required placeholder="my-post" />`, "Used in the URL: /journal/your-slug.html")
                  : field("Slug", `<input type="text" value="${esc(p.slug)}" disabled /><input type="hidden" name="_slug" value="${esc(p.slug)}" />`)}
                ${field("Date", `<input type="date" name="date" value="${esc(p.date || "")}" />`)}
              </div>
              ${field("Title", `<input type="text" name="title" value="${esc(p.title || "")}" ${isNew ? "data-slug-source" : ""} />`)}
              <div class="grid-3">
                ${field("Category", input("category", p.category, 'placeholder="Process"'))}
                ${field("Reading time", input("readingTime", p.readingTime, 'placeholder="5 min"'))}
                ${field("Sort order", `<input type="number" name="sortOrder" value="${esc(p.sortOrder ?? 0)}" />`)}
              </div>
              ${field("Excerpt", textarea("excerpt", p.excerpt, 3))}
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">2</span><h3>Body</h3><span class="desc">Write and format your post</span></header>
            <div class="body">
              ${bodyEditor(p.body)}
            </div>
          </section>
        </div>

        <div class="form-side">
          <section class="form-section">
            <header><h3>Formatting</h3></header>
            <div class="body">
              <p class="muted" style="font-size:13px;margin:0 0 10px">Use the toolbar to add headings, bold, lists, quotes and links. Press <kbd>Enter</kbd> for a new paragraph.</p>
              <p class="muted" style="font-size:13px;margin:0">Need fine control? Click <span class="chip">HTML</span> to edit the underlying code, then <span class="chip">Preview</span> to see it formatted again.</p>
            </div>
          </section>
        </div>
      </div>

      <div class="sticky-bar">
        <span class="grow"></span>
        <span class="dirty" data-dirty></span>
        <a class="btn btn-ghost" href="/admin/journal">Cancel</a>
        <button class="btn btn-primary" type="submit">Save post</button>
      </div>
    </form>

    ${!isNew ? `<form method="post" action="/admin/journal/${esc(p.slug)}/delete" data-confirm="Delete “${esc(p.title || p.slug)}”? This cannot be undone." style="margin-top:14px">
      <button class="btn btn-danger" type="submit">${icon("trash")} Delete post</button>
    </form>` : ""}`,
  });

/* ---------------- settings ---------------- */

const settingsField = (label, key, value, help = "") =>
  `<div class="field">
    <label>${esc(label)}</label>
    <input type="text" data-field="${key}" value="${esc(value ?? "")}" />
    ${help ? `<div class="help">${esc(help)}</div>` : ""}
  </div>`;

const rowTools = (withUp = true) => `
  <div class="row-tools">
    ${withUp ? `<button type="button" class="btn btn-ghost btn-icon" data-up title="Move up" aria-label="Move up">↑</button>` : ""}
    <button type="button" class="btn btn-ghost btn-icon" data-down title="Move down" aria-label="Move down">↓</button>
    <button type="button" class="btn btn-danger btn-icon" data-remove title="Remove" aria-label="Remove">${icon("trash")}</button>
  </div>`;

const navRow = (n = {}) => `
  <div class="repeater-row" data-row>
    <span class="row-grip" aria-hidden="true">${icon("grip")}</span>
    <input type="text" data-in="label" value="${esc(n.label || "")}" placeholder="Label (e.g. Home)" />
    <input type="text" data-in="href" value="${esc(n.href || "")}" placeholder="/work/" />
    ${rowTools()}
  </div>`;

const discRow = (d = {}) => `
  <div class="repeater-row repeater-card" data-row>
    <div class="rc-head">
      <span class="rc-title">Discipline</span>
      ${rowTools()}
    </div>
    <div class="grid-3">
      <div class="field"><label>Number</label><input type="text" data-in="index" value="${esc(d.index || "")}" placeholder="01" /></div>
      <div class="field"><label>Title</label><input type="text" data-in="title" value="${esc(d.title || "")}" placeholder="Labels and Posters" /></div>
      <div class="field"><label>Icon</label><input type="text" data-in="icon" value="${esc(d.icon || "")}" placeholder="inventory_2" /></div>
    </div>
    <div class="field"><label>Short label</label><input type="text" data-in="code" value="${esc(d.code || "")}" placeholder="Labels &amp; Posters" /></div>
    <div class="field"><label>Description</label><textarea data-in="body" rows="2" placeholder="One or two sentences shown on the card.">${esc(d.body || "")}</textarea></div>
    <div class="field"><label>Bullet points</label><textarea data-in="points" rows="3" placeholder="One point per line">${esc((d.points || []).join("\n"))}</textarea><div class="help">One point per line</div></div>
  </div>`;

export const settingsForm = ({ site, err, user, flash }) => {
  const s = typeof site === "string" ? (() => { try { return JSON.parse(site); } catch { return {}; } })() : (site || {});
  const nav = Array.isArray(s.nav) ? s.nav : [];
  const discs = Array.isArray(s.disciplines) ? s.disciplines : [];
  const ethos = Array.isArray(s.ethos) ? s.ethos.join("\n") : "";
  const locations = Array.isArray(s.locations) ? s.locations.join("\n") : "";
  const jsonFallback = esc(JSON.stringify(
    { name: s.name, tagline: s.tagline, description: s.description, url: s.url, locale: s.locale, email: s.email, locations: s.locations || [], nav, disciplines: discs, ethos: s.ethos || [] },
    null, 2
  ));

  return layout({
    title: "Settings",
    subtitle: "Edit your studio details without touching code",
    active: "settings",
    user,
    flash,
    actions: `<button class="btn btn-primary" type="submit" form="settings-form">Save settings</button>`,
    body: `
    ${err ? `<div class="alert">${esc(err)}</div>` : ""}
    <form id="settings-form" method="post" action="/admin/settings" data-settings-form>
      <input type="hidden" data-settings-json />
      <noscript>
        <div class="alert">JavaScript is off, so the friendly editor is unavailable. Edit the JSON below instead — invalid JSON is rejected on save.</div>
        <textarea name="site" rows="30" class="mono">${jsonFallback}</textarea>
      </noscript>

      <div class="form-layout">
        <div class="form-main">

          <section class="form-section">
            <header><span class="num">1</span><h3>Studio details</h3><span class="desc">Shown across the site</span></header>
            <div class="body">
              <div class="grid-2">
                ${settingsField("Studio name", "name", s.name, "Appears in the header and page titles")}
                ${settingsField("Tagline", "tagline", s.tagline, "The small line under the name")}
              </div>
              <div class="field">
                <label>Description</label>
                <textarea data-field="description" rows="3" placeholder="What the studio does, in a sentence or two.">${esc(s.description || "")}</textarea>
                <div class="help">Used for search engines and social previews</div>
              </div>
              <div class="grid-2">
                ${settingsField("Website address", "url", s.url, "e.g. https://kaytheboss.studio")}
                ${settingsField("Language", "locale", s.locale, "e.g. en")}
              </div>
              <div class="grid-2">
                ${settingsField("Contact email", "email", s.email, "Where commission enquiries arrive")}
                <div class="field">
                  <label>Locations</label>
                  <textarea data-field="locations" rows="2" placeholder="One per line, e.g. WORLDWIDE">${esc(locations)}</textarea>
                  <div class="help">One per line</div>
                </div>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">2</span><h3>Navigation</h3><span class="desc">Links in the header menu, in order</span></header>
            <div class="body">
              <div class="repeater" data-repeater="nav">
                <div class="repeater-rows" data-rows>${nav.map(navRow).join("")}</div>
                <template data-row-template>${navRow()}</template>
                <button type="button" class="btn btn-ghost btn-sm" data-add>${icon("plus")} Add menu link</button>
              </div>
            </div>
          </section>

          <section class="form-section">
            <header><span class="num">3</span><h3>Disciplines</h3><span class="desc">The service cards on the home and studio pages</span></header>
            <div class="body">
              <div class="repeater" data-repeater="disciplines">
                <div class="repeater-rows" data-rows>${discs.map(discRow).join("")}</div>
                <template data-row-template>${discRow()}</template>
                <button type="button" class="btn btn-ghost btn-sm" data-add>${icon("plus")} Add discipline</button>
              </div>
            </div>
          </section>

        </div>

        <div class="form-side">
          <section class="form-section">
            <header><h3>Keywords</h3></header>
            <div class="body">
              <div class="field">
                <label>Studio keywords</label>
                <textarea data-field="ethos" rows="8" placeholder="One per line, e.g. GOOD TASTE">${esc(ethos)}</textarea>
                <div class="help">One per line. These scroll in the marquee band.</div>
              </div>
            </div>
          </section>
          <section class="form-section">
            <header><h3>Tip</h3></header>
            <div class="body">
              <p class="muted" style="font-size:13px;margin:0">Reorder menu links and disciplines with the ↑ ↓ buttons. Changes go live the next time the site is built.</p>
            </div>
          </section>
        </div>
      </div>

      <div class="sticky-bar">
        <span class="grow"></span>
        <span class="dirty" data-dirty></span>
        <a class="btn btn-ghost" href="/admin">Cancel</a>
        <button class="btn btn-primary" type="submit">Save settings</button>
      </div>
    </form>`,
  });
};

/* ---------------- emails / enquiries ---------------- */

const STATUS_LABEL = {
  new: "New",
  replied: "Replied",
  won: "Won",
  lost: "Lost",
  spam: "Spam",
};

const statusChip = (s) =>
  `<span class="status ${esc(s || "new")}">${esc(STATUS_LABEL[s] || s || "New")}</span>`;

const emailRow = (e, threadCounts = {}) => {
  const n = threadCounts[e.id] || 0;
  return `
  <a class="row-item email-row" href="/admin/emails/${e.id}"
     data-item
     data-status="${esc(e.status || "new")}"
     data-search-text="${esc((e.name + " " + e.email + " " + e.company + " " + e.brief).toLowerCase())}">
    <span class="avatar sm">${esc((e.name || e.email || "?").slice(0, 1).toUpperCase())}</span>
    <span class="row-main">
      <span class="rt" style="display:block">${esc(e.name || "(no name)")}${e.status === "new" ? ` <span class="dot-new" title="Unread"></span>` : ""}</span>
      <span class="rs">
        <span class="chip">${esc(e.email)}</span>
        ${e.company ? `<span class="chip">${esc(e.company)}</span>` : ""}
        ${e.discipline ? `<span class="chip">${esc(e.discipline)}</span>` : ""}
        ${e.budget ? `<span class="chip">${esc(e.budget)}</span>` : ""}
        ${n ? `<span class="chip chip-mail">${n} message${n === 1 ? "" : "s"}</span>` : ""}
      </span>
    </span>
    <span class="row-actions">
      <span class="when">${esc(fmtWhen(e.createdAt))}</span>
      ${statusChip(e.status)}
    </span>
  </a>`;
};

export const emailsList = ({ emails, counts, threadCounts = {}, user, flash }) =>
  layout({
    title: "Emails",
    subtitle: counts.all ? `${counts.all} enquir${counts.all === 1 ? "y" : "ies"}${counts.new ? ` · ${counts.new} new` : ""}` : "Commission enquiries",
    active: "emails",
    counts: { emails: counts.new },
    user,
    flash,
    actions: `<a class="btn btn-ghost" href="/admin/mail">${icon("inbox")} Mailbox</a>`,
    body: emails.length
      ? `
      <div data-list-root>
        <div class="toolbar">
          <div class="search">${icon("search")}<input type="text" data-search placeholder="Search by name, email, company or brief…" /></div>
          <div class="filters">
            <select data-filter="status" style="width:auto">
              <option value="">All (${counts.all})</option>
              <option value="new">New (${counts.new})</option>
              <option value="replied">Replied (${counts.replied})</option>
              <option value="won">Won (${counts.won})</option>
              <option value="lost">Lost (${counts.lost})</option>
              <option value="spam">Spam (${counts.spam})</option>
            </select>
          </div>
        </div>
        <div class="list">${emails.map((e) => emailRow(e, threadCounts)).join("")}</div>
        <div class="empty hidden" data-no-results><h3>No matches</h3><p>Try a different search or status.</p></div>
      </div>`
      : `<div class="empty"><div class="icon">${icon("mail")}</div><h3>No emails yet</h3><p>Enquiries sent through the commission form will land here.</p></div>`,
  });

const threadMsg = (m) => {
  const out = m.direction === "out";
  const who = out ? "You" : m.fromName || m.fromEmail || "Unknown sender";
  const to = m.toEmails || m.ccEmails || "";
  return `
    <article class="thread-msg ${out ? "out" : "in"}">
      <header>
        <span class="avatar sm">${esc((who || "?").slice(0, 1).toUpperCase())}</span>
        <span class="thread-who">
          <strong>${esc(who)}</strong>
          ${to ? `<span class="thread-to">to ${esc(to)}</span>` : ""}
        </span>
        <span class="when">${esc(fmtWhen(m.sentAt || m.createdAt))}</span>
      </header>
      ${m.subject && m.subject !== "—" ? `<div class="thread-subject">${esc(m.subject)}</div>` : ""}
      <div class="thread-body">${esc(m.bodyText || m.snippet || "(empty message)")}</div>
      <div class="thread-foot">
        <span class="chip">${out ? "Sent" : "Received"}</span>
        ${m.source ? `<span class="chip">${esc(m.source)}</span>` : ""}
        <a class="thread-link" href="/admin/mail/${m.id}">Open in Mailbox</a>
      </div>
    </article>`;
};

export const emailDetail = ({ e, messages = [], user, flash, mailConfigured = false, mailboxConfigured = false }) => {
  const subject = "Re: your enquiry - KaytheBoss";
  const replyTo = `mailto:${e.email}?subject=${encodeURIComponent(subject)}`;
  const mailHint = mailConfigured
    ? "Review and edit, then send it straight from here"
    : "Review and edit. Sending is not set up yet - use Reply by email";
  const thread = messages.length
    ? messages.map(threadMsg).join("")
    : `<div class="thread-empty">
        <p>No synced mail on this thread yet.</p>
        <p class="muted">${mailboxConfigured
          ? "The mailbox is connected - new messages appear after the next sync."
          : "Connect IMAP in server/.env to pull this conversation in from your mailbox."}</p>
      </div>`;
  return layout({
    title: e.name || "Enquiry",
    subtitle: e.email,
    active: "emails",
    user,
    flash,
    actions: `<a class="btn btn-ghost" href="/admin/emails">${icon("arrowLeft")} Back</a>
      <a class="btn btn-ghost" href="${esc(replyTo)}">${icon("reply")} Reply by email</a>`,
    body: `
    <div class="email-detail">
      <div class="form-layout">
        <div class="form-main">
          <section class="form-section">
            <header><h3>Brief</h3><span class="desc">What they are asking for</span></header>
            <div class="body">
              <p class="email-brief">${esc(e.brief || "(no brief provided)")}</p>
            </div>
          </section>

          <section class="form-section">
            <header>
              <h3>Conversation</h3>
              <span class="desc">${messages.length ? `${messages.length} message${messages.length === 1 ? "" : "s"}` : "Synced from your mailbox"}</span>
            </header>
            <div class="body">
              <div class="thread">${thread}</div>
            </div>
          </section>

          <section class="form-section">
            <header>
              <h3>Reply</h3>
              <span class="desc">${esc(mailHint)}</span>
            </header>
            <div class="body">
              <form method="post" action="/admin/emails/${e.id}/draft" data-track-dirty>
                <div class="field">
                  <label for="reply-subject">Subject</label>
                  <input id="reply-subject" type="text" name="subject" value="${esc(subject)}" />
                </div>
                <textarea name="draftReply" rows="12" class="draft-box">${esc(e.draftReply || "")}</textarea>
                <div class="sticky-bar" style="position:static;border:0;background:transparent;padding:12px 0 0">
                  <span class="grow"></span>
                  <span class="dirty" data-dirty></span>
                  <button class="btn btn-ghost btn-sm" type="button" data-copy-target>${icon("copy")} Copy</button>
                  <button class="btn btn-ghost btn-sm" type="submit">Save draft</button>
                  <button class="btn btn-primary btn-sm" type="submit"
                          formaction="/admin/emails/${e.id}/reply"
                          data-confirm-submit
                          data-confirm="Send this reply to ${esc(e.email)}? It goes out immediately."
                          data-confirm-ok="Send reply"
                          data-confirm-variant="primary"
                          ${mailConfigured ? "" : `disabled title="Add RESEND_API_KEY to .env to send from here"`}>${icon("send")} Send reply</button>
                </div>
                ${mailConfigured ? "" : `<div class="help" style="margin-top:8px">No RESEND_API_KEY set, so sending is disabled - the draft still saves, and Reply by email works.</div>`}
              </form>
            </div>
          </section>
        </div>

        <div class="form-side">
          <section class="form-section">
            <header><h3>Contact</h3></header>
            <div class="body">
              <div class="kv"><span class="k">Name</span><span class="v">${esc(e.name || "—")}</span></div>
              <div class="kv"><span class="k">Email</span><span class="v"><a href="mailto:${esc(e.email)}">${esc(e.email || "—")}</a></span></div>
              <div class="kv"><span class="k">Company</span><span class="v">${esc(e.company || "—")}</span></div>
              <div class="kv"><span class="k">Received</span><span class="v">${esc(fmtWhen(e.createdAt))}</span></div>
              <div class="kv"><span class="k">NDA first</span><span class="v">${e.nda ? "Yes" : "No"}</span></div>
            </div>
          </section>

          <section class="form-section">
            <header><h3>Project</h3></header>
            <div class="body">
              <div class="kv"><span class="k">Needs</span><span class="v">${esc(e.discipline || "—")}</span></div>
              <div class="kv"><span class="k">Budget</span><span class="v">${esc(e.budget || "—")}</span></div>
              <div class="kv"><span class="k">Timeline</span><span class="v">${esc(e.timeline || "—")}</span></div>
            </div>
          </section>

          <section class="form-section">
            <header><h3>Status</h3></header>
            <div class="body">
              <form method="post" action="/admin/emails/${e.id}/status">
                <div class="field">
                  <label>Mark as</label>
                  <select name="status">
                    ${Object.entries(STATUS_LABEL).map(([v, l]) => `<option value="${v}"${e.status === v ? " selected" : ""}>${l}</option>`).join("")}
                  </select>
                </div>
                <button class="btn btn-primary btn-sm" type="submit" style="width:100%;justify-content:center">${icon("check")} Update status</button>
              </form>
            </div>
          </section>

          <form method="post" action="/admin/emails/${e.id}/delete" data-confirm="Delete this enquiry from ${esc(e.name || e.email)}? This cannot be undone.">
            <button class="btn btn-danger" type="submit">${icon("trash")} Delete enquiry</button>
          </form>
        </div>
      </div>
    </div>`,
  });
};

/* ---------------- mailbox (synced mail) ---------------- */

const mailRow = (m) => {
  const out = m.direction === "out";
  const who = out ? m.toEmails || m.ccEmails : m.fromName || m.fromEmail;
  const linked = Boolean(m.enquiryId);
  const title = m.subject || "(no subject)";
  const search = [m.subject, m.fromName, m.fromEmail, m.toEmails, m.ccEmails, m.snippet, m.enquiryName, m.enquiryEmail]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return `
  <a class="row-item email-row mail-row" href="/admin/mail/${m.id}"
     data-item
     data-link="${linked ? "linked" : "unlinked"}"
     data-direction="${out ? "out" : "in"}"
     data-search-text="${esc(search)}">
    <span class="avatar sm">${esc((who || "?").slice(0, 1).toUpperCase())}</span>
    <span class="row-main">
      <span class="rt" style="display:block">${esc(title)}</span>
      <span class="rs">
        <span class="chip">${out ? "To" : "From"} ${esc(who || "unknown")}</span>
        ${linked ? `<span class="chip chip-mail">${esc(m.enquiryName || m.enquiryEmail || "Enquiry")}</span>` : `<span class="chip">Unlinked</span>`}
      </span>
      <span class="mail-snippet">${esc(m.snippet || "(empty message)")}</span>
    </span>
    <span class="row-actions">
      <span class="when">${esc(fmtWhen(m.sentAt || m.createdAt))}</span>
      <span class="direction ${out ? "out" : "in"}">${out ? "Sent" : "Received"}</span>
    </span>
  </a>`;
};

export const mailList = ({ messages = [], counts = {}, filter = "", configured = false, user, flash }) =>
  layout({
    title: "Mailbox",
    subtitle: counts.total
      ? `${counts.total} synced message${counts.total === 1 ? "" : "s"}${counts.unlinked ? ` · ${counts.unlinked} unlinked` : ""}`
      : "Synced mail from your studio inbox",
    active: "mail",
    user,
    flash,
    actions: `<form method="post" action="/admin/mail/sync">
        <button class="btn btn-primary btn-sm" type="submit" ${configured ? "" : `disabled title="Add IMAP_USER and IMAP_PASSWORD to server/.env"`}>${icon("inbox")} Sync now</button>
      </form>`,
    body: `
      ${configured
        ? ""
        : `<div class="notice notice-warn"><strong>IMAP is not connected.</strong> Add <code>IMAP_USER</code> and <code>IMAP_PASSWORD</code> to <code>server/.env</code>, then restart the admin. See <code>server/README.md</code> for a Gmail app password.</div>`}
      ${messages.length
        ? `
        <div data-list-root>
          <div class="toolbar">
            <div class="search">${icon("search")}<input type="text" data-search placeholder="Search subject, sender, recipient or preview…" /></div>
            <div class="filters">
              <select data-filter="link" style="width:auto">
                <option value="">All mail</option>
                <option value="linked"${filter === "linked" ? " selected" : ""}>Linked to enquiries</option>
                <option value="unlinked"${filter === "unlinked" ? " selected" : ""}>Unlinked</option>
              </select>
              <select data-filter="direction" style="width:auto">
                <option value="">Both directions</option>
                <option value="in">Received</option>
                <option value="out">Sent</option>
              </select>
            </div>
          </div>
          <div class="list">${messages.map(mailRow).join("")}</div>
          <div class="empty hidden" data-no-results><h3>No matches</h3><p>Try a different search or filter.</p></div>
        </div>`
        : `<div class="empty"><div class="icon">${icon("inbox")}</div><h3>No synced mail yet</h3><p>${configured
            ? "Click Sync now to pull the newest messages from INBOX and Sent. The admin also syncs in the background while it runs."
            : "Connect a mailbox over IMAP and the newest messages will appear here."}</p></div>`}
    `,
  });

export const mailDetail = ({ m, enquiry = null, user, flash }) => {
  const out = m.direction === "out";
  return layout({
    title: m.subject || "(no subject)",
    subtitle: out ? `Sent to ${m.toEmails || "—"}` : `From ${m.fromName || m.fromEmail || "—"}`,
    active: "mail",
    user,
    flash,
    actions: `<a class="btn btn-ghost" href="/admin/mail">${icon("arrowLeft")} Mailbox</a>
      ${enquiry ? `<a class="btn btn-ghost" href="/admin/emails/${enquiry.id}">${icon("mail")} Open enquiry</a>` : ""}`,
    body: `
      <div class="mail-detail">
        <section class="form-section">
          <header>
            <h3>${esc(m.subject || "(no subject)")}</h3>
            <span class="desc">${esc(fmtWhen(m.sentAt || m.createdAt))}</span>
          </header>
          <div class="body">
            <div class="kv"><span class="k">From</span><span class="v">${esc(m.fromName ? `${m.fromName} <${m.fromEmail}>` : m.fromEmail || "—")}</span></div>
            <div class="kv"><span class="k">To</span><span class="v">${esc(m.toEmails || "—")}</span></div>
            ${m.ccEmails ? `<div class="kv"><span class="k">Cc</span><span class="v">${esc(m.ccEmails)}</span></div>` : ""}
            <div class="kv"><span class="k">Direction</span><span class="v">${out ? "Sent from the studio" : "Received"}</span></div>
            <div class="kv"><span class="k">Folder</span><span class="v">${esc(m.source || "—")}</span></div>
            <div class="kv"><span class="k">Enquiry</span><span class="v">${enquiry
              ? `<a href="/admin/emails/${enquiry.id}">${esc(enquiry.name || enquiry.email)}</a>`
              : `<span class="muted">Not linked to an enquiry</span>`}</span></div>
          </div>
        </section>

        <section class="form-section">
          <header><h3>Message</h3></header>
          <div class="body">
            <div class="thread-body thread-body-full">${esc(m.bodyText || m.snippet || "(empty message)")}</div>
          </div>
        </section>

        ${enquiry
          ? `<p class="muted" style="font-size:13px">This message is filed under <a href="/admin/emails/${enquiry.id}">${esc(enquiry.name || enquiry.email)}</a>.</p>`
          : `<p class="muted" style="font-size:13px">No matching enquiry was found for this message, so it is stored on its own.</p>`}
      </div>`,
  });
};

/* ---------------- media library page ---------------- */

export const mediaLibrary = ({ media = [], user = null, flash = null }) => {
  const grid = media.map(mediaTile).join("");
  return layout({
    title: "Media",
    subtitle: `${media.length} ${media.length === 1 ? "file" : "files"}`,
    active: "media",
    user,
    flash,
    body: `
      <div class="media-page" data-media-library>
        <div class="media-page-head">
          <p class="media-page-hint">Drag images anywhere on this card to upload. Click a file to copy its URL.</p>
          <button type="button" class="btn btn-primary" data-media-upload-btn>${icon("plus")} Upload image</button>
        </div>
        <div class="media-grid" data-media-grid>${grid}</div>
        <div class="media-empty" data-media-empty ${media.length ? "hidden" : ""}>${icon("image")}<p>No media yet — upload your first image.</p></div>
        <input type="file" accept="image/*" multiple hidden data-media-file />
        <p class="media-note">Saved to <code>public/media</code> and served from <code>/media/…</code>. Run <code>npm run build</code> to publish new files to the live site.</p>
      </div>`,
  });
};
