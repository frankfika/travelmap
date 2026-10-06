// scripts/capture-readme-shots.mjs
//
// Drives the dev server to take 4 polished screenshots used in the GitHub
// README. Each one starts from a fresh browser profile (no caching) and seeds
// a specific scenario. Output goes to docs/img/.
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";

const B = "http://localhost:5173/";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUT = "docs/img";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage() {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
    userDataDir: `/tmp/tt-readme-${Math.random().toString(36).slice(2, 8)}`,
  });
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("  pageerror:", e.message));
  return { browser, page };
}

async function reset(page, hash = "#/world") {
  await page.goto(B, { waitUntil: "domcontentloaded" });
  await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("tt-onboarded:v1", "1");
    await new Promise((res) => {
      const req = indexedDB.deleteDatabase("traveltally");
      req.onsuccess = req.onerror = req.onblocked = () => res();
      setTimeout(res, 3000);
    });
  });
  await page.goto(B + hash, { waitUntil: "domcontentloaded" });
  await page.reload({ waitUntil: "domcontentloaded" });
  await wait(2500);
}

async function say(page, text) {
  await page.click('input[aria-label="描述你的旅行"]');
  await page.keyboard.type(text);
  await wait(220);
  await page.keyboard.press("Enter");
  await wait(800);
}

async function waitForLookups(page, max = 60) {
  for (let i = 0; i < max; i++) {
    const left = await page.evaluate(() => (document.body.innerText.match(/正在获取\s+(\d+)/) ?? [])[1] ?? null);
    if (left === null || Number(left) === 0) return;
    await wait(1000);
  }
}

async function clickPin(page, name) {
  const ok = await page.evaluate((n) => {
    const label = Array.from(document.querySelectorAll(".tt-label")).find(
      (el) => (el.textContent ?? "").startsWith(n) && !el.classList.contains("is-hidden")
    );
    if (!label) return null;
    const r = label.getBoundingClientRect();
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) };
  }, name);
  if (!ok) throw new Error(`pin "${name}" not visible`);
  await page.mouse.click(ok.x, ok.y);
  await wait(3000);
}

async function shutdown(browser) {
  await browser.close();
}

await mkdir(OUT, { recursive: true });

/* ============================================================ */
/* Shot 1: World overview with pinned cities                   */
/* ============================================================ */
{
  const { browser, page } = await newPage();
  await reset(page, "#/world");
  for (const t of ["成都 2024", "东京 2023", "Paris 2023", "Sydney 2024", "New York 2024"]) {
    await say(page, t);
  }
  await waitForLookups(page);
  await wait(2000);
  await page.evaluate(() => {
    window.__ttMap?.setView([30, 25], 2.4, { animate: false });
  });
  await wait(1200);
  await page.screenshot({ path: `${OUT}/01-world-overview.png` });
  console.log("✓ 01-world-overview.png");
  await shutdown(browser);
}

/* ============================================================ */
/* Shot 2: Click Chengdu — real boundary, drawer, anchored pin */
/* ============================================================ */
{
  const { browser, page } = await newPage();
  await reset(page, "#/world");
  for (const t of ["成都 2024", "杭州 2024", "上海 2024"]) {
    await say(page, t);
  }
  await waitForLookups(page);
  await wait(2000);
  await page.evaluate(() => {
    window.__ttMap?.setView([25, 35], 2.2, { animate: false });
  });
  await wait(800);
  await clickPin(page, "成都");
  await page.screenshot({ path: `${OUT}/02-click-chengdu.png` });
  console.log("✓ 02-click-chengdu.png");
  await shutdown(browser);
}

/* ============================================================ */
/* Shot 3: China view — provinces + cities                       */
/* ============================================================ */
{
  const { browser, page } = await newPage();
  await reset(page, "#/china");
  for (const t of ["成都 2024", "杭州 2024", "北京 2024", "上海 2024", "广州 2024"]) {
    await say(page, t);
  }
  await wait(2000);
  await waitForLookups(page, 30);
  await wait(2000);
  await page.screenshot({ path: `${OUT}/03-china-view.png` });
  console.log("✓ 03-china-view.png");
  await shutdown(browser);
}

/* ============================================================ */
/* Shot 4: Light theme — same data, different palette          */
/* ============================================================ */
{
  const { browser, page } = await newPage();
  await reset(page, "#/world");
  for (const t of ["成都 2024", "东京 2023", "Sydney 2024"]) {
    await say(page, t);
  }
  await waitForLookups(page);
  await wait(1500);
  await page.click('button[aria-label="切换主题"]');
  await wait(1500);
  await page.evaluate(() => {
    window.__ttMap?.setView([15, 60], 2.0, { animate: false });
  });
  await wait(800);
  await page.screenshot({ path: `${OUT}/04-light-world.png` });
  console.log("✓ 04-light-world.png");
  await shutdown(browser);
}

console.log("\nAll 4 screenshots written to docs/img/.");
