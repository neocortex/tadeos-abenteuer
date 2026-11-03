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
