/**
 * Outfit pieces Tadeo unlocks: a straw hat, a pirate hat, a feather hat and cool
 * sunglasses for gold coins, a fishing hat, a golden crown and a turtle hat as side-game
 * prizes. Each model is built to sit on the Humanoid head (head radius 0.36,
 * origin at the head centre).
 */

import * as THREE from "three";
import { mat, toonMesh } from "./parts";

export type OutfitId = "strawHat" | "pirateHat" | "featherHat" | "sunglasses" | "fishingHat" | "crown" | "shellHat";

/** How far the top of each hat sits above the head centre (Chuleta perches there). */
export const HAT_TOP: Partial<Record<OutfitId, number>> = { strawHat: 0.62, pirateHat: 0.66, featherHat: 0.58, fishingHat: 0.58, crown: 0.64, shellHat: 0.56 };

function strawHat(): THREE.Group {
  const g = new THREE.Group();
  const straw = mat("#f2d27a", 0.8);
  const brim = toonMesh(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 28), straw);
  brim.position.y = 0.3;
  const crown = toonMesh(new THREE.CylinderGeometry(0.27, 0.33, 0.26, 24), straw);
  crown.position.y = 0.44;
  const band = toonMesh(new THREE.CylinderGeometry(0.335, 0.335, 0.07, 24), mat("#e63946", 0.6), false);
  band.position.y = 0.36;
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mat("#ffe14d", 0.5, 0.4));
  flower.position.set(0.24, 0.38, 0.2);
  g.add(brim, crown, band, flower);
  g.rotation.x = -0.1;
  return g;
}

function pirateHat(): THREE.Group {
  const g = new THREE.Group();
  const black = mat("#22202a", 0.7);
  const dome = toonMesh(new THREE.SphereGeometry(0.38, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), black);
  dome.scale.set(1, 0.72, 0.95);
  dome.position.y = 0.26;
  g.add(dome);
  // Tricorn: three brim flaps flaring up and out around the dome
  const flapMat = new THREE.MeshStandardMaterial({ color: "#22202a", roughness: 0.7, side: THREE.DoubleSide });
  flapMat.emissive.set("#22202a");
  flapMat.emissiveIntensity = 0.16;
  for (let i = 0; i < 3; i++) {
    const flap = toonMesh(new THREE.CylinderGeometry(0.58, 0.4, 0.2, 18, 1, true, -0.95, 1.9), flapMat);
    flap.rotation.y = (i / 3) * Math.PI * 2;
    flap.position.y = 0.38;
    g.add(flap);
  }
  const trim = toonMesh(new THREE.TorusGeometry(0.4, 0.025, 6, 30), mat("#ffc83d", 0.3, 0.4), false);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = 0.29;
  g.add(trim);
  // A friendly skull badge on the front flap
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), mat("#fff8ee", 0.5, 0.3));
  skull.position.set(0, 0.4, 0.5);
  g.add(skull);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), mat("#22202a", 0.5));
    eye.position.set(side * 0.028, 0.41, 0.57);
    g.add(eye);
    const bone = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.16, 3, 6), mat("#fff8ee", 0.5, 0.3));
    bone.rotation.z = side * 0.8 + Math.PI / 2;
    bone.position.set(0, 0.34, 0.52);
    g.add(bone);
  }
  return g;
}

function sunglasses(): THREE.Group {
  const g = new THREE.Group();
  const frame = mat("#1c1a22", 0.3);
  for (const side of [-1, 1]) {
    const lens = toonMesh(new THREE.CylinderGeometry(0.1, 0.1, 0.03, 20), mat("#2a2d4a", 0.15, 0.3), false);
    lens.rotation.x = Math.PI / 2;
    lens.scale.set(1.15, 1, 0.85);
    lens.position.set(side * 0.13, 0.04, 0.35);
    lens.rotation.y = side * 0.25;
    g.add(lens);
    const shine = new THREE.Mesh(new THREE.CircleGeometry(0.03, 8), mat("#ffffff", 0.2, 1.5));
    shine.position.set(side * 0.13 - 0.035, 0.075, 0.367);
    g.add(shine);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.025, 0.3), frame);
    arm.position.set(side * 0.29, 0.06, 0.2);
    arm.rotation.y = side * -0.15;
    g.add(arm);
  }
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.022, 0.022), frame);
  bridge.position.set(0, 0.07, 0.37);
  g.add(bridge);
  return g;
}

/** A wide musketeer hat with one huge curling feather, swept back on the left so Chuleta still has room on top. */
function featherHat(): THREE.Group {
  const g = new THREE.Group();
  const felt = mat("#4a3a8c", 0.75);
  const brimMat = new THREE.MeshStandardMaterial({ color: "#4a3a8c", roughness: 0.75, side: THREE.DoubleSide });
  brimMat.emissive.set("#4a3a8c");
  brimMat.emissiveIntensity = 0.16;
  // Reason: a shallow open cone rising outwards reads as a brim with its edge turned up
  const brim = toonMesh(new THREE.CylinderGeometry(0.72, 0.36, 0.1, 30, 1, true), brimMat);
  brim.position.y = 0.33;
  const crown = toonMesh(new THREE.CylinderGeometry(0.25, 0.32, 0.26, 24), felt);
  crown.position.y = 0.42;
  const band = toonMesh(new THREE.CylinderGeometry(0.325, 0.325, 0.07, 24), mat("#ffc83d", 0.3, 0.4), false);
  band.position.y = 0.33;
  g.add(brim, crown, band);

  // The plume: a quill along a curve, with soft vanes that shrink towards the curling tip
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.3, 0.38, 0.08),
    new THREE.Vector3(-0.42, 0.62, -0.06),
    new THREE.Vector3(-0.44, 0.86, -0.3),
    new THREE.Vector3(-0.34, 0.98, -0.58),
    new THREE.Vector3(-0.22, 0.92, -0.78),
  ]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 5), mat("#fff8ee", 0.5, 0.3)));
  const colours = ["#e63946", "#ff6b3d", "#ff9f1c", "#ffd23f"];
  const VANES = 18;
  for (let i = 0; i < VANES; i++) {
    const t = 0.06 + (i / (VANES - 1)) * 0.92;
    const at = curve.getPointAt(t);
    const along = curve.getTangentAt(t);
    const width = 0.17 * (1 - t * 0.5);
    const vane = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), mat(colours[Math.floor(t * colours.length * 0.999)], 0.6, 0.35));
    vane.scale.set(width, 0.045, 0.12);
    vane.position.copy(at);
    vane.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), along);
    vane.rotateZ(Math.PI / 2);
    g.add(vane);
  }
  g.rotation.set(-0.1, 0, 0.08);
  return g;
}

/** Fischer Jonas' prize: a floppy bucket hat with a red-white float and a little fish badge. */
function fishingHat(): THREE.Group {
  const g = new THREE.Group();
  const cloth = mat("#8fa86a", 0.85);
  const top = toonMesh(new THREE.CylinderGeometry(0.28, 0.34, 0.24, 24), cloth);
  top.position.y = 0.43;
  const brimMat = new THREE.MeshStandardMaterial({ color: "#8fa86a", roughness: 0.85, side: THREE.DoubleSide });
  brimMat.emissive.set("#8fa86a");
  brimMat.emissiveIntensity = 0.16;
  // Reason: an open cone sloping down and out reads as a soft bucket-hat brim
  const brim = toonMesh(new THREE.CylinderGeometry(0.35, 0.55, 0.12, 28, 1, true), brimMat);
  brim.position.y = 0.27;
  const band = toonMesh(new THREE.CylinderGeometry(0.345, 0.345, 0.06, 24), mat("#3d6b4f", 0.7), false);
  band.position.y = 0.34;
  g.add(top, brim, band);
  // Fishing float tucked into the band: red top, white bottom
  const float = new THREE.Group();
  const red = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat("#e63946", 0.4, 0.35));
  const white = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat("#fff8ee", 0.4, 0.3));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), mat("#ffc83d", 0.4));
  stick.position.y = 0.08;
  float.add(red, white, stick);
  float.position.set(-0.3, 0.42, 0.16);
  float.rotation.z = 0.4;
  g.add(float);
  // Little orange fish badge on the front
  const fish = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), mat("#ff8a3d", 0.4, 0.35));
  body.scale.set(1.4, 0.85, 0.5);
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.07, 3), mat("#ff8a3d", 0.4, 0.35));
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -0.1;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), mat("#22202a", 0.5));
  eye.position.set(0.045, 0.015, 0.03);
  fish.add(body, tail, eye);
  fish.position.set(0.12, 0.42, 0.3);
  fish.rotation.y = -0.35;
  g.add(fish);
  g.rotation.x = -0.08;
  return g;
}

/** Kleine Mia's prize: a shiny golden crown with gems and pearls (bloom makes it glow). */
function crown(): THREE.Group {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: "#ffc83d", roughness: 0.25, metalness: 0.6, side: THREE.DoubleSide });
  gold.emissive.set("#ffb21a");
  gold.emissiveIntensity = 0.35;
  const ring = toonMesh(new THREE.CylinderGeometry(0.3, 0.29, 0.14, 28, 1, true), gold);
  ring.position.y = 0.36;
  g.add(ring);
  const gems = ["#e63946", "#3a86ff", "#2ec27e", "#e63946", "#3a86ff"];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = toonMesh(new THREE.ConeGeometry(0.075, 0.2, 4), gold);
    spike.position.set(Math.sin(a) * 0.27, 0.52, Math.cos(a) * 0.27);
    spike.rotation.y = a;
    const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), mat("#fff8ee", 0.2, 0.6));
    pearl.position.set(Math.sin(a) * 0.27, 0.63, Math.cos(a) * 0.27);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), mat(gems[i], 0.15, 0.9));
    gem.position.set(Math.sin(a) * 0.305, 0.36, Math.cos(a) * 0.305);
    gem.rotation.y = a;
    g.add(spike, pearl, gem);
  }
  g.rotation.set(-0.08, 0, 0.1);
  return g;
}

/** Frau Moos' prize: a little turtle sitting on Tadeo's head, with a plated shell, a friendly face and four flippers. */
function shellHat(): THREE.Group {
  const g = new THREE.Group();
  const skin = mat("#8fae6a", 0.7);
  const shell = toonMesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat("#55783a", 0.65));
  shell.scale.set(1, 0.62, 1.12);
  shell.position.y = 0.26;
  g.add(shell);
  const rim = toonMesh(new THREE.TorusGeometry(0.4, 0.035, 8, 30), mat("#e3d39a", 0.6), false);
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1, 1.12, 1);
  rim.position.y = 0.26;
  g.add(rim);
  // Reason: lighter plates set into the dome read as a turtle's shell from behind, where the camera mostly sees it
  const plateMat = mat("#8fb25a", 0.6);
  const up = new THREE.Vector3(0, 1, 0);
  const plates: [number, number][] = [[0, 0], ...[0, 1, 2, 3, 4, 5].map((i): [number, number] => [(i / 6) * Math.PI * 2, 0.75])];
  for (const [around, tilt] of plates) {
    const normal = new THREE.Vector3(Math.sin(around) * Math.sin(tilt), Math.cos(tilt), Math.cos(around) * Math.sin(tilt));
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.115, 0.03, 6), plateMat);
    plate.position.set(normal.x * 0.4, 0.26 + normal.y * 0.4 * 0.62, normal.z * 0.4 * 1.12);
    plate.quaternion.setFromUnitVectors(up, normal.clone().multiply(new THREE.Vector3(1, 1.5, 1)).normalize());
    g.add(plate);
  }
  // A little head looking the way Tadeo looks, a tail behind and four flippers
  const head = toonMesh(new THREE.SphereGeometry(0.1, 14, 10), skin);
  head.scale.set(0.95, 0.85, 1.1);
  head.position.set(0, 0.3, 0.52);
  g.add(head);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), mat("#22202a", 0.4));
    eye.position.set(side * 0.05, 0.33, 0.61);
    g.add(eye);
    for (const [z, length] of [[0.26, 0.17], [-0.28, 0.13]]) {
      const flipper = toonMesh(new THREE.SphereGeometry(length, 10, 6), skin);
      flipper.scale.set(1, 0.22, 0.6);
      flipper.position.set(side * 0.43, 0.27, z);
      flipper.rotation.y = side * (z > 0 ? -0.5 : 0.5);
      g.add(flipper);
    }
  }
  const tail = toonMesh(new THREE.ConeGeometry(0.04, 0.12, 6), skin);
  tail.rotation.x = -Math.PI / 2;
  tail.position.set(0, 0.26, -0.49);
  g.add(tail);
  g.rotation.x = -0.08;
  return g;
}

export function createOutfit(id: OutfitId): THREE.Group {
  switch (id) {
    case "strawHat":
      return strawHat();
    case "pirateHat":
      return pirateHat();
    case "featherHat":
      return featherHat();
    case "sunglasses":
      return sunglasses();
    case "fishingHat":
      return fishingHat();
    case "crown":
      return crown();
    case "shellHat":
      return shellHat();
  }
}
