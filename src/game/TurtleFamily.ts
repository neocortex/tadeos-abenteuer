/**
 * The turtle family at the lagoon, a side quest Tadeo can do at any time. The rumbling volcano scared Frau Moos' five
 * babies off along the beach. A baby runs after Tadeo once he comes close, in a little line that follows the way he
 * walked and copies his jumps; beside their mother they scuttle into the water. All five home earns the turtle hat.
 * Only the hat is remembered: a game loaded half way through finds the babies on the beach again.
 */

import * as THREE from "three";
import { Coins } from "./Coins";
import { Wardrobe } from "./Wardrobe";
import { audio } from "../audio/Audio";
import { henVoice } from "../audio/henVoice";
import { Bursts } from "../challenges/shared/bursts";
import { OutfitId } from "../characters/hats";
import { DialogueScript } from "../data/dialogues";
import { IslandDirector } from "./IslandDirector";
import { NarrationManager } from "../systems/NarrationManager";
import { Bubble } from "../ui/Hud";
import { CritterMesh } from "../world/ambient/CritterMesh";
import { TURTLE_ANIM } from "../world/ambient/critterAnims";
import { mossyTurtleModel, turtleModel } from "../world/ambient/regionCritterModels";
import { rnd, turnToward, yawTo } from "../world/ambient/spawn";
import { glowTexture } from "../world/ambient/textures";
import { P2, SPOTS } from "../world/layout";

const PRIZE: OutfitId = "shellHat";
const PRIZE_NAME = "Schildkrötenhut";
/** Where the babies ran to: all round the lagoon, one of them on the far side of the water. */
const LOST_AT: P2[] = [[92, 83], [78, 109], [97, 109], [110, 83], [120, 97]];
const MUM = SPOTS.turtleMum;
const POOL = SPOTS.turtlePool;
const MUM_SCALE = 2.6;
const MUM_RADIUS = 1.5;
const MUM_FACING = -Math.PI / 2;
const BABY_SCALE = 0.55;
const TALK_RANGE = 3.8;
/** With Tadeo this close to their mother, the babies behind him run to the water. */
const DELIVER_RANGE = 6;
/** Beyond this the thank-you scene waits until Tadeo comes back. */
const THANKS_RANGE = 12;
const JOIN_RANGE = 2.4;
const PEEP_RANGE = 14;
const HOP_EVERY = 1.6;
const HOP_TIME = 0.36;
const JOIN_HOP_TIME = 0.45;
/** Metres between babies in the line. */
const GAP = 1;
/** Metres between points of Tadeo's trail. */
const TRAIL_STEP = 0.15;
const TRAIL_POINTS = Math.ceil(((LOST_AT.length + 1) * GAP) / TRAIL_STEP) + 1;
/** Further than this in one frame is a teleport (back from a challenge), not a step. */
const TELEPORT = 3;
const SCUTTLE_SPEED = 3.4;
/** Seconds between babies setting off from the line to the water. */
const LEAVE_STAGGER = 0.35;
const SURFACE = -0.05;

const moos = (text: string) => ({ speaker: "Frau Moos", portrait: "", text });
const tadeo = (text: string) => ({ speaker: "Tadeo", portrait: "", text });

const INTRO: DialogueScript = [
  moos("Hallo! Ich bin Frau Moos. Bitte hilf mir!"),
  tadeo("Was ist denn passiert?"),
  moos("Der Vulkan hat so laut gerumpelt. Da sind meine Babys erschrocken."),
  moos("Alle fünf sind weggelaufen! Sie sind irgendwo am Strand."),
];
const ASK: DialogueScript = [
  tadeo("Keine Angst, Frau Moos. Ich finde sie!"),
  moos("Geh einfach nah zu ihnen hin. Dann laufen sie dir nach."),
  moos("Und dann bring sie zu mir ans Wasser."),
];
/** He comes along with babies behind him already. */
const ASK_WITH_BABIES: DialogueScript = [
  tadeo("Schau mal! Meinst du die hier?"),
  moos("Ja, das sind meine Kleinen! Bitte bring sie alle zu mir ans Wasser."),
];
const HINTS: DialogueScript = [
  moos("Hörst du das Piepsen? So rufen meine Kleinen."),
  moos("Schau auch auf der anderen Seite vom Wasser nach!"),
];
const THANKS: DialogueScript = [
  moos("Alle fünf sind wieder da! Danke, Tadeo!"),
  tadeo("Gern! Die sind aber schnell für Schildkröten!"),
  moos("Das haben sie von mir. Ich war früher auch so schnell."),
  moos("Hier, mein Schildkrötenhut für dich. Jetzt gehörst du zur Familie!"),
];
const AFTER: DialogueScript = [
  moos("Schau nur, wie schön meine Kleinen schwimmen!"),
  moos("Danke noch mal, Tadeo. Du bist eine tolle Schildkröte!"),
];
const ARRIVALS = ["Da bist du ja, mein Kleines!", "Schnell ins Wasser, mein Schatz!", "Noch ein Baby! Wie schön!"];
const WHERE_IS_MUM = "Gack! Das Baby läuft dir nach! Wo ist wohl seine Mama?";
const LAST_BABY = "Das war das letzte Baby! Jetzt schnell zur Mama! Gack!";
const CHEER = "Gack! Tadeo ist jetzt eine Schildkröte! Aber bitte nicht so langsam!";

type BabyState = "lost" | "following" | "leaving" | "home";

interface Baby {
  state: BabyState;
  x: number;
  z: number;
  yaw: number;
  /** Flipper paddling (the turtle shader's crawl phase). */
  phase: number;
  /** Height above the ground right now: a hop, or Tadeo's jump copied. */
  lift: number;
  clock: number;
  peepIn: number;
  /** Seconds left of the hop into the line. */
  joinHop: number;
  /** Seconds before it sets off for the water. */
  delay: number;
  /** Its circle in the water. */
  angle: number;
  radius: number;
  swim: number;
  glint: THREE.Sprite;
}

interface TurtleFamilyDeps {
  director: IslandDirector;
  wardrobe: Wardrobe;
  coins: Coins;
}

export class TurtleFamily {
  private group = new THREE.Group();
  private babyMesh = new CritterMesh({ name: "turtleBabies", geometry: turtleModel(), count: LOST_AT.length, animate: TURTLE_ANIM, castShadow: true, selfLit: 0.15 });
  private mumMesh = new CritterMesh({ name: "frauMoos", geometry: mossyTurtleModel(), count: 1, animate: TURTLE_ANIM, castShadow: true, selfLit: 0.1 });
  private sparks = new Bursts(glowTexture(), true);
  private bubble: Bubble;
  private babies: Baby[];
  /** The babies behind Tadeo, first in line first. */
  private line: Baby[] = [];
  /** Where Tadeo walked, newest first, and how high he was above the ground there. */
  private trail: { x: number; z: number; lift: number }[] = [];
  private mum = new THREE.Vector3();
  private mumYaw = MUM_FACING;
  private mumPhase = 0;
  private mumTalking = false;
  private mumClock = 0;
  private asked = false;
  private won = false;
  private finishing = false;
  private chats = 0;
  private arrivals = 0;
  private pill: string | null = null;
  private tmp = new THREE.Vector3();

  constructor(private d: TurtleFamilyDeps) {
    const { island } = d.director;
    // Reason: plain blending, not additive: added light disappears on the bright white sand
    const glintMat = new THREE.SpriteMaterial({ map: glowTexture(), color: "#ffc21f", opacity: 0.95, depthWrite: false, fog: false });
    this.babies = LOST_AT.map(() => ({
      state: "lost",
      x: 0,
      z: 0,
      yaw: rnd(-Math.PI, Math.PI),
      phase: 0,
      lift: 0,
      clock: rnd(0, HOP_EVERY),
      peepIn: rnd(0, 2),
      joinHop: 0,
      delay: 0,
      angle: rnd(0, Math.PI * 2),
      radius: rnd(1.4, 3),
      swim: rnd(0.3, 0.5),
      glint: new THREE.Sprite(glintMat),
    }));
    this.group.add(this.babyMesh.mesh, this.mumMesh.mesh, this.sparks.mesh, ...this.babies.map((b) => b.glint));
    island.scene.add(this.group);
    this.bubble = new Bubble(d.director.ui.layer);
    this.mum.set(MUM[0], island.player.world.groundHeight(MUM[0], MUM[1]), MUM[1]);
    island.island.colliders.add(MUM[0], MUM[1], MUM_RADIUS);
    this.won = d.wardrobe.hasPrize(PRIZE);
    this.arrange();
  }

  /** For the E2E test. */
  get state() {
    return {
      asked: this.asked,
      found: this.found,
      mum: MUM,
      babies: this.babies.map((b) => ({ state: b.state, x: b.x, z: b.z, lift: b.lift })),
    };
  }

  /** The talk Tadeo can start beside Frau Moos, shaped like one of the game's objectives. */
  offer(): { at: P2; radius: number; verb: string; run(): Promise<void> } | null {
    const p = this.d.director.island.player.position;
    if (this.finishing || Math.hypot(p.x - MUM[0], p.z - MUM[1]) > TALK_RANGE) return null;
    return { at: MUM, radius: TALK_RANGE, verb: "Sprechen", run: () => this.chat() };
  }

  /**
   * @param free Tadeo is free to act.
   * @returns A scene that wants to run now, if any.
   */
  update(dt: number, free: boolean): (() => Promise<void>) | null {
    const { wardrobe, director } = this.d;
    const { ui, island } = director;
    // Reason: the prize is the only thing saved, and a new adventure forgets it, so the babies go back to the beach
    const won = wardrobe.hasPrize(PRIZE);
    if (won !== this.won) {
      this.won = won;
      this.arrange();
    }
    const p = island.player.position;
    this.extendTrail(p);
    this.babies.forEach((b, i) => {
      if (b.state === "lost") this.stepLost(b, i, dt, p, free);
      else if (b.state === "following") this.stepFollowing(b, this.line.indexOf(b), dt);
      else if (b.state === "leaving") this.stepLeaving(b, dt);
      else this.stepHome(b, dt);
      this.show(b, i);
    });
    this.babyMesh.commit();
    this.updateMum(dt, p);
    this.sparks.update(dt);
    if (this.bubble.speaking) this.bubble.place(this.d.director.onScreen(this.mum.x, this.mum.y + 2.4, this.mum.z));
    else this.bubble.place(null);

    const near = Math.hypot(p.x - MUM[0], p.z - MUM[1]);
    if (free && this.asked && near < DELIVER_RANGE && this.line.length) this.deliver();
    const running = !this.won && (this.asked || this.found > 0);
    // Reason: only while Tadeo is free, so the pill is gone before a challenge starts and during a talk
    const pill = free && running ? `🐢 ${this.found} / ${LOST_AT.length}` : null;
    // Reason: written on a change only, because a challenge fills this same pill while its scene is still fading in
    if (pill !== this.pill) ui.status((this.pill = pill));
    // Reason: she finishes greeting the last baby first, so her bubble and voice are not cut off by the thank-you scene
    if (free && !this.won && !this.finishing && !this.bubble.speaking && near < THANKS_RANGE && this.babies.every((b) => b.state === "home")) {
      this.finishing = true;
      return () => this.thanks();
    }
    return null;
  }

  private get found(): number {
    return this.babies.filter((b) => b.state !== "lost").length;
  }

  /** Lost on the beach, or swimming once the hat is won. */
  private arrange(): void {
    this.asked = this.won;
    this.finishing = false;
    this.line = [];
    this.babies.forEach((b, i) => {
      b.state = this.won ? "home" : "lost";
      [b.x, b.z] = LOST_AT[i];
    });
  }

  private extendTrail(p: THREE.Vector3): void {
    const last = this.trail[0];
    const moved = last ? Math.hypot(p.x - last.x, p.z - last.z) : Infinity;
    if (last && moved > TELEPORT) {
      this.trail.length = 0;
      for (const b of this.line) {
        b.x = p.x;
        b.z = p.z;
      }
    }
    if (moved < TRAIL_STEP) return;
    this.trail.unshift({ x: p.x, z: p.z, lift: p.y - this.ground(p.x, p.z) });
    this.trail.length = Math.min(this.trail.length, TRAIL_POINTS);
  }

  private stepLost(b: Baby, i: number, dt: number, p: THREE.Vector3, free: boolean): void {
    b.clock += dt;
    const d = Math.hypot(b.x - p.x, b.z - p.z);
    // Reason: they hop on the spot and call, so a child spots them from far away; each to its own beat
    const t = b.clock % (HOP_EVERY + i * 0.13);
    b.lift = t < HOP_TIME ? Math.sin((t / HOP_TIME) * Math.PI) * 0.32 : 0;
    if (t < HOP_TIME) b.phase += dt * 16;
    if (d < PEEP_RANGE) b.yaw = turnToward(b.yaw, yawTo(b.x, b.z, p.x, p.z), dt * 3);
    if (!free) return;
    if (d < PEEP_RANGE && (b.peepIn -= dt) < 0) {
      henVoice.peep();
      b.peepIn = rnd(1.4, 2.6);
    }
    if (d < JOIN_RANGE) this.join(b);
  }

  private join(b: Baby): void {
    b.state = "following";
    b.joinHop = JOIN_HOP_TIME;
    this.line.push(b);
    henVoice.peep();
    audio.playSfx("sfx_berry_collect", 0.6, 1.6);
    this.sparks.emit(this.tmp.set(b.x, this.ground(b.x, b.z) + 0.4, b.z), { count: 18, color: "#fff0a8", speed: [1, 2.6], up: 2, life: [0.4, 0.8], size: [0.16, 0.3], gravity: 6 });
    if (this.found === LOST_AT.length) this.d.director.chuletaSay(LAST_BABY);
    else if (this.found === 1 && !this.asked) this.d.director.chuletaSay(WHERE_IS_MUM);
  }

  /** Walk to this baby's place on Tadeo's trail, so the line follows his way round every palm and crate. */
  private stepFollowing(b: Baby, place: number, dt: number): void {
    const spot = this.trail[Math.min(Math.round(((place + 1) * GAP) / TRAIL_STEP), this.trail.length - 1)];
    const k = 1 - Math.exp(-dt * 12);
    const moved = this.moveTo(b, b.x + (spot.x - b.x) * k, b.z + (spot.z - b.z) * k, dt);
    // Reason: little flippers at Tadeo's pace: they paddle as fast as they can, which is the joke
    b.phase += Math.min(moved * 7, dt * 30);
    b.joinHop = Math.max(0, b.joinHop - dt);
    const hop = Math.sin((b.joinHop / JOIN_HOP_TIME) * Math.PI) * 0.6;
    b.lift = Math.max(spot.lift * 0.6, hop);
  }

  private stepLeaving(b: Baby, dt: number): void {
    b.angle += dt * b.swim;
    b.lift = 0;
    b.phase += dt * 24;
    if ((b.delay -= dt) > 0) return;
    const [tx, tz] = this.swimSpot(b);
    const dx = tx - b.x;
    const dz = tz - b.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.3) return this.arrive(b);
    const step = Math.min(SCUTTLE_SPEED * dt, d);
    // Reason: past their mother, not through her
    this.tmp.set(b.x + (dx / d) * step, 0, b.z + (dz / d) * step);
    this.d.director.island.island.colliders.resolve(this.tmp, 0.2);
    this.moveTo(b, this.tmp.x, this.tmp.z, dt);
  }

  private arrive(b: Baby): void {
    b.state = "home";
    this.sparks.emit(this.tmp.set(b.x, 0.1, b.z), { count: 16, color: "#dff6ff", speed: [0.6, 1.8], up: 2.4, life: [0.3, 0.6], size: [0.12, 0.26], gravity: 8 });
    audio.playSfx("sfx_wave", 0.3, 1.6);
    if (this.bubble.speaking || this.babies.every((o) => o.state === "home")) return;
    const text = ARRIVALS[this.arrivals++ % ARRIVALS.length];
    this.bubble.say(text, 2800);
    NarrationManager.getInstance().speakLine(text, "Frau Moos");
  }

  private stepHome(b: Baby, dt: number): void {
    b.angle += dt * b.swim;
    b.clock += dt;
    b.phase += dt * 5;
    b.lift = Math.sin(b.clock * 2) * 0.015;
    const [x, z] = this.swimSpot(b);
    this.moveTo(b, x, z, dt);
  }

  private swimSpot(b: Baby): [number, number] {
    return [POOL[0] + Math.cos(b.angle) * b.radius, POOL[1] + Math.sin(b.angle) * b.radius * 0.8];
  }

  /** Move a baby and turn it the way it goes. Returns the metres moved. */
  private moveTo(b: Baby, x: number, z: number, dt: number): number {
    const moved = Math.hypot(x - b.x, z - b.z);
    if (moved > dt * 0.2) b.yaw = turnToward(b.yaw, yawTo(b.x, b.z, x, z), dt * 10);
    b.x = x;
    b.z = z;
    return moved;
  }

  private show(b: Baby, i: number): void {
    const y = Math.max(this.ground(b.x, b.z), SURFACE) + b.lift;
    this.babyMesh.set(i, b.x, y, b.z, b.yaw, 0, b.state === "following" ? Math.sin(b.phase) * 0.1 : 0, b.phase % (Math.PI * 200), BABY_SCALE);
    b.glint.visible = b.state === "lost";
    if (!b.glint.visible) return;
    b.glint.position.set(b.x, y + 0.6, b.z);
    b.glint.scale.setScalar(1.7 + Math.sin(b.clock * 4 + i) * 0.4);
  }

  private updateMum(dt: number, p: THREE.Vector3): void {
    this.mumClock += dt;
    const near = Math.hypot(p.x - MUM[0], p.z - MUM[1]) < 9;
    this.mumYaw = turnToward(this.mumYaw, near ? yawTo(MUM[0], MUM[1], p.x, p.z) : MUM_FACING, dt * 1.6);
    if (this.mumTalking) this.mumPhase += dt * 3;
    const nod = this.mumTalking ? Math.sin(this.mumClock * 5) * 0.03 : 0;
    this.mumMesh.set(0, this.mum.x, this.mum.y, this.mum.z, this.mumYaw, nod, 0, this.mumPhase % (Math.PI * 200), MUM_SCALE);
    this.mumMesh.commit();
  }

  /** Everybody behind Tadeo sets off for the water, one after the other. */
  private deliver(): void {
    this.line.forEach((b, i) => {
      b.state = "leaving";
      b.delay = i * LEAVE_STAGGER;
    });
    this.line = [];
  }

  private async chat(): Promise<void> {
    if (!this.asked) {
      this.asked = true;
      await this.converse([...INTRO, ...(this.line.length ? ASK_WITH_BABIES : ASK)]);
      return;
    }
    const lines = this.won ? AFTER : HINTS;
    await this.converse([lines[this.chats++ % lines.length]]);
  }

  private async thanks(): Promise<void> {
    audio.playSfx("sfx_victory_fanfare", 0.6);
    await this.converse(THANKS);
    await this.d.wardrobe.givePrize(PRIZE, PRIZE_NAME, CHEER, this.d.coins.collected);
  }

  /** A conversation with Frau Moos: she is too big and too low for the villagers' framing. */
  private async converse(script: DialogueScript): Promise<void> {
    const { director } = this.d;
    const { player } = director.island;
    const p = player.position;
    player.facing = yawTo(p.x, p.z, this.mum.x, this.mum.z);
    const mid = p.clone().lerp(this.mum, 0.5);
    const dir = this.mum.clone().sub(p).setY(0).normalize();
    const side = new THREE.Vector3(dir.z, 0, -dir.x);
    // Reason: from the land side, so the water and the swimming babies are behind the two of them
    if (side.x * (POOL[0] - mid.x) + side.z * (POOL[1] - mid.z) > 0) side.negate();
    // Reason: high and looking low, because her head is near the sand and the dialogue box covers the bottom of the screen
    director.shot({ pos: mid.clone().addScaledVector(side, 7.5).add(new THREE.Vector3(0, 3.4, 0)), look: mid.add(new THREE.Vector3(0, 0.3, 0)) }, 0.9);
    this.mumTalking = true;
    await director.talk(script);
    this.mumTalking = false;
    director.shot(null, 0.9);
  }

  private ground(x: number, z: number): number {
    return this.d.director.island.player.world.groundHeight(x, z);
  }

}
