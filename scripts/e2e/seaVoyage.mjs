/**
 * E2E proof for the sea voyage's rules (quest 10): the current, islets, planks, checkpoints, swells and the things
 * along the route. Every case opens `?challenge=sea&section=N`, which sails straight off from section N's buoy, and
 * plays it with real key presses; the live state (`window.engine.scene.e2e`) only decides which keys to hold.
 *
 * Run:  node scripts/e2e/seaVoyage.mjs [baseUrl] [case name filter]
 * Out:  scripts/e2e/out/seaVoyage/*.png + summary.json
 */

import { BASE, launch, proof } from "./lib/harness.mjs";

const FILTER = process.argv[3] ?? "";
const { out, check, finish } = proof("seaVoyage");
const { browser, page, errors } = await launch();

const sleep = (ms) => page.waitForTimeout(ms);
const state = () => page.evaluate(() => window.engine?.scene?.e2e ?? null).catch(() => null);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

async function waitFor(fn, what, timeout = 30000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await sleep(80);
  }
  throw new Error(`timeout waiting for ${what}`);
}

const held = new Set();
async function hold(keys) {
  for (const k of [...held]) if (!keys.includes(k)) await page.keyboard.up(k);
  for (const k of keys) if (!held.has(k)) await page.keyboard.down(k);
  held.clear();
  for (const k of keys) held.add(k);
}

/** Open the voyage at section `n` and wait until the boat sails. */
async function open(n) {
  await hold([]);
  await page.goto(`${BASE}/?challenge=sea&section=${n}`);
  await waitFor(async () => (await state())?.phase === "sail", `sailing from section ${n}`, 40000);
  await sleep(300);
}

/** The arrow key that turns the bow towards (x, z), or none when it already points there. */
function steerTo(s, x, z, slack = 0.08) {
  // Reason: heading 0 sails towards -z and grows to the left, so the bearing of (dx, dz) is atan2(-dx, -dz)
  const turn = Math.atan2(-(x - s.x), -(z - s.z)) - s.heading;
  return Math.abs(turn) < slack ? [] : [turn > 0 ? "ArrowLeft" : "ArrowRight"];
}

/** Sail for `ms`, each frame holding what `keys(state)` returns. Resolves with every state seen. */
async function sail(ms, keys) {
  const seen = [];
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const s = await state();
    seen.push(s);
    await hold(keys(s));
    await sleep(50);
  }
  await hold([]);
  return seen;
}

const dialogueOpen = () => page.evaluate(() => !!document.querySelector(".dialogue.open"));

/** Note every dialogue line said from now on in `window.said`. */
async function recordLines() {
  await page.evaluate(() => {
    window.said = [];
    const box = Object.getPrototypeOf(window.game.ui.dialogue);
    const begin = box.showLine;
    box.showLine = function () {
      begin.call(this);
      window.said.push(`${this.script[this.index].speaker}: ${this.script[this.index].text}`);
    };
  });
}

/** Steer into each rock or islet ahead in turn until `done(state)`; Space closes any dialogue. Resolves with the states seen. */
async function ramAhead(done, timeout = 90000) {
  const seen = [];
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await state();
    seen.push({ ...s, fade: await page.evaluate(() => Number(getComputedStyle(document.getElementById("fade")).opacity)) });
    if (done(s)) break;
    if (await dialogueOpen()) {
      await hold([]);
      await page.keyboard.press("Space");
      await sleep(250);
      continue;
    }
    await hold(s.retrying || !s.ahead ? [] : steerTo(s, s.ahead[0], s.ahead[1]));
    await sleep(50);
  }
  await hold([]);
  return seen;
}

/** Follow the starfish trail until `done(state)`. */
async function followTrail(done, timeout = 40000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await state();
    if (done(s)) return s;
    if (await dialogueOpen()) await page.keyboard.press("Space");
    await hold(steerTo(s, s.next[0], s.next[1]));
    await sleep(50);
  }
  await hold([]);
  return null;
}

const CASES = {
  async "sailing far off course is turned back"() {
    await open(1);
    const going = await sail(8000, () => ["ArrowRight"]);
    const wentOff = going.some((s) => s.offCourse);
    await shot("off_course");
    const coming = await sail(6000, () => []);
    const back = coming.findIndex((s) => Math.abs(s.routeOff) < 30);
    const furthest = Math.max(...going.map((s) => Math.abs(s.routeOff)));
    check("sailing far off course is turned back", wentOff && back >= 0, `off: ${wentOff}, furthest ${furthest.toFixed(1)} m, back after ${back >= 0 ? (back * 0.05).toFixed(1) : "never"} s`);
    check("the current keeps the boat near the channel", furthest < 40, furthest.toFixed(1));
  },

  async "holding ↓ keeps moving"() {
    await open(1);
    const z0 = (await state()).z;
    const seen = await sail(5000, () => ["ArrowDown"]);
    const last = seen.at(-1);
    const slowest = Math.min(...seen.slice(10).map((s) => s.speed));
    check("holding ↓ keeps moving", slowest >= 5.99 && last.z < z0 - 25, `slowest ${slowest.toFixed(2)}, moved ${(z0 - last.z).toFixed(1)} m`);
  },

  async "an islet is not passable"() {
    await open(1);
    const [ix, iz, shore] = (await state()).islet;
    const hits0 = (await state()).hits;
    const seen = await sail(16000, (s) => steerTo(s, ix, iz));
    const closest = Math.min(...seen.map((s) => Math.hypot(s.x - ix, s.z - iz)));
    await shot("islet");
    const hits = seen.at(-1).hits - hits0;
    check("an islet is not passable", hits > 0 && closest >= shore, `hits ${hits}, closest ${closest.toFixed(2)} m, shore ${shore.toFixed(2)} m`);
  },

  async "a rock hit costs one plank"() {
    await open(1);
    const [rx, rz] = (await state()).rock;
    const hits0 = (await state()).hits;
    const seen = await sail(14000, (s) => (s.hits > hits0 ? [] : steerTo(s, rx, rz)));
    const after = seen.find((s) => s.hits > hits0);
    await shot("rock_hit");
    check("a rock hit costs one plank", after && after.planks === 3, after ? `planks ${after.planks}` : "no hit");
    const icons = await page.evaluate(() => [...document.querySelectorAll(".sea-planks span")].map((e) => e.classList.contains("lost")));
    check("the voyage bar shows the lost plank", icons.length === 4 && icons.filter(Boolean).length === 1, JSON.stringify(icons));

    // ── 10 starfish mend it again
    const mended = await followTrail((s) => s.planks === 4);
    check("10 starfish mend a plank", mended && mended.starfish % 10 === 0, mended ? `planks 4 at ${mended.starfish} starfish` : "never mended");
  },

  async "out of planks fades and restarts at the last buoy with 4 planks"() {
    await open(2);
    await recordLines();
    const cp = (await state()).checkpoint;
    const seen = await ramAhead((s) => s.retries >= 1 && !s.retrying);
    const last = seen.at(-1);
    await sleep(400);
    await shot("after_retry");
    const lines = await page.evaluate(() => window.said);
    check("running out of planks starts one retry", last.retries === 1, last.retries);
    check("the screen was black in between", seen.some((s) => s.fade > 0.95));
    check("an Erzähler line was said over black", lines.some((l) => l.startsWith("Erzähler: ")), lines.join(" | "));
    check("out of planks restarts at the last buoy with 4 planks", Math.abs(last.z - cp.z) < 15 && last.planks === 4, `z ${last.z.toFixed(1)} vs buoy ${cp.z}, planks ${last.planks}`);
    check("the starfish count is the one from the buoy", last.starfish === cp.starfish, `${last.starfish} vs ${cp.starfish}`);
    check("planks never go below 0", seen.every((s) => s.planks >= 0));
  },

  async "double hit on the last plank retries once"() {
    await open(2);
    await ramAhead((s) => s.planks === 1);
    const r = await page.evaluate(() => {
      const sc = window.engine.scene;
      const at = sc.boat.root.position.clone();
      const before = sc.voyage.retries;
      // Reason: a rock and a jellyfish touching the boat in the same frame, through the same handler the voyage uses
      sc.voyage.hit({ kind: "hit", at, push: 1, what: "rock" });
      sc.voyage.hit({ kind: "hit", at, push: -1, what: "jelly" });
      return { retries: sc.voyage.retries - before, planks: sc.voyage.planks.count };
    });
    const seen = await ramAhead((s) => !s.retrying, 20000);
    check("double hit on the last plank retries once", r.retries === 1 && r.planks === 0 && seen.every((s) => s.planks >= 0 && s.retries === seen[0].retries), JSON.stringify(r));
  },
};

try {
  for (const [name, run] of Object.entries(CASES)) {
    if (FILTER && !name.includes(FILTER)) continue;
    console.log(`— ${name}`);
    try {
      await run();
    } catch (e) {
      check(name, false, e.message);
      await shot(`fail_${name.replace(/\W+/g, "_")}`).catch(() => {});
    }
  }
  check("no page errors", errors.length === 0, errors.join(" | "));
} finally {
  await hold([]).catch(() => {});
  await browser.close();
}
finish();
