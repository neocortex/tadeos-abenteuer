/**
 * IslandDirector — what the island's scenes share: who is in shot and who speaks. Conversations with their framing,
 * remarks from Tadeo and Chuleta, placing Tadeo, cinematics, shots and where a world point lands on screen.
 * Scenes get this instead of a list of the game's helpers.
 */

import * as THREE from "three";
import { Shot } from "../core/CameraRig";
import { Chuleta } from "../characters/Chuleta";
import { DialogueScript } from "../data/dialogues";
import { IslandScene } from "../scenes/IslandScene";
import { NarrationManager } from "../systems/NarrationManager";
import { GameUI } from "../ui/GameUI";
import { Bubble } from "../ui/Hud";
import { Npc } from "./Npcs";
import { Sightings } from "./Sightings";
import { talkShot } from "./talkShot";

/** How a conversation is framed. Without `with` or `shot` the camera stays as it is. */
export interface TalkFraming {
  /** Tadeo turns to this person. The camera frames both, and goes back to following Tadeo when the talk ends. */
  with?: Npc;
  /** A third person the camera keeps in the picture too. */
  also?: Npc;
  /** Hold this shot instead of the one the camera would choose. */
  shot?: Shot;
}

export class IslandDirector {
  readonly chuleta: Chuleta;
  private tadeoBubble: Bubble;
  private chuletaBubble: Bubble;
  private cinematic: ((t: number) => Shot) | null = null;
  private cinematicTime = 0;

  constructor(
    readonly island: IslandScene,
    readonly ui: GameUI,
    private sightings: Sightings,
  ) {
    this.chuleta = new Chuleta(island.player);
    this.chuleta.snap();
    island.scene.add(this.chuleta.root);
    this.tadeoBubble = new Bubble(ui.layer);
    this.chuletaBubble = new Bubble(ui.layer);
  }

  /** Run the cinematic; call it every frame. */
  update(dt: number): void {
    if (!this.cinematic) return;
    this.cinematicTime += dt;
    this.island.rig.jumpToShot(this.cinematic(this.cinematicTime));
  }

  /** Chuleta comes along, and the remarks stay over the heads of who says them; call it every frame. */
  followCompanions(dt: number): void {
    const p = this.island.player.position;
    this.tadeoBubble.place(this.onScreen(p.x, p.y + 2.3, p.z));
    this.chuleta.update(dt);
    this.chuleta.talking = this.chuletaBubble.speaking;
    const hen = this.chuleta.position;
    this.chuletaBubble.place(this.onScreen(hen.x, hen.y + 0.75, hen.z));
  }

  /** Play a conversation in this framing. */
  async talk(script: string | DialogueScript, framing: TalkFraming = {}): Promise<void> {
    const { rig, player, island } = this.island;
    const npc = framing.with;
    if (npc) {
      player.facing = Math.atan2(npc.position.x - player.position.x, npc.position.z - player.position.z);
      if (!framing.shot) rig.setShot(talkShot(player.position, npc.position, island.colliders, framing.also?.position), 0.9);
    }
    if (framing.shot) rig.setShot(framing.shot, 0.9);
    rig.setZoom(0.62);
    this.ui.dialogue.onLine = (speaker) => {
      this.sightings.speaking = speaker === "Oger";
      player.avatar.pose = speaker === "Tadeo" ? "talk" : "normal";
      if (npc) npc.avatar.pose = speaker === npc.speaker ? "talk" : "normal";
    };
    await this.ui.say(script);
    this.ui.dialogue.onLine = null;
    this.sightings.speaking = false;
    player.avatar.pose = "normal";
    if (npc) {
      npc.avatar.pose = "normal";
      rig.setShot(null, 0.9);
    }
    rig.setZoom(1);
  }

  /** A short remark from Tadeo, spoken and in a bubble over his head. */
  tadeoSay(text: string): void {
    this.tadeoBubble.say(text, 3800);
    NarrationManager.getInstance().speakLine(text, "Tadeo");
  }

  /** A short remark from Chuleta, spoken and in a bubble over her head. */
  chuletaSay(text: string): void {
    this.chuletaBubble.say(text, 4800);
    NarrationManager.getInstance().speakLine(text, "Chuleta");
  }

  /** The remark Chuleta is making now, if any. */
  get chuletaLine(): string | null {
    return this.chuletaBubble.line;
  }

  /** Take Tadeo's remark off the screen. */
  hideTadeoRemark(): void {
    this.tadeoBubble.place(null);
  }

  /** Teleport Tadeo and bring the camera and Chuleta along. */
  place(x: number, z: number, facing?: number): void {
    const { player, rig } = this.island;
    player.teleport(x, z, facing);
    player.avatar.root.updateMatrixWorld(true);
    rig.follow(player.position, player.velocity);
    rig.snap();
    this.chuleta.snap();
  }

  /** Let `fn` give the shot for every moment from now on, until `endCinematic`. */
  startCinematic(fn: (t: number) => Shot): void {
    this.cinematic = fn;
    this.cinematicTime = 0;
    this.island.rig.jumpToShot(fn(0));
  }

  /** Hand the camera back to the follow rig with a smooth blend. */
  endCinematic(seconds: number): void {
    this.cinematic = null;
    this.island.rig.setShot(null, seconds);
  }

  /** The running cinematic, or null when the camera follows Tadeo. */
  get runningCinematic(): { time: number; shotAt(t: number): Shot } | null {
    return this.cinematic && { time: this.cinematicTime, shotAt: this.cinematic };
  }

  /** Glide to a shot, or back to following Tadeo with null. */
  shot(view: Shot | null, seconds?: number): void {
    this.island.rig.setShot(view, seconds);
  }

  /** Cut straight to a shot. Scenes that move the camera themselves call this every frame. */
  cut(view: Shot): void {
    this.island.rig.jumpToShot(view);
  }

  shake(amount: number): void {
    this.island.rig.addShake(amount);
  }

  /** Where a world point is on the view, from -1 to 1 on both axes. */
  project(x: number, y: number, z: number): { x: number; y: number; behind: boolean } {
    const v = new THREE.Vector3(x, y, z).project(this.island.camera);
    return { x: v.x, y: v.y, behind: v.z > 1 };
  }

  /** Screen pixels of a world point, or null behind the camera. */
  onScreen(x: number, y: number, z: number): { x: number; y: number } | null {
    const s = this.project(x, y, z);
    return s.behind ? null : { x: (s.x * 0.5 + 0.5) * window.innerWidth, y: (-s.y * 0.5 + 0.5) * window.innerHeight };
  }
}
