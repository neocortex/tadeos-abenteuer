/**
 * E2E: water is walkable by one rule everywhere — shallow water can be waded, deep water is the wall, and a steep
 * bank never is. Played on the island with the hedge and the boulder still standing.
 *
 *  1. Wherever Tadeo can walk up to the edge of a pond, puddle, the lake or the lagoon, he can step into its shallow
 *     water (no invisible wall at the water's edge), and nearly all their shallow water is reachable on foot (not the
 *     frog islet's, beyond deep water, nor a strip of the lake under a rock cliff)
 *  2. Opening the banks opens no way past the boulder onto the mountain trail
 *  3. With real arrow presses Tadeo walks into a swamp puddle and back out from all four sides, and the same while
 *     jumping all the way
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/ponds.mjs [baseUrl]
 * Proof: scripts/e2e/out/ponds/{summary.json, survey.json, *.png}
 */

import { writeFileSync } from "node:fs";
import { BASE, launch, proof } from "./lib/harness.mjs";

const { out, check, finish } = proof("ponds");
const { browser, page, errors } = await launch();

/** Inland water and the lagoon, each a disc around it (centres from world/layout.ts). */
const BODIES = [
  { name: "lake", at: [2, 2], r: 30 },
  // Reason: the frog islet's shallows lie beyond deep water, so they are left out
  { name: "swamp pond", at: [-56, 98], r: 18, outside: { at: [-56, 98], r: 5 } },
  { name: "swamp puddles", at: [-60, 88], r: 24, outside: { at: [-56, 98], r: 18 } },
  { name: "lagoon", at: [100, 96], r: 25 },
];
/** Where the mountain trail starts, behind the boulder (Vegetation.ts keeps it clear). */
const TRAIL_START = [55.5, -13.5];
/** Next to the biggest swamp puddle. */
const PUDDLE = [-65, 74];

await page.goto(`${BASE}/?quest=2`);
await page.waitForFunction(() => window.probe?.busy === false && !window.engine.isSwitching, null, { timeout: 90_000 });

// ── 1 + 2. The survey ───────────────────────────────────────
const survey = await page.evaluate(
  ({ BODIES, TRAIL_START }) => {
    const { colliders } = window.game.island.island;
    const world = window.game.island.player.world;
    const STEP = 0.5;
    const HALF = 175;
    const SIZE = Math.round((HALF * 2) / STEP);
    const at = (ix, iz) => [ix * STEP - HALF, iz * STEP - HALF];
    const cell = (x, z) => [Math.round((x + HALF) / STEP), Math.round((z + HALF) / STEP)];
    const free = (ix, iz) => {
      const [x, z] = at(ix, iz);
      return world.canStand(x, z) && !colliders.hits(x, z, 0.35);
    };
    const seen = new Uint8Array(SIZE * SIZE);
    const queue = [cell(-66, 47)];
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
    const ground = (ix, iz) => world.groundHeight(...at(ix, iz));
    // Reason: Player wades below -0.08; the heightfield stops him below -0.45 at its nearest grid point, which on a
    // steep bank can be deep while the spot itself is shallow, so the depth limit is read where the heightfield reads it
    const { hf } = window.game.island.island;
    const GRID = 350 / 640;
    const gridHeight = (x, z) => hf.heights[Math.round((z + HALF) / GRID) * 641 + Math.round((x + HALF) / GRID)];
    const shallow = (ix, iz) => ground(ix, iz) < -0.08 && gridHeight(...at(ix, iz)) > -0.45;
    const bodies = BODIES.map(({ name, at: c, r, outside }) => {
      let edges = 0;
      let open = 0;
      let water = 0;
      let reached = 0;
      const missed = [];
      const shut = [];
      const [x0, z0] = cell(c[0] - r, c[1] - r);
      const [x1, z1] = cell(c[0] + r, c[1] + r);
      for (let iz = z0; iz <= z1; iz++) {
        for (let ix = x0; ix <= x1; ix++) {
          const [x, z] = at(ix, iz);
          if (Math.hypot(x - c[0], z - c[1]) > r) continue;
          if (outside && Math.hypot(x - outside.at[0], z - outside.at[1]) < outside.r) continue;
          if (!shallow(ix, iz) || colliders.hits(x, z, 0.35)) continue;
          water++;
          if (seen[iz * SIZE + ix]) reached++;
          else missed.push([x, z]);
          // A step onto this water from dry ground Tadeo can reach
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const [nx, nz] = [ix + dx, iz + dz];
            if (ground(nx, nz) < -0.08 || !seen[nz * SIZE + nx]) continue;
            edges++;
            if (free(ix, iz)) open++;
            else shut.push([x, z]);
          }
        }
      }
      return { name, water, reached, edges, open, missed, shut };
    });
    const [tx, tz] = cell(...TRAIL_START);
    return { bodies, trailReached: seen[tz * SIZE + tx] === 1 };
  },
  { BODIES, TRAIL_START },
);
writeFileSync(`${out}/survey.json`, JSON.stringify(survey, null, 2));
for (const b of survey.bodies) {
  const pct = (a, n) => (n ? Math.round((100 * a) / n) : 100);
  check(`${b.name}: no invisible wall where its shallow water meets the bank`, b.open === b.edges, `${pct(b.open, b.edges)}% of ${b.edges} steps open`);
  // Reason: a strip of the lake lies under a rock cliff, too steep to climb down like any cliff (see survey.json)
  check(`${b.name}: its shallow water is reachable on foot`, pct(b.reached, b.water) >= 95, `${pct(b.reached, b.water)}% of ${b.water} spots`);
}
check("the trail behind the boulder is not reachable on foot", !survey.trailReached);

// ── 3. Into the puddle and out, from four sides ─────────────
/** The deepest spot near the puddle, and for each arrow the dry start from which that arrow walks into it. */
const plan = await page.evaluate((PUDDLE) => {
  const world = window.game.island.player.world;
  let best = { x: PUDDLE[0], z: PUDDLE[1], h: 99 };
  for (let dz = -6; dz <= 6; dz += 0.5) {
    for (let dx = -6; dx <= 6; dx += 0.5) {
      const [x, z] = [PUDDLE[0] + dx, PUDDLE[1] + dz];
      const h = world.groundHeight(x, z);
      if (h < best.h && world.canStand(x, z)) best = { x, z, h };
    }
  }
  const yaw = window.game.island.rig.yaw;
  const [sin, cos] = [Math.sin(yaw), Math.cos(yaw)];
  // Player.update: dir = (ax·cos − ay·sin, ax·sin + ay·cos), with ArrowUp as ay = −1
  const arrows = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] };
  const starts = Object.entries(arrows).map(([key, [ax, ay]]) => {
    const dir = [ax * cos - ay * sin, ax * sin + ay * cos];
    let d = 1;
    while (d < 12 && world.groundHeight(best.x - dir[0] * d, best.z - dir[1] * d) < 0.05) d += 0.25;
    return { key, x: best.x - dir[0] * (d + 2), z: best.z - dir[1] * (d + 2) };
  });
  return { deepest: best, starts };
}, PUDDLE);
const back = { ArrowUp: "ArrowDown", ArrowDown: "ArrowUp", ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" };
const state = () => page.evaluate(() => ({ wading: window.game.island.player.wading, grounded: window.game.island.player.grounded }));

/** Hold `key` (hopping all the way when `jumping`) until `until` is true or the time is up. */
async function hold(key, until, jumping, ms = 5000) {
  await page.keyboard.down(key);
  const end = Date.now() + ms;
  let ok = false;
  while (Date.now() < end) {
    if (jumping) await page.keyboard.press("Space");
    await page.waitForTimeout(120);
    if (until(await state())) {
      ok = true;
      break;
    }
  }
  // Keep going a little, to stand well inside or well out
  await page.waitForTimeout(400);
  await page.keyboard.up(key);
  return ok;
}

for (const jumping of [false, true]) {
  for (const s of plan.starts) {
    await page.evaluate(({ x, z }) => window.probe.place(x, z), s);
    await page.waitForTimeout(300);
    const dryStart = !(await state()).wading;
    const gotIn = await hold(s.key, (st) => st.wading, jumping);
    if (s.key === "ArrowUp") await page.screenshot({ path: `${out}/in-${jumping ? "jumping" : "walking"}.png` });
    const gotOut = await hold(back[s.key], (st) => !st.wading && st.grounded, jumping);
    const how = jumping ? "jumping" : "walking";
    check(`${how} with ${s.key}: Tadeo gets into the puddle and back out`, dryStart && gotIn && gotOut, `dry start ${dryStart}, in ${gotIn}, out ${gotOut}`);
  }
}

check("no errors in the page", errors.length === 0, errors.slice(0, 3).join(" | "));
await browser.close();
finish();
