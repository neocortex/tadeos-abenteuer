/**
 * E2E: gold coins reach every part of the bigger island. Checks that all 30 exist, that each outer region holds some
 * (with one close to the ruin, the windmill and the lagoon beach), that every coin can be reached on foot from the
 * landing beach while the story still blocks the bridge, and that a coin picked up with real key presses is counted and
 * remembered after a reload. Takes a picture of each secret corner.
 *
 * Usage: node scripts/e2e/coins.mjs [baseUrl]
 * Output: scripts/e2e/out/coins/{*.png, summary.json, console.log}
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.argv[2] ?? "http://localhost:5199";
const OUT = "scripts/e2e/out/coins";
const REGIONS = { lagoon: 0, jungle: 1, swamp: 2, hills: 3 };
const LANDMARKS = { ruin: [-8, 110], windmill: [126, 2], lagoonBeach: [82, 98] };
const NEAR = 15;
const MIN_PER_REGION = 3;
/** Paths give the first 20 coins; the rest lie in the secret corners. */
const PATH_COINS = 20;
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: "chrome", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
const logs = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
  logs.push(`[${m.type()}] ${m.text()}`);
});

const openGame = async () => {
  await page.goto(`${BASE}/?notitle`);
  await page.waitForFunction(() => window.game?.busy === false, null, { timeout: 90_000 });
};
await openGame();

const survey = await page.evaluate(
  ({ regions, landmarks, near }) => {
    const { hf, colliders } = window.game.island.island;
    const world = window.game.island.player.world;
    const spots = window.game.coins.spots.map((s) => [s.x, s.z]);
    const byRegion = Object.fromEntries(
      Object.entries(regions).map(([name, i]) => [name, spots.filter(([x, z]) => hf.regionAt(x, z, i) > 0.5).length]),
    );
    const byLandmark = Object.fromEntries(
      Object.entries(landmarks).map(([name, [lx, lz]]) => [name, spots.filter(([x, z]) => Math.hypot(x - lx, z - lz) < near).length]),
    );

    // Flood the walkable ground from the landing beach, the way a character of Tadeo's size can walk it
    const STEP = 0.5;
    const HALF = 175;
    const SIZE = Math.round((HALF * 2) / STEP);
    const seen = new Uint8Array(SIZE * SIZE);
    const start = window.game.island.player.position;
    const cell = (x, z) => [Math.round((x + HALF) / STEP), Math.round((z + HALF) / STEP)];
    const free = (ix, iz) => {
      const x = ix * STEP - HALF;
      const z = iz * STEP - HALF;
      return world.canStand(x, z) && !colliders.hits(x, z, 0.35);
    };
    const queue = [cell(start.x, start.z)];
    seen[queue[0][1] * SIZE + queue[0][0]] = 1;
    for (let head = 0; head < queue.length; head++) {
      const [cx, cz] = queue[head];
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx;
        const nz = cz + dz;
        if (nx < 0 || nz < 0 || nx >= SIZE || nz >= SIZE || seen[nz * SIZE + nx] || !free(nx, nz)) continue;
        seen[nz * SIZE + nx] = 1;
        queue.push([nx, nz]);
      }
    }
    const unreachable = spots.filter(([x, z]) => {
      const [cx, cz] = cell(x, z);
      // Reason: a coin may sit a hand's width from a rock, so its neighbouring cells count too
      for (let dz = -2; dz <= 2; dz++) for (let dx = -2; dx <= 2; dx++) if (seen[(cz + dz) * SIZE + cx + dx]) return false;
      return true;
    });
    return { spots, byRegion, byLandmark, unreachable };
  },
  { regions: REGIONS, landmarks: LANDMARKS, near: NEAR },
);

const closest = (i) => {
  const [x, z] = survey.spots[i];
  return Math.min(...survey.spots.filter((_, k) => k !== i).map(([ox, oz]) => Math.hypot(ox - x, oz - z)));
};
const corners = survey.spots.slice(PATH_COINS);
const crowded = corners.map((_, k) => closest(PATH_COINS + k)).filter((d) => d < 3).length;

// A picture of every secret corner, as Tadeo sees it walking up from the south
for (let i = 0; i < corners.length; i++) {
  const [x, z] = corners[i];
  await page.evaluate(
    ([cx, cz]) => {
      const { island } = window.game;
      const free = [[0, 4], [3, 3], [-3, 3], [4, 0], [-4, 0], [0, -4]].map(([dx, dz]) => [cx + dx, cz + dz]).find(([ax, az]) => island.player.world.canStand(ax, az) && !island.island.colliders.hits(ax, az, 0.5));
      window.game.placePlayer(...(free ?? [cx, cz + 1]));
    },
    [x, z],
  );
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/corner-${String(i + 1).padStart(2, "0")}.png` });
}

// Pick up the first corner coin with real key presses
const state = () =>
  page.evaluate(() => {
    const g = window.game;
    const p = g.island.player.position;
    return { x: p.x, z: p.z, yaw: g.island.rig.yaw, collected: g.coins.collected };
  });

async function walkTo(x, z, stopWhen, timeoutMs = 15_000) {
  const held = new Set();
  const t0 = Date.now();
  let s = await state();
  while (!stopWhen(s) && Date.now() - t0 < timeoutMs) {
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.hypot(dx, dz) || 1;
    const right = (dx * Math.cos(s.yaw) + dz * Math.sin(s.yaw)) / d;
    const down = (-dx * Math.sin(s.yaw) + dz * Math.cos(s.yaw)) / d;
    const want = new Set();
    if (right > 0.38) want.add("ArrowRight");
    if (right < -0.38) want.add("ArrowLeft");
    if (down > 0.38) want.add("ArrowDown");
    if (down < -0.38) want.add("ArrowUp");
    for (const k of [...held]) if (!want.has(k)) await page.keyboard.up(k), held.delete(k);
    for (const k of want) if (!held.has(k)) await page.keyboard.down(k), held.add(k);
    await page.waitForTimeout(50);
    s = await state();
  }
  for (const k of held) await page.keyboard.up(k);
  return s;
}

const [cx, cz] = corners[0];
await page.evaluate(([x, z]) => {
  const { island } = window.game;
  const free = [[0, 5], [4, 3], [-4, 3], [5, 0], [-5, 0], [0, -5]].map(([dx, dz]) => [x + dx, z + dz]).find(([ax, az]) => island.player.world.canStand(ax, az) && !island.island.colliders.hits(ax, az, 0.5));
  window.game.placePlayer(...free);
}, [cx, cz]);
await page.waitForTimeout(400);
const before = (await state()).collected;
const after = (await walkTo(cx, cz, (s) => s.collected > before)).collected;
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/picked-up.png` });

await openGame();
const remembered = await page.evaluate(() => window.game.coins.collected);

const checks = {
  thirtyCoins: survey.spots.length === 30,
  everyRegionHasCoins: Object.values(survey.byRegion).every((n) => n >= MIN_PER_REGION),
  coinsNearLandmarks: Object.values(survey.byLandmark).every((n) => n >= 1),
  allReachableOnFoot: survey.unreachable.length === 0,
  cornersNotCrowded: crowded === 0,
  pickedUpWithKeys: after === before + 1,
  rememberedAfterReload: remembered === after,
  noConsoleErrors: errors.length === 0,
};

const summary = {
  test: "coins",
  passed: Object.values(checks).every(Boolean),
  checks,
  byRegion: survey.byRegion,
  byLandmark: survey.byLandmark,
  unreachable: survey.unreachable,
  corners,
  errors,
};
writeFileSync(`${OUT}/summary.json`, JSON.stringify(summary, null, 2));
writeFileSync(`${OUT}/console.log`, logs.join("\n"));
console.log(JSON.stringify(summary, null, 2));
await browser.close();
process.exit(summary.passed ? 0 : 1);
