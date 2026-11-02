/**
 * E2E: picking a point in the story from the menu starts the game there, and the story plays on from it.
 *
 *  1. Every point leads to its quest, and the game goes on from it to the next quest
 *  2. It works from wherever the menu opens: the title, a talk, a challenge, and by arrows + Space
 *  3. A jump happens once: the address comes back clean and a reload goes to the title
 *  4. A jump alone leaves the save alone; finishing the next quest saves like any other
 *  5. From the title through "Der Zauberwald" all the way to the end card
 *
 * The pick is a real click or key press. As in `jumpIn.mjs`, what comes after a challenge is under test and not the
 * challenge: each one is ended by resolving its `finished` promise, which is what a win does, and a goal is reached
 * with `game.placePlayer` instead of walking. Quests 3 and 4 only show their goal here: `island.mjs` plays them through.
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/menuJump.mjs [baseUrl]
 * Proof: scripts/e2e/out/menuJump/{*.png, summary.json}
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = "scripts/e2e/out/menuJump";
const SAVE_KEY = "schatzkarten_save";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && !m.text().includes("404") && errors.push(m.text()));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail: String(detail) });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail !== "" ? ` — ${detail}` : ""}`);
};

const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const entry = (name) => page.locator(".menu-jump", { hasText: name });

const state = () =>
  page.evaluate(() => {
    const g = window.game;
    const e = window.engine;
    return {
      onIsland: e.scene === g.island,
      switching: e.isSwitching,
      busy: g.busy,
      milestone: g.quest.currentMilestone,
      dialogue: !!document.querySelector(".dialogue.open"),
      mapCard: !!document.querySelector(".map-card"),
      endCard: !!document.querySelector(".endcard"),
    };
  });
const free = (s) => s.onIsland && !s.switching && !s.dialogue && !s.mapCard && !s.busy;

/** Clear dialogues with Space and end any challenge on screen, until `done` holds. */
async function playUntil(done, timeoutMs = 90_000) {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    const s = await state();
    if (done(s)) return s;
    if (s.dialogue || s.mapCard) {
      await page.keyboard.press("Space");
      await wait(150);
    } else if (!s.onIsland && !s.switching) {
      // Reason: the intro comes first, so the challenge ends the way a win does and not under its own opening lines
      await wait(1200);
      if (!(await state()).dialogue) {
        await page.evaluate(() => {
          const scene = window.engine.scene;
          (scene.resolveFinished ?? scene.resolve)?.call(scene);
        });
      }
    } else {
      await wait(100);
    }
  }
  return null;
}

/** Go to the goal of the current quest and press Space there. */
async function startNextQuest() {
  await page.evaluate(() => {
    const [goal] = window.game.objectives();
    window.game.placePlayer(goal.at[0], goal.at[1]);
  });
  await wait(500);
  await page.keyboard.press("Space");
  await wait(300);
}

/** Tadeo moves when the arrow keys are held. Tries both ways, as one may be blocked where he stands. */
async function tadeoWalks() {
  const at = () => page.evaluate(() => window.game.island.player.position.toArray());
  for (const key of ["ArrowUp", "ArrowDown"]) {
    const a = await at();
    await page.keyboard.down(key);
    await wait(700);
    await page.keyboard.up(key);
    const b = await at();
    if (Math.hypot(b[0] - a[0], b[2] - a[2]) > 0.3) return true;
  }
  return false;
}

/** Open the game on the island, free to walk. */
async function openIsland(query = "notitle") {
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.game?.busy === false && !window.engine.isSwitching, null, { timeout: 90_000 });
}

/** Wait for the fresh page a jump opens, until it stands at this quest. */
async function landedOn(milestone, onIsland) {
  await page.waitForFunction(
    ([m, island]) => {
      const g = window.game;
      const e = window.engine;
      if (!g?.quest || g.quest.currentMilestone !== m || !e.scene || e.isSwitching) return false;
      return island ? e.scene === g.island && g.busy === false : e.scene !== g.island;
    },
    [milestone, onIsland],
    { timeout: 120_000 },
  );
}

/** Pick a point in the open menu with a click and wait for the page to start afresh. */
async function pick(name) {
  const navigated = page.waitForEvent("framenavigated", { timeout: 15_000 });
  await entry(name).click();
  await navigated;
}

const POINTS = [
  { name: "Der Vulkan", milestone: 2, onIsland: false },
  { name: "Das Dorf", milestone: 3, onIsland: true },
  { name: "Der See", milestone: 4, onIsland: true },
  { name: "Die Höhle", milestone: 5, onIsland: false },
  { name: "Der Zauberwald", milestone: 6, onIsland: false },
  { name: "Der Schlüssel", milestone: 7, onIsland: false },
  { name: "Der Oger", milestone: 8, onIsland: false },
  { name: "Der Berg", milestone: 9, onIsland: false },
  { name: "Der Hai", milestone: 10, onIsland: false },
  { name: "Die Schatzinsel", milestone: 11, onIsland: false },
  { name: "Das Feuerherz", milestone: 12, onIsland: false },
];

// ── 1. Every point leads to its quest, and the story goes on ─────────
await openIsland();
await page.keyboard.press("Escape");
await wait(400);
await shot("01-open-on-island");
const listed = await page.evaluate(() => [...document.querySelectorAll(".menu-jump")].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
check(`the list shows ${POINTS.length} points in the order of the story`, POINTS.every((p, i) => listed[i]?.endsWith(p.name)) && listed.length === POINTS.length, listed.join(" | "));
check("the travel map is still there beside it", await page.locator(".menu-map").isVisible());
await page.keyboard.press("Escape");

for (const point of POINTS) {
  await openIsland();
  await page.evaluate(() => localStorage.clear());
  await page.keyboard.press("Escape");
  await pick(point.name);
  await landedOn(point.milestone, point.onIsland);
  check(`${point.name}: starts quest ${point.milestone} ${point.onIsland ? "on the island" : "in its challenge"}`, true);
  await wait(700);
  await shot(`point-${point.milestone}`);
  if (point.onIsland) {
    const goals = await page.evaluate(() => window.game.objectives().length);
    check(`${point.name}: the quest shows its goal`, goals > 0, `${goals} goal(s)`);
    check(`${point.name}: Tadeo can walk`, await tadeoWalks());
    continue;
  }
  // Reason: sea, treasure and finale follow each other with no walk in between, so these three run on to the end card
  const toEnd = point.milestone >= 10;
  const s = await playUntil((x) => (toEnd ? x.endCard : x.milestone === point.milestone + 1 && free(x)));
  check(`${point.name}: the story goes on to ${toEnd ? "the end card" : `quest ${point.milestone + 1}`}`, !!s, s ? "" : JSON.stringify(await state()));
  if (s && !toEnd) check(`${point.name}: Tadeo can walk afterwards`, await tadeoWalks());
}

// ── 2. From wherever the menu opens ──────────────────────────────────
// A talk: the jump leaves it behind
await openIsland();
await page.evaluate(() => {
  const n = window.game.npcs.get("villager1").position;
  const world = window.game.island.player.world;
  const spot = [[1.6, 0], [-1.6, 0], [0, 1.6], [0, -1.6]].map(([dx, dz]) => [n.x + dx, n.z + dz]).find(([x, z]) => world.canStand(x, z));
  window.game.placePlayer(spot[0], spot[1]);
});
await wait(300);
await page.keyboard.press("Space");
await page.waitForFunction(() => window.game.ui.dialogue.isOpen, null, { timeout: 3000 });
await page.keyboard.press("Escape");
await wait(400);
await shot("02-open-in-talk");
await pick("Der See");
await landedOn(4, true);
check("from a talk: the jump works and no talk follows along", !(await state()).dialogue);

// A challenge: the jump leaves it behind
await page.goto(`${BASE}/?challenge=volcano`);
await landedOn(2, false);
await wait(800);
await page.keyboard.press("Escape");
await wait(400);
await shot("03-open-in-challenge");
await pick("Der Oger");
await landedOn(8, false);
check("from a challenge: the jump leads to another challenge", true);

// Arrows + Space
await openIsland();
await page.keyboard.press("Escape");
for (let i = 0; i < 6; i++) await page.keyboard.press("ArrowLeft");
await page.keyboard.press("ArrowDown");
const lit = async () => (await page.locator(".menu-panel .active").innerText()).replace(/\s+/g, " ").trim();
check("the arrows bring the light from the switches to the list", (await lit()).endsWith("Der Vulkan"), await lit());
for (let i = 0; i < 4; i++) await page.keyboard.press("ArrowDown");
check("the light walks down the list", (await lit()).endsWith("Der Zauberwald"), await lit());
const navigated = page.waitForEvent("framenavigated", { timeout: 15_000 });
await page.keyboard.press("Space");
await navigated;
await landedOn(6, false);
check("Space on the lit point jumps there", true);

// ── 3. A jump happens once ───────────────────────────────────────────
const query = await page.evaluate(() => location.search);
check("the address comes back clean", query === "", query);
await page.reload();
await page.waitForSelector(".title-screen .menu div", { timeout: 90_000 });
check("a reload goes to the title and does not jump again", true);

// ── 4. The save ──────────────────────────────────────────────────────
// A real save: Tadeo has come as far as quest 9
await openIsland("quest=9");
await page.evaluate(() => {
  localStorage.clear();
  window.game.saveAt(window.game.objectives()[0].at);
});
const saved = await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY);
check("a save at quest 9 exists", JSON.parse(saved)?.milestone === 9);
await page.keyboard.press("Escape");
await pick("Der Zauberwald");
await landedOn(6, false);
check("a jump alone leaves the save alone", (await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY)) === saved);
await page.reload();
await page.waitForSelector(".title-screen .menu div", { timeout: 90_000 });
const titleMenu = await page.locator(".title-screen .menu").innerText();
check('the title still offers "Weiterspielen"', titleMenu.includes("Weiterspielen"), titleMenu.replace(/\s+/g, " "));

// ── 5. From the title to the end card ────────────────────────────────
await page.locator(".menu-wheel").click();
await wait(400);
await shot("04-open-on-title");
await pick("Der Zauberwald");
await landedOn(6, false);
check("from the title: the jump leads to the forest", true);
const reached = [];
let ended = false;
for (let step = 0; step < 12 && !ended; step++) {
  const s = await playUntil((x) => x.endCard || free(x));
  if (!s) break;
  ended = s.endCard;
  if (ended) break;
  reached.push(s.milestone);
  if (step === 0) {
    const save = JSON.parse(await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY));
    check("finishing the forest saves like any other quest", save?.milestone === 7, `save at quest ${save?.milestone}`);
  }
  await startNextQuest();
}
check("the story plays on from the forest to the end card", ended, `quests on the island: ${reached.join(", ")}`);
await shot("05-end-card");

check("no errors on the page", errors.length === 0, errors.slice(0, 3).join(" / "));

await browser.close();
const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}/summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} ${passed ? "PASS" : "FAIL"} → ${OUT}/summary.json`);
process.exit(passed ? 0 : 1);
