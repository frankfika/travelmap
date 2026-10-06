/**
 * Screenshots for the "make it fun" pass: quick start, achievements, sharing.
 *   npm run dev   # in another terminal
 *   node scripts/shots-fun.mjs
 */
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE_URL ?? "http://localhost:5173";
const OUT = "screenshots/regions";
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"],
});
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.on("pageerror", (e) => errors.push(e.message.slice(0, 100)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 100)); });
await page.evaluateOnNewDocument(() => {
  window.__copied = null;
  const orig = navigator.clipboard?.writeText?.bind(navigator.clipboard);
  if (navigator.clipboard) navigator.clipboard.writeText = async (t) => { window.__copied = t; return orig?.(t); };
});

await page.goto(`${BASE}/#/china`, { waitUntil: "networkidle0", timeout: 25000 });
await page.evaluate(() => localStorage.clear());
await page.evaluate(() => new Promise((r) => {
  const d = indexedDB.deleteDatabase("traveltally");
  d.onsuccess = d.onerror = d.onblocked = () => r();
}));
await page.reload({ waitUntil: "networkidle0" });
await wait(6500);

// 1. First-run grid, nothing picked yet
await page.screenshot({ path: `${OUT}/13-quickstart-empty.png` });

// 2. Grid with a plausible travel history ticked
await page.evaluate(() => {
  const h2 = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent.includes("你去过哪些省"));
  const grid = h2?.parentElement?.querySelector(".grid");
  ["北京", "天津", "上海", "江苏", "浙江", "福建", "广东", "四川", "云南", "西藏", "新疆", "内蒙古", "陕西", "湖南"]
    .forEach((n) => Array.from(grid?.querySelectorAll("button") ?? []).find((b) => b.textContent.includes(n))?.click());
});
await wait(500);
await page.screenshot({ path: `${OUT}/14-quickstart-picked.png` });

await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => /点亮这/.test(b.textContent))?.click());
await wait(3500);
await page.screenshot({ path: `${OUT}/15-map-after-quickstart.png` });

// 3. Achievement wall
await page.goto(`${BASE}/#/settings`, { waitUntil: "networkidle0" });
await wait(2500);
await page.screenshot({ path: `${OUT}/16-achievements.png` });

// 4. Copy the share link, then open it in a clean context (as a friend would)
await page.evaluate(() => Array.from(document.querySelectorAll("button")).find((b) => b.textContent.trim() === "复制链接")?.click());
await wait(1600);
const url = await page.evaluate(() => window.__copied);

if (url) {
  const ctx = await browser.createBrowserContext();
  const guest = await ctx.newPage();
  await guest.setViewport({ width: 1440, height: 900 });
  guest.on("pageerror", (e) => errors.push("guest: " + e.message.slice(0, 100)));
  await guest.goto(url, { waitUntil: "networkidle0", timeout: 30000 });
  await wait(8000);
  await guest.screenshot({ path: `${OUT}/17-shared-readonly.png` });
  console.log("shared url length:", url.length);
  await ctx.close();
}

console.log("errors:", errors.length ? errors.slice(0, 4) : "none");
await browser.close();
