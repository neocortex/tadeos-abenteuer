/**
 * E2E: talking on the island.
 *
 *  1. From every place Tadeo can stand beside anyone on the island, nothing solid hides the talk's picture.
 *     Counted in pixels, with the island's real depth in front of a sheet stretched between the two speakers
 *  2. A real talk at the elder from the spot where a lantern post used to fill the picture uses that shot
 *  3. Standing at a place of a later quest, Tadeo says "Hier komme ich später wieder hin" once and not again, neither
 *     while he stays nor when he comes back; the next quest may say it once more
 *
 * Run (dev server on :5199 must be running):  node scripts/e2e/talk.mjs
 * Proof: scripts/e2e/out/talk/summary.json + screenshots
 */

import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.GAME_URL ?? "http://localhost:5199/";
const OUT = new URL("./out/talk/", import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });

/** Share of the sheet between the two speakers that must be in view; a hen or a flower pot may cover a little of it. */
const MIN_BETWEEN = 0.8;
/** The same for a wider sheet, about the whole picture: benches and the like may stand in its corners. */
const MIN_WIDE = 0.7;
/** Tadeo can talk from up to 2.8 away (`TALK_RANGE` in game/Game.ts). */
const RADII = [1.3, 2, 2.7];
const ANGLES = 24;
/** Where Tadeo stood when the lantern post filled the picture. */
const POST_STAND = [63.9, 39.3];
/** 4 from the elder's spot, a place of quest 7, and out of his talking range. */
const NEAR_LATER_PLACE = [65, 41];
const AWAY = [64, 48];
const REMARK = "Hier komme ich später wieder hin.";
/** Long enough for three remarks at one every 12 seconds. */
const STAY_MS = 27000;
/** Long enough for the pause between two remarks to have run out. */
const COME_BACK_MS = 13000;

const browser = await chromium.launch({
  channel: "chrome",
  args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
};
const shot = (name) => page.screenshot({ path: `${OUT}${name}.png` });
const wait = (ms) => page.waitForTimeout(ms);

async function open(quest) {
  await page.goto(`${BASE}?quest=${quest}`);
  await page.waitForFunction(() => window.game?.story && window.engine?.scene === window.game.island && !window.probe.busy, null, { timeout: 30000 });
  await wait(2500);
}

/** Runs in the page: how much of the picture is free from each place Tadeo can stand beside the named people. */
async function measureStands({ ids, radii, angles }) {
  const three = performance.getEntriesByType("resource").map((e) => e.name).find((n) => /deps\/three\.js/.test(n));
  const THREE = await import(three);
  const { talkShot } = await import("/src/game/talkShot.ts");
  const { island, npcs, engine, director } = window.game;
  const { chuleta } = director;
  const { hf, colliders, landmarks } = island.island;
  const { renderer } = engine;
  const player = island.player;
  const [W, H] = [320, 180];
  const target = new THREE.WebGLRenderTarget(W, H);
  const stencil = new THREE.Scene();
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: 0xff0000, side: THREE.DoubleSide }));
  stencil.add(sheet);
  const camera = island.camera.clone();
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
  const read = () => {
    const pixels = new Uint8Array(W * H * 4);
    renderer.readRenderTargetPixels(target, 0, 0, W, H, pixels);
    return pixels;
  };

  /** Share of a sheet through both speakers, wider by `extra` on each side, that nothing stands in front of. */
  const seen = (world, npc, extra) => {
    const p = player.position;
    sheet.position.copy(p).lerp(npc.position, 0.5);
    sheet.position.y += 1.3;
    sheet.rotation.y = Math.atan2(-(npc.position.z - p.z), npc.position.x - p.x);
    sheet.scale.set(Math.hypot(npc.position.x - p.x, npc.position.z - p.z) + extra * 2, 1.6, 1);
    sheet.updateMatrixWorld(true);
    const autoClear = renderer.autoClear;
    renderer.setRenderTarget(target);
    renderer.autoClear = true;
    renderer.setClearColor(0x000000, 1);
    renderer.render(stencil, camera);
    const alone = read();
    renderer.render(island.scene, camera);
    const before = read();
    // Reason: drawn on top of the island's depth, the sheet only changes the pixels where nothing stands before it
    renderer.autoClear = false;
    renderer.render(stencil, camera);
    const both = read();
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(null);
    let [total, free] = [0, 0];
    for (let i = 0; i < alone.length; i += 4) {
      if (alone[i] < 128) continue;
      total++;
      if (both[i] !== before[i] || both[i + 1] !== before[i + 1] || both[i + 2] !== before[i + 2]) free++;
    }
    return total ? free / total : 0;
  };

  const stands = [];
  for (const id of ids) {
    const npc = npcs.get(id);
    for (const r of radii) {
      for (let a = 0; a < angles; a++) {
        const [x, z] = [npc.position.x + Math.cos((a / angles) * Math.PI * 2) * r, npc.position.z + Math.sin((a / angles) * Math.PI * 2) * r];
        // Reason: the same rule Tadeo walks by, so only places he can stand count
        if (colliders.hits(x, z, 0.35) || !(landmarks.surfaceHeight(x, z) != null || hf.isWalkable(x, z))) continue;
        player.teleport(x, z);
        if (npcs.nearest(player.position, r + 0.01) !== npc) continue;
        const talk = talkShot(player.position, npc.position, colliders);
        camera.position.copy(talk.pos);
        camera.lookAt(talk.look);
        camera.updateMatrixWorld(true);
        // Reason: the two speakers stand on the sheet; everyone and everything else counts as being in the way
        for (const who of [player.avatar.root, npc.avatar.root, chuleta.root, npc.shadow]) who.visible = false;
        const between = seen(island.scene, npc, 0.4);
        const wide = seen(island.scene, npc, 2);
        for (const who of [player.avatar.root, npc.avatar.root, chuleta.root, npc.shadow]) who.visible = true;
        stands.push({ id, x, z, between, wide, camera: [talk.pos.x, talk.pos.z] });
      }
    }
  }
  return stands;
}

const percent = (share) => `${Math.round(share * 100)}%`;
const describe = (s) => `${s.id} from (${s.x.toFixed(1)}, ${s.z.toFixed(1)}), camera (${s.camera[0].toFixed(1)}, ${s.camera[1].toFixed(1)}): ${percent(s.between)} between, ${percent(s.wide)} wide`;

function pictureChecks(place, stands, least) {
  const hidden = stands.filter((s) => s.between < MIN_BETWEEN || s.wide < MIN_WIDE).sort((a, b) => a.between - b.between);
  check(
    `${place}: nothing hides the picture from all ${stands.length} places to talk from`,
    stands.length >= least && hidden.length === 0,
    hidden.length ? `${hidden.length} hidden, worst ${hidden.slice(0, 6).map(describe).join("; ")}` : "",
  );
  writeFileSync(`${OUT}stands-${place}.json`, JSON.stringify(stands, null, 1));
}

// ── 1. The picture, from everywhere ─────────────────────────
await open(7);
pictureChecks("village", await page.evaluate(measureStands, { ids: ["elder", "wiseWoman", "wiseMan", "villager0", "villager1", "villager2", "villager3"], radii: RADII, angles: ANGLES }), 300);
await open(10);
pictureChecks("dock", await page.evaluate(measureStands, { ids: ["villager3"], radii: RADII, angles: ANGLES }), 10);

// ── 2. A real talk where the post used to stand in the way ──
await open(7);
await page.evaluate(([x, z]) => window.probe.place(x, z), POST_STAND);
await wait(500);
await page.keyboard.press("Space");
await wait(1500);
const framing = await page.evaluate(async () => {
  const { talkShot } = await import("/src/game/talkShot.ts");
  const { island, npcs, ui } = window.game;
  const want = talkShot(island.player.position, npcs.get("elder").position, island.island.colliders);
  return { open: ui.dialogue.isOpen, apart: island.camera.position.distanceTo(want.pos) };
});
check("a real talk at the elder opens", framing.open);
check("the real talk's camera stands where the measured shot says", framing.apart < 0.05, `${framing.apart.toFixed(3)} apart`);
await shot("elder-from-the-post-stand");

// ── 3. The remark about later places ────────────────────────
await open(4);
await page.evaluate(async () => {
  const { NarrationManager } = await import("/src/systems/NarrationManager.ts");
  const narration = NarrationManager.getInstance();
  const speak = narration.speakLine.bind(narration);
  window.said = [];
  narration.speakLine = (text, speaker) => {
    window.said.push(`${speaker}: ${text}`);
    return speak(text, speaker);
  };
});
const remarks = () => page.evaluate((text) => window.said.filter((l) => l.includes(text)), REMARK);
const place = (at) => page.evaluate(([x, z]) => window.probe.place(x, z), at);

await place(NEAR_LATER_PLACE);
await wait(STAY_MS);
let heard = await remarks();
check(`standing there for ${STAY_MS / 1000} s he says it once`, heard.length === 1, heard.length ? `${heard.length} times: ${heard[0]}` : "never");
await shot("remark");

await place(AWAY);
await wait(1000);
await place(NEAR_LATER_PLACE);
await wait(COME_BACK_MS);
heard = await remarks();
check("coming back during the same quest he does not say it again", heard.length === 1, `${heard.length} times`);

await page.evaluate(() => window.probe.advance());
await place(AWAY);
await wait(1000);
await place(NEAR_LATER_PLACE);
await wait(COME_BACK_MS);
heard = await remarks();
check("the next quest says it once more, with its own name", heard.length === 2 && heard[1] !== heard[0], heard.at(-1));

check("no errors in the page", errors.length === 0, errors.slice(0, 3).join(" | "));

await browser.close();
const passed = results.every((r) => r.ok);
writeFileSync(`${OUT}summary.json`, JSON.stringify({ passed, when: new Date().toISOString(), results }, null, 2));
console.log(passed ? "\nALL PASS" : "\nFAIL", `→ ${OUT}summary.json`);
process.exit(passed ? 0 : 1);
