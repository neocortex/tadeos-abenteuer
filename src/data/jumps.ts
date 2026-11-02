/**
 * The points in the story the menu can start from. A pick opens the game afresh with `query`, the same start as typing
 * `?challenge=<name>` or `?quest=N`, and the story plays on from there to the end. Quests 3 and 4 have no challenge of
 * their own, so they start on the island. Quest 1 is left out: it is the opening, which "Neues Abenteuer" plays.
 */

export interface Jump {
  name: string;
  emoji: string;
  query: string;
}

export const JUMPS: Jump[] = [
  { name: "Der Vulkan", emoji: "🌋", query: "challenge=volcano" },
  { name: "Das Dorf", emoji: "🏠", query: "quest=3" },
  { name: "Der See", emoji: "🌊", query: "quest=4" },
  { name: "Die Höhle", emoji: "💎", query: "challenge=cave" },
  { name: "Der Zauberwald", emoji: "🌲", query: "challenge=forest" },
  { name: "Der Schlüssel", emoji: "🔑", query: "challenge=village" },
  { name: "Der Oger", emoji: "👹", query: "challenge=ogre" },
  { name: "Der Berg", emoji: "⛰️", query: "challenge=mountain" },
  { name: "Der Hai", emoji: "🦈", query: "challenge=sea" },
  { name: "Die Schatzinsel", emoji: "🏝️", query: "challenge=treasure" },
  { name: "Das Feuerherz", emoji: "🔥", query: "challenge=finale" },
];
