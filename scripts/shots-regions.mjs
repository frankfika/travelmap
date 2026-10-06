/**
 * Screenshots for the region-painting feature (province → city → district).
 *
 *   npm run dev          # in another terminal
 *   node scripts/shots-regions.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = "screenshots/regions";

mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Click the nth reasonably-sized region on screen (ignores tiny slivers). */
async function clickRegion(index = 0) {
  await page.evaluate((i) => {
    const list = Array.from(document.querySelectorAll("path.tt-region")).filter((p) => {
      const r = p.getBoundingClientRect();
      return r.width > 22 && r.top > 190 && r.bottom < 790;
    });
    list[i]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }, index);
  await wait(700);
}

async function doubleClickRegion(selector = "path.tt-region") {
  await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    setTimeout(() => el?.dispatchEvent(new MouseEvent("click", { bubbles: true })), 80);
  }, selector);
  await wait(5000);
}

async function enterProvince(name) {
  await page.evaluate((n) => {
    const nav = document.querySelector("[data-province-nav]");
    const btn = nav && Array.from(nav.querySelectorAll("button")).find((b) => b.textContent.includes(n));
    btn?.click();
  }, name);
  await wait(5000);
}

async function goUpTo(index) {
  await page.evaluate((i) => {
    const nav = document.querySelector("nav.surface");
    nav?.querySelectorAll("button")[i]?.click();
  }, index);
  await wait(5000);
}

// ---- 1. Country view, nothing painted yet -------------------------------
await page.goto(`${BASE}/#/china`, { waitUntil: "networkidle0", timeout: 25000 });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: "networkidle0" });
await wait(6500);
await shot("1-country-empty");

// ---- 2. Paint a few provinces directly ----------------------------------
for (const i of [0, 8, 19, 25]) await clickRegion(i);
await wait(600);
await shot("2-country-painted");

// ---- 3. Province level: paint cities inside 浙江 -------------------------
await enterProvince("浙江");
await shot("3-province-empty");
for (const i of [0, 3, 7]) await clickRegion(i);
await wait(600);
await shot("4-province-painted");

// ---- 4. Back to country: provinces show rolled-up fill -------------------
await goUpTo(0);
await shot("5-country-rollup");

// ---- 5. Drill into a painted city: districts read as covered -------------
await doubleClickRegion("path.tt-region--rolled");
await shot("6-districts-covered");

// ---- 6. Paint one district ----------------------------------------------
await clickRegion(2);
await wait(600);
await shot("7-district-painted");

// ---- 7. World map: foreign cities painted from OSM outlines --------------
await page.goto(`${BASE}/#/world`, { waitUntil: "networkidle0", timeout: 25000 });
await page.evaluate(() => {
  localStorage.clear();
  localStorage.setItem(
    "traveltally-state",
    JSON.stringify({
      state: {
        places: [
          ["Paris", "FR", 48.85341, 2.3488],
          ["Amsterdam", "NL", 52.3676, 4.9041],
          ["Kyoto", "JP", 35.02107, 135.75385],
          ["Interlaken", "CH", 46.6863, 7.8632],
          ["Reykjavik", "IS", 64.1466, -21.9426],
        ].map(([name, cc, lat, lng], i) => ({
          id: `w${i}`,
          name,
          cityId: `g${i}`,
          country: name,
          countryCode: cc,
          lat,
          lng,
          visitedStart: "2024-01-01",
          visitedEnd: "2024-01-03",
          kind: "travel",
          note: "",
          photoIds: [],
          color: "amber",
          createdAt: 1700000000000 + i,
        })),
        theme: "dark",
      },
      version: 2,
    })
  );
});
await page.reload({ waitUntil: "networkidle0" });
await wait(3000);
await shot("9-world-loading");
// 5 outlines at ~1.1s each (Nominatim rate limit)
await wait(22000);
await shot("10-world-painted");

// zoom into Europe so the shapes are legible
await page.evaluate(() => {
  const map = document.querySelector(".leaflet-container");
  if (map) map.dispatchEvent(new WheelEvent("wheel", { deltaY: -600, bubbles: true }));
});
await wait(1500);
await shot("11-world-zoom");

// ---- 8. Light theme ------------------------------------------------------
await page.goto(`${BASE}/#/china`, { waitUntil: "networkidle0" });
await wait(5000);
await page.evaluate(() => {
  const raw = localStorage.getItem("traveltally-state");
  if (raw) {
    const s = JSON.parse(raw);
    s.state.theme = "light";
    localStorage.setItem("traveltally-state", JSON.stringify(s));
  }
});
await page.reload({ waitUntil: "networkidle0" });
await wait(6500);
await shot("12-china-light");

console.log("errors:", errors.length ? errors.slice(0, 5) : "none");
await browser.close();
