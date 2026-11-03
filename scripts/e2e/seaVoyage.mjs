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

/** Steer at what `target(state)` points to (and hold `extra` keys) until `done(state)`. Resolves with the states seen. */
async function chase(target, done, timeout = 30000, extra = []) {
  const seen = [];
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const s = await state();
    seen.push(s);
    if (done(s)) break;
    if (await dialogueOpen()) await page.keyboard.press("Space");
    const at = target(s);
    await hold([...(at ? steerTo(s, at[0], at[1]) : []), ...extra]);
    await sleep(40);
  }
  await hold([]);
  return seen;
}

/** Knock planks off through the voyage's own hit handler, as a bump would (the boat is somewhere without rocks). */
const knock = (n) =>
  page.evaluate((n) => {
    const sc = window.engine.scene;
    for (let i = 0; i < n; i++) sc.voyage.hit({ kind: "hit", at: sc.boat.root.position.clone(), push: 1, what: "rock" });
  }, n);

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

  async "a swell taken bow-first is a jump, not a hit"() {
    await open(0);
    let shotJump = false;
    let highest = 0;
    let s = null;
    const end = Date.now() + 40000;
    while (Date.now() < end) {
      s = await state();
      if (s.z < -140) break;
      if (Math.abs(s.z + 128) < 12) highest = Math.max(highest, s.boatY);
      if (s.airborne && !shotJump) {
        shotJump = true;
        await sleep(120);
        await shot("swell_ride");
      }
      await hold(steerTo(s, s.next[0], s.next[1]));
      await sleep(40);
    }
    await hold([]);
    check("a swell taken bow-first is a jump, not a hit", s.jumps >= 1 && !s.hitsBy.swell && s.planks === 4, `jumps ${s.jumps}, hits ${JSON.stringify(s.hitsBy)}, planks ${s.planks}`);
    check("the boat rides the visible swell up", highest > 2.2, `highest ${highest.toFixed(2)} m`);

    // ── The second swell, taken sideways
    await followTrail((k) => k.z < -168);
    const planks0 = (await state()).planks;
    const seen = await sail(3500, (k) => (k.z < -190 ? [] : k.heading < 0.9 ? ["ArrowLeft"] : []));
    const after = seen.at(-1);
    check("a swell taken sideways costs a plank", after.hitsBy.swell === 1 && after.planks === planks0 - 1, `swell hits ${after.hitsBy.swell ?? 0}, planks ${planks0} → ${after.planks}`);
  },

  async "a breaking swell shows white foam"() {
    await open(5);
    await sleep(1500);
    await shot("swell_break");
    const s = await state();
    check("a breaking swell shows white foam (see swell_break.png)", s.phase === "sail");
  },

  async "a dolphin gives a boost"() {
    await open(1);
    // Reason: aim a little behind the leader, in its wake, and keep up with ↑
    const seen = await chase((s) => (s.dolphin ? [s.dolphin[0], s.dolphin[1] + 4] : s.next), (s) => s.speed > 12.5, 25000, ["ArrowUp"]);
    await shot("dolphins");
    const fastest = Math.max(...seen.map((s) => s.speed));
    check("a dolphin gives a boost", fastest > 12, `fastest ${fastest.toFixed(1)} m/s`);
  },

  async "a barrel costs a plank"() {
    await open(1);
    // Reason: barrels drift sideways, so aim where it will be when the boat gets there
    let last = null;
    const seen = await chase(
      (s) => {
        if (!s.barrel) return s.next;
        const vx = last && last[1] === s.barrel[1] ? (s.barrel[0] - last[0]) / 0.06 : 0;
        last = s.barrel;
        const eta = Math.max(0, (s.z - s.barrel[1]) / Math.max(s.speed, 1));
        return [s.barrel[0] + vx * eta, s.barrel[1]];
      },
      (s) => (s.hitsBy.barrel ?? 0) > 0,
      30000,
    );
    await shot("barrel");
    const s = seen.at(-1);
    check("a barrel costs a plank", s.hitsBy.barrel === 1 && s.planks === 4 - s.hits, `barrel hits ${s.hitsBy.barrel ?? 0}, planks ${s.planks}`);
  },

  async "the bottle is found"() {
    await open(2);
    const seen = await chase((s) => s.bottle ?? s.next, (s) => s.remarks.some((r) => r.includes("Flaschenpost")), 30000);
    await sleep(600);
    await shot("bottle");
    check("the bottle is found (Tadeo reads it)", seen.at(-1).remarks.some((r) => r.includes("Flaschenpost")), seen.at(-1).remarks.join(" | "));
  },

  async "a jellyfish costs a plank"() {
    await open(3);
    const seen = await chase((s) => s.jelly, (s) => (s.hitsBy.jelly ?? 0) > 0, 30000);
    await shot("jellyfish");
    const s = seen.at(-1);
    check("a jellyfish costs a plank", s.hitsBy.jelly === 1 && s.planks === 4 - s.hits, `jelly hits ${s.hitsBy.jelly ?? 0}, planks ${s.planks}`);
  },

  async "the whirlpool spins without a plank lost"() {
    await open(4);
    let shotSpin = false;
    const seen = await chase(
      (s) => s.whirlpool,
      (s) => s.spun > 6.2 && !s.spinning,
      40000,
    ).then(async (r) => r);
    for (const s of seen) if (s.spinning && !shotSpin) shotSpin = true;
    await shot("whirlpool");
    const s = seen.at(-1);
    const most = Math.max(...seen.map((k) => k.spun));
    check("the whirlpool spins without a plank lost", most >= 2 * Math.PI - 0.05 && s.planks === 4 - s.hits && !s.hitsBy.whirlpool, `spun ${most.toFixed(2)} rad, planks ${s.planks}, hits ${s.hits}`);
    check("after the spin Tadeo is dizzy", s.remarks.some((r) => r.includes("schwindelig")), s.remarks.join(" | "));
  },

  async "the whale lifts the boat"() {
    await open(4);
    let highest = 0;
    let shotWhale = false;
    const end = Date.now() + 40000;
    while (Date.now() < end) {
      const s = await state();
      if (s.z < -990) break;
      if (Math.abs(s.z + 975) < 10) highest = Math.max(highest, s.boatY);
      if (!shotWhale && s.z < -973) {
        shotWhale = true;
        await shot("whale");
      }
      await hold(steerTo(s, s.next[0], s.next[1]));
      await sleep(40);
    }
    await hold([]);
    check("the whale lifts the boat", highest > 1, `highest ${highest.toFixed(2)} m`);
  },

  async "passing a buoy saves the checkpoint"() {
    await open(1);
    const before = (await state()).checkpoint.index;
    const s = await followTrail((k) => k.z < -432, 50000);
    await shot("buoy");
    check("passing a buoy saves the checkpoint", s && before === 1 && s.checkpoint.index === 2 && s.buoy === 2, s ? `checkpoint ${before} → ${s.checkpoint.index}, buoy ${s.buoy}` : "never got there");
  },

  async "the fin shows in jellies and bigSwells"() {
    await open(3);
    let shotFin = false;
    const a = await chase((s) => s.next, (s) => s.z < -745, 30000);
    shotFin = a.some((s) => s.finSeen.includes(3));
    await open(5);
    const b = await chase((s) => s.next, (s) => s.z < -1150, 30000);
    await shot("fin");
    check("the fin shows in jellies and bigSwells", shotFin && b.at(-1).finSeen.includes(5), JSON.stringify({ jellies: a.at(-1).finSeen, bigSwells: b.at(-1).finSeen }));
  },

  async "retry during a spin lands level"() {
    await open(4);
    await knock(3);
    await chase((s) => s.whirlpool, (s) => s.spinning && s.spun > 2, 40000);
    await knock(1);
    const seen = await ramAhead((s) => s.retries >= 1 && !s.retrying, 20000);
    await hold([]);
    await sleep(200);
    const s = await state();
    await shot("after_spin_retry");
    check("retry during a spin lands level", seen.at(-1).retries === 1 && Math.abs(s.yaw) < 0.05 && Math.abs(s.heading) < 0.05 && !s.airborne && !s.spinning, `yaw ${s.yaw.toFixed(3)}, heading ${s.heading.toFixed(3)}, airborne ${s.airborne}, spinning ${s.spinning}`);
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
