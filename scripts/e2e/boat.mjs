/**
 * E2E: Tadeo's boat and the docks.
 *
 *  1. Nowhere on a dock can Tadeo step off into deep water, checked over the whole ground and with real key presses
 *  2. Water never draws inside the hull: on the moored boat, at sea and on the treasure island's beach
 *  3. In the opening at sea, nothing of the boat comes between the camera and Tadeo's face, and his feet stay inside her
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/boat.mjs
 * Proof: scripts/e2e/out/boat/summary.json + screenshots
 */

import { BASE, launch, proof } from "./lib/harness.mjs";

const { out, check, finish } = proof("boat");
const { browser, page, errors } = await launch();
const wait = (ms) => page.waitForTimeout(ms);
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });

/**
 * Deeper than Tadeo can ever wade.
 * Reason: terrain lets him wade to 0.45, and a coast cell reaches a little deeper between its grid points; seabed under
 * the docks lies at 15.
 */
const TOO_DEEP = 0.8;

async function openIsland(query) {
  await page.goto(`${BASE}/?${query}`);
  await page.waitForFunction(() => window.game?.island && window.probe && !window.probe.busy, null, { timeout: 60000 });
  await wait(800);
}

// ── 1. The docks ────────────────────────────────────────────

await openIsland("quest=10");

const deep = await page.evaluate((maxDepth) => {
  const { world } = window.game.island.player;
  const found = [];
  // Reason: fine enough to catch a single opened heightfield cell, which is about a metre wide
  for (let z = -180; z <= 180; z += 0.2) {
    for (let x = -180; x <= 180; x += 0.2) {
      if (world.canStand(x, z) && world.groundHeight(x, z) < -maxDepth) found.push([+x.toFixed(1), +z.toFixed(1)]);
    }
  }
  return found;
}, TOO_DEEP);
check("nowhere can Tadeo stand in water too deep to wade", deep.length === 0, `${deep.length} spots, e.g. ${JSON.stringify(deep.slice(0, 4))}`);

/** Places Tadeo on a deck, holds a key for a while, and returns the lowest he ever stood. */
async function walkOff(x, z, key) {
  await page.evaluate(([px, pz]) => window.probe.place(px, pz), [x, z]);
  await wait(150);
  await page.keyboard.down(key);
  let lowest = Infinity;
  for (let i = 0; i < 16; i++) {
    await wait(100);
    lowest = Math.min(lowest, await page.evaluate(() => window.game.island.player.position.y));
  }
  await page.keyboard.up(key);
  return lowest;
}

// Reason: the neck where it joins the head, and the head itself, in every direction the arrows can walk
const heads = { "north dock head": [-35.5, -74], "north dock neck": [-34.2, -70.2], "landing pier head": [-83, 65], "landing pier neck": [-80.3, 62.4] };
for (const [name, [x, z]] of Object.entries(heads)) {
  for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]) {
    const lowest = await walkOff(x, z, key);
    check(`${name}: ${key} stays out of deep water`, lowest > -TOO_DEEP, `lowest ${lowest.toFixed(2)}`);
  }
}
await shot("01-dock");

// ── 2. No water in the hull ─────────────────────────────────

/** Every open scene's sea plane, and the lid over the hull, for the running scene. */
const FIND_PARTS = `
  const scene = window.engine.scene.scene;
  const camera = window.engine.scene.camera;
  let lid = null;
  const water = [];
  const at = new camera.position.constructor();
  // Reason: the island has more than one boat; the one in the picture is the nearest to the camera
  let nearest = Infinity;
  scene.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.name === "water-stop") {
      const d = o.getWorldPosition(at).distanceTo(camera.position);
      if (d < nearest) {
        nearest = d;
        lid = o;
      }
    }
    if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
    if (o.material.transparent && o.material.depthWrite === false && o.renderOrder === 1 && o.geometry.boundingSphere.radius > 300) water.push(o);
  });
`;

/** Screen pixels inside the rim of the hull, as [x, y] on a 1280 x 720 page. */
const hullPixels = () =>
  page.evaluate((find) => {
    const parts = new Function(`${find}; return { camera, lid };`)();
    const { camera, lid } = parts;
    if (!lid) return [];
    const pos = lid.geometry.attributes.position;
    const seen = [];
    camera.updateMatrixWorld();
    const c = lid.position.clone().set(0, 0, 0);
    for (let i = 0; i < pos.count; i += 3) {
      // Reason: each lid triangle starts at the middle of the boat and reaches for the rim, so stay short of the rail
      for (const k of [0.45, 0.6, 0.75]) {
        c.fromBufferAttribute(pos, i).lerp(lid.position.clone().fromBufferAttribute(pos, i + 1), k).applyMatrix4(lid.matrixWorld).project(camera);
        const x = Math.round((c.x * 0.5 + 0.5) * 1280);
        const y = Math.round((0.5 - c.y * 0.5) * 720);
        if (x >= 0 && x < 1280 && y >= 0 && y < 720) seen.push([x, y]);
      }
    }
    return seen;
  }, FIND_PARTS);

/** Colours of these page pixels now. */
async function colours(points, name) {
  const png = await page.screenshot(name ? { path: `${out}/${name}.png` } : {});
  return page.evaluate(
    async ([data, spots]) => {
      const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${data}`)).blob());
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      return spots.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3));
    },
    [png.toString("base64"), points],
  );
}

const setShown = (what, shown) =>
  page.evaluate(
    ([find, part, value]) => {
      const { lid, water } = new Function(`${find}; return { lid, water };`)();
      if (part === "lid") lid.visible = value;
      else water.forEach((w) => (w.visible = value));
    },
    [FIND_PARTS, what, shown],
  );

/**
 * Share of the hull's pixels that the water turns blue.
 * Reason: hiding the sea brightens the whole picture through the bloom, so plain differences also find the dark outlines.
 */
function watery(picture, dry) {
  const blue = ([r, , b]) => b > r + 40;
  return picture.filter((p, i) => blue(p) && !blue(dry[i])).length / picture.length;
}

/**
 * With the world stopped, the hull's inside must look the same with and without the water plane.
 * Reason: taking the lid off as well shows that the comparison would see water if there were any.
 */
async function checkHull(name, expectControl) {
  await page.evaluate(() => (window.engine.paused = true));
  await wait(300);
  const points = await hullPixels();
  check(`${name}: the hull is in the picture`, points.length > 30, `${points.length} pixels`);
  const shown = await colours(points, `02-${name}`);
  await setShown("water", false);
  await wait(200);
  const dry = await colours(points);
  await setShown("water", true);
  await setShown("lid", false);
  await wait(200);
  const flooded = await colours(points, `02-${name}-without-lid`);
  await setShown("lid", true);
  const withLid = watery(shown, dry);
  const withoutLid = watery(flooded, dry);
  check(`${name}: no water shows inside the hull`, withLid === 0, `${(withLid * 100).toFixed(1)} % of its pixels`);
  if (expectControl) check(`${name}: without the lid the check does see water`, withoutLid > 0.02, `${(withoutLid * 100).toFixed(1)} %`);
  await page.evaluate(() => (window.engine.paused = false));
}

await page.evaluate(() => window.probe.place(-35.5, -72, Math.PI));
await wait(2500);
await checkHull("moored", true);

/** Starts a challenge and clicks through its talk until `ready` holds. */
async function playUntil(query, ready) {
  await page.goto(`${BASE}/?${query}`);
  for (let i = 0; i < 240; i++) {
    await wait(250);
    if (await page.evaluate(ready).catch(() => false)) return true;
    if (await page.locator(".dialogue.open").count()) await page.keyboard.press("Space");
  }
  return false;
}

check("the sail starts", await playUntil("challenge=sea", () => window.engine?.scene?.e2e?.phase === "sail"));
await wait(1500);
await checkHull("sea", true);

// ── 3. Tadeo's face in the opening ──────────────────────────

await page.addInitScript(() => localStorage.clear());
await page.goto(BASE);
await wait(4000);
await page.keyboard.press("Space");
let atSea = false;
for (let i = 0; i < 480 && !atSea; i++) {
  await wait(250);
  atSea = await page.evaluate(() => !!window.game?.island.scene.getObjectByName("opening-sea"));
  if (!atSea) await page.keyboard.press("Space");
}
check("the opening reaches the sea", atSea);

const face = page.evaluate(async () => {
  const THREE = await import("/node_modules/.vite/deps/three.js");
  const { island } = window.game;
  const ray = new THREE.Raycaster();
  const parts = ["opening-boat:solid", "opening-boat:cloth"].map((n) => island.scene.getObjectByName(n));
  const head = island.scene.getObjectByName("opening-head");
  const legs = [];
  island.scene.traverse((o) => o.name === "opening-leg" && legs.push(o));
  const at = new THREE.Vector3();
  const to = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();
  let frames = 0;
  let blocked = 0;
  let feetOut = 0;
  const box = new THREE.Box3();
  return new Promise((resolve) => {
    const frame = () => {
      if (!island.scene.getObjectByName("opening-sea")) return resolve({ frames, blocked, feetOut });
      frames++;
      const cam = island.camera;
      cam.updateMatrixWorld();
      head.getWorldPosition(at);
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      // Reason: the middle of the face and four points around it, inside the big round head
      for (const [dx, dy] of [[0, 0], [0.22, 0], [-0.22, 0], [0, 0.22], [0, -0.22]]) {
        to.copy(at).addScaledVector(right, dx).addScaledVector(up, dy);
        ray.set(cam.position, to.clone().sub(cam.position).normalize());
        ray.far = cam.position.distanceTo(to) - 0.3;
        if (ray.intersectObjects(parts, false).length) {
          blocked++;
          break;
        }
      }
      // Reason: until the hit flings him up, the hull hides everything below his waist, so a ray to a foot must hit the boat
      if (island.scene.getObjectByName("opening-shark").position.y < 0) {
        for (const leg of legs) {
          box.setFromObject(leg).getCenter(to);
          to.y = box.min.y + 0.05;
          ray.set(cam.position, to.clone().sub(cam.position).normalize());
          ray.far = cam.position.distanceTo(to) + 0.05;
          if (!ray.intersectObjects(parts, false).length) feetOut++;
        }
      }
      requestAnimationFrame(frame);
    };
    frame();
  });
});
await wait(1500);
await shot("03-sailing");
await wait(2700);
await shot("03-fin");
const seen = await face;
check("nothing of the boat comes between the camera and Tadeo's face", seen.frames > 60 && seen.blocked === 0, `${seen.blocked} of ${seen.frames} frames`);
check("his feet stay inside the boat", seen.feetOut === 0, `${seen.feetOut} times out`);

await browser.close();
check("no errors in the console", errors.length === 0, errors.slice(0, 3).join(" | "));
finish();
