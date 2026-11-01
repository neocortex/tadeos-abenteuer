/**
 * The Hüter is really seen when he rises: from every place Tadeo can stand while reading the last tablet, the shot
 * shows nearly all of the figure. Counted in pixels, with the island's real depth in front of him. Part of island.mjs.
 */

/** Share of the figure that must be in view. Tadeo's hat or a tablet's edge may cover a little of him, a tree may not. */
const MIN_SEEN = 0.9;
const TABLETS = [[-14, -9], [17, -9], [2, 19]];
/** Tadeo can read a tablet from up to 3.2 away (`objectives` in game/Game.ts). */
const RADII = [1.6, 2.4, 3.1];
const ANGLES = 24;

/** Runs in the page: how much of the figure the lake shot sees from each free place around the tablets. */
async function measureStands({ tablets, radii, angles }) {
  const three = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /deps\/three\.js/.test(n));
  const THREE = await import(three);
  const { island, lake, engine } = window.game;
  const { hf, colliders, landmarks } = island.island;
  const { renderer } = engine;
  const [W, H] = [320, 180];
  const target = new THREE.WebGLRenderTarget(W, H);
  const stencil = new THREE.Scene();
  const figure = new THREE.Mesh(lake.hueter.figure.children[1].geometry, new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }));
  stencil.add(figure);
  const camera = island.camera.clone();
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const read = () => {
    const pixels = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(target, 0, 0, W, H, pixels);
    return pixels;
  };

  const seenFrom = (shot, spot) => {
    camera.position.copy(shot.pos);
    camera.lookAt(shot.look);
    camera.updateMatrixWorld(true);
    figure.position.copy(spot);
    figure.position.y += 0.18;
    const autoClear = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 1);
    renderer.render(stencil, camera);
    const alone = read();
    renderer.render(island.scene, camera);
    const world = read();
    // Reason: drawn on top of the island's depth, the figure only changes the pixels where nothing stands before it
    renderer.autoClear = false;
    renderer.render(stencil, camera);
    const both = read();
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(null);
    let [total, seen] = [0, 0];
    for (let i = 0; i < alone.length; i += 4) {
      if (alone[i] < 128) continue;
      total++;
      if (both[i] !== world[i] || both[i + 1] !== world[i + 1] || both[i + 2] !== world[i + 2]) seen++;
    }
    return seen / total;
  };

  const stands = [];
  tablets.forEach(([tx, tz], tablet) => {
    for (const r of radii) {
      for (let a = 0; a < angles; a++) {
        const [x, z] = [tx + Math.cos((a / angles) * Math.PI * 2) * r, tz + Math.sin((a / angles) * Math.PI * 2) * r];
        // Reason: the same rule Tadeo walks by, so only places he can stand count
        if (colliders.hits(x, z, 0.35) || !(landmarks.surfaceHeight(x, z) != null || hf.isWalkable(x, z))) continue;
        island.player.teleport(x, z);
        island.player.avatar.root.updateMatrixWorld(true);
        const spot = lake.risingSpot();
        stands.push({ tablet: tablet + 1, x, z, seen: seenFrom(lake.lakeShot(spot), spot) });
      }
    }
  });
  return stands;
}

export async function hueterViewChecks({ page, BASE, check, shot, wait }) {
  await page.goto(`${BASE}?quest=4`);
  await wait(4000);
  const stands = await page.evaluate(measureStands, { tablets: TABLETS, radii: RADII, angles: ANGLES });
  const hidden = stands.filter((s) => s.seen < MIN_SEEN).sort((a, b) => a.seen - b.seen);
  const line = (s) => `tablet ${s.tablet} at (${s.x.toFixed(1)}, ${s.z.toFixed(1)}): ${Math.round(s.seen * 100)}%`;
  check(
    `the Hüter is in full view from all ${stands.length} places Tadeo can stand`,
    stands.length > 100 && hidden.length === 0,
    hidden.length ? `${hidden.length} hidden, worst ${hidden.slice(0, 5).map(line).join("; ")}` : "",
  );
  // The place where the grove south of the first tablet used to hide him, played for real
  await page.goto(`${BASE}?quest=4`);
  await wait(4000);
  await page.evaluate(() => {
    window.game.placePlayer(-12.44, -10.56);
    void window.game.lake.rise();
  });
  await wait(6500);
  await shot("17-hueter-seen-south-of-tablet-1");
}
