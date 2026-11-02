/**
 * StoryWorld — the island follows the story. For the current quest it says what
 * stands where: Tadeo's wreck or his mended boat, the thorn hedge at the forest
 * gate, the boulder on the mountain trail, Captain Paco and the ogre. Every
 * finished quest makes the volcano rumble a little harder. `beforeQuest` and
 * `afterQuest` are the moments when something happens on the island around a challenge:
 * the sword opens the hedge, the elder sends Tadeo on, the ogre lifts the boulder, Paco sees him off at the dock.
 */

import * as THREE from "three";
import { CameraRig } from "../core/CameraRig";
import { Circle, Colliders } from "../world/Colliders";
import { Island } from "../world/Island";
import { LANDMARKS, P2, SPOTS } from "../world/layout";
import { Site } from "../world/models/site";
import { faceDir } from "../world/models/shapes";
import { HedgeProp, StoryProp, mountainBoulder, standProp, thornHedge } from "../world/models/storyProps";
import { Player } from "../characters/Player";
import { DialogueScript } from "../data/dialogues";
import { BoulderLift, LiftPhase } from "./boulderLift";
import { CHULETA_BEHIND_HEDGE } from "./chuletaLines";
import { HedgeOpening } from "./hedgeOpening";
import { Npc, Npcs, NpcId } from "./Npcs";
import { OgreSpot, Sightings } from "./Sightings";
import { audio } from "../audio/Audio";
import { QUEST, QUESTS } from "../data/quests";

const PACO: NpcId = "villager3";
/** On the head of the north pier, with his back to the boat. */
const PACO_DOCK: P2 = [-36.36, -73.58];
const PACO_DOCK_FACING = Math.PI;
/** Seen from up the pier, Tadeo and Paco stand in front of the mended boat, which is what Paco is talking about. */
const DOCK_TALK_SHOT = { pos: new THREE.Vector3(-29.5, 4.8, -68.5), look: new THREE.Vector3(-39, 1.7, -75.5) };
/** Tadeo stands on the lake's side of the arch: the hedge stands just behind it, so the beacon on the gate stays free. */
const HEDGE_BEHIND_GATE = 0.9;
/** Tadeo is behind the hedge from this many metres past it, up to this far from its middle: on the meadow it leaves open. */
const BEHIND_HEDGE_PAST = 1.2;
const BEHIND_HEDGE_WITHIN = 7;
/** Seconds before Chuleta says it again to a child who stays on that meadow. */
const BEHIND_HEDGE_REPEAT = 30;

export interface StoryWorldState {
  wreck: boolean;
  dockBoat: boolean;
  boulder: boolean;
  hedge: boolean;
  paco: "away" | "village" | "dock";
  ogre: OgreSpot;
  lift: LiftPhase;
  lastRumble: number;
}

/** A story prop standing on the island with the colliders under it. */
class Barrier<P extends StoryProp = StoryProp> {
  /** The colliders' places in the world. */
  readonly circles: Circle[];
  private standing: Circle[] = [];

  constructor(readonly prop: P, private colliders: Colliders, x: number, z: number, rotY: number, ground: (x: number, z: number) => number) {
    standProp(prop, x, z, rotY, ground);
    this.circles = prop.blockers.map((b) => {
      const [wx, wz] = Site.local(x, z, rotY, b.x, b.z);
      return { x: wx, z: wz, r: b.r };
    });
    this.set(true);
  }

  get up(): boolean {
    return this.standing.length > 0;
  }

  set(on: boolean): void {
    this.prop.group.visible = on;
    if (on === this.up) return;
    if (on) this.standing = this.circles.map((c) => this.colliders.add(c.x, c.z, c.r));
    else {
      this.standing.forEach((c) => this.colliders.remove(c));
      this.standing = [];
    }
  }

  /** Play the exit; the way is open only when it has finished. */
  async remove(): Promise<void> {
    await this.prop.remove();
    this.set(false);
  }
}

export class StoryWorld {
  readonly group = new THREE.Group();
  readonly boulder: Barrier;
  readonly hedge: Barrier<HedgeProp>;
  private hedgeOpening: HedgeOpening;
  private boulderLift: BoulderLift;
  private pacoHome: { at: P2; facing: number };
  private lastRumble = 0;
  private hedgeRemarkIn = 0;

  constructor(
    private island: Island,
    private rig: CameraRig,
    private player: Player,
    private npcs: Npcs,
    private sightings: Sightings,
    private talk: (script: string | DialogueScript, npc?: Npc) => Promise<void>,
    private chuletaSay: (text: string) => void,
  ) {
    const { hf, colliders, landmarks } = island;
    const ground = (x: number, z: number) => hf.heightAt(x, z);
    this.boulder = new Barrier(mountainBoulder(), colliders, SPOTS.trailBoulder[0], SPOTS.trailBoulder[1], 0, ground);
    const [gx, gz] = LANDMARKS.forestGate;
    const rot = faceDir(LANDMARKS.forest[0] - gx, LANDMARKS.forest[1] - gz);
    const [hx, hz] = Site.local(gx, gz, rot, 0, HEDGE_BEHIND_GATE);
    this.hedge = new Barrier(thornHedge(), colliders, hx, hz, rot, ground);
    this.group.add(this.boulder.prop.group, this.hedge.prop.group);
    this.hedgeOpening = new HedgeOpening({ scene: island.scene, rig, player, hedge: this.hedge, ground });
    this.boulderLift = new BoulderLift({ scene: island.scene, rig, player, sightings, boulder: this.boulder, ground, talk });
    // Reason: all rocks, thorns and the wreck are up while Game places the coins, so no coin lands inside them; `apply` then sets the real state
    landmarks.setBoatVisible("wreck", true);
    const paco = npcs.get(PACO);
    this.pacoHome = { at: [paco.position.x, paco.position.z], facing: paco.homeFacing };
  }

  /** Make the island match this quest. Safe to call any number of times. */
  apply(m: number): void {
    const { landmarks } = this.island;
    landmarks.setBoatVisible("wreck", m < QUEST.sea);
    landmarks.setBoatVisible("north", m >= QUEST.sea);
    // Reason: the hedge has gone once the forest quest is won, the boulder once the mountain quest has begun
    this.hedge.set(m <= QUEST.forest);
    this.boulder.set(m < QUEST.mountain);
    // Reason: Paco comes home to the village at the elder's quest
    if (m < QUEST.elder) this.npcs.setSpot(PACO, null);
    else if (m < QUEST.sea) this.npcs.setSpot(PACO, this.pacoHome.at, this.pacoHome.facing);
    else this.npcs.setSpot(PACO, PACO_DOCK, PACO_DOCK_FACING);
    // Reason: a reload forgets the tablets, so a game that has passed the lake lights them again
    if (m > QUEST.lake) LANDMARKS.tablets.forEach((_, i) => landmarks.tablets.wake(i));
    this.sightings.place(m);
  }

  /** The volcano feels a quest being won: the ground shakes and smoke goes up, nothing else stops. */
  rumble(finished: number): void {
    const strength = THREE.MathUtils.clamp(finished / QUESTS.length, 0, 1);
    this.lastRumble = strength;
    this.rig.addShake(0.2 + 0.5 * strength);
    this.island.ambient.volcano.burst(strength);
    // Reason: a groan from under the ground, louder with every quest won
    audio.playSfx("sfx_rumble", 0.5 + 0.5 * strength);
  }

  /** A challenge has just been won and the island is not on screen yet: what the island shows already follows from it. */
  won(m: number): void {
    // Reason: the ogre is no longer the guard the story still says he is, so he must not roar at Tadeo when the island fades in
    if (m === QUEST.ogre) this.sightings.befriend();
  }

  /** What happens on the island right before a quest's challenge. */
  async beforeQuest(m: number): Promise<void> {
    switch (m) {
      case QUEST.forest:
        // Reason: a reload in the forest brings the hedge back, so the sword opens it again
        if (this.hedge.up) {
          this.hedgeOpening.faceTheHedge();
          await this.talk("forest_hedge");
          // Reason: the follow camera would show Tadeo from the forest side, so the opening's last shot stays on the open gate for this talk
          await this.hedgeOpening.play(true);
          await this.talk("forest_hedge_open");
          this.hedgeOpening.release();
        }
        return;
      case QUEST.sea: {
        const talking = this.talk("sea_dock", this.npcs.get(PACO));
        // Reason: a talk frames the two speakers from the side, and here that puts the camera behind the sail
        this.rig.setShot(DOCK_TALK_SHOT, 0.9);
        await talking;
        return;
      }
      default:
        return;
    }
  }

  /** What happens on the island right after a quest's challenge. */
  async afterQuest(m: number): Promise<void> {
    switch (m) {
      case QUEST.village:
        await this.talk("village_after", this.npcs.get("elder"));
        return;
      case QUEST.ogre:
        // Reason: a reload after the fight brings the boulder back, and the ogre lifts it again after the next fight
        if (this.boulder.up) await this.boulderLift.play();
        return;
      default:
        return;
    }
  }

  update(dt: number): void {
    this.boulder.prop.update(dt);
    this.hedge.prop.update(dt);
    this.hedgeOpening.update(dt);
    this.boulderLift.update(dt);
    this.hedgeRemarkIn -= dt;
    if (this.hedgeRemarkIn <= 0 && this.behindHedge(this.player.position.x, this.player.position.z)) {
      this.chuletaSay(CHULETA_BEHIND_HEDGE);
      this.hedgeRemarkIn = BEHIND_HEDGE_REPEAT;
    }
  }

  /** Whether (x, z) is on the meadow behind the standing hedge, where walking round it ends up. */
  behindHedge(x: number, z: number): boolean {
    if (!this.hedge.up) return false;
    const { position, rotation } = this.hedge.prop.group;
    const [dx, dz] = [x - position.x, z - position.z];
    return dx * Math.sin(rotation.y) + dz * Math.cos(rotation.y) > BEHIND_HEDGE_PAST && Math.hypot(dx, dz) < BEHIND_HEDGE_WITHIN;
  }

  /** What really stands on the island, read from the scene. */
  get e2e(): StoryWorldState {
    const { landmarks } = this.island;
    const paco = this.npcs.get(PACO);
    const atDock = Math.hypot(paco.position.x - PACO_DOCK[0], paco.position.z - PACO_DOCK[1]) < 1;
    return {
      wreck: landmarks.isBoatVisible("wreck"),
      dockBoat: landmarks.isBoatVisible("north"),
      boulder: this.boulder.up,
      hedge: this.hedge.up,
      paco: !paco.avatar.root.visible ? "away" : atDock ? "dock" : "village",
      ogre: this.sightings.ogreSpot,
      lift: this.boulderLift.phase,
      lastRumble: this.lastRumble,
    };
  }
}
