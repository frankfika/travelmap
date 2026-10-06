// node scripts/shots.mjs  (dev server on :5173)
import puppeteer from "puppeteer-core";
const B = "http://localhost:5173/";
const out = (n) => `screenshots/${n}.png`;
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
});
const page = await browser.newPage();
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const go = async (hash, ms = 2500) => { await page.goto(B + hash, { waitUntil: "networkidle2" }); await wait(ms); };
const say = async (text) => {
  await page.click('input[aria-label="描述你的旅行"]');
  await page.keyboard.type(text);
  await wait(400);
  await page.keyboard.press("Enter");
  await wait(2200);
};

await go("");
await page.evaluate(() => { localStorage.clear(); indexedDB.deleteDatabase("traveltally"); });
await go("");
await page.screenshot({ path: out("1-home") });

await go("#/world");
await page.screenshot({ path: out("2-world-empty") });

await page.click('input[aria-label="描述你的旅行"]');
await page.keyboard.type("我去年春天去了成都和东京");
await wait(500);
await page.screenshot({ path: out("3-world-typing") });
await page.keyboard.press("Enter");
await wait(2500);
await page.screenshot({ path: out("4-world-added") });

await say("上个月去上海出差");
await say("Paris 2023");
await say("杭州 2024-05-01");
await page.mouse.click(700, 450); // background click closes drawer
await wait(1500);
await page.screenshot({ path: out("5-world-populated") });

await page.click('ul button'); // open a place from the list
await wait(1200);
await page.click('button[aria-label="编辑"]');
await wait(400);
await page.screenshot({ path: out("5b-drawer-edit") });

await go("#/china", 3500);
await page.mouse.move(5, 300);
await wait(300);
await page.screenshot({ path: out("6-china") });

await go("#/settings", 800);
await page.screenshot({ path: out("7-settings") });

await go("#/world");
await page.keyboard.down("Meta"); await page.keyboard.press("k"); await page.keyboard.up("Meta");
await wait(500);
await page.screenshot({ path: out("8-palette") });

await page.keyboard.press("Escape");
await wait(600);
await page.click('button[aria-label="切换主题"]');
await wait(2500);
await page.screenshot({ path: out("9-world-light") });

console.log(await page.evaluate(() => localStorage.getItem("traveltally-state")));
await browser.close();
