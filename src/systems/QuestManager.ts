/**
 * Linear quest progression tracker.
 * Manages which milestone the player is on.
 */

import { QUESTS, QuestDef } from "../data/quests";

export class QuestManager {
  private static instance: QuestManager;
  private currentMilestoneIndex = 0;

  private constructor() {}

  static getInstance(): QuestManager {
    if (!QuestManager.instance) {
      QuestManager.instance = new QuestManager();
    }
    return QuestManager.instance;
  }

  /** Get the current milestone number (1-based). */
  get currentMilestone(): number {
    return this.currentMilestoneIndex + 1;
  }

  /** Get the current quest definition. */
  get currentQuest(): QuestDef {
    return QUESTS[this.currentMilestoneIndex];
  }

  /** Advance to the next milestone; the last one stays current. */
  completeMilestone(): void {
    if (this.currentMilestoneIndex < QUESTS.length - 1) this.currentMilestoneIndex++;
  }

  /** Set milestone directly (for save/load). */
  setMilestone(milestone: number): void {
    this.currentMilestoneIndex = Math.max(0, Math.min(milestone - 1, QUESTS.length - 1));
  }

  /** Reset to the beginning. */
  reset(): void {
    this.currentMilestoneIndex = 0;
  }
}
