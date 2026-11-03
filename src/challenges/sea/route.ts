/**
 * The voyage's map, data only: the channel's centre line from the dock to the
 * shark's waters (`ROUTE`), and the six sections along it, each with one idea
 * (rocks to weave through, dolphins, rock arches, jellyfish, a whirlpool and a
 * whale, big breaking swells). A checkpoint buoy stands at the start of every
 * section after the first.
 *
 * Every x in `SECTIONS` is an offset from the channel's centre at that z
 * (`routeX(z)`), so the layout follows the channel when its bends change.
 */

/** The channel's centre line, x and z, from the pier to where the shark waits. */
export const ROUTE: [number, number][] = [
  [0, -12],
  [0, -70],
  [10, -150],
  [16, -230],
  [4, -320],
  [-14, -420],
  [-18, -520],
  [-6, -630],
  [10, -720],
  [14, -830],
  [0, -930],
  [-12, -1030],
  [-6, -1140],
  [0, -1250],
];
/** The voyage ends here; the shark waits just beyond. */
export const COURSE_END = -1250;
/** Half the channel's width: further out, a current turns the boat back. */
export const CHANNEL_HALF = 30;

/** A giant swell rolling towards the boat across x0..x1; it meets the boat at `zMeet`. `breakX` foams and is a hit. */
export interface SwellSpec {
  zMeet: number;
  x0: number;
  x1: number;
  breakX?: [number, number];
}

/** A row of the course: sea stacks (x, radius) and where the starfish trail passes (`safe`). */
export interface RowSpec {
  z: number;
  rocks?: [number, number][];
  safe: number;
}

export interface SectionSpec {
  name: string;
  /** Where the section begins (its buoy stands here). */
  startZ: number;
  rows?: RowSpec[];
  /** Rock arches: x of the opening, z, clear width between the two stacks. The trail threads each one. */
  arches?: [number, number, number][];
  swells?: SwellSpec[];
  /** Jellyfish: x, z, and the radius of the slow circle each one drifts on. */
  jellies?: [number, number, number][];
  /** Barrels drifting across: x, z, speed along x (they start when the boat comes near). */
  barrels?: [number, number, number][];
  dolphins?: [number, number][];
  whirlpool?: [number, number, number];
  whale?: [number, number];
  bottle?: [number, number];
  fin?: [number, number];
}

export const SECTIONS: SectionSpec[] = [
  {
    // Teaching: a few rocks and two gentle swells that never break
    name: "start",
    startZ: -12,
    rows: [
      { z: -60, rocks: [[4, 2.2]], safe: -3 },
      { z: -95, rocks: [[-4.5, 2.4]], safe: 3 },
      { z: -160, rocks: [[-6, 2.2], [5.5, 2.2]], safe: 0 },
      { z: -200, rocks: [[0, 2.6]], safe: 5 },
    ],
    swells: [
      { zMeet: -128, x0: -26, x1: 26 },
      { zMeet: -182, x0: -26, x1: 26 },
    ],
  },
  {
    name: "dolphins",
    startZ: -215,
    rows: [
      { z: -300, rocks: [[7, 2.2]], safe: -2 },
      { z: -385, rocks: [[-6, 2.4]], safe: 3 },
    ],
    dolphins: [
      [-4, -235],
      [5, -335],
    ],
    barrels: [
      [-16, -275, 3],
      [16, -350, -3.5],
      [-17, -405, 4],
    ],
  },
  {
    name: "arches",
    startZ: -425,
    rows: [
      { z: -485, rocks: [[-7, 2]], safe: 3 },
      { z: -588, rocks: [[6, 2]], safe: -2 },
    ],
    arches: [
      [0, -460, 6],
      [5, -515, 5.5],
      [-4, -560, 5],
      [0, -615, 4],
    ],
    bottle: [-11, -540],
  },
  {
    name: "jellies",
    startZ: -635,
    rows: [
      { z: -650, safe: 0 },
      { z: -820, safe: 0 },
    ],
    jellies: [
      [-5, -665, 1.2],
      [6, -675, 1.5],
      [2.5, -695, 2.4],
      [-6, -710, 1.4],
      [-2.5, -728, 2.2],
      [6, -740, 1.4],
      [3, -760, 2.5],
      [-5.5, -772, 1.5],
      [-2, -792, 2.4],
      [5.5, -800, 1.3],
      [0, -812, 3],
    ],
    fin: [14, -720],
  },
  {
    name: "whirlpool",
    startZ: -835,
    rows: [
      { z: -860, rocks: [[-6, 2.2]], safe: 2 },
      { z: -905, safe: -7 },
      { z: -950, rocks: [[5, 2.4]], safe: -2 },
      { z: -1005, rocks: [[-5, 2]], safe: 3 },
    ],
    whirlpool: [7, -905, 7],
    whale: [-1, -975],
  },
  {
    // The big ones: swells that break on one side, with rocks between them
    name: "bigSwells",
    startZ: -1035,
    rows: [
      { z: -1050, safe: -4 },
      { z: -1085, rocks: [[-3, 2.4]], safe: 5 },
      { z: -1140, rocks: [[4, 2.2], [-7, 2.2]], safe: -1.5 },
      { z: -1200, rocks: [[0, 2.6]], safe: -5 },
    ],
    swells: [
      { zMeet: -1062, x0: -28, x1: 28, breakX: [4, 28] },
      { zMeet: -1112, x0: -28, x1: 28, breakX: [-28, 0] },
      { zMeet: -1170, x0: -28, x1: 28, breakX: [2.5, 28] },
      { zMeet: -1228, x0: -28, x1: 28, breakX: [-28, -6] },
    ],
    fin: [-15, -1130],
  },
];

/** Centre of the channel at z (straight lines between the waypoints). */
export function routeX(z: number): number {
  if (z >= ROUTE[0][1]) return ROUTE[0][0];
  for (let i = 1; i < ROUTE.length; i++) {
    const [xb, zb] = ROUTE[i];
    if (z >= zb) {
      const [xa, za] = ROUTE[i - 1];
      return xa + ((xb - xa) * (z - za)) / (zb - za);
    }
  }
  return ROUTE[ROUTE.length - 1][0];
}

/** The next waypoint of the channel ahead of z. */
export function nextWaypoint(z: number): [number, number] {
  return ROUTE.find(([, wz]) => wz < z - 1) ?? ROUTE[ROUTE.length - 1];
}

/** The index of the section the boat is in at z. */
export function sectionAt(z: number): number {
  let i = 0;
  while (i + 1 < SECTIONS.length && z <= SECTIONS[i + 1].startZ) i++;
  return i;
}

/** The trail's turning points (absolute x, z): every row's safe spot and every arch's opening, from the pier to the end. */
const TRAIL_KEYS: [number, number][] = (() => {
  const keys: [number, number][] = [[0, -12]];
  for (const s of SECTIONS) {
    for (const r of s.rows ?? []) keys.push([routeX(r.z) + r.safe, r.z]);
    for (const [x, z] of s.arches ?? []) keys.push([routeX(z) + x, z]);
  }
  keys.push([0, COURSE_END]);
  return keys.sort((a, b) => b[1] - a[1]);
})();

/** Where the starfish trail (the safe way) passes at z: eased between its turning points. */
export function trailX(z: number): number {
  if (z >= TRAIL_KEYS[0][1]) return TRAIL_KEYS[0][0];
  for (let i = 1; i < TRAIL_KEYS.length; i++) {
    const [xb, zb] = TRAIL_KEYS[i];
    if (z >= zb) {
      const [xa, za] = TRAIL_KEYS[i - 1];
      const t = (z - za) / (zb - za);
      return xa + (xb - xa) * t * t * (3 - 2 * t);
    }
  }
  return 0;
}
