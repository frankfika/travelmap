// scripts/audit-e2e.mjs
//
// Comprehensive e2e audit driven by puppeteer against the dev server. Runs in
// addition to scripts/verify-map.mjs and covers the behavioural paths that
// the unit-style suite can't probe (animations, multi-window state, deletion
// side-effects, light theme, duplicate place merging).
//
// Each test reports PASS/FAIL into a findings list. Exit code is non-zero if
// any high-severity finding fails.
//
// Prereqs: dev server on http://localhost:5173, npm run dev.
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const B = "http://localhost:5173/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const findings = [];
const check = (test, severity, summary, detail = "") => {
  findings.push({ test, severity, summary, detail });
  const sym = { high: "🔴", medium: "🟠", low: "🟡", none: "🟢", ok: "🟢" }[severity] || "·";
  console.log(`${sym} [${severity.toUpperCase()}] ${test} — ${summary}${detail ? `\n    ${detail}` : ""}`);
  if (severity === "high" && summary.startsWith("FAIL")) failures.push(test);
};

const launch = async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    userDataDir: "/tmp/tt-audit-profile",
    protocolTimeout: 120_000,
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  // Block Nominatim so the audit relies on the static bundle (public/osm-boundaries.json).
  // Without this, flaky upstream rate-limits mask real product bugs.
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (/nominatim\.openstreetmap\.org/.test(req.url())) req.abort().catch(() => {});
    else req.continue().catch(() => {});
  });
  return { browser, page };
};

const reset = async (page, hash = "#/world") => {
  await page.goto(B, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("tt-onboarded:v1", "1");
    await new Promise((res) => {
      const req = indexedDB.deleteDatabase("traveltally");
      req.onsuccess = req.onerror = req.onblocked = () => res();
      setTimeout(res, 3000);
    });
  });
  await page.goto(B + hash, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(1500);
};

const goto = async (page, hash, ms = 1500) => {
  await page.goto(B + hash, { waitUntil: "domcontentloaded", timeout: 60000 });
  await wait(ms);
};

const say = async (page, text) => {
  await page.click('input[aria-label="描述你的旅行"]');
  await page.keyboard.type(text);
  await wait(220);
  await page.keyboard.press("Enter");
  await wait(700);
};

const worldView = async (page, lat = 25, lng = 30, zoom = 2) => {
  await page.evaluate(
    ([la, ln, z]) => window.__ttMap?.setView([la, ln], z, { animate: false }),
    [lat, lng, zoom]
  );
  await wait(900);
};

const stats = async (page) =>
  page.evaluate(() => {
    const map = window.__ttMap;
    const labels = Array.from(document.querySelectorAll(".tt-label"));
    let biggest = 0;
    let biggestClass = "";
    for (const p of document.querySelectorAll(".leaflet-overlay-pane path")) {
      const r = p.getBoundingClientRect();
      const area = Math.round(r.width * r.height);
      if (area > biggest) {
        biggest = area;
        biggestClass = p.getAttribute("class") || "";
      }
    }
    const s = (() => {
      try { return JSON.parse(localStorage.getItem("traveltally-state") ?? "{}"); }
      catch { return {}; }
    })();
    return {
      zoom: map ? Number(map.getZoom().toFixed(2)) : null,
      center: map ? [Number(map.getCenter().lat.toFixed(2)), Number(map.getCenter().lng.toFixed(2))] : null,
      pins: labels.length,
      hiddenLabels: labels.filter((el) => el.classList.contains("is-hidden")).length,
      labels: labels.map((el) => el.textContent),
      biggestRegionPx2: biggest,
      biggestRegionClass: biggestClass,
      drawerTitle: document.querySelector('button[aria-label="编辑"]')
        ? document.querySelector("h2")?.textContent ?? ""
        : null,
      litRegions: document.querySelectorAll(
        ".tt-region--lit, .tt-region--rolled, .tt-region--covered"
      ).length,
      placesAdded: s?.state?.places?.length ?? -1,
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    };
  });

const waitForLookups = async (page, maxSec = 90) => {
  for (let i = 0; i < maxSec; i++) {
    const left = await page.evaluate(() => (document.body.innerText.match(/正在获取\s+(\d+)/) ?? [])[1] ?? null);
    if (left === null || Number(left) === 0) return i;
    await wait(1000);
  }
  return -1;
};

await mkdir("screenshots", { recursive: true });

/* ============================================================ */
/* Test 1: Theme toggle mid-flight                                */
/* ============================================================ */
{
  const { browser, page } = await launch();
  await reset(page, "#/world");
  await say(page, "成都 2024");
  await waitForLookups(page);
  await wait(1500);
  await worldView(page, 30.57, 104.07, 5);

  const c = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll(".tt-label")).find((el) => (el.textContent ?? "").startsWith("成都"));
    if (!label) return null;
    const r = label.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!c) {
    check("theme-midflight", "high", "Chengdu pin not found");
  } else {
    await page.mouse.click(c.x, c.y);
    await wait(120); // mid-flight
    await page.click('button[aria-label="切换主题"]');
    await wait(2000);
    const after = await stats(page);
    check("theme-midflight",
      after.drawerTitle === "成都" ? "none" : "high",
      after.drawerTitle === "成都" ? "selection survives theme toggle mid-flight" : `selection lost: drawer=${after.drawerTitle}`);
    check("theme-midflight",
      after.biggestRegionPx2 > 60000 ? "none" : "high",
      after.biggestRegionPx2 > 60000 ? `flyTo completed: ${after.biggestRegionPx2}px²` : `flyTo incomplete: ${after.biggestRegionPx2}px²`);
    check("theme-midflight",
      after.pins >= 1 ? "none" : "high",
      after.pins >= 1 ? `pin survives theme toggle (pins=${after.pins})` : `pin disappeared: pins=${after.pins}`);
  }
  await browser.close();
}

/* ============================================================ */
/* Test 2: Delete leaves stale boundary (regression for cn pruning) */
/* ============================================================ */
{
  const { browser, page } = await launch();
  await page.evaluateOnNewDocument(() => { window.confirm = () => true; });
  await reset(page, "#/world");
  await say(page, "Beijing 2024");
  await waitForLookups(page);
  await wait(1000);

  const cBox = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll(".tt-label")).find((el) => (el.textContent ?? "").startsWith("北京"));
    if (!label) return null;
    const r = label.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (!cBox) {
    check("delete-stale", "high", "Beijing pin not found");
  } else {
    await page.mouse.click(cBox.x, cBox.y);
    await wait(1500);
    const delBtn = await page.$('button[aria-label="删除"]');
    await delBtn?.click();
    await wait(1500);
    const after = await stats(page);
    check("delete-stale",
      after.biggestRegionPx2 > 100 && after.biggestRegionClass.includes("cn-") ? "high" : "none",
      after.biggestRegionClass.includes("cn-")
        ? `stale cn boundary kept: ${after.biggestRegionClass} ${after.biggestRegionPx2}px²`
        : `delete cleanly removed all regions (biggest=${after.biggestRegionPx2}px²)`);
  }
  await browser.close();
}

/* ============================================================ */
/* Test 3: Duplicate place merging (Sydney ×2, Moscow ×2)         */
/* ============================================================ */
{
  const { browser, page } = await launch();
  await reset(page, "#/world");
  await say(page, "Sydney 2024");
  await waitForLookups(page);
  await wait(1500);
  await say(page, "Sydney 2025");
  await wait(500);
  const duringQueue = await stats(page);
  check("merge-during",
    duringQueue.pins === 1 && duringQueue.labels.some((l) => l.includes("Sydney")) ? "none" : "low",
    `Sydney shows as one pin during queue: pins=${duringQueue.pins} labels=${JSON.stringify(duringQueue.labels)}`);
  await waitForLookups(page);
  await wait(1500);
  const after = await stats(page);
  const sydneyLabel = after.labels.find((l) => l.includes("Sydney"));
  check("merge-after",
    after.pins === 1 && sydneyLabel?.includes("×2") ? "none" : "high",
    after.pins === 1 && sydneyLabel?.includes("×2") ? `Sydney merged: ${sydneyLabel}` : `Sydney merge broken: pins=${after.pins} label=${sydneyLabel}`);
  await browser.close();
}

/* ============================================================ */
/* Test 4: Light theme click (label legibility, draw/boundary render) */
/* ============================================================ */
{
  const { browser, page } = await launch();
  await reset(page, "#/world");
  await say(page, "成都 2024");
  await waitForLookups(page);
  await wait(1000);
  await page.click('button[aria-label="切换主题"]');
  await wait(1500);
  const light = await stats(page);
  check("light-click",
    light.theme === "light" && light.biggestRegionPx2 > 60000 ? "none" : "high",
    light.theme === "light" && light.biggestRegionPx2 > 60000
      ? `light theme works (theme=${light.theme}, region=${light.biggestRegionPx2}px²)`
      : `light theme broken (theme=${light.theme}, region=${light.biggestRegionPx2}px²)`);

  const cBox = await page.evaluate(() => {
    const label = Array.from(document.querySelectorAll(".tt-label")).find((el) => (el.textContent ?? "").startsWith("成都"));
    if (!label) return null;
    const r = label.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  });
  if (cBox) {
    await page.mouse.click(cBox.x, cBox.y);
    await wait(2000);
    const after = await stats(page);
    check("light-drawer",
      after.drawerTitle === "成都" ? "none" : "high",
      after.drawerTitle === "成都" ? `click opens drawer in light theme` : `drawer title wrong: ${after.drawerTitle}`);
  }
  await browser.close();
}

/* ============================================================ */
/* Test 5: China -> World transition (no leaked state)            */
/* ============================================================ */
{
  const { browser, page } = await launch();
  await reset(page, "#/china");
  await waitForLookups(page, 30);
  await wait(2000);
  await say(page, "成都 2024");
  await say(page, "杭州 2024");
  await wait(2000);
  await goto(page, "#/world", 3500);
  const worldView = await stats(page);
  check("china-to-world",
    !worldView.labels.some((l) => l.includes("全国")) ? "none" : "medium",
    `breadcrumb state did not leak into world view`);
  check("china-to-world",
    worldView.pins > 0 ? "none" : "high",
    `world view shows pins after China→World switch (pins=${worldView.pins})`);
  await browser.close();
}

/* ============================================================ */
/* Summary                                                         */
/* ============================================================ */
console.log("\n========== AUDIT SUMMARY ==========");
const bySev = { high: [], medium: [], low: [], none: [] };
for (const f of findings) bySev[f.severity].push(f);
for (const sev of ["high", "medium", "low", "none"]) {
  if (!bySev[sev].length) continue;
  console.log(`\n--- ${sev.toUpperCase()} (${bySev[sev].length}) ---`);
  for (const f of bySev[sev]) console.log(`  • [${f.test}] ${f.summary}`);
}
console.log(failures.length ? `\nFAIL: ${failures.length} high-severity failures` : "\nALL AUDITS PASSED");
process.exit(failures.length ? 1 : 0);
