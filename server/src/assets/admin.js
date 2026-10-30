/* ==================================================================
   KAYTHEBOSS Admin — interactions
   No dependencies. Progressive enhancement only.
   ================================================================== */
(function () {
  "use strict";

  /* ---------------- Sidebar (mobile) ---------------- */
  function initNav() {
    var app = document.querySelector(".app");
    var toggle = document.querySelector("[data-menu-toggle]");
    if (!app || !toggle) return;
    toggle.addEventListener("click", function () {
      app.classList.toggle("nav-open");
    });
    app.addEventListener("click", function (e) {
      if (app.classList.contains("nav-open") && e.target === app) {
        app.classList.remove("nav-open");
      }
    });
  }

  /* ---------------- Toasts ---------------- */
  function toast(message, type) {
    var wrap = document.querySelector(".toasts");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "toasts";
      document.body.appendChild(wrap);
    }
    var el = document.createElement("div");
    el.className = "toast" + (type === "err" ? " err" : "");
    var icon = type === "err"
      ? '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5"/><path d="M12 16h.01"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5"/></svg>';
    el.innerHTML = icon + "<span></span>";
    el.querySelector("span").textContent = message;
    wrap.appendChild(el);
    setTimeout(function () {
      el.classList.add("hide");
      setTimeout(function () { el.remove(); }, 260);
    }, 3200);
  }
  window.kbToast = toast;

  function initFlash() {
    var el = document.querySelector("[data-flash]");
    if (!el) return;
    var msg = el.getAttribute("data-flash");
    var type = el.getAttribute("data-flash-type") || "ok";
    if (msg) setTimeout(function () { toast(msg, type); }, 120);
  }

  /* ---------------- Search + filters ---------------- */
  function initFilter() {
    var root = document.querySelector("[data-list-root]");
    if (!root) return;
    var search = root.querySelector("[data-search]");
    var filters = root.querySelectorAll("[data-filter]");
    var items = root.querySelectorAll("[data-item]");
    var empty = root.querySelector("[data-no-results]");

    function apply() {
      var q = (search && search.value || "").trim().toLowerCase();
      var active = {};
      filters.forEach(function (f) {
        if (f.value) active[f.getAttribute("data-filter")] = f.value.toLowerCase();
      });
      var shown = 0;
      items.forEach(function (item) {
        var hay = (item.getAttribute("data-search-text") || "").toLowerCase();
        var ok = !q || hay.indexOf(q) !== -1;
        Object.keys(active).forEach(function (key) {
          var val = (item.getAttribute("data-" + key) || "").toLowerCase();
          if (val !== active[key]) ok = false;
        });
        item.classList.toggle("hidden", !ok);
        if (ok) shown++;
      });
      if (empty) empty.classList.toggle("hidden", shown !== 0);
    }

    if (search) search.addEventListener("input", apply);
    filters.forEach(function (f) { f.addEventListener("change", apply); });
    apply();
  }

  /* ---------------- Drag to reorder ---------------- */
  function initReorder() {
    var list = document.querySelector("[data-reorder]");
    if (!list) return;
    var endpoint = list.getAttribute("data-reorder");
    var dragging = null;

    list.querySelectorAll("[data-item]").forEach(function (item) {
      var handle = item.querySelector(".drag-handle");
      if (!handle) return;
      handle.setAttribute("draggable", "true");
      handle.addEventListener("dragstart", function (e) {
        dragging = item;
        item.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
      });
      handle.addEventListener("dragend", function () {
        item.classList.remove("dragging");
        dragging = null;
        list.querySelectorAll(".drop-target").forEach(function (n) {
          n.classList.remove("drop-target");
        });
      });
    });

    list.addEventListener("dragover", function (e) {
      if (!dragging) return;
      e.preventDefault();
      var target = e.target.closest("[data-item]");
      if (!target || target === dragging) return;
      var rect = target.getBoundingClientRect();
      var after = (e.clientY - rect.top) / rect.height > 0.5;
      list.insertBefore(dragging, after ? target.nextSibling : target);
      list.querySelectorAll(".drop-target").forEach(function (n) { n.classList.remove("drop-target"); });
      target.classList.add("drop-target");
    });

    list.addEventListener("drop", function (e) {
      e.preventDefault();
      if (!dragging) return;
      var order = Array.prototype.map.call(
        list.querySelectorAll("[data-item]"),
        function (n) { return n.getAttribute("data-id"); }
      );
      fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order: order }),
      }).then(function (r) {
        if (r.ok) toast("Order saved");
        else toast("Could not save order", "err");
      }).catch(function () {
        toast("Could not save order", "err");
      });
    });
  }

  /* ---------------- Confirm modal for destructive forms ---------------- */
  function initConfirm() {
    var scrim = document.createElement("div");
    scrim.className = "modal-scrim";
    scrim.innerHTML =
      '<div class="modal" role="dialog" aria-modal="true">' +
      "<h3>Are you sure?</h3>" +
      '<p data-confirm-text></p>' +
      '<div class="actions">' +
      '<button type="button" class="btn btn-ghost" data-confirm-cancel>Cancel</button>' +
      '<button type="button" class="btn btn-danger" data-confirm-ok>Delete</button>' +
      "</div></div>";
    document.body.appendChild(scrim);

    var pending = null;
    var label = scrim.querySelector("[data-confirm-text]");
    var okBtn = scrim.querySelector("[data-confirm-ok]");

    function setOk(text, variant) {
      okBtn.textContent = text || "Delete";
      okBtn.className = "btn " + (variant === "primary" ? "btn-primary" : "btn-danger");
    }

    function close() { scrim.classList.remove("open"); pending = null; }

    scrim.querySelector("[data-confirm-cancel]").addEventListener("click", close);
    scrim.addEventListener("click", function (e) { if (e.target === scrim) close(); });
    okBtn.addEventListener("click", function () {
      if (!pending) return;
      var p = pending;
      pending = null;
      scrim.classList.remove("open");
      if (p.btn) {
        /* Keep the submitter so its formaction (e.g. /reply) is used. */
        if (p.form.requestSubmit) p.form.requestSubmit(p.btn);
        else p.form.submit();
      } else {
        p.form.submit();
      }
    });

    document.querySelectorAll("form[data-confirm]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        pending = { form: form };
        label.textContent = form.getAttribute("data-confirm") || "This cannot be undone.";
        setOk(null, null);
        scrim.classList.add("open");
      });
    });

    /* Buttons that post somewhere other than their form action (Send
       reply) confirm on the button so the edited textarea is still sent. */
    document.querySelectorAll("button[data-confirm-submit]").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (btn.disabled || !btn.form) return;
        e.preventDefault();
        pending = { form: btn.form, btn: btn };
        label.textContent = btn.getAttribute("data-confirm") || "Are you sure?";
        setOk(btn.getAttribute("data-confirm-ok"), btn.getAttribute("data-confirm-variant"));
        scrim.classList.add("open");
      });
    });
  }

  /* ---------------- Image preview ---------------- */
  var IMG_PLACEHOLDER =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
        '<rect width="100%" height="100%" fill="#17181d"/>' +
        '<text x="50%" y="50%" fill="#71717a" font-family="sans-serif" font-size="15" text-anchor="middle" dominant-baseline="middle">No image</text>' +
        "</svg>"
    );

  function initImagePreview() {
    var input = document.querySelector("[data-image-input]");
    var preview = document.querySelector("[data-image-preview]");
    if (!input || !preview) return;
    function update() {
      var v = input.value.trim();
      if (!v) {
        preview.src = IMG_PLACEHOLDER;
        return;
      }
      preview.src = /^https?:\/\//.test(v) || v.charAt(0) === "/" ? v : "/admin/img/" + v;
    }
    input.addEventListener("input", update);
    update();
  }

  /* ---------------- Dirty-state hint ---------------- */
  function initDirty() {
    var form = document.querySelector("form[data-track-dirty]");
    if (!form) return;
    var bar = form.querySelector("[data-dirty]");
    if (!bar) return;
    var initial = new FormData(form);
    var initialStr = new URLSearchParams(initial).toString();
    form.addEventListener("input", function () {
      var now = new URLSearchParams(new FormData(form)).toString();
      bar.textContent = now === initialStr ? "" : "Unsaved changes";
    });
  }

  /* ---------------- Slug auto-fill ---------------- */
  function initSlug() {
    var title = document.querySelector("[data-slug-source]");
    var slug = document.querySelector("[data-slug-target]");
    if (!title || !slug) return;
    var manual = slug.value.trim() !== "";
    slug.addEventListener("input", function () { manual = slug.value.trim() !== ""; });
    title.addEventListener("input", function () {
      if (manual) return;
      slug.value = title.value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    });
  }

  /* ---------------- Settings editor ---------------- */
  function lineList(v) {
    return String(v || "")
      .split(/\r?\n/)
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
  }

  function initRepeaters(form) {
    form.querySelectorAll("[data-repeater]").forEach(function (rep) {
      var rows = rep.querySelector("[data-rows]");
      var tpl = rep.querySelector("template[data-row-template]");
      var add = rep.querySelector("[data-add]");

      function addRow() {
        if (!tpl) return;
        var node = tpl.content.firstElementChild.cloneNode(true);
        rows.appendChild(node);
        var first = node.querySelector("input, textarea");
        if (first) first.focus();
        return node;
      }

      if (add) add.addEventListener("click", function () { addRow(); });

      rep.addEventListener("click", function (e) {
        var row = e.target.closest("[data-row]");
        if (!row) return;
        if (e.target.closest("[data-remove]")) { row.remove(); return; }
        if (e.target.closest("[data-up]") && row.previousElementSibling) {
          rows.insertBefore(row, row.previousElementSibling);
        }
        if (e.target.closest("[data-down]") && row.nextElementSibling) {
          rows.insertBefore(row.nextElementSibling, row);
        }
      });

      if (!rows.querySelector("[data-row]") && tpl) addRow();
    });
  }

  function readSettings(form) {
    function val(key) {
      var el = form.querySelector('[data-field="' + key + '"]');
      return el ? el.value : "";
    }
    function rowsIn(name) {
      return Array.prototype.slice.call(
        form.querySelectorAll('[data-repeater="' + name + '"] [data-rows] [data-row]')
      );
    }
    function input(row, key) {
      var el = row.querySelector('[data-in="' + key + '"]');
      return el ? el.value.trim() : "";
    }

    var nav = rowsIn("nav")
      .map(function (r) { return { label: input(r, "label"), href: input(r, "href") }; })
      .filter(function (n) { return n.label || n.href; });

    var disciplines = rowsIn("disciplines")
      .map(function (r) {
        var pts = r.querySelector('[data-in="points"]');
        return {
          index: input(r, "index"),
          title: input(r, "title"),
          icon: input(r, "icon"),
          code: input(r, "code"),
          body: input(r, "body"),
          points: lineList(pts ? pts.value : ""),
        };
      })
      .filter(function (d) { return d.title || d.body; });

    return {
      name: val("name").trim(),
      tagline: val("tagline").trim(),
      description: val("description").trim(),
      url: val("url").trim().replace(/\/+$/, ""),
      locale: val("locale").trim(),
      email: val("email").trim(),
      locations: lineList(val("locations")),
      nav: nav,
      disciplines: disciplines,
      ethos: lineList(val("ethos")),
    };
  }

  function initSettingsForm() {
    var form = document.querySelector("[data-settings-form]");
    if (!form) return;
    var slot = form.querySelector("[data-settings-json]");
    var dirty = form.querySelector("[data-dirty]");
    initRepeaters(form);

    var initial = JSON.stringify(readSettings(form));

    form.addEventListener("input", function () {
      if (!dirty) return;
      dirty.textContent =
        JSON.stringify(readSettings(form)) === initial ? "" : "Unsaved changes";
    });

    form.addEventListener("submit", function () {
      if (slot) {
        slot.name = "site";
        slot.value = JSON.stringify(readSettings(form));
      }
    });
  }

  /* ---------------- Rich text editor ---------------- */
  function escapeText(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function initEditors() {
    document.querySelectorAll("[data-editor]").forEach(function (root) {
      var surface = root.querySelector("[data-editor-surface]");
      var input = root.querySelector("[data-editor-input]");
      var toolbar = root.querySelector("[data-editor-toolbar]");
      var sourceBtn = root.querySelector("[data-editor-source]");
      if (!surface || !input || !toolbar) return;

      surface.innerHTML = input.value || "";

      var sync = function () { input.value = surface.innerHTML.trim(); };
      var form = root.closest("form");

      try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch (e) {}

      function toggleSource() {
        var source = root.classList.toggle("source-mode");
        if (source) {
          sync();
          input.hidden = false;
          surface.hidden = true;
          sourceBtn.textContent = "Preview";
          input.focus();
        } else {
          surface.innerHTML = input.value;
          surface.hidden = false;
          input.hidden = true;
          sourceBtn.textContent = "HTML";
          sync();
        }
      }

      toolbar.addEventListener("mousedown", function (e) {
        if (e.target.closest("button")) e.preventDefault();
      });

      toolbar.addEventListener("click", function (e) {
        var btn = e.target.closest("button");
        if (!btn) return;
        if (btn.hasAttribute("data-editor-source")) { toggleSource(); return; }
        var cmd = btn.getAttribute("data-cmd");
        if (!cmd) return;
        var arg = btn.getAttribute("data-arg");
        surface.focus();
        if (cmd === "createLink") {
          var url = window.prompt("Link address", "https://");
          if (!url) return;
          document.execCommand("createLink", false, url);
        } else if (cmd === "formatBlock") {
          document.execCommand("formatBlock", false, arg);
        } else {
          document.execCommand(cmd, false, null);
        }
        sync();
        refreshActive();
      });

      surface.addEventListener("input", sync);
      surface.addEventListener("blur", sync);

      surface.addEventListener("paste", function (e) {
        e.preventDefault();
        var text = (e.clipboardData || window.clipboardData).getData("text/plain");
        var html = text
          .split(/\n{2,}/)
          .map(function (par) {
            return "<p>" + escapeText(par).split(/\n/).join("<br>") + "</p>";
          })
          .join("");
        document.execCommand("insertHTML", false, html);
        sync();
      });

      function refreshActive() {
        root.querySelectorAll("[data-cmd]").forEach(function (b) {
          var c = b.getAttribute("data-cmd");
          var on = false;
          try {
            if (c === "formatBlock") {
              var want = (b.getAttribute("data-arg") || "").toUpperCase();
              var now = String(document.queryCommandValue("formatBlock")).toUpperCase().replace(/[<>]/g, "");
              on = now === want;
            } else if (c === "bold" || c === "italic" || c === "insertUnorderedList" || c === "insertOrderedList") {
              on = document.queryCommandState(c);
            }
          } catch (e) {}
          b.classList.toggle("active", !!on);
        });
      }

      document.addEventListener("selectionchange", function () {
        if (document.activeElement === surface) refreshActive();
      });

      if (form) form.addEventListener("submit", sync);
    });
  }

  function initCopy() {
    document.querySelectorAll("[data-copy-target]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var form = btn.closest("form");
        var field = form && form.querySelector("textarea, input[type=text]");
        if (!field) return;
        var text = field.value;
        var done = function () { toast("Copied to clipboard"); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(done, function () {
            field.select(); document.execCommand("copy"); done();
          });
        } else {
          field.select();
          document.execCommand("copy");
          done();
        }
      });
    });
  }

  /* ---------------- Media library & picker ---------------- */
  var TRASH_SVG =
    '<svg viewBox="0 0 24 24"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>';

  function mediaEsc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtBytes(n) {
    if (n == null || n === "") return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return Math.round(n / 1024) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function mediaTile(m) {
    return (
      '<div class="media-tile" data-media-tile data-name="' + mediaEsc(m.name) + '" data-url="' + mediaEsc(m.url) + '">' +
      '<button type="button" class="media-tile-pick" data-media-pick title="' + mediaEsc(m.name) + '"><img src="' + mediaEsc(m.url) + '" alt="' + mediaEsc(m.name) + '" loading="lazy" /></button>' +
      '<div class="media-tile-meta"><span class="media-tile-name" title="' + mediaEsc(m.name) + '">' + mediaEsc(m.name) + '</span><span class="media-tile-size">' + mediaEsc(fmtBytes(m.size)) + "</span></div>" +
      '<button type="button" class="media-tile-del" data-media-delete title="Delete this file">' + TRASH_SVG + "</button>" +
      "</div>"
    );
  }

  function copyText(text) {
    var done = function () { toast("URL copied"); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { window.prompt("Copy URL", text); });
    } else {
      window.prompt("Copy URL", text);
    }
  }

  var IMG_EXT = /\.(png|jpe?g|webp|gif|svg|avif)$/i;

  function uploadFiles(files, scope, onEach) {
    var list = Array.prototype.slice.call(files || []).filter(function (f) {
      return /^image\//.test(f.type) || IMG_EXT.test(f.name);
    });
    if (!list.length) {
      toast("Only image files are supported", "err");
      return;
    }
    toast("Uploading " + list.length + (list.length > 1 ? " files…" : " file…"));
    var jobs = list.map(function (f) {
      return fetch("/admin/media/upload?name=" + encodeURIComponent(f.name), {
        method: "POST",
        headers: { "content-type": "application/octet-stream" },
        body: f,
      })
        .then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (d) {
            return { ok: r.ok && d.ok, d: d };
          });
        })
        .catch(function () { return { ok: false, d: {} }; });
    });
    Promise.all(jobs).then(function (results) {
      var good = [];
      results.forEach(function (r) {
        if (r.ok) good.push(r.d);
        else toast((r.d && r.d.error) || "Upload failed", "err");
      });
      if (good.length) {
        toast(good.length + " uploaded");
        if (scope) refreshMedia(scope);
        if (onEach) good.forEach(onEach);
      }
    });
  }

  function refreshMedia(scope) {
    var grid = scope.querySelector("[data-media-grid]");
    var empty = scope.querySelector("[data-media-empty]");
    return fetch("/admin/media/list", { headers: { accept: "application/json" } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        var items = (d && d.media) || [];
        if (grid) grid.innerHTML = items.map(mediaTile).join("");
        if (empty) empty.hidden = items.length !== 0;
        return items;
      })
      .catch(function () { toast("Could not load library", "err"); return []; });
  }

  function deleteMediaTile(tile, scope) {
    if (!tile) return;
    var name = tile.getAttribute("data-name");
    if (!window.confirm('Delete "' + name + '"? This cannot be undone.')) return;
    fetch("/admin/media/delete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name }),
    })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok) {
          tile.remove();
          var empty = scope && scope.querySelector("[data-media-empty]");
          if (empty && scope && !scope.querySelector("[data-media-tile]")) empty.hidden = false;
          toast("Deleted");
        } else {
          toast((res.d && res.d.error) || "Could not delete", "err");
        }
      })
      .catch(function () { toast("Could not delete", "err"); });
  }

  function setMediaValue(input, url) {
    if (!input) return;
    input.value = url || "";
    var field = input.closest("[data-media-field]");
    if (field) {
      var val = field.querySelector("[data-media-value]");
      if (val) {
        val.textContent = url || "No image selected";
        val.title = url || "";
      }
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function initMediaField(field, modal) {
    var input = field.querySelector("[data-image-input]");
    var drop = field.querySelector("[data-media-drop]");
    var fileInput = field.querySelector("[data-media-file]");
    var chooseBtn = field.querySelector("[data-media-choose]");
    var clearBtn = field.querySelector("[data-media-clear]");
    if (!input) return;

    function browse() { if (fileInput) fileInput.click(); }

    if (drop) {
      drop.addEventListener("click", browse);
      drop.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); browse(); }
      });
      ["dragenter", "dragover"].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add("drag-over"); });
      });
      ["dragleave", "dragend"].forEach(function (ev) {
        drop.addEventListener(ev, function () { drop.classList.remove("drag-over"); });
      });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("drag-over");
        uploadFiles(e.dataTransfer && e.dataTransfer.files, null, function (d) {
          setMediaValue(input, d.url);
        });
      });
    }

    if (fileInput) {
      fileInput.addEventListener("change", function () {
        uploadFiles(fileInput.files, null, function (d) { setMediaValue(input, d.url); });
        fileInput.value = "";
      });
    }

    if (chooseBtn && modal) {
      chooseBtn.addEventListener("click", function () {
        openMediaModal(modal, input);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener("click", function () { setMediaValue(input, ""); });
    }
  }

  var mediaModalState = { target: null, modal: null };

  function openMediaModal(modal, input) {
    mediaModalState.target = input;
    mediaModalState.modal = modal;
    modal.hidden = false;
    document.documentElement.classList.add("media-open");
    refreshMedia(modal);
  }

  function closeMediaModal() {
    var modal = mediaModalState.modal;
    if (modal) modal.hidden = true;
    document.documentElement.classList.remove("media-open");
    mediaModalState.target = null;
  }

  function initMedia() {
    var modal = document.querySelector("[data-media-modal]");

    document.querySelectorAll("[data-media-field]").forEach(function (field) {
      initMediaField(field, modal);
    });

    if (modal) {
      modal.addEventListener("click", function (e) {
        if (e.target.closest("[data-media-modal-close]")) { closeMediaModal(); return; }
        var del = e.target.closest("[data-media-delete]");
        if (del) { deleteMediaTile(del.closest("[data-media-tile]"), modal); return; }
        var pick = e.target.closest("[data-media-pick]");
        if (pick) {
          var tile = pick.closest("[data-media-tile]");
          var url = tile && tile.getAttribute("data-url");
          if (url && mediaModalState.target) {
            setMediaValue(mediaModalState.target, url);
            toast("Image selected");
            closeMediaModal();
          } else if (url) {
            copyText(url);
          }
        }
      });

      var modalBtn = modal.querySelector("[data-media-upload-btn]");
      var modalFile = modal.querySelector("[data-media-file]");
      if (modalBtn && modalFile) modalBtn.addEventListener("click", function () { modalFile.click(); });
      if (modalFile) {
        modalFile.addEventListener("change", function () {
          var target = mediaModalState.target;
          uploadFiles(modalFile.files, modal, function (d) {
            if (target) setMediaValue(target, d.url);
          });
          modalFile.value = "";
        });
      }
    }

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && mediaModalState.modal && !mediaModalState.modal.hidden) closeMediaModal();
    });

    var lib = document.querySelector("[data-media-library]");
    if (lib) {
      var libBtn = lib.querySelector("[data-media-upload-btn]");
      var libFile = lib.querySelector("[data-media-file]");
      if (libBtn && libFile) libBtn.addEventListener("click", function () { libFile.click(); });
      if (libFile) {
        libFile.addEventListener("change", function () {
          uploadFiles(libFile.files, lib);
          libFile.value = "";
        });
      }
      lib.addEventListener("click", function (e) {
        var del = e.target.closest("[data-media-delete]");
        if (del) { deleteMediaTile(del.closest("[data-media-tile]"), lib); return; }
        var pick = e.target.closest("[data-media-pick]");
        if (pick) {
          var t = pick.closest("[data-media-tile]");
          if (t) copyText(t.getAttribute("data-url"));
        }
      });
      ["dragenter", "dragover"].forEach(function (ev) {
        lib.addEventListener(ev, function (e) { e.preventDefault(); lib.classList.add("drag-over"); });
      });
      lib.addEventListener("dragleave", function (e) {
        if (e.target === lib) lib.classList.remove("drag-over");
      });
      lib.addEventListener("drop", function (e) {
        e.preventDefault();
        lib.classList.remove("drag-over");
        uploadFiles(e.dataTransfer && e.dataTransfer.files, lib);
      });
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initFlash();
    initFilter();
    initReorder();
    initConfirm();
    initImagePreview();
    initDirty();
    initSlug();
    initSettingsForm();
    initEditors();
    initCopy();
    initMedia();
  });
})();
