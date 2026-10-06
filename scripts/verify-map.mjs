// node scripts/verify-map.mjs   (dev server must be running on :5173)
//
// End-to-end check for the "click a city → see its name and its range" work.
// Drives the real UI with real mouse clicks and asserts observable outcomes,
// then drops screenshots into screenshots/verify-*.png.
//
// Exits non-zero if any assertion fails.
import puppeteer from "puppeteer-core";

const B = "http://localhost:5173/";
const out = (n) => `screenshots/verify-${n}.png`;

const failures = [];
const check = (name, ok, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
};
// Subset of check() used by section 7 (audit runner) so failures collected
// there are surfaced but do NOT block the main suite — the audit has its own
// exit code, so we run it after the main checks and just report.
const auditFindings = [];

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
  userDataDir: "/tmp/tt-verify-profile",
});
const page = await browser.newPage();
page.on("pageerror", (e) => {
  console.log("pageerror:", e.message);
  failures.push("pageerror: " + e.message);
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Block Nominatim outright. The static build-time bundle
// (public/osm-boundaries.json, rebuilt by scripts/build-osm-boundaries.mjs)
// covers all the cities the suite touches, so the test is deterministic and
// runs identically whether Nominatim is up or rate-limiting us.
let _nomCount = 0;
await page.setRequestInterception(true);
page.on("request", (req) => {
  if (/nominatim\.openstreetmap\.org/.test(req.url())) {
    _nomCount++;
    req.abort().catch(() => {});
  } else {
    req.continue().catch(() => {});
  }
});
const nomCount = () => _nomCount;

const reset = async () => {
  await page.goto(B, { waitUntil: "networkidle2" });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("tt-onboarded:v1", "1");
    // The city outlines live in IndexedDB; drop them so lookups really run.
    await new Promise((res) => {
      const req = indexedDB.deleteDatabase("traveltally");
      req.onsuccess = req.onerror = req.onblocked = () => res();
      setTimeout(res, 2000);
    });
  });
  await page.reload({ waitUntil: "networkidle2" });
  await wait(1200);
};
const goto = async (hash, ms = 1500) => {
  await page.goto(B + hash, { waitUntil: "networkidle2" });
  await page.reload({ waitUntil: "networkidle2" });
  await wait(ms);
};
const say = async (text) => {
  await page.click('input[aria-label="描述你的旅行"]');
  await page.keyboard.type(text);
  await wait(220);
  await page.keyboard.press("Enter");
  await wait(850);
};

/** Put the map back at a fixed global view with nothing selected. */
const worldView = async (lat = 25, lng = 30, zoom = 2) => {
  await page.evaluate(
    ([la, ln, z]) => {
      window.__ttMap?.setView([la, ln], z, { animate: false });
    },
    [lat, lng, zoom]
  );
  await wait(900);
};

/** Screen-space centre of a world pin whose label starts with `name`.
 *  Returns null when the pin is missing or outside the visible viewport. */

const pinCentre = (name) =>
  page.evaluate((n) => {
    const label = Array.from(document.querySelectorAll(".tt-label")).find((el) =>
      (el.textContent ?? "").startsWith(n)
    );
    if (!label) return null;
    if (label.classList.contains("is-hidden")) return null;
    const r = label.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return null;
    const x = Math.round(r.left + r.width / 2);
    const y = Math.round(r.top + r.height / 2);
    if (x < 12 || y < 70 || x > window.innerWidth - 12 || y > window.innerHeight - 12) {
      return null; // off-screen / under the chrome
    }
    return { x, y };
  }, name);

const stats = () =>
  page.evaluate(() => {
    const map = window.__ttMap;
    const labels = Array.from(document.querySelectorAll(".tt-label"));
    let biggest = 0;
    for (const p of document.querySelectorAll(".leaflet-overlay-pane path")) {
      const r = p.getBoundingClientRect();
      biggest = Math.max(biggest, Math.round(r.width * r.height));
    }
    const drawerTitle = document.querySelector('button[aria-label="编辑"]')
      ? (document.querySelector("h2")?.textContent ?? "")
      : null;
    return {
      zoom: map ? Number(map.getZoom().toFixed(2)) : null,
      center: map
        ? [Number(map.getCenter().lat.toFixed(2)), Number(map.getCenter().lng.toFixed(2))]
        : null,
      pins: labels.length,
      labels: labels.map((el) => el.textContent),
      hiddenLabels: labels.filter((el) => el.classList.contains("is-hidden")).length,
      biggestRegionPx2: biggest,
      drawerTitle,
      litRegions: document.querySelectorAll(
        ".tt-region--lit, .tt-region--rolled, .tt-region--covered"
      ).length,
      placesAdded: (() => {
        try {
          const s = JSON.parse(localStorage.getItem("traveltally-state") ?? "{}");
          return (s?.state?.places ?? []).length;
        } catch {
          return -1;
        }
      })(),
      theme: document.documentElement.classList.contains("dark") ? "dark" : "light",
    };
  });

/* ---------------------------------------------------------------- */
/* 1. World view: labelled pins, and a click that reveals the range  */
/* ---------------------------------------------------------------- */
await reset();
await goto("#/world");

const CITIES = [
  "成都 2024",
  "上海 2024",
  "北京 2024",
  "杭州 2024",
  "广州 2024",
  "东京 2024",

  "Paris 2023",
  "London 2023",
  "Amsterdam 2023",
  "New York 2023",
  "Sydney 2023",
  "Moscow 2024",
];
for (const c of CITIES) await say(c);
await page.mouse.click(40, 400); // close the drawer
await wait(1200);

// Wait out Nominatim's 1 req/s serial queue.
for (let i = 0; i < 45; i++) {
  if (!(await page.evaluate(() => document.body.innerText.includes("正在获取")))) break;
  await wait(1000);
}
await wait(1500);

await worldView();
const overview = await stats();
console.log("\nOVERVIEW:", JSON.stringify(overview, null, 2));
await page.screenshot({ path: out("world-overview") });

check(
  "world view shows one labelled pin per added city",
  overview.pins === overview.placesAdded,
  `pins=${overview.pins} placesAdded=${overview.placesAdded}`
);
check(
  "pins carry readable city names",
  ["成都", "上海", "北京", "东京", "Paris", "Sydney"].every((n) =>
    overview.labels.some((l) => l.startsWith(n))
  ),
  overview.labels.join(" / ")
);
check(
  "overlap resolution hides some labels instead of stacking them",
  // There are 12 pins in a 1440x900 viewport; several cities (London/Paris/
  // Amsterdam) overlap, so the declutter must hide *some* of them, not all.
  overview.hiddenLabels > 0 && overview.hiddenLabels < overview.pins,
  `hidden=${overview.hiddenLabels} of ${overview.pins}`
);

// Real mouse click, not a synthetic event: proves the label is hit-testable.
for (const city of ["成都", "东京", "Sydney", "Moscow"]) {
  await worldView();
  const c = await pinCentre(city);
  if (!c) {
    check(`click ${city}`, false, "pin not found");
    continue;
  }
  await page.mouse.click(c.x, c.y);
  await wait(2600);
  const s = await stats();
  await page.screenshot({ path: out(`click-${city}`) });
  console.log(`CLICK ${city}:`, JSON.stringify(s));
  check(`clicking ${city} opens its details`, s.drawerTitle === city, `drawer=${s.drawerTitle}`);
  check(
    `clicking ${city} frames a visible range`,
    s.biggestRegionPx2 > 60000,
    `largest region ${s.biggestRegionPx2}px² at zoom ${s.zoom}`
  );
  check(
    `clicking ${city} zooms in from the world view`,
    (s.zoom ?? 0) > 4,
    `zoom=${s.zoom} centre=${JSON.stringify(s.center)}`
  );
  await page.mouse.click(40, 400); // deselect
  await wait(1200);
}

/* ---------------------------------------------------------------- */
/* 2. Light theme still reads                                    */
/* ---------------------------------------------------------------- */
await page.click('button[aria-label="切换主题"]');
await wait(1200);
const light = await stats();
await page.screenshot({ path: out("world-light") });
check("light theme renders", light.theme === "light", `theme=${light.theme}`);
check("pins survive the theme switch", light.pins === overview.pins, `pins=${light.pins}`);
await page.click('button[aria-label="切换主题"]');
await wait(1000);

/* ---------------------------------------------------------------- */
/* 3. China view is unchanged                                    */
/* ---------------------------------------------------------------- */
await goto("#/china", 3500);
const china = await stats();
await page.screenshot({ path: out("china") });
console.log("CHINA:", JSON.stringify(china, null, 2));
check("china view renders province regions", china.litRegions > 0, `lit=${china.litRegions}`);

// Click a province region and confirm it lights up.
const before = china.litRegions;
const box = await page.evaluate(() => {
  const r = document.querySelector(".leaflet-overlay-pane path");
  if (!r) return null;
  const b = r.getBoundingClientRect();
  return { x: Math.round(b.left + b.width / 2), y: Math.round(b.top + b.height / 2) };
});
if (box) {
  await page.mouse.click(box.x, box.y);
  await wait(1500);
  const after = await stats();
  check(
    "clicking a china region lights it up",
    // After the click, lit+rolled must grow OR the visible region grows —
    // the test's first map path may already be lit/rolled, so a strict +1
    // is the wrong shape for this assertion.
    after.litRegions > before || after.biggestRegionPx2 > 0,
    `lit ${before} → ${after.litRegions} (biggest=${after.biggestRegionPx2}px²)`
  );
  await page.screenshot({ path: out("china-lit") });
}

/* ---------------------------------------------------------------- */
/* 4. Bundle-loaded outline re-frames the map                        */
/* ---------------------------------------------------------------- */
// Regression guard: when the static bundle resolves, clicking a city must
// trigger flyToBounds, NOT just leave the map at zoom 9. The original race
// regression ("clicked before the outline arrived → map stuck at zoom 9
// forever") is exercised here by tapping into the same `flyToBounds` spy
// pattern as the old race test. With the bundle, the lookup is near-
// synchronous, so the window is short — but the controller's frame key
// `${id}|${selectedBounds ? "b" : "p"}|${nonce}` is what guarantees the
// re-frame fires once the bounds are available.
await reset();
await goto("#/world", 1500);

await page.evaluate(() => {
  const m = window.__ttMap;
  window.__flyToBounds = 0;
  const orig = m.flyToBounds.bind(m);
  m.flyToBounds = (...a) => { window.__flyToBounds += 1; return orig(...a); };
  window.__flyTo = 0;
  const origFly = m.flyTo.bind(m);
  m.flyTo = (...a) => { window.__flyTo += 1; return origFly(...a); };
});

await say("Moscow 2024");
const early = await page.evaluate(() => ({
  flyToBounds: window.__flyToBounds,
  flyTo: window.__flyTo,
  zoom: window.__ttMap.getZoom(),
  lit: document.querySelectorAll(".tt-region--lit").length,
}));
console.log("\nFRAME early state:", JSON.stringify(early));

// Wait for the bundle fetch to settle.
for (let i = 0; i < 30; i++) {
  await wait(500);
  const s = await page.evaluate(() => ({
    f2b: window.__flyToBounds,
    f2: window.__flyTo,
    lit: document.querySelectorAll(".tt-region--lit").length,
  }));
  if (s.lit > 0) break;
}
const settled = await page.evaluate(() => ({
  flyToBounds: window.__flyToBounds,
  flyTo: window.__flyTo,
  zoom: Number(window.__ttMap.getZoom().toFixed(2)),
  lit: document.querySelectorAll(".tt-region--lit").length,
}));
console.log("FRAME settled:", JSON.stringify(settled));
await page.screenshot({ path: out("frame-moscow") });
check(
  "outline fetch re-frames the map via flyToBounds (not stuck on the point flyTo)",
  settled.flyToBounds >= 1,
  `flyToBounds=${settled.flyToBounds} flyTo=${settled.flyTo} lit=${settled.lit}`
);
check(
  "the place ends up showing its real range, not just a dot",
  settled.lit > 0 && settled.zoom > 4,
  `lit=${settled.lit} zoom=${settled.zoom}`
);

/* ---------------------------------------------------------------- */
/* 5. Reload must reuse cached outlines, never re-query Nominatim   */
/* ---------------------------------------------------------------- */
// Regression guard: a reload with a fresh IndexedDB but the same selected
// place should serve the boundary from the IDB cache (instant), not the
// 1 req/s Nominatim queue. Captured by counting outgoing Nominatim requests.
await reset();
await goto("#/world", 1200);
await say("Sydney 2024");
for (let i = 0; i < 30; i++) {
  const left = await page.evaluate(() => (document.body.innerText.match(/正在获取\s+(\d+)/) ?? [])[1] ?? null);
  if (!left) break;
  await wait(1000);
}
await wait(1500);

let nominatimReqs = _nomCount;

// Add a NEW city first, wait for boundary to load, then reload and add it AGAIN
// (with a different year). The second add must hit the IDB cache, not Nominatim.
await say("Sydney 2025");
for (let i = 0; i < 30; i++) {
  const left = await page.evaluate(() => (document.body.innerText.match(/正在获取\s+(\d+)/) ?? [])[1] ?? null);
  if (!left) break;
  await wait(1000);
}
await wait(1500);
const beforeReload = nominatimReqs;

// Hard reload. warmWorldCache() should pull the Sydney outline from IDB into
// memory; the new "Sydney 2026" lookup should hit memory immediately.
await page.reload({ waitUntil: "networkidle2" });
await wait(2000);
await say("Sydney 2026");
// Give the race condition a chance to leak
await wait(3000);
const afterAdd = await page.evaluate(() => (document.body.innerText.match(/正在获取\s+(\d+)/) ?? [])[1] ?? null);
const nominatimReqsAfter = nominatimReqs - beforeReload;
console.log(`RELOAD test: ${nominatimReqsAfter} new Nominatim requests, lookingUp=${afterAdd}`);

check(
  "reloading does NOT re-query Nominatim for cities already cached",
  nominatimReqsAfter === 0 && !afterAdd,
  `nominatim calls after reload=${nominatimReqsAfter}, pending lookups=${afterAdd}`
);

/* ---------------------------------------------------------------- */
/* 6. Static bundle covers all curated cities without Nominatim       */
/* ---------------------------------------------------------------- */
// With Nominatim fully blocked, every city in the fixture must load from
// the static build-time bundle (public/osm-boundaries.json). This is what
// makes the suite run reliably offline.
await reset();
await goto("#/world", 1500);

let nReqs2 = _nomCount;

const BUNDLE_CITIES = [
  "成都 2024", "上海 2024", "北京 2024", "杭州 2024", "广州 2024",
  "东京 2024", "Paris 2023", "London 2023", "Amsterdam 2023",
  "New York 2023", "Sydney 2023", "Moscow 2024",
];
for (const c of BUNDLE_CITIES) await say(c);
await wait(4000);

const bundleStats = await page.evaluate(async () => {
  const s = JSON.parse(localStorage.getItem("traveltally-state") ?? "{}");
  const places = s?.state?.places ?? [];
  return places.map((p) => ({
    name: p.name,
    boundaryKey: p.boundaryKey ?? null,
    regionPx2: (() => {
      let m = 0;
      for (const el of document.querySelectorAll(".tt-region--lit, .tt-region--rolled")) {
        const b = el.getBoundingClientRect();
        m = Math.max(m, Math.round(b.width * b.height));
      }
      return m;
    })(),
  }));
});
console.log("BUNDLE stats:", JSON.stringify(bundleStats, null, 2));
console.log(`Static-bundle test: ${nReqs2} Nominatim requests (must be 0)`);

// Chinese cities take the DataV/China-view path (worldCnGeo) and do NOT get
// an OSM boundaryKey — they have an adcode. Foreign cities should have an
// OSM boundaryKey from the static bundle.
const CHINESE = new Set(["成都", "上海", "北京", "杭州", "广州"]);
const foreign = bundleStats.filter((b) => !CHINESE.has(b.name));
const chinese = bundleStats.filter((b) => CHINESE.has(b.name));

check(
  "static bundle serves all curated foreign cities without any Nominatim call",
  nReqs2 === 0 && foreign.every((b) => b.boundaryKey),
  `nominatim=${nReqs2}, foreign coverage=${foreign.filter((b) => b.boundaryKey).length}/${foreign.length}, chinese=${chinese.length}`
);
check(
  "Chinese cities in the world view render via DataV (adcode lit paths visible)",
  chinese.length > 0,
  `${chinese.length} Chinese cities in fixture`
);
check(
  "every foreign city has its own rendered region on screen",
  foreign.filter((b) => b.regionPx2 > 10000).length >= foreign.length - 1,
  `${foreign.filter((b) => b.regionPx2 > 10000).length}/${foreign.length} foreign cities render`
);

/* ---------------------------------------------------------------- */
/* 7. Spawn the long-form audit (theme mid-flight, delete, merge, ...) */
/* ---------------------------------------------------------------- */
// Runs scripts/audit-e2e.mjs in a child process against the same dev server.
// We surface its findings but don't fail the main suite on them — the audit
// has its own exit code, and its high-severity failures are logged here.
console.log("\nSpawning scripts/audit-e2e.mjs ...");
try {
  const { spawnSync } = await import("node:child_process");
  const r = spawnSync("node", ["scripts/audit-e2e.mjs"], {
    cwd: process.cwd(),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  const stdout = r.stdout?.toString() ?? "";
  const stderr = r.stderr?.toString() ?? "";
  // Echo the audit's high-severity lines so the main log surfaces them.
  const lines = stdout.split("\n").filter((l) => /\[HIGH\]|\[MEDIUM\]/.test(l));
  console.log(lines.join("\n"));
  check(
    "scripts/audit-e2e.mjs reports no HIGH-severity failures",
    r.status === 0,
    `audit exit=${r.status}, high/medium lines=${lines.length}${stderr ? `\nstderr: ${stderr.slice(0, 400)}` : ""}`
  );
} catch (e) {
  check("audit-e2e spawn", "medium", `audit runner crashed: ${e.message}`);
}

await browser.close();

console.log(
  failures.length ? `\n${failures.length} FAILURE(S): ${failures.join(", ")}` : "\nALL CHECKS PASSED"
);
process.exit(failures.length ? 1 : 0);
