import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CHROME = "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.resolve("shots");
const PORT = 9222;

if (!existsSync(OUT)) mkdirSync(OUT);

const profile = mkdtempSync(path.join(tmpdir(), "cdp-"));

const chrome = spawn(CHROME, [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`,
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-gpu",
  "--hide-scrollbars",
  "--window-size=1440,1000",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cdpTargets() {
  const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
  return res.json();
}

let ws;
let msgId = 0;
const pending = new Map();
const consoleMsgs = [];
const failedReqs = [];

function send(method, params = {}, sessionId) {
  const id = ++msgId;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
}

async function main() {
  // wait for devtools
  let targets = null;
  for (let i = 0; i < 40; i++) {
    try {
      targets = await cdpTargets();
      if (targets.length) break;
    } catch {}
    await sleep(500);
  }
  if (!targets?.length) throw new Error("devtools never came up");

  const { WebSocket } = await import("ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
  const page = targets.find((t) => t.type === "page") || targets[0];
  ws = new WebSocket(page.webSocketDebuggerUrl);

  await new Promise((r) => (ws.onopen = r));

  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      return;
    }
    if (m.method === "Runtime.consoleAPICalled") {
      consoleMsgs.push({
        type: m.params.type,
        text: m.params.args.map((a) => a.value ?? a.description ?? a.type).join(" "),
      });
    }
    if (m.method === "Runtime.exceptionThrown") {
      consoleMsgs.push({
        type: "EXCEPTION",
        text: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text,
      });
    }
    if (m.method === "Network.loadingFailed") {
      failedReqs.push(m.params.errorText);
    }
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
      failedReqs.push(`${m.params.response.status} ${m.params.response.url}`);
    }
  };

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false,
  });

  const pages = process.argv.slice(2);
  for (const route of pages) {
    consoleMsgs.length = 0;
    failedReqs.length = 0;

    await send("Page.navigate", { url: `http://localhost:4321${route}` });
    await sleep(2500);

    // scroll the whole page so every IntersectionObserver fires
    await send("Runtime.evaluate", {
      awaitPromise: true,
      expression: `(async () => {
        const step = window.innerHeight * 0.7;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          scrollTo(0, y);
          await new Promise(r => setTimeout(r, 90));
        }
        scrollTo(0, document.documentElement.scrollHeight);
        await new Promise(r => setTimeout(r, 900));
        scrollTo(0, 0);
        await new Promise(r => setTimeout(r, 300));
      })()`,
    });
    await sleep(800);

    // measure what is actually invisible after load
    const probe = await send("Runtime.evaluate", {
      returnByValue: true,
      expression: `(() => {
        const hidden = [];
        document.querySelectorAll('.reveal-item, .reveal-mask, .reveal-line, [data-tilt], [data-tilt-3d], [data-identity-stage]')
          .forEach(el => {
            const cs = getComputedStyle(el);
            const r = el.getBoundingClientRect();
            const invisible = parseFloat(cs.opacity) < 0.05 || (el.scrollWidth === 0 && el.scrollHeight === 0);
            const offscreen = el.classList.contains('reveal-line') && !el.classList.contains('revealed')
              && getComputedStyle(el.firstElementChild || el).transform !== 'none';
            if (invisible || offscreen) hidden.push({
              cls: el.className.toString().slice(0, 70),
              opacity: cs.opacity, unrevealed: !el.classList.contains('revealed'),
              offscreen,
              top: Math.round(r.top + scrollY), h: Math.round(r.height)
            });
          });
        return {
          total: document.querySelectorAll('.reveal-item, .reveal-mask, .reveal-line').length,
          revealed: document.querySelectorAll('.revealed').length,
          hiddenCount: hidden.length,
          hidden: hidden.slice(0, 12),
          scrollH: document.documentElement.scrollHeight,
          bodyFont: getComputedStyle(document.body).fontFamily,
          h1: (() => { const h = document.querySelector('h1'); return h ? { cls: h.className.slice(0,60), fs: getComputedStyle(h).fontSize, ff: getComputedStyle(h).fontFamily } : null; })(),
          fontsLoaded: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family).filter((v,i,a)=>a.indexOf(v)===i),
          overflowX: document.documentElement.scrollWidth > window.innerWidth + 1
        };
      })()`,
    });

    const name = route === "/" ? "index" : route.replace(/[/.]/g, "_").replace(/^_/, "");
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
    writeFileSync(path.join(OUT, `${name}.png`), Buffer.from(shot.data, "base64"));

    console.log(`\n=== ${route} ===`);
    console.log(JSON.stringify(probe.result.value, null, 1));
    if (consoleMsgs.length) console.log("CONSOLE:", JSON.stringify(consoleMsgs, null, 1));
    if (failedReqs.length) console.log("FAILED REQ:", JSON.stringify([...new Set(failedReqs)], null, 1));
  }

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error("ERR", e);
  chrome.kill();
  process.exit(1);
});
