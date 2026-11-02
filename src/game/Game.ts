/**
 * Game — the adventure flow on the island: title screen, intro flight, quest
 * objectives (beacon, compass arrow, "Leertaste" prompts), conversations,
 * launching the challenge scenes, handing out rewards and saving progress.
 */

import * as THREE from "three";
import { Engine } from "../core/Engine";
import { IslandScene } from "../scenes/IslandScene";
import { GameUI } from "../ui/GameUI";
import { Beacon } from "./Beacon";
import { IslandDirector } from "./IslandDirector";
import { Objective, QuestFlow, TALK_RANGE } from "./QuestFlow";
import { GameProbe, createProbe } from "./GameProbe";
import { Npcs, Npc } from "./Npcs";
import { Title } from "./Title";
import { Coins } from "./Coins";
import { Wardrobe } from "./Wardrobe";
import { SIDE_GAMES, SideGame } from "./sideGames";
import { Sightings } from "./Sightings";
import { StoryWorld } from "./StoryWorld";
import { TurtleFamily } from "./TurtleFamily";
import { Lake } from "./lake";
import { IslandSounds } from "./IslandSounds";
import { Menu } from "../ui/Menu";
import { QuestManager } from "../systems/QuestManager";
import { SaveManager } from "../systems/SaveManager";
import { NarrationManager } from "../systems/NarrationManager";
import { VILLAGE, P2 } from "../world/layout";
import { ChallengeName } from "../challenges/types";
import { audio } from "../audio/Audio";

/** Milliseconds of black each way when Tadeo travels from the menu's map. */
const TRAVEL_FADE = 350;

export class Game {
  private ui = new GameUI();
  private island = new IslandScene();
  private beacon = new Beacon();
  private npcs: Npcs;
  private director: IslandDirector;
  private coins: Coins;
  private wardrobe: Wardrobe;
  private sightings: Sightings;
  private story: StoryWorld;
  private lake: Lake;
  private family: TurtleFamily;
  private flow: QuestFlow;
  private quest = QuestManager.getInstance();
  /** True while a cutscene, conversation or challenge owns the controls. */
  private busy = true;
  private title: Title | null = null;
  private islandSounds: IslandSounds;
  private tmp = new THREE.Vector3();
  /** The interface E2E tests use. */
  readonly probe: GameProbe;

  constructor(private engine: Engine) {
    const { landmarks, hf, colliders } = this.island.island;
    const walkHeight = (x: number, z: number) => landmarks.surfaceHeight(x, z) ?? hf.heightAt(x, z);
    this.islandSounds = new IslandSounds(hf);
    this.npcs = new Npcs(walkHeight, colliders);
    this.island.scene.add(this.npcs.group, this.beacon.group);
    this.sightings = new Sightings(walkHeight, colliders, this.ui.layer);
    this.director = new IslandDirector(this.island, this.ui, this.sightings);
    this.story = new StoryWorld(this.director, this.npcs, this.sightings);
    this.island.scene.add(this.sightings.group, this.story.group);
    this.lake = new Lake({ director: this.director, input: engine.input });
    // Reason: coins come after the NPCs so none lands inside a villager, and after the story's rocks and thorns for the same reason
    this.coins = new Coins(hf, colliders);
    this.island.scene.add(this.coins.group);
    this.wardrobe = new Wardrobe(this.island.player.avatar, this.director.chuleta, this.ui, (t) => this.director.chuletaSay(t));
    this.wardrobe.dress(this.coins.collected);
    this.family = new TurtleFamily({ director: this.director, wardrobe: this.wardrobe, coins: this.coins });
    this.flow = new QuestFlow({ engine, director: this.director, story: this.story, npcs: this.npcs, lake: this.lake, coins: this.coins, wardrobe: this.wardrobe });
    this.probe = createProbe({
      flow: this.flow,
      director: this.director,
      isBusy: () => this.busy,
      holdControls: (hold) => {
        this.busy = hold;
      },
      run: (action) => this.run(action),
    });
    this.story.apply(this.quest.currentMilestone);
    engine.onFrame = (dt, time) => this.frame(dt, time);
  }

  async start(): Promise<void> {
    NarrationManager.getInstance().init();
    const params = new URLSearchParams(location.search);
    if (params.has("coins")) {
      this.coins.setCollected(Number(params.get("coins")));
      this.wardrobe.dress(this.coins.collected);
    }
    // Reason: debug camera views are for screenshots of the world — no UI, no flow
    if (params.has("cam") || params.has("closeup")) {
      this.ui.hud.setVisible(false);
      await this.engine.setScene(this.island, 0);
      return;
    }
    // Reason: after NarrationManager.init, because the menu's key listener has to run after the one for V
    new Menu({
      engine: this.engine,
      portrait: this.ui.portraits.tadeo,
      heightAt: (x, z) => this.island.island.hf.heightAt(x, z),
      where: () => this.island.player.position,
      canTravel: () => this.engine.scene === this.island && this.free,
      travel: (at) => void this.run(() => this.travelTo(at)),
    });
    const challenge = params.get("challenge") as ChallengeName | null;
    const milestone = Number(params.get("quest") ?? 0);
    const side = SIDE_GAMES.find((s) => s.challenge === challenge);
    if (side) {
      this.flow.jumpTo(milestone || 1);
      await this.playSideGame(side);
      this.busy = false;
      return;
    }
    if (challenge) {
      await this.flow.startChallenge(challenge);
      this.busy = false;
      return;
    }
    if (milestone || params.has("notitle")) {
      // Reason: quest 1 is the opening's cutscene and has no goal, so a game that skips it starts on the beach at quest 2
      this.flow.jumpTo(milestone || 2, !milestone);
      await this.flow.showIsland();
      this.busy = false;
      return;
    }
    await this.titleScreen();
  }

  // ── Per-frame ─────────────────────────────────────────────

  private frame(dt: number, time: number): void {
    const input = this.engine.input;
    // Reason: UI first so Space advances a dialogue instead of making Tadeo jump
    this.ui.update(dt, input);
    this.title?.update(input);
    if (this.engine.scene !== this.island) return;

    const player = this.island.player;
    this.npcs.update(dt, player.position);
    this.sightings.update(dt, player.position, this.quest.currentMilestone, (v) => this.director.onScreen(v.x, v.y, v.z));
    this.story.update(dt);
    this.lake.update(dt, time);
    this.director.update(dt);

    const free = this.free;
    player.controlsEnabled = free;
    const objectives = free ? this.flow.goals() : [];
    const main = this.mainObjective(objectives);

    // Beacon + compass towards the current goal
    if (main) this.tmp.set(main.at[0], this.groundAt(main.at), main.at[1]);
    this.beacon.set(main ? this.tmp : null);
    this.beacon.update(dt, time, main ? this.distance(main.at) : 99, this.island.camera);
    this.ui.hud.updateCompass(main ? this.director.project(this.tmp.x, this.tmp.y, this.tmp.z) : null);

    // Interaction prompt: quest objectives first, then casual chats
    const near = objectives.find((o) => this.distance(o.at) < o.radius) ?? (free ? this.family.offer() : null);
    const npc = !near && free ? this.npcs.nearest(player.position, TALK_RANGE) : null;
    if (near) {
      this.showPrompt(near.at, near.verb);
      if (input.consume("Space")) void this.run(() => near.run());
    } else if (npc) {
      const side = SIDE_GAMES.find((s) => s.host === npc.id);
      this.showPrompt([npc.position.x, npc.position.z], side?.verb ?? "Sprechen");
      if (input.consume("Space")) void this.run(() => (side ? this.playSideGame(side, npc) : this.director.talk(this.npcs.nextChat(npc), { with: npc })));
    } else {
      this.ui.prompt.show(null);
    }
    // Reason: not just `free`: a talk started just above has made the game busy since `free` was read
    const familyScene = this.family.update(dt, free && !this.busy);
    if (familyScene) void this.run(familyScene);

    this.flow.update(dt, free, objectives);
    this.director.followCompanions(dt);

    if (this.coins.update(dt, time, player.position)) this.wardrobe.onCoins(this.coins.collected);

    if (free) {
      const inVillage = this.distance(VILLAGE.plaza) < 24;
      audio.playMusic(inVillage ? "music_village" : "music_overworld");
    }
    this.islandSounds.update(dt, player.position);
  }

  /** Whether Tadeo walks freely: no cutscene, conversation or scene change has the controls. */
  private get free(): boolean {
    return !this.busy && !this.ui.dialogue.isOpen && !this.engine.isSwitching;
  }

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.ui.prompt.show(null);
    try {
      await action();
    } finally {
      this.busy = false;
    }
  }

  /** The goal the beacon marks: the nearest open objective. */
  private mainObjective(list: Objective[]): Objective | null {
    let best: Objective | null = null;
    for (const o of list) if (!best || this.distance(o.at) < this.distance(best.at)) best = o;
    return best;
  }

  // ── Title and side games ──────────────────────────────────

  private async titleScreen(): Promise<void> {
    this.ui.hud.setVisible(false);
    this.director.startCinematic((t) => {
      // Reason: the clouds are seeded, so this start is clear of them on every load (scripts/e2e/title.mjs measures it)
      const a = 0.2 + t * 0.045;
      return {
        pos: new THREE.Vector3(18 + Math.cos(a) * 205, 88 + Math.sin(t * 0.2) * 6, 28 + Math.sin(a) * 165),
        look: new THREE.Vector3(18, 4, 28),
      };
    });
    audio.playMusic("music_title");
    audio.setAmbience(true);
    await this.engine.setScene(this.island, 1400);
    const save = SaveManager.getInstance();
    const hasSave = save.hasSave();
    this.title = new Title(this.ui.layer, hasSave);
    const choice = await this.title.choose();
    this.title = null;
    await this.engine.fade(1, 700);

    const data = choice === "continue" ? save.load() : null;
    if (data) await this.flow.resume(data);
    else await this.flow.beginAdventure(hasSave);
    this.busy = false;
  }

  /** A villager's side game: invitation, the game itself, then the prize hat on the first win. */
  private async playSideGame(side: SideGame, npc?: Npc): Promise<void> {
    const won = this.wardrobe.hasPrize(side.prize);
    if (npc) await this.director.talk(won ? side.again : side.invite, { with: npc });
    await this.flow.enterChallenge(side.challenge);
    const host = this.npcs.get(side.host).position;
    await this.flow.backToIsland(side.back, Math.atan2(host.x - side.back[0], host.z - side.back[1]));
    await this.wardrobe.givePrize(side.prize, side.prizeName, side.cheer, this.coins.collected);
  }

  // ── Helpers ───────────────────────────────────────────────

  /** Through black to a place picked on the menu's map. */
  private async travelTo([x, z]: P2): Promise<void> {
    await this.engine.fade(1, TRAVEL_FADE);
    this.director.place(x, z);
    await this.engine.fade(0, TRAVEL_FADE);
  }

  private showPrompt(at: P2, verb: string): void {
    this.ui.prompt.show(this.director.onScreen(at[0], this.groundAt(at) + 2.6, at[1]), verb);
  }

  private groundAt(at: P2): number {
    return Math.max(this.island.island.hf.heightAt(at[0], at[1]), 0);
  }

  private distance(at: P2): number {
    const p = this.island.player.position;
    return Math.hypot(p.x - at[0], p.z - at[1]);
  }
}
