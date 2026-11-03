/**
 * QuestFlow — how a quest is arrived at, played and completed, whichever way the game was started. It knows what each
 * kind of goal in the quest table asks for, and what happens around a win: the reward, the next quest, the save.
 * Game keeps the frame loop and the controls, and asks this for the goals to show.
 */

import { Engine } from "../core/Engine";
import { audio } from "../audio/Audio";
import { loadChallenge } from "../challenges/registry";
import { ChallengeName } from "../challenges/types";
import { QUEST, QUESTS, gateOf } from "../data/quests";
import { InventoryManager } from "../systems/InventoryManager";
import { QuestManager } from "../systems/QuestManager";
import { SaveData, SaveManager } from "../systems/SaveManager";
import { showMapCard } from "../ui/MapCard";
import { LANDMARKS, P2 } from "../world/layout";
import { ItemKey } from "../world/models/items";
import { CHULETA_CHEERS } from "./chuletaLines";
import { Coins } from "./Coins";
import { playEnding } from "./ending";
import { IslandDirector } from "./IslandDirector";
import { Lake } from "./lake";
import { Npcs } from "./Npcs";
import { playOpening } from "./opening";
import { StoryWorld } from "./StoryWorld";
import { Wardrobe } from "./Wardrobe";

/** A goal Tadeo can walk to now. */
export interface Objective {
  at: P2;
  radius: number;
  verb: string;
  run(): Promise<void>;
}

export const TALK_RANGE = 2.8;
/** Seconds without progress before Chuleta offers a hint. */
const HINT_AFTER = 45;

interface QuestFlowDeps {
  engine: Engine;
  director: IslandDirector;
  story: StoryWorld;
  npcs: Npcs;
  lake: Lake;
  coins: Coins;
  wardrobe: Wardrobe;
}

export class QuestFlow {
  private quest = QuestManager.getInstance();
  private hintTimer = 0;
  private remarkCooldown = 0;
  /** The places of later quests Tadeo has already remarked on during this quest. */
  private remarked = new Set<P2>();

  constructor(private d: QuestFlowDeps) {}

  // ── Starts ────────────────────────────────────────────────

  /** A new adventure from the opening on. `abandonsSave` also takes the coins and hats of the adventure it replaces. */
  async beginAdventure(abandonsSave: boolean): Promise<void> {
    const { director, coins, wardrobe, engine } = this.d;
    SaveManager.getInstance().fullReset();
    this.arrive(1);
    // Reason: only a running adventure is abandoned; after a save from an older version the coins and hats stay
    if (abandonsSave) {
      coins.reset();
      wardrobe.reset();
    }
    wardrobe.dress(coins.collected);
    await playOpening({ engine, director });
    director.ui.hud.setVisible(true);
    await this.advance();
  }

  /** Go on from a save that has just been loaded. The screen is black when this starts. */
  async resume(save: SaveData): Promise<void> {
    const { director, story, engine } = this.d;
    this.arrive(this.quest.currentMilestone);
    director.place(save.playerX, save.playerY);
    director.endCinematic(0.01);
    director.ui.hud.setVisible(true);
    this.islandAudio();
    await engine.fade(0, 800);
    if (this.quest.currentMilestone === QUESTS.length) story.rumble(QUESTS.length);
    void director.ui.hud.showBanner("Willkommen zurück!", this.quest.currentQuest.name);
  }

  /** Set the game as if quests 1..m-1 were done, and place Tadeo near the goal, or on the beach. */
  jumpTo(m: number, onBeach = m === 1): void {
    const { director, story } = this.d;
    this.quest.setMilestone(m);
    const items = QUESTS.slice(0, m - 1).map((q) => q.reward).filter((r): r is string => !!r);
    InventoryManager.getInstance().setItems(items);
    this.arrive(m);
    director.ui.hud.setVisible(true);
    const goal = onBeach ? LANDMARKS.spawn : (this.goals()[0]?.at ?? LANDMARKS.spawn);
    const { world } = director.island.player;
    const spot = [[0, 5], [5, 0], [-5, 0], [0, -5]].map(([dx, dz]) => [goal[0] + dx, goal[1] + dz]).find(([x, z]) => world.canStand(x, z) && !story.behindHedge(x, z));
    const [x, z] = spot ?? LANDMARKS.spawn;
    director.place(x, z);
  }

  /** Fade in on the island after a jump. */
  async showIsland(): Promise<void> {
    await this.d.engine.setScene(this.d.director.island, 300);
    this.islandAudio();
  }

  /** Jump to the quest of a story challenge and play it. The festival has no gate: it plays on to the end card. */
  async startChallenge(name: ChallengeName): Promise<void> {
    if (name === "festival") {
      this.jumpTo(QUEST.finale);
      await this.enterChallenge("festival");
      await this.ending();
      return;
    }
    const m = QUESTS.findIndex((q) => gateOf(q)?.challenge === name) + 1 || 1;
    this.jumpTo(m);
    await this.play(m);
  }

  // ── Goals ─────────────────────────────────────────────────

  /** The goals open now for the current quest. */
  goals(): Objective[] {
    const { npcs, lake } = this.d;
    const m = this.quest.currentMilestone;
    const { goal } = this.quest.currentQuest;
    switch (goal.kind) {
      case "opening":
        return [];
      case "talk":
        return [{ at: goal.at, radius: TALK_RANGE, verb: "Sprechen", run: () => this.meetElder() }];
      case "tablets":
        return LANDMARKS.tablets
          .map((at, i) => ({ at, i }))
          .filter(({ i }) => !lake.solved.has(i))
          .map(({ at, i }) => ({ at, radius: 3.2, verb: "Lesen", run: () => this.readTablet(i) }));
      case "talkThenChallenge":
        return [{
          at: goal.gate.at,
          radius: TALK_RANGE,
          verb: "Sprechen",
          run: async () => {
            await this.d.director.talk("village_enter", { with: npcs.get("elder"), also: npcs.get("villager3") });
            await this.play(m);
          },
        }];
      default:
        return [{ at: goal.gate.at, radius: 3.5, verb: "Los geht's!", run: () => this.play(m) }];
    }
  }

  /** Tadeo's remarks at later places and Chuleta's hints; call it every frame on the island. `open` = the goals shown now. */
  update(dt: number, free: boolean, open: Objective[]): void {
    this.remarkCooldown -= dt;
    if (free) this.remarkAtLaterGates(open);
    this.hintTimer = free ? this.hintTimer + dt : 0;
    const current = this.quest.currentQuest;
    if (this.hintTimer > HINT_AFTER && current.goal.kind !== "opening") {
      this.d.director.chuletaSay(current.hint);
      this.hintTimer = -HINT_AFTER;
    }
  }

  // ── Playing and completing ────────────────────────────────

  /** Fade into this quest's challenge, wait for the win, then reward and return to the island. */
  async play(milestone: number): Promise<void> {
    const { engine, director, story } = this.d;
    const quest = QUESTS[milestone - 1];
    if (quest.goal.kind === "finale") {
      await this.enterChallenge("finale");
      await this.enterChallenge("festival");
      await this.ending();
      return;
    }
    const gate = gateOf(quest)!;
    // Reason: a debug start has no island on screen yet, and the treasure comes straight from the sea
    if (engine.scene === director.island) await story.beforeQuest(milestone);
    await this.enterChallenge(gate.challenge);
    story.won(milestone);

    const reward = quest.reward as ItemKey | null;
    if (reward) InventoryManager.getInstance().addItem(reward);
    if (quest.straightOn) {
      this.quest.completeMilestone();
      this.save(quest.straightOn.saveAt);
      if (quest.straightOn.overBlack) {
        await engine.fade(1, 700);
        await director.ui.sayOverBlack(quest.straightOn.overBlack);
      }
      return this.play(milestone + 1);
    }

    const back = gate.back ?? gate.at;
    await this.backToIsland([back[0], back[1] + (gate.back ? 0 : 2.5)]);
    if (reward) director.ui.hud.popItem(reward);
    await story.afterQuest(milestone);
    await this.advance();
  }

  /** Complete the current quest, save and announce the next one. */
  async advance(): Promise<void> {
    const { director, story } = this.d;
    const finished = this.quest.currentMilestone;
    this.quest.completeMilestone();
    this.arrive(this.quest.currentMilestone);
    story.rumble(finished);
    const p = director.island.player.position;
    this.save([p.x, p.z]);
    audio.playSfx("sfx_victory_fanfare", 0.6);
    await director.ui.hud.showBanner(`Neue Aufgabe · ${this.quest.currentMilestone} von ${QUESTS.length}`, this.quest.currentQuest.name);
    if (CHULETA_CHEERS[finished]) director.chuletaSay(CHULETA_CHEERS[finished]);
  }

  /** Save the game with Tadeo at this spot. */
  save(at: P2): void {
    SaveManager.getInstance().save(at[0], at[1]);
  }

  /** Fade into a challenge scene and wait until the player wins it. */
  async enterChallenge(name: ChallengeName): Promise<void> {
    const { engine, director } = this.d;
    const { ui } = director;
    const factory = await loadChallenge(name);
    ui.hud.setVisible(false);
    ui.prompt.show(null);
    ui.hud.updateCompass(null);
    director.hideTadeoRemark();
    audio.setAmbience(false);
    const challenge = factory({ engine, ui });
    await engine.setScene(challenge, 700);
    await challenge.finished;
    ui.status(null);
  }

  /** Back from a challenge, with Tadeo standing at `at`. */
  async backToIsland(at: P2, facing?: number): Promise<void> {
    const { engine, director } = this.d;
    director.place(at[0], at[1], facing);
    director.endCinematic(0.01);
    await engine.setScene(director.island, 700);
    this.islandAudio();
    director.ui.hud.setVisible(true);
  }

  // ── Inside ────────────────────────────────────────────────

  /** What every way of reaching a quest has in common: the island and the HUD show it, and nothing is left over from before. */
  private arrive(m: number): void {
    this.remarked.clear();
    this.hintTimer = 0;
    this.d.story.apply(m);
    this.d.director.ui.hud.refresh();
  }

  /** The legend of the Feuerherz; Tadeo's map shows where the heart is. */
  private async meetElder(): Promise<void> {
    const { director, npcs, engine } = this.d;
    const framing = { with: npcs.get("elder"), also: npcs.get("villager3") };
    await director.talk("elder_legend", framing);
    // Reason: the card closes on Space, which the island leaves alone while controls are off
    await showMapCard(director.ui.layer, engine.input);
    await director.talk("elder_after_map", framing);
    await this.advance();
  }

  /** A riddle at a tablet. The third one wakes the Hüter, who speaks the rhyme of the four things. */
  private async readTablet(i: number): Promise<void> {
    const { lake } = this.d;
    if (await lake.solve(i)) await lake.awaken().then(() => this.advance());
  }

  /** Short remark when Tadeo wanders to a place whose quest comes later. */
  private remarkAtLaterGates(open: Objective[]): void {
    if (this.remarkCooldown > 0) return;
    const m = this.quest.currentMilestone;
    const later: P2[] = [];
    QUESTS.forEach((q, i) => {
      const gate = gateOf(q);
      // Reason: the treasure and the finale reuse the gates of the sea and the volcano, and the elder and the village quests share the elder, so neither counts as a later place
      const ownSpot = gate && open.some((o) => o.at[0] === gate.at[0] && o.at[1] === gate.at[1]);
      if (gate && i + 1 > m && i + 1 < QUEST.treasure && !ownSpot) later.push(gate.at);
    });
    if (m < QUEST.lake) later.push(...LANDMARKS.tablets);
    const p = this.d.director.island.player.position;
    const place = later.find((at) => Math.hypot(p.x - at[0], p.z - at[1]) < 4.5 && !this.remarked.has(at));
    if (place) {
      this.d.director.tadeoSay(`Hier komme ich später wieder hin. Zuerst: ${this.quest.currentQuest.name}!`);
      this.remarked.add(place);
      this.remarkCooldown = 12;
    }
  }

  private ending(): Promise<void> {
    const { director, engine, coins, wardrobe } = this.d;
    return playEnding(director.ui, engine.input, coins, wardrobe);
  }

  private islandAudio(): void {
    audio.playMusic("music_overworld");
    audio.setAmbience(true);
  }
}
