/**
 * The festival as a little play: the camera comes down from the stars to the
 * fire, Paco stands up and owns up, the elder forgives him, the gold goes to the
 * village, the plan turns out to be a rocket, Chuleta lays a golden egg, and then
 * it is one long party.
 */

import * as THREE from "three";
import { audio } from "../../audio/Audio";
import { Actor } from "../shared/actor";
import { Shot, shot } from "../shared/director";
import { lootBurst } from "../treasure/fx";
import { Feast } from "./feast";

const FROM_THE_STARS = shot(0, 2.4, 15, 0, 22, -30);
/** Everyone in one picture, the fire in the middle and the night above it. */
const ALL_OF_THEM = shot(0, 4.6, 14.5, 0, 1.5, -2.6);
const PACO_SPOT: [number, number] = [2.6, -0.9];
const ELDER_SPOT: [number, number] = [1.1, -1.5];
/** The camera stays low in the party and looks up, so the fireworks and the people share the frame. */
const PARTY_LOOK = new THREE.Vector3(0, 4.6, -5);
const PARTY_RADIUS = 14.5;

/** Close on one person, looking at the camera, framed above the dialogue box. */
function faceShot(a: Actor, distance = 4.4, side = 1): Shot {
  const p = a.position;
  const h = a.avatar.height;
  return {
    pos: new THREE.Vector3(p.x + side, h * 1.05, p.z + distance),
    look: new THREE.Vector3(p.x + side * 0.15, h * 0.62, p.z),
  };
}

/** Down from the stars to the fire, where everyone is waiting. */
export async function welcome(f: Feast): Promise<void> {
  const s = f.stage;
  s.director.cut(FROM_THE_STARS);
  s.crowd.watch(s.tadeo.position);
  await s.sleep(0.8);
  await s.director.move(ALL_OF_THEM, 3.6);
  f.atWide = true;
  // Reason: no sparkles on Tadeo here: with the fire roaring behind him they would burn him out of the picture
  s.celebrate(0.5, false);
  s.tadeo.avatar.pose = "cheer";
  s.tadeo.jump(6);
  audio.playSfx("sfx_victory_fanfare", 0.6);
  // Reason: lines stay until the player presses Space, so no clock fits them: cheer until the lines are done
  s.crowd.cheer(Infinity);
  await s.ui.say("festival_opening");
  // Reason: a 0.01 s cheer ends on the next frame, before Paco gets his own pose, so the end can't reset it
  s.crowd.cheer(0.01);
  f.atWide = false;
  s.tadeo.avatar.pose = "normal";

  // Paco gets up from his bench: he has something to say
  const paco = f.paco;
  const seat = s.crowd.watchers.find((w) => w.actor === paco)!;
  seat.sitting = false;
  paco.avatar.pose = "normal";
  paco.ground = () => 0;
  paco.shadow.visible = true;
  audio.stopMusic(1.4);
  s.crowd.watch(paco.position);
  await paco.walkTo(PACO_SPOT[0], PACO_SPOT[1], 1.6);
  paco.face(Math.atan2(-0.1, 1));
  s.tadeo.faceTo(PACO_SPOT[0], PACO_SPOT[1]);
  s.crowd.watch(new THREE.Vector3(PACO_SPOT[0], 0, PACO_SPOT[1]));
  await s.sleep(0.5);
}

/** The conversation, one beat per line. */
export async function talk(f: Feast): Promise<void> {
  const s = f.stage;
  const { paco, chest, hen, egg, plan } = f;
  const elder = s.crowd.sages.elder;
  const t = s.tadeo;
  const ogreHead = f.ogre.head.getWorldPosition(new THREE.Vector3());
  // Reason: from the fire side, a little below his chin, so the big face looks down on the camera
  const ogreShot = shot(ogreHead.x + 4.2, 1.9, ogreHead.z + 5.4, ogreHead.x, ogreHead.y - 0.3, ogreHead.z);
  const treasureTop = chest.group.position.clone().add(new THREE.Vector3(0, 0.9, 0.1));

  /** The camera moves to a speaker; Tadeo is looked at from his left, like the talk has always done. */
  const onTadeo = () => void s.director.move(faceShot(t, 4.2, -1), 0.8);
  const onPaco = () => void s.director.move(faceShot(paco, 3.6), 1.4);
  /** The elder, with the plan above Tadeo's head still in the corner of the picture. */
  const onElderWithPlan = () => void s.director.move(shot(3, 2.3, 9, 0.2, 1.9, 0), 1.2);

  // One beat per line of `festival_talk`, in the order the design gives them
  const beats: (() => void)[] = [
    // 0 Paco: the pirate was me
    () => {
      paco.avatar.pose = "talk";
      void s.director.move(faceShot(paco), 1.6);
    },
    // 1 Erzähler: it is quiet at the fire. Nobody moves, the camera takes in everyone
    () => {
      paco.avatar.pose = "normal";
      void s.director.move(ALL_OF_THEM, 1.6);
    },
    // 2 Tadeo: But you are my friend
    () => {
      t.avatar.pose = "talk";
      onTadeo();
    },
    // 3 Paco: young and silly, sorry
    () => {
      t.avatar.pose = "normal";
      paco.avatar.pose = "talk";
      f.bow = 1;
      onPaco();
    },
    // 4 Paco: the heart shone so nicely
    () => {},
    // 5 Paco: so he froze it and buried it
    () => {},
    // 6 Tadeo: the shark!
    () => {
      paco.avatar.pose = "normal";
      t.avatar.pose = "talk";
      onTadeo();
    },
    // 7 Paco: yes, and I was ashamed
    () => {
      t.avatar.pose = "normal";
      paco.avatar.pose = "talk";
      onPaco();
    },
    // 8 Paco: only the key
    () => {},
    // 9 Paco: the message in the bottle too
    () => {},
    // 10 Tadeo: P for Paco!
    () => {
      paco.avatar.pose = "normal";
      t.avatar.pose = "cheer";
      t.jump(6);
      f.henPose.flap = 1;
      t.face(Math.atan2(0.3, 1));
      onTadeo();
    },
    // 11 Tadeo: that is why you always said Hm, hm
    () => t.jump(5),
    // 12 Paco: I was too old to go myself
    () => {
      t.avatar.pose = "normal";
      f.henPose.flap = 0;
      paco.avatar.pose = "talk";
      onPaco();
    },
    // 13 Elder: you sent us Tadeo
    () => {
      t.avatar.pose = "normal";
      paco.avatar.pose = "normal";
      elder.avatar.pose = "talk";
      void elder.walkTo(ELDER_SPOT[0], ELDER_SPOT[1], 1.5).then(() => elder.faceTo(paco.position.x, paco.position.z));
      paco.faceTo(ELDER_SPOT[0], ELDER_SPOT[1]);
      f.bow = 0;
      audio.playMusic("music_village", 2);
      s.crowd.cheer(2.4);
      void s.director.move(shot(2.9, 2.1, 4.7, 1.8, 1.15, -1.2), 1.5);
    },
    // 14 Elder: and you told the truth
    () => {},
    // 15 Tadeo: the gold is for the village
    () => {
      elder.avatar.pose = "normal";
      paco.face(0);
      elder.face(0);
      t.avatar.pose = "talk";
      // Reason: half towards the chest and half towards the camera; turned all the way, only the back of his head would speak
      t.face(0.8);
      chest.open();
      chest.showGold();
      audio.playSfx("sfx_chest_open", 0.8, 1.2);
      // Reason: not too far: the loot must not land around Chuleta, where a golden egg has to stand out in a moment
      lootBurst(f.coins, f.gems, treasureTop, 90, 30, 0.7);
      s.crowd.cheer(3);
      void s.director.move(shot(0.7, 3, 10.4, 1.5, 0.9, 1.2), 1.2);
    },
    // 16 Oger: and me? Is there cake?
    () => {
      t.avatar.pose = "normal";
      f.ogre.setPose("wave");
      void s.director.move(ogreShot, 1.2);
    },
    // 17 Tadeo: this was in the chest too
    () => {
      f.ogre.setPose("sit");
      chest.endBeam();
      plan.visible = true;
      audio.playSfx("sfx_menu_confirm", 0.8, 0.8);
      t.avatar.pose = "holdUp";
      t.face(0);
      s.sparkleAt(t.position.clone().add(new THREE.Vector3(0, 1.6, 0.6)), 40, "#bfe0ff", 2);
      void s.director.move(shot(0, 1.5, t.position.z + 6, 0, 1.25, t.position.z), 1.2);
    },
    // 18 Elder: show me... a plan for a rocket
    () => {
      elder.avatar.pose = "talk";
      elder.faceTo(t.position.x, t.position.z);
      onElderWithPlan();
    },
    // 19 Tadeo: a rocket?
    () => {
      elder.avatar.pose = "normal";
      void s.director.move(shot(0, 1.5, t.position.z + 6, 0, 1.25, t.position.z), 1);
    },
    // 20 Elder: an old legend of a rocket
    () => {
      elder.avatar.pose = "talk";
      onElderWithPlan();
    },
    // 21 Tadeo: another world?
    () => {
      elder.avatar.pose = "normal";
      void s.director.move(shot(0, 1.5, t.position.z + 6, 0, 1.25, t.position.z), 1);
    },
    // 22 Elder: a story for another time
    () => {
      elder.avatar.pose = "talk";
      onElderWithPlan();
    },
    // 23 Chuleta: a golden egg
    () => {
      elder.avatar.pose = "normal";
      plan.visible = false;
      t.avatar.pose = "normal";
      hen.cluck(0.8);
      hen.kick(1);
      f.henPose.flap = 1;
      egg.visible = true;
      audio.playSfx("sfx_item_get", 0.8);
      s.sparkleAt(egg.position.clone().add(new THREE.Vector3(0, 0.2, 0)), 50, "#ffd75e", 2.4);
      // Reason: from a little to the left, or Tadeo's side would fill the right of the frame
      void s.director.move(shot(egg.position.x - 0.5, 0.95, egg.position.z + 2.4, egg.position.x - 0.55, 0.3, egg.position.z), 0.9);
    },
    // 24 Erzähler: the volcano sleeps, and Tadeo looks up at the stars
    () => {
      f.henPose.flap = 0;
      const stock = t.overlay;
      t.overlay = (h, dt) => {
        stock?.(h, dt);
        h.head.rotation.x = -0.5;
      };
      t.face(Math.atan2(0.3, 1));
      void s.director.move(faceShot(t, 4.2, -1), 1.2);
    },
  ];

  const tadeoOverlay = t.overlay;
  let line = 0;
  s.ui.dialogue.onLine = () => {
    const beat = beats[line++];
    if (!beat) return;
    beat();
    f.beatsFired++;
  };
  await s.ui.say("festival_talk");
  s.ui.dialogue.onLine = null;
  t.overlay = tadeoOverlay;
  f.henPose.flap = 0;
}

/** Endless celebration under the end card: hops, confetti, coin showers, fireworks. */
export async function party(f: Feast): Promise<void> {
  const s = f.stage;
  const t = s.tadeo;
  f.phase = "party";
  f.fireworks.auto = true;
  audio.playMusic("music_victory");
  let orbit = 0;
  s.director.track((): Shot => {
    orbit += 1 / 60;
    const a = Math.sin(orbit * 0.14) * 0.34;
    return { pos: new THREE.Vector3(Math.sin(a) * PARTY_RADIUS, 1.9, -2.5 + Math.cos(a) * PARTY_RADIUS), look: PARTY_LOOK };
  }, 2);
  let beat = 0;
  while (!f.disposed) {
    await s.sleep(1.7);
    beat++;
    // Reason: Tadeo keeps turning to face the orbiting camera so he is never seen from behind for long
    t.faceTo(s.camera.position.x, s.camera.position.z);
    t.avatar.pose = "cheer";
    t.jump(5 + Math.random() * 1.5);
    f.ogre.setPose(beat % 2 ? "wave" : "sit");
    f.fox.hop();
    f.henPose.flap = beat % 2;
    if (beat % 3 === 0) s.celebrate(0.6);
    if (beat % 4 === 1) lootBurst(f.coins, f.gems, f.chest.group.position.clone().add(new THREE.Vector3(0, 0.9, 0.1)), 24, 8, 0.7);
    if (beat % 2 === 0) s.sparkleAt(t.position.clone().add(new THREE.Vector3(0, 2.2, 0)), 20, "#ffd75e", 2);
  }
}
