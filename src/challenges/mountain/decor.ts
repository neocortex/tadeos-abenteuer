/**
 * Mountain scenery: instanced pines (snowy higher up), round trees, bushes,
 * rocks, flowers and grass tufts on the foothills and around the path, kept
 * out of the camera's line of sight; drifting clouds around the peak, gulls
 * circling the cliffs, the island's smoking volcano far to the west, falling
 * snow that thickens above the snow line, and for the view from the summit the
 * small island far out at sea with the shark's fin circling it.
 */

import * as THREE from "three";
import { mulberry32, smoothstep } from "../../core/noise";
import { part, merge } from "../../core/geo";
import * as flora from "../../world/models/flora";
import { Clouds } from "../../world/Sky";
import { CritterMesh } from "../../world/ambient/CritterMesh";
import { gullModel } from "../../world/ambient/critterModels";
import { GULL_ANIM } from "../../world/ambient/critterAnims";
import { SmokeSystem, VOLCANO_SPARKS } from "../../world/ambient/Smoke";
import { glowTexture } from "../../world/ambient/textures";
import { WorldUniforms } from "../../world/Terrain";
import { Course, DEPTH } from "./course";

/** Where the island's volcano stands, seen from the mountain (far west-south-west). */
export const VOLCANO_AT = new THREE.Vector3(-290, 0, 85);
const GULLS = 9;
/** The sky colour that far things are washed towards. */
const HAZE = "#a9c4dd";
/** How far out to sea the small island lies (the fog ends at 820), and the radius of its sand. */
const ISLE_AT = 240;
const ISLE_R = 36;
/** The fin's circle around the island, and its speed (a round in about 40 s). */
const FIN_CIRCLE = 52;
const FIN_OMEGA = 0.16;
/** Half the width of the lane from the summit out over the island: the fin's circle plus the biggest cloud. */
const CLOUD_LANE = FIN_CIRCLE + 35;

interface Gull {
  radius: number;
  y: number;
  omega: number;
  phase: number;
}

function flower(color: THREE.ColorRepresentation): THREE.BufferGeometry {
  const parts = [part(new THREE.CylinderGeometry(0.02, 0.025, 0.32, 4), "#3f8f2e", { pos: [0, 0.16, 0] })];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(part(new THREE.SphereGeometry(0.075, 6, 4), color, { pos: [Math.cos(a) * 0.08, 0.34, Math.sin(a) * 0.08], scale: [1, 0.45, 1] }));
  }
  parts.push(part(new THREE.SphereGeometry(0.05, 6, 4), "#ffd23f", { pos: [0, 0.36, 0] }));
  return merge(parts);
}

function tuft(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    parts.push(part(new THREE.ConeGeometry(0.06, 0.45, 3), "#5fae3a", { pos: [Math.cos(a) * 0.08, 0.2, Math.sin(a) * 0.08], rot: [Math.sin(a) * 0.35, 0, -Math.cos(a) * 0.35] }));
  }
  return merge(parts);
}

/** How far the small island's coast reaches at angle a, so that it doesn't look turned on a lathe. */
const coast = (a: number): number => 1 + Math.sin(a * 2 + 1) * 0.1 + Math.sin(a * 3 + 2.2) * 0.06 + Math.sin(a * 5) * 0.03;

/** The small island: foam at the waterline, a sand rim, one low green hump and palms, all in one mesh. */
function isleGeometry(): THREE.BufferGeometry {
  const R = ISLE_R;
  const profile = (
    [
      [R + 4, -1],
      [R + 2.5, 0.35],
      [R + 0.5, 0.6],
      [R - 3, 1],
      [R - 7, 1.5],
      [R - 10, 1.9],
      [R - 12, 2.5],
      [R - 15, 4.2],
      [R - 19, 6.2],
      [R - 24, 7.8],
      [R - 30, 8.8],
      [0, 9.2],
    ] as const
  ).map(([r, y]) => new THREE.Vector2(r, y));
  const lathe = new THREE.LatheGeometry(profile, 56);
  const pos = lathe.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const k = coast(Math.atan2(pos.getZ(i), pos.getX(i)));
    pos.setXYZ(i, pos.getX(i) * k, pos.getY(i), pos.getZ(i) * k);
  }
  const hump = part(lathe, (p) => {
    const r = Math.hypot(p.x, p.z) / coast(Math.atan2(p.z, p.x));
    if (r > R + 1) return new THREE.Color("#ffffff");
    return new THREE.Color("#f2dc9b").lerp(new THREE.Color("#7cc243"), smoothstep(R - 10, R - 12, r)).lerp(new THREE.Color("#4f9a3a"), smoothstep(R - 15, R - 28, r));
  });
  // Reason: bigger than life, like the fin, so that a child can tell the palms from the summit
  const palms = (
    [
      [-13, 6.3, 7, 2.9, 0.4],
      [-4, 7.6, 12, 2.5, 2.2],
      [9, 6.8, 8, 3.1, 3.9],
      [23, 1.4, 12, 2.3, 5.2],
    ] as const
  ).map(([x, y, z, s, yaw], i) =>
    flora.palmTree(i + 2).geometry.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw), new THREE.Vector3(s, s, s))),
  );
  const geo = merge([hump, ...palms]);
  // Reason: wash the colours towards the sky, as on the far volcano, so that the island sits out in the haze
  const colors = geo.attributes.color as THREE.BufferAttribute;
  const tint = new THREE.Color();
  const haze = new THREE.Color(HAZE);
  for (let i = 0; i < colors.count; i++) {
    tint.fromBufferAttribute(colors, i).lerp(haze, 0.25);
    colors.setXYZ(i, tint.r, tint.g, tint.b);
  }
  return geo;
}

/** The turquoise shallows around the small island, fading out into the open sea. */
function lagoonGeometry(): THREE.BufferGeometry {
  const outer = ISLE_R * 1.6;
  const g = new THREE.RingGeometry(ISLE_R, outer, 56, 5).rotateX(-Math.PI / 2);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const rgba = new Float32Array(pos.count * 4);
  const c = new THREE.Color("#5fe0d2");
  for (let i = 0; i < pos.count; i++) {
    const k = coast(Math.atan2(pos.getZ(i), pos.getX(i)));
    rgba.set([c.r, c.g, c.b, smoothstep(outer, ISLE_R, Math.hypot(pos.getX(i), pos.getZ(i))) * 0.9], i * 4);
    pos.setXYZ(i, pos.getX(i) * k, 0.3, pos.getZ(i) * k);
  }
  g.setAttribute("color", new THREE.BufferAttribute(rgba, 4));
  return g;
}

/** The shark's dorsal fin (nose towards +z) far bigger than life, with its white wake on the water. */
function farFinGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape().moveTo(0.46, -0.05).quadraticCurveTo(0.16, 0.62, -0.4, 1).quadraticCurveTo(-0.2, 0.5, -0.42, -0.05).closePath();
  const fin = new THREE.ExtrudeGeometry(shape, { depth: 0.14, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 10 });
  fin.translate(0, 0, -0.07);
  // Reason: shape x becomes the fin's z axis, the extrusion its thickness (x)
  fin.rotateY(-Math.PI / 2);
  // Reason: thin towards the tip, so that seen from the front it is a spike and not a slab
  const pos = fin.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) pos.setX(i, pos.getX(i) * (1 - Math.max(pos.getY(i), 0) * 0.8));
  const foam = (z: number, width: number, length: number) => part(new THREE.SphereGeometry(1, 12, 6), "#ffffff", { pos: [0, 0.15, z], scale: [width, 0.4, length] });
  return merge([part(fin, "#1b2733", { scale: 12 }), foam(1.5, 3, 7), foam(-14, 1.1, 16)]);
}

const SNOW_VERT = /* glsl */ `
uniform float uTime;
uniform vec3 uCenter;
attribute vec4 aSeed;
varying float vAlpha;
varying vec2 vUv;
const vec3 BOX = vec3(36.0, 26.0, 36.0);
void main() {
  vec3 p = aSeed.xyz * BOX;
  p += vec3(uTime * 2.2, -uTime * (1.6 + aSeed.w), uTime * 0.9);
  p.x += sin(uTime * 1.3 + aSeed.w * 20.0) * 0.6;
  // Reason: wrap the flakes into a box that travels with the camera
  p = mod(p - uCenter + BOX * 0.5, BOX) + uCenter - BOX * 0.5;
  vec4 mv = viewMatrix * vec4(p, 1.0);
  mv.xy += position.xy * (0.09 + aSeed.w * 0.07);
  gl_Position = projectionMatrix * mv;
  vUv = uv;
  vAlpha = smoothstep(26.0, 6.0, -mv.z);
}
`;

const SNOW_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform float uAmount;
varying float vAlpha;
varying vec2 vUv;
void main() {
  float a = texture2D(uTex, vUv).a;
  gl_FragColor = vec4(1.0, 1.0, 1.0, a * vAlpha * uAmount);
}
`;

export class Decor {
  readonly group = new THREE.Group();
  readonly snowMaterial: THREE.ShaderMaterial;
  /** The small island and the fin, once `addFarIsle` has put them on the sea. */
  farIsle: { island: THREE.Object3D; fin: THREE.Object3D } | null = null;
  private clouds: Clouds;
  private gullMesh: CritterMesh;
  private gulls: Gull[] = [];
  private smoke: SmokeSystem;
  private owned: { dispose(): void }[] = [];

  constructor(
    private course: Course,
    height: (x: number, z: number) => number,
    world: WorldUniforms,
  ) {
    this.scatter(height);
    this.clouds = new Clouds(12, 31);
    const rand = mulberry32(5);
    this.clouds.group.children.forEach((c, i) => {
      // Reason: a ring of clouds around the peak, below the summit, so the climb rises above them
      const a = (i / 12) * Math.PI * 2 + rand() * 0.4;
      const r = 70 + rand() * 110;
      c.position.set(Math.cos(a) * r, 30 + rand() * 22, Math.sin(a) * r);
      c.scale.setScalar(0.45 + rand() * 0.5);
    });
    this.group.add(this.clouds.group);
    this.owned.push((this.clouds.group.children[0] as THREE.Mesh).material as THREE.Material);

    this.gullMesh = new CritterMesh({ name: "mountain-gulls", geometry: gullModel(), count: GULLS, animate: GULL_ANIM, doubleSided: true, selfLit: 0.35 });
    this.owned.push(this.gullMesh.mesh.material as THREE.Material);
    this.group.add(this.gullMesh.mesh);
    for (let i = 0; i < GULLS; i++) {
      this.gulls.push({ radius: 24 + rand() * 22, y: 16 + rand() * 24, omega: (rand() < 0.5 ? -1 : 1) * (0.12 + rand() * 0.06), phase: rand() * Math.PI * 2 });
    }

    this.smoke = new SmokeSystem(world);
    this.group.add(this.smoke.group);
    this.volcano(world);

    // Falling snow (point sprites in a camera-following box)
    const n = 900;
    const seeds = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) seeds[i] = rand();
    const base = new THREE.PlaneGeometry(1, 1);
    const geo = new THREE.InstancedBufferGeometry();
    geo.index = base.index;
    geo.setAttribute("position", base.attributes.position);
    geo.setAttribute("aSeed", new THREE.InstancedBufferAttribute(seeds, 4));
    geo.instanceCount = n;
    this.snowMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: world.uTime, uCenter: { value: new THREE.Vector3() }, uTex: { value: glowTexture() }, uAmount: { value: 0 } },
      vertexShader: SNOW_VERT,
      fragmentShader: SNOW_FRAG,
      transparent: true,
      depthWrite: false,
    });
    geo.setAttribute("uv", base.attributes.uv);
    const snow = new THREE.Mesh(geo, this.snowMaterial);
    snow.frustumCulled = false;
    snow.renderOrder = 6;
    this.group.add(snow);
    this.owned.push(this.snowMaterial, geo, base);
  }

  /** Scatter vegetation and rocks, avoiding the path and the strip between path and camera. */
  private scatter(height: (x: number, z: number) => number): void {
    const rand = mulberry32(88);
    const c = this.course;
    // Path samples and their camera positions, for keep-out tests
    const samples: { p: THREE.Vector2; cam: THREE.Vector2; lens: THREE.Vector2; y: number }[] = [];
    for (let s = -4; s <= c.length + 2; s += 0.6) {
      const y = c.nominalY(s);
      const r = c.radius(y);
      const p = c.point(s, r, y);
      const q = c.point(s, r + 12, y);
      const l = c.point(s, r + 10, y);
      samples.push({ p: new THREE.Vector2(p.x, p.z), cam: new THREE.Vector2(q.x, q.z), lens: new THREE.Vector2(l.x, l.z), y });
    }
    const seg = new THREE.Vector2();
    const blocked = (x: number, z: number, y: number, pad: number): boolean => {
      const v = new THREE.Vector2(x, z);
      for (const sm of samples) {
        if (Math.abs(sm.y - y) > 9) continue;
        // Distance to the segment path → camera
        seg.copy(sm.cam).sub(sm.p);
        const t = THREE.MathUtils.clamp(v.clone().sub(sm.p).dot(seg) / seg.lengthSq(), 0, 1);
        if (v.distanceTo(sm.p.clone().addScaledVector(seg, t)) < pad + (t < 0.15 ? DEPTH / 2 : 0)) return true;
      }
      return false;
    };

    const kinds = {
      pine: [0, 1, 2].map((s) => flora.pineTree(s)),
      snowPine: [0, 1].map((s) => flora.pineTree(s + 5, true)),
      tree: [0, 1, 2].map((s) => flora.roundTree(s)),
      bush: [flora.bush(1), flora.bush(7, "#e0263a")],
      rock: [0, 1, 2].map((s) => flora.rock(s)),
      bare: [4, 5].map((s) => flora.rock(s, false)),
    };
    const lists = new Map<flora.FloraModel, THREE.Matrix4[]>();
    const put = (model: flora.FloraModel, x: number, y: number, z: number, s: number) => {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x, y - 0.1 * s, z),
        new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * Math.PI * 2),
        new THREE.Vector3(s, s * (0.9 + rand() * 0.25), s),
      );
      if (!lists.has(model)) lists.set(model, []);
      lists.get(model)!.push(m);
    };
    const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

    for (let i = 0; i < 2600; i++) {
      const a = rand() * Math.PI * 2;
      const r = 10 + Math.sqrt(rand()) * 100;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = height(x, z);
      if (y < 1.2) continue;
      const steep = Math.abs(height(x + 1, z) - y) + Math.abs(height(x, z + 1) - y);
      const roll = rand();
      let model: flora.FloraModel | null = null;
      let scale = 1;
      if (y > 30) {
        if (steep < 1.4 && roll < 0.1) [model, scale] = [pick(kinds.bare), 0.7 + rand() * 0.9];
      } else if (y > 9) {
        if (steep < 1.3 && roll < 0.3) [model, scale] = [pick(y > 17 ? kinds.snowPine : kinds.pine), 0.8 + rand() * 0.5];
        else if (steep < 1.6 && roll < 0.22) [model, scale] = [pick(kinds.bare), 0.8 + rand() * 1.2];
      } else if (r < 85) {
        if (steep > 1.3) continue;
        if (roll < 0.34) [model, scale] = [pick(kinds.pine), 0.9 + rand() * 0.7];
        else if (roll < 0.42) [model, scale] = [pick(kinds.tree), 0.8 + rand() * 0.5];
        else if (roll < 0.5) [model, scale] = [pick(kinds.bush), 0.8 + rand() * 0.6];
        else if (roll < 0.56) [model, scale] = [pick(kinds.rock), 0.5 + rand() * 1.1];
      }
      if (!model) continue;
      if (blocked(x, z, y, 2.2 + scale)) continue;
      // Reason: sink rocks into slopes so their downhill side never floats
      put(model, x, y - (kinds.bare.includes(model) || kinds.rock.includes(model) ? steep * 0.5 * scale : 0), z, scale);
    }
    // Flowers and grass tufts on the foothills near the start and on grassy ledges
    const flowers = ["#ff5d8f", "#ffd23f", "#ffffff", "#7f6bff", "#ff8c3a"].map(flower);
    const tufts = tuft();
    const small = new Map<THREE.BufferGeometry, THREE.Matrix4[]>();
    const putSmall = (g: THREE.BufferGeometry, x: number, y: number, z: number, s: number) => {
      if (!small.has(g)) small.set(g, []);
      small.get(g)!.push(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rand() * 6.3), new THREE.Vector3(s, s, s)));
    };
    for (let i = 0; i < 1400; i++) {
      const a = rand() * Math.PI * 2;
      const r = 22 + rand() * 50;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const y = height(x, z);
      if (y < 1.5 || y > 14 || blocked(x, z, y, 0.6)) continue;
      if (Math.abs(height(x + 0.5, z) - y) + Math.abs(height(x, z + 0.5) - y) > 0.5) continue;
      putSmall(rand() < 0.45 ? pick(flowers) : tufts, x, y, z, 0.8 + rand() * 0.7);
    }
    // Reason: the camera looks across this meadow at the start of the climb — dress it, but keep
    // the path and the few metres right in front of the lens clear
    const clear = (x: number, z: number, y: number): boolean =>
      samples.some((sm) => Math.abs(sm.y - y) < 9 && (Math.hypot(x - sm.p.x, z - sm.p.y) < DEPTH / 2 + 0.5 || Math.hypot(x - sm.lens.x, z - sm.lens.y) < 3.5));
    for (let i = 0; i < 360; i++) {
      const s = -4 + rand() * 34;
      const y0 = c.nominalY(s);
      const q = c.point(s, c.radius(y0) + DEPTH / 2 + 0.4 + rand() * 9, y0);
      const y = height(q.x, q.z);
      if (y < 1.5 || clear(q.x, q.z, y)) continue;
      putSmall(rand() < 0.5 ? pick(flowers) : tufts, q.x, y, q.z, 0.8 + rand() * 0.6);
    }
    for (const p of c.pieces) {
      if (p.y0 > 18 || p.kind === "boards" || p.kind === "bridge") continue;
      for (let s = p.s0 + 0.3; s < p.s1 - 0.3; s += 0.35) {
        if (rand() > 0.55) continue;
        const y = c.top(p, s);
        const q = c.point(s, c.radius(y) - DEPTH / 2 + 0.15 + rand() * 0.5, y);
        putSmall(rand() < 0.5 ? pick(flowers) : tufts, q.x, q.y, q.z, 0.7 + rand() * 0.5);
      }
    }

    const tint = new THREE.Color();
    const add = (geo: THREE.BufferGeometry, list: THREE.Matrix4[], shadows: boolean) => {
      const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88 });
      this.owned.push(material);
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach((m, i) => {
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, tint.setScalar(0.85 + rand() * 0.25));
      });
      mesh.castShadow = shadows;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.group.add(mesh);
    };
    for (const [model, list] of lists) add(model.geometry, list, true);
    for (const [g, list] of small) add(g, list, false);
    // Unused models still own geometry
    for (const ms of Object.values(kinds)) for (const m of ms) if (!lists.has(m)) this.owned.push(m.geometry);
    for (const g of [...flowers, tufts]) if (!small.has(g)) this.owned.push(g);
  }

  /** The island's volcano on the far horizon, smoking and glowing. */
  private volcano(world: WorldUniforms): void {
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      const r = 72 - t * 60 + Math.sin(t * 9) * 1.5;
      profile.push(new THREE.Vector2(r, -4 + Math.pow(t, 1.35) * 50));
    }
    profile.push(new THREE.Vector2(8, 44), new THREE.Vector2(3, 39));
    const g = new THREE.LatheGeometry(profile, 40);
    // Reason: wash the colours towards the sky so the far island sits back in the haze
    const haze = new THREE.Color(HAZE);
    const geo = part(g, (p) => {
      const t = smoothstep(-2, 44, p.y);
      return new THREE.Color("#e6d09a")
        .lerp(new THREE.Color("#4f9a45"), smoothstep(0.02, 0.07, t))
        .lerp(new THREE.Color("#6b5450"), smoothstep(0.22, 0.4, t))
        .lerp(new THREE.Color("#3a2f33"), smoothstep(0.65, 1, t))
        .lerp(haze, 0.4);
    });
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    this.owned.push(material);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.copy(VOLCANO_AT);
    this.group.add(mesh);
    const vent = VOLCANO_AT.clone().add(new THREE.Vector3(0, 42, 0));
    this.smoke.add([vent], "volcano");
    this.group.add(this.smoke.sparks([vent.clone().setY(vent.y + 2)], VOLCANO_SPARKS));
    const glowMat = new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color("#ff5a14"), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
    this.owned.push(glowMat);
    const glow = new THREE.Sprite(glowMat);
    glow.position.copy(vent).setY(vent.y + 2);
    glow.scale.setScalar(20);
    this.group.add(glow);
    void world;
  }

  /** Puts the small island on the sea in direction `out` (a unit vector) with the shark's fin circling it. */
  addFarIsle(out: THREE.Vector3): void {
    const landGeo = isleGeometry();
    const landMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, side: THREE.DoubleSide });
    const lagoonGeo = lagoonGeometry();
    const lagoonMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false });
    const lagoon = new THREE.Mesh(lagoonGeo, lagoonMat);
    // Reason: the water blends too and draws at renderOrder 1; the shallows lie on top of it
    lagoon.renderOrder = 2;
    const island = new THREE.Group();
    island.add(new THREE.Mesh(landGeo, landMat), lagoon);
    island.position.copy(out).multiplyScalar(ISLE_AT);
    // Reason: the palms are arranged for this side, so the island's +z looks back at the summit
    island.rotation.y = Math.atan2(-out.x, -out.z);
    const finGeo = farFinGeometry();
    // Reason: no shine, so that the fin stays dark on the side the sun shines on
    const finMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
    const fin = new THREE.Mesh(finGeo, finMat);
    this.group.add(island, fin);
    this.owned.push(landGeo, landMat, lagoonGeo, lagoonMat, finGeo, finMat);
    this.farIsle = { island, fin };
  }

  /** The fin swims its circle, and the clouds keep out of the view. */
  private updateFarIsle(island: THREE.Object3D, fin: THREE.Object3D, time: number): void {
    const th = time * FIN_OMEGA;
    fin.position.set(island.position.x + Math.cos(th) * FIN_CIRCLE, 0, island.position.z + Math.sin(th) * FIN_CIRCLE);
    const ox = island.position.x / ISLE_AT;
    const oz = island.position.z / ISLE_AT;
    // Reason: its nose (+z) points along the circle, but seen end-on a fin is a mere spike from the summit: the part
    // of its heading towards or away from the summit is squeezed, so it swings through that view and shows its side
    const a = th - Math.atan2(oz, ox);
    const away = -Math.sin(a) * 0.3;
    const sideways = Math.cos(a);
    fin.rotation.y = Math.atan2(away * ox - sideways * oz, away * oz + sideways * ox);
    // Reason: the clouds drift and wrap all through the climb, so any of them may have come to stand between
    // the summit and the island, however far out it lies; they slide along the edge of this lane instead
    for (const c of this.clouds.group.children) {
      const along = c.position.x * ox + c.position.z * oz;
      const across = c.position.z * ox - c.position.x * oz;
      if (along < -30 || Math.abs(across) >= CLOUD_LANE) continue;
      const push = (across < 0 ? -CLOUD_LANE : CLOUD_LANE) - across;
      c.position.x -= oz * push;
      c.position.z += ox * push;
    }
  }

  update(dt: number, time: number, camera: THREE.Camera, snowAmount: number): void {
    this.clouds.update(dt);
    this.snowMaterial.uniforms.uCenter.value.copy(camera.position);
    this.snowMaterial.uniforms.uAmount.value = snowAmount;
    this.gulls.forEach((g, i) => {
      const th = g.phase + g.omega * time;
      const x = Math.cos(th) * g.radius;
      const z = Math.sin(th) * g.radius;
      const y = g.y + Math.sin(time * 0.5 + i) * 1.5;
      const dir = Math.sign(g.omega);
      const yaw = Math.atan2(-Math.sin(th) * dir, Math.cos(th) * dir);
      const wing = 0.1 + 0.5 * Math.max(0, Math.sin(time * 0.6 + i * 2)) * Math.sin(time * 7 + i);
      this.gullMesh.set(i, x, y, z, yaw, 0.05, dir * 0.35, wing, 0.8);
    });
    this.gullMesh.commit();
    if (this.farIsle) this.updateFarIsle(this.farIsle.island, this.farIsle.fin, time);
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
