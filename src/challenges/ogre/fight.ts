/**
 * Turn-based rules for the ogre fight, tuned for a seven-year-old and based
 * on the original combat numbers: Tadeo attacks with the magic sword, heals
 * with magic berries or unleashes a charged special. The ogre follows a
 * readable rhythm — club swipe, then a big wind-up warning, then a slam. Each
 * swing can be blocked by raising the shield in time (Space at the right
 * moment); a blocked slam turns into a "boing" bouncing back on the ogre.
 * Attacks and blocks charge the special.
 * Tadeo has to block or heal now and then to win. At zero health the fight
 * starts over (`reset`), never a "Game Over".
 */

export type HeroAction = "attack" | "heal" | "special";
export type OgreMove = "swipe" | "windup" | "slam";

export const HERO_MAX = 30;
export const OGRE_MAX = 80;
export const CHARGE_NEEDED = 3;

const roll = (a: number, b: number): number => a + Math.floor(Math.random() * (b - a + 1));

export interface OgreResult {
  move: OgreMove;
  damage: number;
  blocked: boolean;
  /** Damage the ogre takes himself when his slam bounces off Tadeo's shield. */
  bounce: number;
  /** Tadeo ran out of health: the fight starts over. */
  knockedOut: boolean;
}

export class FightRules {
  heroHp = HERO_MAX;
  ogreHp = OGRE_MAX;
  charge = 0;
  private ogreTurns = 0;

  /** Both back at full health, as at the start of the fight. */
  reset(): void {
    this.heroHp = HERO_MAX;
    this.ogreHp = OGRE_MAX;
    this.charge = 0;
    this.ogreTurns = 0;
  }

  get won(): boolean {
    return this.ogreHp <= 0;
  }

  get specialReady(): boolean {
    return this.charge >= CHARGE_NEEDED;
  }

  /** What the ogre will do after Tadeo's next action. */
  get nextOgreMove(): OgreMove {
    return (["swipe", "windup", "slam"] as const)[this.ogreTurns % 3];
  }

  /** Tadeo's move; returns damage dealt (attack/special) or health restored (heal). */
  hero(action: HeroAction): number {
    switch (action) {
      case "attack": {
        this.charge = Math.min(this.charge + 1, CHARGE_NEEDED);
        return this.hurtOgre(roll(9, 12));
      }
      case "special": {
        if (!this.specialReady) return 0;
        this.charge = 0;
        return this.hurtOgre(roll(24, 28));
      }
      case "heal": {
        const healed = Math.min(15, HERO_MAX - this.heroHp);
        this.heroHp += healed;
        return healed;
      }
    }
  }

  /** The ogre's turn; `blocked` = Tadeo raised his shield in time for the swing. */
  ogre(blocked: boolean): OgreResult {
    const move = this.nextOgreMove;
    this.ogreTurns++;
    const res: OgreResult = { move, damage: 0, blocked: false, bounce: 0, knockedOut: false };
    if (move === "windup") return res;
    res.blocked = blocked;
    if (blocked) this.charge = Math.min(this.charge + 1, CHARGE_NEEDED);
    if (move === "swipe") res.damage = blocked ? 0 : roll(6, 8);
    else {
      res.damage = blocked ? 0 : roll(13, 15);
      if (blocked) res.bounce = this.hurtOgre(6);
    }
    this.heroHp = Math.max(0, this.heroHp - res.damage);
    res.knockedOut = this.heroHp === 0;
    return res;
  }

  private hurtOgre(amount: number): number {
    const dealt = Math.min(amount, this.ogreHp);
    this.ogreHp -= dealt;
    return dealt;
  }
}
