import { spawn } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const profile = mkdtempSync(path.join(tmpdir(), "cdp2-"));
const PORT = 9333;

const chrome = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  "--no-first-run", "--disable-gpu", "--hide-scrollbars", "--window-size=1440,1000", "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws, msgId = 0;
const pending = new Map();
const send = (method, params = {}, sessionId) => {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
};

const targets = await (async () => {
  for (let i = 0; i < 40; i++) {
    try { const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (t.length) return t; } catch {}
    await sleep(500);
  }
})();

const page = targets.find((t) => t.type === "page");
const { WebSocket } = await import("ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
ws = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
};

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: `http://localhost:4321${process.argv[2] || "/"}` });
await sleep(3500);

const r = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const out = [];
    document.querySelectorAll('main > section, main section > div').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.height < 1000) return;
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && el.className.toString().slice(0,70)) || '',
        h: Math.round(rect.height),
        top: Math.round(rect.top + scrollY),
        children: el.children.length,
        innerLen: el.innerHTML.length,
        firstKid: el.firstElementChild ? el.firstElementChild.tagName.toLowerCase() + '.' + (el.firstElementChild.className.toString().slice(0,50)) : null
      });
    });
    return out.sort((a,b) => b.h - a.h).slice(0, 14);
  })()`,
});
console.log(JSON.stringify(r.result.value, null, 1));

// also: how many cards actually rendered?
const c = await send("Runtime.evaluate", {
  returnByValue: true,
  expression: `(() => {
    const nav = document.querySelector('nav[aria-label="Main Navigation"]');
    const links = nav ? [...nav.querySelectorAll('a')] : [];
    const first = links[0];
    const after = first ? getComputedStyle(first, '::after') : null;
    return {
      navLinks: links.length,
      navText: nav ? nav.innerText.replace(/\\s+/g, ' ').trim() : null,
      navVisible: nav ? getComputedStyle(nav).display : null,
      anyEscapedTextOnPage: /<a |<div |<section /.test(document.body.innerText),
      firstLinkAfter: after ? {
        content: after.content,
        position: after.position,
        height: after.height,
        bg: after.backgroundColor,
        width: after.width,
        transition: after.transitionProperty
      } : null,
      mobileNavLinks: document.querySelectorAll('#mobile-nav a').length
    };
  })()`,
});
console.log("\n--- nav ---\n" + JSON.stringify(c.result.value, null, 1));
ws.close();
chrome.kill();
