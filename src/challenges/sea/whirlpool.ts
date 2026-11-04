/**
 * The whirlpool: a big swirl of foam arms turning round a dark eye, beside
 * the trail. Sailing into it costs nothing, but it catches the boat, spins it
 * once around and throws it back out, off the trail.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { NOISE_GLSL } from "../../core/glsl";
import { SECTIONS, routeX } from "./route";
import { BoatState, SeaEvent, SeaThing } from "./things";

const VERT = /* glsl */ `
varying vec2 vUv;
#include <fog_pars_vertex>
void main() {
  vUv = uv * 2.0 - 1.0;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
${NOISE_GLSL}
#include <fog_pars_fragment>
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  float a = atan(vUv.y, vUv.x);
  // Reason: the arms curl tighter towards the eye, like water draining away
  float spiral = sin(a * 4.0 + log(max(r, 0.02)) * 7.0 + uTime * 3.0);
  float n = vnoise(vec2(a * 3.0, r * 6.0 - uTime * 1.5)) * 0.5 + vnoise(vUv * 5.0 + uTime * 0.4) * 0.5;
  float arms = smoothstep(0.35, 0.95, spiral + n * 0.5) * smoothstep(0.08, 0.3, r);
  vec3 deep = vec3(0.02, 0.2, 0.4);
  vec3 col = mix(vec3(0.1, 0.55, 0.75), deep, smoothstep(0.75, 0.1, r));
  col = mix(col, vec3(1.0), arms * 0.9);
  float edge = 1.0 - smoothstep(0.7, 1.0, r);
  float alpha = max(arms * 0.95, 0.55 * smoothstep(0.85, 0.2, r)) * edge;
  gl_FragColor = vec4(col, alpha);
  #include <fog_fragment>
}
`;

interface Pool {
  section: number;
  mesh: THREE.Mesh;
  x: number;
  z: number;
  r: number;
  /** The boat is in it now (it catches once each time the boat comes in). */
  inside: boolean;
}

export class Whirlpool implements SeaThing {
  readonly group = new THREE.Group();
  private pools: Pool[] = [];
  private material: THREE.ShaderMaterial;

  constructor(time: { value: number }) {
    this.material = new THREE.ShaderMaterial({
      uniforms: { ...THREE.UniformsUtils.merge([THREE.UniformsLib.fog]), uTime: time },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      fog: true,
    });
    SECTIONS.forEach((sec, section) => {
      if (!sec.whirlpool) return;
      const [dx, z, r] = sec.whirlpool;
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(r * 1.25, 48).rotateX(-Math.PI / 2), this.material);
      const x = routeX(z) + dx;
      mesh.position.set(x, 0.25, z);
      // Reason: drawn after the sea (which writes no depth), like the wake, so the swirl lies on the water
      mesh.renderOrder = 2;
      mesh.userData.ownMaterial = true;
      this.group.add(mesh);
      this.pools.push({ section, mesh, x, z, r, inside: false });
    });
  }

  update(_dt: number, _t: number, boat: BoatState, active: boolean): SeaEvent[] {
    const events: SeaEvent[] = [];
    for (const p of this.pools) {
      p.mesh.visible = Math.abs(p.z - boat.z) < 300;
      const d = Math.hypot(boat.x - p.x, boat.z - p.z);
      if (d > p.r + 2) p.inside = false;
      if (!active || p.inside || d > p.r) continue;
      p.inside = true;
      audio.playSfx("sfx_whirlpool", 0.9);
      events.push({ kind: "spin", center: new THREE.Vector3(p.x, 0, p.z) });
    }
    return events;
  }

  /** The whirlpool's centre nearest to z (for the E2E test). */
  nearest(z: number): [number, number] | null {
    const p = [...this.pools].sort((a, b) => Math.abs(a.z - z) - Math.abs(b.z - z))[0];
    return p ? [p.x, p.z] : null;
  }

  reset(index: number): void {
    for (const p of this.pools) if (p.section >= index) p.inside = false;
  }
}
