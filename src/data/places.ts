/**
 * The places Tadeo can travel to from the menu's map. Each spot is open, dry ground a few steps from what it is named
 * after, in front of it as the camera sees it, and never behind the hedge or the boulder that the story still has up.
 * Listed from north-west to south-east, like the map itself.
 */

import { LANDMARKS, P2 } from "../world/layout";

export interface Place {
  name: string;
  emoji: string;
  at: P2;
}

export const PLACES: Place[] = [
  { name: "Steg", emoji: "⚓", at: [-29, -60] },
  { name: "Höhle", emoji: "💎", at: [-54, -16] },
  { name: "See", emoji: "🌊", at: [20, 8] },
  { name: "Berg", emoji: "⛰️", at: [55.5, -3.5] },
  { name: "Vulkan", emoji: "🌋", at: [-56, 17.5] },
  { name: "Zauberwald", emoji: "🌲", at: [-6.5, 22.5] },
  { name: "Blumenhügel", emoji: "🌻", at: [122, 12] },
  { name: "Strand", emoji: "🏖️", at: LANDMARKS.spawn },
  { name: "Dorf", emoji: "🏠", at: [68, 41] },
  { name: "Sumpf", emoji: "🐸", at: [-40, 91] },
  { name: "Dschungel", emoji: "🦜", at: [-11, 117] },
  { name: "Lagune", emoji: "🐢", at: [78, 95] },
];
