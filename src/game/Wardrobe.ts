/**
 * Wardrobe — turns collected coins into outfits: a straw hat at 15 coins, a
 * pirate hat at 25, a feather hat at 35 and sunglasses for all 50. Side games add prize hats (a
 * fishing hat, a golden crown, a turtle hat). Tadeo wears the hat he got most recently.
 * An outfit once earned stays, even when its coin count rises later.
 * Dresses Tadeo, keeps the HUD coin counter and its next outfit current and celebrates every unlock.
 */

import * as THREE from "three";
import { Humanoid } from "../characters/Humanoid";
import { Chuleta } from "../characters/Chuleta";
import { createOutfit, HAT_TOP, OutfitId } from "../characters/hats";
import { GameUI } from "../ui/GameUI";
import { CoinGoal } from "../ui/Hud";
import { COIN_COUNT } from "./Coins";
import { audio } from "../audio/Audio";

const UNLOCKS: { coins: number; id: OutfitId; name: string; cheer: string }[] = [
  { coins: 15, id: "strawHat", name: "Strohhut", cheer: "Gack! Der Strohhut steht dir super, Tadeo!" },
  { coins: 25, id: "pirateHat", name: "Piratenhut", cheer: "Ein echter Piratenhut! Jetzt bist du Kapitän Tadeo!" },
  { coins: 35, id: "featherHat", name: "Federhut", cheer: "Gack! Die Feder ist ja größer als ich!" },
  { coins: COIN_COUNT, id: "sunglasses", name: "Coole Sonnenbrille", cheer: "Alle Münzen gefunden! Du bist der coolste Pirat der Welt!" },
];
/** The coin counts before there were 50 coins: a save from then keeps what it had earned. */
const EARLIER_UNLOCKS: [number, OutfitId][] = [[10, "strawHat"], [20, "pirateHat"], [30, "sunglasses"]];

const HATS: OutfitId[] = ["strawHat", "pirateHat", "featherHat", "fishingHat", "crown", "shellHat"];
/** Side-game prizes won so far, and the hat Tadeo picked last. */
const PRIZES_KEY = "schatzkarten_prizes";
const HAT_KEY = "schatzkarten_hat";
/** Coin outfits earned so far; missing in a save from before outfits were remembered. */
const EARNED_KEY = "schatzkarten_outfits";

/** Default perch height on top of Tadeo's hair. */
const HAIR_TOP = 0.37;

export class Wardrobe {
  private worn = new Map<OutfitId, THREE.Group>();
  private prizes = new Set<OutfitId>(load<OutfitId[]>(PRIZES_KEY) ?? []);
  private hat: OutfitId | null = load<OutfitId>(HAT_KEY);
  private earned: Set<OutfitId> | null = toSet(load<OutfitId[]>(EARNED_KEY));

  constructor(
    private avatar: Humanoid,
    private chuleta: Chuleta,
    private ui: GameUI,
    private chuletaSay: (text: string) => void,
  ) {}

  /** Dress Tadeo for a coin count without any fanfare (loading a game). */
  dress(coins: number): void {
    const earned = this.earnedFor(coins);
    const owned = HATS.filter((id) => this.prizes.has(id) || earned.has(id));
    // Reason: keep the last chosen hat if Tadeo still owns it, otherwise the best one he has
    const hat = this.hat && owned.includes(this.hat) ? this.hat : (owned.filter((id) => !this.prizes.has(id)).pop() ?? owned[0] ?? null);
    for (const id of HATS) this.wear(id, id === hat);
    this.wear("sunglasses", earned.has("sunglasses"));
    this.chuleta.setPerchHeight(hat ? HAT_TOP[hat]! : HAIR_TOP);
    this.ui.hud.setCoins(coins, COIN_COUNT, this.nextGoal(coins), false);
  }

  /** The outfits Tadeo owns for his coins, remembering every one he earned before. */
  private earnedFor(coins: number): Set<OutfitId> {
    // Reason: a save from before outfits were remembered earned them at the old, lower coin counts
    const before = this.earned?.size ?? -1;
    const earned = this.earned ?? new Set(EARLIER_UNLOCKS.filter(([at]) => coins >= at).map(([, id]) => id));
    for (const u of UNLOCKS) if (coins >= u.coins) earned.add(u.id);
    if (earned.size !== before) save(EARNED_KEY, [...earned]);
    this.earned = earned;
    return earned;
  }

  /** The next coin outfit still to earn, for the counter to show. */
  private nextGoal(coins: number): CoinGoal | null {
    const u = UNLOCKS.find((u) => coins < u.coins && !this.earned?.has(u.id));
    return u ? { coins: u.coins, name: u.name, icon: this.ui.outfitIcons[u.id] } : null;
  }

  /** Coins were just picked up: update the counter and celebrate a new outfit. */
  onCoins(coins: number): void {
    const unlock = UNLOCKS.find((u) => u.coins === coins && !this.earned?.has(u.id));
    if (unlock && HATS.includes(unlock.id)) this.choose(unlock.id);
    this.dress(coins);
    this.ui.hud.setCoins(coins, COIN_COUNT, this.nextGoal(coins), true);
    if (unlock) void this.celebrate(unlock.name, unlock.cheer);
  }

  hasPrize(id: OutfitId): boolean {
    return this.prizes.has(id);
  }

  /** A side game was won: hand out its prize hat the first time (resolves after the banner). */
  async givePrize(id: OutfitId, name: string, cheer: string, coins: number): Promise<void> {
    if (this.prizes.has(id)) return;
    this.prizes.add(id);
    save(PRIZES_KEY, [...this.prizes]);
    this.choose(id);
    this.dress(coins);
    await this.celebrate(name, cheer);
  }

  /** Forget prizes and the chosen hat (a fresh adventure). */
  reset(): void {
    this.prizes.clear();
    this.hat = null;
    this.earned = new Set();
    save(PRIZES_KEY, []);
    save(HAT_KEY, null);
    save(EARNED_KEY, []);
  }

  private choose(id: OutfitId): void {
    this.hat = id;
    save(HAT_KEY, id);
  }

  private async celebrate(name: string, cheer: string): Promise<void> {
    audio.playSfx("sfx_item_get", 0.8);
    await this.ui.hud.showBanner("Neues Outfit!", name, 2400);
    this.chuletaSay(cheer);
  }

  private wear(id: OutfitId, on: boolean): void {
    const current = this.worn.get(id);
    if (on && !current) {
      const g = createOutfit(id);
      this.avatar.head.add(g);
      this.worn.set(id, g);
    } else if (!on && current) {
      this.avatar.head.remove(current);
      this.worn.delete(id);
    }
  }
}

function load<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

function toSet<T>(list: T[] | null): Set<T> | null {
  return list ? new Set(list) : null;
}

function save(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
