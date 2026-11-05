// Wheel corner: an F1-style front wheel on a setup bench, for notebook Chapter 01.
// Build: node build.mjs [--light]. Writes wheel-corner(.light).html next to this file.
// Generic and unbranded. Every number in the readout is illustrative and comes from model() below.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const SKILL = join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit", "iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit", "lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts", "inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- the model (illustrative, labelled as such on the page) ----------
// Degradation rate rises as the rubber thins; lap-time loss is the sum of the per-lap rates.
const MODEL = { maxAge: 40, base: 0.05, growth: 1 / 600, life: 44 };
// rate(n) = base + growth * n  (s/lap);  loss(n) = sum_{i=1..n} rate(i);  depth(n) = 1 - n / life

// ---------- world (1 unit is about 4 mm) ----------
const WIDTH = 600;
const HEIGHT = 420;
const AZ = 98; // axle height above the bench top
const R = 90; // tyre radius (720 mm)
const TW = 76; // tyre width (305 mm)
const RIM = 57; // rim radius (18 inch)
const TOP = AZ + R;

const PLATE = { x: -150, y: -78, w: 320, d: 156, r: 8 };
const PLATE_H = 12;
const FOOT_H = 5;
const PAD = { x: -12, y: -34, w: 100, d: 68, r: 3 };
const PAD_H = 8;

const POSTS = [[-112, -44], [-112, 44]];
const POST_R = 4.2;
const FRAME_TOP = 166;
const UPRIGHT = { x: -26, y: -9, w: 14, d: 18, r: 2 };
const BALL_UP = [-19, 0, AZ + 42];
const BALL_LO = [-19, 0, AZ - 40];
const STEER = [-19, 15, AZ + 6];

const GAUGE_POST = [146, -30];
const GAUGE_TOP = 244;
const DIAL = [38, 0];
const DIAL_R = 15;
const DIAL_Z = 214;
const DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const ARM_Z = 226;
const HOLES = [17, 59]; // wear-indicator holes on the tread top, either side of the gauge
const HOLE_R = 2.4;

const P = k.fitProjection(
  [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -R, AZ], [TW, R, AZ], [TW, 0, TOP], [0, 0, TOP], [GAUGE_POST[0], GAUGE_POST[1], GAUGE_TOP + 3], [-112, 44, FRAME_TOP + 6]],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 36 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], a[2] ?? 0], P) - k.depthOf([b[0], b[1], b[2] ?? 0], P));
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (v) => Math.hypot(...v);
const unit = (v) => v.map((c) => c / len(v));

// A slender rod between two points, with rod-end balls.
function rod(a, b, r, tone = "mid") {
  const F = G.frameAlong(a, unit(sub(b, a)));
  return S(G.disc(0, len(sub(b, a)), r, F, P, { steps: 18 }), { tone, crease: "none" });
}
const ball = (c, r, tone = "mid") => S(G.sphereOf(c, r, P), { tone });

// ---------- bench ----------
function bench() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, PLATE_H, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    out.push(S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }));
  }
  out.push(S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }));
  const screws = k.corners(PLATE, 10);
  out.push(L(screws.map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }));
  out.push(D(screws.map(([x, y]) => at([x, y, 0])), { size: 0.5 }));
  // ruler strip along the front edge
  const strip = { x: -128, y: PLATE.y + PLATE.d - 15, w: 200, d: 7, r: 1 };
  out.push(S(k.slabOf(strip, 0, 0.6, P, 3), { tone: "lo", crease: "none" }));
  const ticks = k.topTicks(strip.x + 4, strip.x + strip.w - 4, 4, 5, strip.y + 0.8, 0.6, [2, 3.6], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(D([at([strip.x + 2, strip.y + 3.5, 0.6]), at([strip.x + strip.w - 2, strip.y + 3.5, 0.6])], { size: 0.45 }));
  // label plate, front right
  const label = { x: 104, y: PLATE.y + PLATE.d - 30, w: 44, d: 20, r: 1.5 };
  out.push(S(k.slabOf(label, 0, 0.8, P, 4), { tone: "lo", crease: "none" }));
  out.push(L(k.planOutline(k.insetPlan(label, 1.6), 0.8, P), { tone: "faint" }));
  [[30, 6], [22, 10], [26, 14]].forEach(([w, y]) => out.push(L(k.lineOnTop([label.x + 5, label.y + y], [label.x + 5 + w, label.y + y], 0.8, P), { tone: "lo", free: true })));
  out.push(D([at([label.x + label.w - 4, label.y + 4, 0.8]), at([label.x + label.w - 4, label.y + label.d - 4, 0.8])], { size: 0.45 }));
  return out.join("");
}

// ---------- scale pad under the tyre ----------
function pad() {
  const out = [];
  out.push(S(k.slabOf(PAD, 0, 3, P, 4, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(k.insetPlan(PAD, 3), 3, PAD_H - 3, P, 4, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(PAD, 8), PAD_H, P, 4), { tone: "faint" }));
  const strip = { x: PAD.x + 8, y: PAD.y + PAD.d - 12, w: PAD.w - 16, d: 5, r: 0.8 };
  out.push(S(k.slabOf(strip, PAD_H, 0.4, P, 3), { tone: "lo", crease: "none" }));
  const t = k.topTicks(strip.x + 3, strip.x + strip.w - 3, 3, 5, strip.y + 0.6, PAD_H + 0.4, [1.4, 2.8], P);
  out.push(L(t.minor, { tone: "lo" }), L(t.major, { tone: "mid" }));
  out.push(D(k.corners(PAD, 6).map(([x, y]) => at([x, y, 3])), { size: 0.45 }));
  // cable gland on the pad's side, with a short lead to the bench
  const gx = PAD.x + PAD.w, gy = PAD.y + 14;
  out.push(S(k.slabOf({ x: gx, y: gy - 3, w: 4, d: 6, r: 1 }, 1.5, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(k.wireSvg(at([gx + 4, gy, 3.5]), at([gx + 30, gy - 6, 0]), { via: [at([gx + 14, gy, 3.5])], tone: "lo", size: 1 }));
  return out.join("");
}

// ---------- the corner jig behind the wheel: posts, wishbones, upright ----------
function jig() {
  const out = [];
  const tie = { x: POSTS[0][0] - 5, y: POSTS[0][1] - 5, w: 10, d: 98, r: 2 };
  out.push(S(k.slabOf(tie, 0, 6, P, 3, 0.4), { tone: "lo" }));
  for (const [x, y] of byDepth(POSTS)) {
    out.push(S(k.cylinder(x, y, POST_R + 2, 6, 3, P, 24), { tone: "mid" }));
    out.push(S(k.cylinder(x, y, POST_R, 9, FRAME_TOP - 9, P, 24), { tone: "mid", crease: "none" }));
    out.push(L([40, 150].map((z) => k.sideArc(x, y, POST_R, z, P, 16)).join(""), { tone: "faint" }));
    for (const z of [BALL_UP[2] - 2, BALL_LO[2] + 2]) {
      out.push(S(k.slabOf({ x: x - 2, y: y - 5, w: 12, d: 10, r: 1.5 }, z - 5, 10, P, 3, 0.4), { tone: "mid" }));
      out.push(D([at([x + 6, y, z + 5])], { size: 0.45 }));
    }
  }
  const bar = { x: POSTS[0][0] - 5, y: POSTS[0][1] - 5, w: 10, d: 98, r: 2 };
  out.push(S(k.slabOf(bar, FRAME_TOP, 6, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([bar.x + 5, bar.y + 4, FRAME_TOP + 6]), at([bar.x + 5, bar.y + bar.d - 4, FRAME_TOP + 6])], { size: 0.45 }));
  // rocker block at the bar's centre for the push rod
  const rocker = [POSTS[0][0] + 4, 0, FRAME_TOP - 4];
  out.push(S(k.slabOf({ x: POSTS[0][0] + 5, y: -5, w: 8, d: 10, r: 1.5 }, FRAME_TOP - 10, 10, P, 3, 0.4), { tone: "mid" }));

  // arms, painted far to near
  const legs = [];
  for (const [x, y] of POSTS) {
    legs.push([[x + 10, y, BALL_UP[2] - 2], BALL_UP, 1.7]);
    legs.push([[x + 10, y, BALL_LO[2] + 2], BALL_LO, 1.9]);
  }
  legs.push([[rocker[0] + 9, 0, rocker[2] - 2], [BALL_LO[0] + 3, 0, BALL_LO[2] + 6], 1.5]); // push rod
  legs.push([[POSTS[1][0] + 10, POSTS[1][1], AZ + 6], STEER, 1.4]); // track rod
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
  const near = (l) => k.depthOf(mid(l[0], l[1]), P);
  for (const [a, b, r] of [...legs].sort((p, q) => near(p) - near(q))) {
    out.push(rod(a, b, r));
    out.push(ball(a, r + 1.1, "mid"));
  }
  // track-rod mount on the near post
  out.push(S(k.slabOf({ x: POSTS[1][0] - 2, y: POSTS[1][1] - 5, w: 12, d: 10, r: 1.5 }, AZ + 1, 10, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([POSTS[1][0] + 6, POSTS[1][1], AZ + 11])], { size: 0.45 }));

  // upright: a tall block with a steering arm and the hub stub
  out.push(S(k.slabOf(UPRIGHT, AZ - 46, 92, P, 3, 0.6), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(UPRIGHT, 2.5), AZ + 46, P, 3), { tone: "faint" }));
  out.push(S(k.slabOf({ x: UPRIGHT.x + 2, y: 6, w: 8, d: 12, r: 1.5 }, AZ + 1, 9, P, 3, 0.4), { tone: "mid" }));
  out.push(ball(BALL_UP, 3), ball(BALL_LO, 3.2), ball(STEER, 2.6));
  const hub = G.frameAlong([UPRIGHT.x + UPRIGHT.w, 0, AZ], [1, 0, 0]);
  out.push(S(G.disc(0, 12, 11, hub, P), { tone: "mid" }));
  return out.join("");
}

// ---------- tyre ----------
// Superellipse section (p = 4): flat sidewalls, rounded shoulders, a flat tread.
const half = TW / 2;
const radiusAt = (s) => {
  const u = Math.min(1, Math.abs((s - half) / half));
  return RIM + (R - RIM) * Math.pow(1 - Math.pow(u, 4), 0.25);
};
const slopeAt = (s) => {
  const u = (s - half) / half;
  const a = Math.min(Math.abs(u), 0.9995);
  const d = -((R - RIM) / half) * Math.pow(1 - Math.pow(a, 4), -0.75) * Math.pow(a, 3) * Math.sign(u);
  return Math.max(-60, Math.min(60, d));
};
const TYRE_F = G.frameOf([0, 0, AZ], [1, 0, 0], [0, 0, 1], [0, 1, 0]); // angle 0 points up, +90° toward +y
const tyreProfile = Array.from({ length: 41 }, (_, i) => {
  const s = half - half * Math.cos((Math.PI * i) / 40);
  return [s, radiusAt(s), i === 0 || i === 40 ? 0 : 1];
});
// the compound ring sits on the outer sidewall where the section is about 78 out
const RING_S = (() => { let s = TW; while (radiusAt(s) < 79 && s > half) s -= 0.05; return s; })();

function tyre() {
  const out = [];
  const body = G.lathe(tyreProfile, TYRE_F, P, { smooth: { slope: slopeAt, radius: radiusAt }, hole: [TW, RIM] });
  out.push(S(body, { tone: "hi", crease: "none" }));
  // compound band (amber = a medium compound, as a convention, not a brand)
  out.push(`<g class="wc-band">${L(G.circleOf(TYRE_F, RING_S, 79, P) + G.circleOf(TYRE_F, RING_S + 0.9, 76.2, P), { tone: "lo" })}</g>`);
  // tread edge seams where the shoulders start, ending on the outline
  out.push(L(G.arcOf(TYRE_F, 12, radiusAt(12), P, { slope: slopeAt(12) }) + G.arcOf(TYRE_F, TW - 12, radiusAt(TW - 12), P, { slope: slopeAt(TW - 12) }), { tone: "faint" }));
  return out.join("");
}

// wear-indicator holes: small dark pits on the tread top, faded by the live code as they wear away
function holes() {
  return HOLES.map((s, i) => {
    const d = k.ring(s, 0, HOLE_R, TOP, P, 20);
    const inner = k.ring(s - 0.5, -0.4, HOLE_R * 0.55, TOP, P, 16);
    return `<g data-hole="${i}"><path class="wc-pit" d="${d}"/><path class="iso-line" data-tone="mid" d="${d}"/><path class="wc-pit-floor" d="${inner}"/></g>`;
  }).join("");
}

// ---------- wheel face ----------
function wheel() {
  const out = [];
  const F = TYRE_F;
  // rim flange over the bead (painted first: its fill covers the opening)
  out.push(S(G.ringBand(TW - 1.2, TW + 1.6, RIM - 1.6, RIM + 2.4, F, P), { tone: "mid" }));
  // rim barrel seen through the bead opening, clipped by it
  out.push(`<clipPath id="wc-well"><path d="${G.circleOf(F, TW, RIM - 1.6, P)}"/></clipPath>`);
  const barrel = G.lathe([[TW - 12, RIM - 1.6], [TW, RIM - 1.6]], F, P, { fill: "facets", rims: "none" });
  const cover = G.disc(TW - 12, TW - 11, RIM - 1.6, F, P);
  out.push(`<g clip-path="url(#wc-well)">${S(barrel, { tone: "lo", crease: "none" })}${S(cover, { tone: "mid", crease: "none" })}`);
  out.push(L(G.circleOf(F, TW - 11, RIM - 5, P) + G.circleOf(F, TW - 11, 30, P), { tone: "faint" }));
  out.push(D(G.dotsOf(F, TW - 11, RIM - 8.5, 16, P, { all: true }), { size: 0.45 }));
  out.push(D(G.dotsOf(F, TW - 11, 26, 8, P, { all: true, phase: 0.2 }), { size: 0.4 }));
  // cooling slots between the two seam rings: closed radial stadiums, so no line ends
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + 0.31;
    const ring = [];
    for (let j = 0; j < 20; j++) {
      const t = (j / 20) * Math.PI * 2;
      const along = 40 + Math.cos(t) * 6.2, side = Math.sin(t) * 1.3;
      ring.push(at(G.pointOf(F, TW - 11, Math.hypot(along, side), a + Math.atan2(side, along))));
    }
    out.push(L("M" + ring.map((p) => p.join(" ")).join("L") + "Z", { tone: "lo" }));
  }
  out.push(`</g>`);
  // hub boss, centre-lock nut (hexagon), nut cap and retaining clip
  out.push(S(G.disc(TW - 11, TW - 2, 15, F, P), { tone: "mid" }));
  out.push(D(G.dotsOf(F, TW - 2, 11.5, 6, P, { all: true }), { size: 0.45 }));
  const hex = Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 10, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 10]);
  out.push(S(G.prismOf(F, hex, TW - 2, TW + 6, P), { tone: "mid" }));
  out.push(S(G.disc(TW + 6, TW + 9, 6, F, P), { tone: "hi", lit: false }));
  out.push(L(G.circleOf(F, TW + 9, 3.2, P), { tone: "lo" }));
  return out.join("");
}

// ---------- the depth gauge on the tread ----------
function gaugeBase() {
  const out = [];
  const [x, y] = GAUGE_POST;
  const mag = { x: x - 16, y: y - 14, w: 30, d: 28, r: 3 };
  out.push(S(k.slabOf(mag, 0, 10, P, 4, 0.8), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(mag, 1), 10, 10, P, 4, 0.8), { tone: "mid" }));
  out.push(L(k.planOutline(k.insetPlan(mag, 3.5), 20, P, 4), { tone: "faint" }));
  const knob = [mag.x + 8, mag.y + mag.d - 7];
  out.push(S(k.cylinder(knob[0], knob[1], 4.5, 20, 3.5, P, 28), { tone: "mid" }));
  out.push(L(k.knurl(knob[0], knob[1], 4.5, 20, 23.5, 28, P), { tone: "lo" }));
  out.push(L(k.lineOnTop(knob, [knob[0] + 4.5, knob[1]], 23.5, P), { tone: "hi", free: "end" }));
  out.push(S(k.cylinder(x, y, 4.6, 20, 3, P, 24), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.8, 23, GAUGE_TOP - 23, P, 24), { tone: "mid", crease: "none" }));
  out.push(L([90, 160].map((z) => k.sideArc(x, y, 2.8, z, P, 14)).join(""), { tone: "faint" }));
  out.push(S(k.cylinder(x, y, 3.4, GAUGE_TOP, 2, P, 24), { tone: "mid" }));
  return out.join("");
}

function gaugeHead() {
  const out = [];
  const [x, y] = GAUGE_POST;
  // clamp on the post and the arm out over the tread
  const clamp = { x: x - 6, y: y - 6, w: 12, d: 12, r: 2 };
  out.push(S(k.slabOf(clamp, ARM_Z - 4, 11, P, 4, 0.5), { tone: "mid" }));
  const thumb = [clamp.x + 6, clamp.y + clamp.d + 3];
  out.push(S(k.slabOf({ x: thumb[0] - 1.3, y: clamp.y + clamp.d, w: 2.6, d: 3, r: 0.8 }, ARM_Z - 2, 4, P, 2), { tone: "mid", crease: "none" }));
  out.push(S(k.cylinder(thumb[0], thumb[1] + 1.2, 2.4, ARM_Z - 3, 6, P, 18), { tone: "mid" }));
  out.push(L(k.knurl(thumb[0], thumb[1] + 1.2, 2.4, ARM_Z - 3, ARM_Z + 3, 16, P), { tone: "lo" }));
  const arm = { x: DIAL[0] + DIAL_R - 2, y: -3, w: clamp.x - DIAL[0] - DIAL_R + 2, d: 6, r: 2 };
  // the arm runs from the dial lug to the clamp along x, at the clamp's y
  const armPlan = { x: arm.x, y: y - 3, w: arm.w, d: 6, r: 2 };
  out.push(S(k.slabOf(armPlan, ARM_Z, 4, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([armPlan.x + 6, y, ARM_Z + 4]), at([armPlan.x + armPlan.w - 5, y, ARM_Z + 4])], { size: 0.45 }));
  // elbow block that steps the arm across to the dial's line
  const elbow = { x: DIAL[0] + DIAL_R - 4, y: y - 4, w: 10, d: -y + 8, r: 2 };
  out.push(S(k.slabOf(elbow, ARM_Z - 1, 6, P, 3, 0.5), { tone: "mid" }));
  out.push(D([at([elbow.x + 5, y + 2, ARM_Z + 5]), at([elbow.x + 5, 2, ARM_Z + 5])], { size: 0.45 }));

  // bridge foot resting on the tread top, either side of the hole the plunger sits in
  const bridge = { x: DIAL[0] - 10, y: -3, w: 20, d: 6, r: 1.2 };
  out.push(S(k.slabOf(bridge, TOP, 2.4, P, 3, 0.4), { tone: "mid" }));
  out.push(D([at([bridge.x + 3, 0, TOP + 2.4]), at([bridge.x + bridge.w - 3, 0, TOP + 2.4])], { size: 0.4 }));
  // plunger barrel from the bridge up to the dial (lit: the part that measures)
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 2.6, TOP + 2.4, 4, P, 20), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], 1.3, TOP + 6.4, DIAL_Z - TOP - 6.4, P, 16), { tone: "hi", crease: "none", lit: true }));
  // dial body
  out.push(S(k.slabOf({ x: DIAL[0] + DIAL_R - 3, y: -3, w: 6, d: 6, r: 1.2 }, DIAL_Z + 1, ARM_Z - DIAL_Z - 1, P, 3, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(DIAL[0], DIAL[1], DIAL_R, DIAL_Z, DIAL_H, P, 64, 0.8), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3, DIAL_TOP, 64, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(DIAL[0], DIAL[1], DIAL_R, DIAL_TOP - 3, P, 40), { tone: "faint" }));
  out.push(L(k.ring(DIAL[0], DIAL[1], DIAL_R - 2, DIAL_TOP, P, 64), { tone: "lo" }));
  const ticks = k.radialTicks(DIAL[0], DIAL[1], DIAL_R - 2.6, 40, 5, DIAL_TOP, [1.1, 2.4], P);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  // crown on the -y side
  out.push(S(k.slabOf({ x: DIAL[0] - 2, y: DIAL[1] - DIAL_R - 4, w: 4, d: 5, r: 1 }, DIAL_Z + 2, 4, P, 3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: DIAL[0] - 3, y: DIAL[1] - DIAL_R - 6.4, w: 6, d: 2.6, r: 1 }, DIAL_Z + 1.2, 5.6, P, 3), { tone: "mid" }));
  out.push(L(k.ring(DIAL[0], DIAL[1], 1.4, DIAL_TOP, P, 14), { tone: "mid" }));
  return out.join("");
}

// needle: 0 = new tyre (full hole depth), sweeps clockwise as the hole gets shallower
const SWEEP = 0.82;
const needleAt = (wear) => {
  const angle = wear * SWEEP * Math.PI * 2;
  return k.lineOnTop([DIAL[0] - Math.sin(angle) * 2.6, DIAL[1] + Math.cos(angle) * 2.6], [DIAL[0] + Math.sin(angle) * (DIAL_R - 3.4), DIAL[1] - Math.cos(angle) * (DIAL_R - 3.4)], DIAL_TOP + 0.2, P);
};

// ---------- assemble ----------
const START = 18;
const halo = `<path class="iso-halo" d="${k.haloOf({ x: -4, y: -40, w: TW + 8, d: 80, r: 30 }, PAD_H, 0.1, P)}" style="filter:blur(5px)"/>`;
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "A front wheel corner on a setup bench. The wheel hangs from an upright on two wishbones, a push rod and a track rod, with the tyre resting on a scale pad. A depth gauge sits on the tread with its plunger in a wear-indicator hole. As the tyre ages the hole gets shallower, the needle turns and the other indicator holes fade away.",
  body: [
    bench(),
    gaugeBase(),
    jig(),
    pad(),
    halo,
    `<g class="wc-rubber">${tyre()}<g data-part="holes">${holes()}</g></g>`,
    wheel(),
    gaugeHead(),
    `<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needleAt(START / MODEL.life)}" style="stroke-width:1.1"/>`,
  ],
});

const live = `
const P = ${JSON.stringify(P)};
const M = ${JSON.stringify(MODEL)};
const DIAL = ${JSON.stringify(DIAL)}, DIAL_R = ${DIAL_R}, DIAL_TOP = ${DIAL_TOP}, SWEEP = ${SWEEP};
const root = document.querySelector("[data-wheel-corner]");
const stage = root.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const needle = svg.querySelector('[data-part="needle"]');
const holes = [...svg.querySelectorAll("[data-hole]")];
const readout = root.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const rate = (n) => M.base + M.growth * n;
const loss = (n) => M.base * n + M.growth * n * (n + 1) / 2;
const needleAt = ${needleAt.toString().replace("k.lineOnTop", "lineOnTop")};
let age = ${START}, target = age, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, shown = "";
// tour: run a stint to ${MODEL.maxAge} laps, hold, fit new tyres, repeat
const STINT = 9, HOLD = 1.6, RESET = 1.2, CYCLE = STINT + HOLD + RESET;
const tourAt = (t) => { const c = t % CYCLE; return c < STINT ? (c / STINT) * M.maxAge : c < STINT + HOLD ? M.maxAge : M.maxAge * (1 - (c - STINT - HOLD) / RESET); };
function draw() {
  const wear = clamp(age / M.life, 0, 1);
  needle.setAttribute("d", needleAt(wear));
  holes.forEach((h, i) => h.setAttribute("opacity", (clamp(1 - wear * (1.08 + i * 0.05), 0, 1) ** 0.8).toFixed(3)));
  const n = Math.round(age);
  const text = "tyre age " + n + " laps · deg " + rate(n).toFixed(2) + " s/lap · +" + loss(n).toFixed(2) + " s";
  if (text !== shown) { readout.textContent = text; shown = text; stage.setAttribute("aria-valuenow", String(n)); stage.setAttribute("aria-valuetext", text + " (illustrative)"); }
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  if (touring) { clock += dt; target = tourAt(clock); }
  age = still.matches ? target : age + (target - age) * (1 - Math.exp(-dt / 0.22));
  if (Math.abs(target - age) < 0.01) age = target;
  draw();
  frame = visible && (touring || age !== target) && !(root.closest(".off")) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const steer = (n) => { touring = false; target = clamp(n, 0, M.maxAge); clearTimeout(idle); idle = setTimeout(() => { touring = !still.matches; clock = (target / M.maxAge) * STINT; run(); }, 3200); run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "80px 0px" }).observe(stage);
stage.addEventListener("pointermove", (e) => { const b = svg.getBoundingClientRect(); steer(clamp(((e.clientX - b.left) / b.width - 0.15) / 0.7, 0, 1) * M.maxAge); });
stage.addEventListener("keydown", (e) => {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
  if (e.key === "Home") steer(0); else if (e.key === "End") steer(M.maxAge); else if (step) steer(Math.round(target) + step); else return;
  e.preventDefault();
});
still.addEventListener("change", () => { touring = !still.matches; run(); });
draw();
`;

const plate = k.plateHtml({
  fig: "Fig 01",
  title: "Tyre wear",
  hint: "Hover to age the tyre",
  readout: `tyre age ${START} laps · deg ${(MODEL.base + MODEL.growth * START).toFixed(2)} s/lap`,
  keys: [
    { mark: "lit", label: "Gauge plunger and needle: what reads the wear" },
    { mark: "raised", label: "Tyre on a scale pad, wheel on its upright" },
  ],
  caption:
    "A depth gauge sits in a wear-indicator hole on the tread. As the tyre ages the hole gets shallower and the needle turns. Numbers are illustrative: a toy model where the degradation rate grows from 0.05 s/lap by 1/600 s each lap.",
  body: `<div class="iso-stage" tabindex="0" role="slider" aria-label="Wheel corner: arrow keys change the tyre age" aria-valuemin="0" aria-valuemax="${MODEL.maxAge}" aria-valuenow="${START}">${svg}</div>`,
});

// Site palette mapped onto the kit's tokens, so the figure follows the portfolio's two themes.
export const SITE_CSS = `
.wc{--anatomy-page:var(--bg);--anatomy-card:var(--paper);--anatomy-paper:var(--paper);--anatomy-text:var(--text2);--anatomy-strong:var(--text);--anatomy-muted:var(--text3);
  --anatomy-mono:"JetBrains Mono",ui-monospace,Menlo,Consolas,monospace;
  --anatomy-hi:color-mix(in srgb,var(--text) 88%,var(--paper));--anatomy-mid:color-mix(in srgb,var(--text) 48%,var(--paper));
  --anatomy-lo:color-mix(in srgb,var(--text) 30%,var(--paper));--anatomy-faint:color-mix(in srgb,var(--text) 16%,var(--paper));
  --anatomy-lit:var(--accent);--anatomy-dot:color-mix(in srgb,var(--text) 80%,var(--paper));--anatomy-red:var(--pink);--anatomy-green:var(--green);--anatomy-blue:var(--accent)}
[data-theme="light"] .wc,.wc[data-theme="light"]{--anatomy-face:#fff;--anatomy-top:#fff;
  --anatomy-shade-0:color-mix(in srgb,var(--text) 13%,var(--paper));--anatomy-shade-1:color-mix(in srgb,var(--text) 9.5%,var(--paper));
  --anatomy-shade-2:color-mix(in srgb,var(--text) 6.5%,var(--paper));--anatomy-shade-3:color-mix(in srgb,var(--text) 3.5%,var(--paper));
  --anatomy-lit-top:#fff;--anatomy-lit-shade:color-mix(in srgb,var(--accent) 10%,var(--paper));--anatomy-halo:var(--text);--anatomy-halo-opacity:.22}
[data-theme="dark"] .wc,.wc[data-theme="dark"]{--anatomy-face:color-mix(in srgb,var(--text) 6%,var(--paper));--anatomy-top:color-mix(in srgb,var(--text) 7%,var(--paper));
  --anatomy-shade-0:color-mix(in srgb,var(--paper),#000 24%);--anatomy-shade-1:color-mix(in srgb,var(--paper),#000 14%);
  --anatomy-shade-2:color-mix(in srgb,var(--paper),#000 6%);--anatomy-shade-3:color-mix(in srgb,var(--text) 3%,var(--paper));
  --anatomy-lit-top:color-mix(in srgb,var(--accent) 22%,var(--paper));--anatomy-lit-shade:color-mix(in srgb,var(--accent) 12%,var(--paper));--anatomy-halo:#000;--anatomy-halo-opacity:.7}
.wc .wc-band .iso-line{stroke:var(--amber);stroke-width:1.4px}
[data-theme="light"] .wc .wc-rubber,.wc[data-theme="light"] .wc-rubber{--anatomy-paper:color-mix(in srgb,var(--text) 72%,var(--paper));--anatomy-top:color-mix(in srgb,var(--text) 62%,var(--paper));
  --anatomy-shade-3:color-mix(in srgb,var(--text) 66%,var(--paper));--anatomy-shade-2:color-mix(in srgb,var(--text) 73%,var(--paper));
  --anatomy-shade-1:color-mix(in srgb,var(--text) 80%,var(--paper));--anatomy-shade-0:color-mix(in srgb,var(--text) 87%,var(--paper));
  --anatomy-faint:color-mix(in srgb,var(--text) 52%,var(--paper));--anatomy-lo:color-mix(in srgb,var(--text) 44%,var(--paper));--anatomy-mid:color-mix(in srgb,var(--text) 38%,var(--paper));--wc-band:color-mix(in srgb,var(--amber),#fff 34%)}
[data-theme="dark"] .wc .wc-rubber,.wc[data-theme="dark"] .wc-rubber{--anatomy-paper:color-mix(in srgb,var(--paper),#000 24%);--anatomy-top:color-mix(in srgb,var(--text) 5%,var(--paper));
  --anatomy-shade-3:color-mix(in srgb,var(--paper),#000 8%);--anatomy-shade-2:color-mix(in srgb,var(--paper),#000 18%);
  --anatomy-shade-1:color-mix(in srgb,var(--paper),#000 28%);--anatomy-shade-0:color-mix(in srgb,var(--paper),#000 38%);
  --anatomy-faint:color-mix(in srgb,var(--text) 16%,#0d0f11);--anatomy-lo:color-mix(in srgb,var(--text) 26%,#0d0f11);--anatomy-mid:color-mix(in srgb,var(--text) 40%,#0d0f11);--wc-band:var(--amber)}
.wc .wc-rubber .wc-band .iso-line{stroke:var(--wc-band)}
.wc .wc-pit{fill:color-mix(in srgb,var(--anatomy-shade-0),#000 45%)}
.wc .wc-pit-floor{fill:var(--anatomy-shade-3);opacity:.5}
`;

const SITE_VARS = `
body[data-theme="light"]{--bg:#f6f5f0;--paper:#fffefa;--text:#16191f;--text2:#4a505a;--text3:#737985;--line2:rgba(22,25,31,.16);--accent:#1d4ed8;--pink:#c8324b;--green:#2f7d5b;--amber:#a86a12}
body[data-theme="dark"]{--bg:#161a1d;--paper:#1e2327;--text:#ecebe4;--text2:#b3b6b8;--text3:#84898d;--line2:rgba(236,235,228,.16);--accent:#8db4ff;--pink:#ff8f8f;--green:#7fcf9f;--amber:#e3b56a}
body{background:var(--bg)}
.wc-toggle{font:500 12px/1 "JetBrains Mono",ui-monospace,monospace;color:var(--text2);background:var(--paper);border:1px solid var(--line2);border-radius:999px;padding:8px 14px;cursor:pointer;margin-bottom:16px}
.wc-mini{max-width:340px;margin-top:40px}
.wc-mini p{font:12px/1.4 "JetBrains Mono",monospace;color:var(--text3);margin:0 0 8px}
`;

// ---------- embed fragment for index.html (notebook Chapter 01, right page) ----------
if (process.argv.includes("--embed")) {
  // crop the viewBox to the drawing, padded out to the page frame's 16:10
  const pts = [...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0), [0, -R, AZ], [TW, R, AZ], [TW, 0, TOP], [0, 0, TOP], [GAUGE_POST[0], GAUGE_POST[1], GAUGE_TOP + 3], [-112, -44, FRAME_TOP + 6], [-112, 44, FRAME_TOP + 6], [DIAL[0], -DIAL_R, DIAL_TOP]].map(at);
  let [x0, y0, x1, y1] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  const padX = 10, padTop = 8, padBottom = 26; // room under the bench for the caption chip
  x0 -= padX; x1 += padX; y0 -= padTop; y1 += padBottom;
  let w = x1 - x0, h = y1 - y0;
  if (w / h < 1.6) { const nw = h * 1.6; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / 1.6; y0 -= (nh - h) / 2; h = nh; }
  const vb = [x0, y0, w, h].map((v) => Math.round(v * 10) / 10).join(" ");
  const figure = svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`).replace("<svg ", '<svg preserveAspectRatio="xMidYMid meet" ');
  const cam = k.cameraOf(P);
  const startText = `${START} laps · deg ${(MODEL.base + MODEL.growth * START).toFixed(2)} s/lap · illustrative`;
  const EMBED_CSS = `[data-wheel-corner] .art-cap{white-space:nowrap}@media (max-width:420px){[data-wheel-corner] .art-cap{font-size:.6rem}}.pg-art .wc{position:absolute;inset:0}.pg-art .wc .iso-stage{position:absolute;inset:0;outline:none}.pg-art .wc .iso-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--accent);border-radius:8px}.pg-art .wc svg{width:100%;height:100%;display:block}`;
  const script = `(function(){
  var root = document.querySelector("[data-wheel-corner]"); if (!root) return;
  var stage = root.querySelector(".iso-stage"), svg = stage.querySelector("svg"), needle = svg.querySelector('[data-part="needle"]');
  var holes = [].slice.call(svg.querySelectorAll("[data-hole]")), cap = root.querySelector("[data-readout]"), face = root.closest(".face");
  var M = ${JSON.stringify(MODEL)}, still = typeof reduce !== "undefined" ? reduce : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var OX = ${P.origin[0]},OY = ${P.origin[1]}, SA = ${cam.sinA}, CA = ${cam.cosA}, SE = ${cam.sinE}, CE = ${cam.cosE}, K = ${cam.k};
  var DX = ${DIAL[0]}, DY = ${DIAL[1]}, RN = ${DIAL_R - 3.4}, Z = ${DIAL_TOP + 0.2}, SWEEP = ${SWEEP};
  function pt(x, y){ return (OX + (x * SA - y * CA) * K).toFixed(1) + " " + (OY + ((x * CA + y * SA) * SE - Z * CE) * K).toFixed(1); }
  function clamp(v, a, b){ return Math.min(b, Math.max(a, v)); }
  function rate(n){ return M.base + M.growth * n; }
  var age = ${START}, target = age, frame = 0, last = 0, clock = 0, touring = !still, visible = false, idle = 0, shown = "";
  var STINT = 9, HOLD = 1.6, RESET = 1.2, CYCLE = STINT + HOLD + RESET;
  function tourAt(t){ var c = t % CYCLE; return c < STINT ? c / STINT * M.maxAge : c < STINT + HOLD ? M.maxAge : M.maxAge * (1 - (c - STINT - HOLD) / RESET); }
  function open(){ return visible && !(face && face.classList.contains("off")); }
  function draw(){
    var wear = clamp(age / M.life, 0, 1), a = wear * SWEEP * Math.PI * 2, s = Math.sin(a), c = Math.cos(a);
    needle.setAttribute("d", "M" + pt(DX - s * 2.6, DY + c * 2.6) + "L" + pt(DX + s * RN, DY - c * RN));
    holes.forEach(function(h, i){ h.setAttribute("opacity", Math.pow(clamp(1 - wear * (1.08 + i * 0.05), 0, 1), 0.8).toFixed(3)); });
    var n = Math.round(age), text = n + " laps · deg " + rate(n).toFixed(2) + " s/lap · illustrative";
    if (text !== shown){ cap.textContent = text; shown = text; stage.setAttribute("aria-valuenow", String(n)); stage.setAttribute("aria-valuetext", "tyre age " + n + " laps, degradation " + rate(n).toFixed(2) + " seconds per lap (illustrative)"); }
  }
  function tick(now){
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now;
    if (touring){ clock += dt; target = tourAt(clock); }
    age = still ? target : age + (target - age) * (1 - Math.exp(-dt / 0.22));
    if (Math.abs(target - age) < 0.01) age = target;
    draw();
    frame = open() && (touring || age !== target) ? requestAnimationFrame(tick) : 0;
  }
  function run(){ if (!frame && open()){ last = 0; frame = requestAnimationFrame(tick); } }
  function steer(n){ touring = false; target = clamp(n, 0, M.maxAge); clearTimeout(idle); idle = setTimeout(function(){ touring = !still; clock = target / M.maxAge * STINT; run(); }, 3200); run(); }
  new IntersectionObserver(function(e){ visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
  if (face) new MutationObserver(run).observe(face, { attributes: true, attributeFilter: ["class"] });
  stage.addEventListener("pointermove", function(e){ var b = svg.getBoundingClientRect(); steer(clamp(((e.clientX - b.left) / b.width - 0.15) / 0.7, 0, 1) * M.maxAge); });
  stage.addEventListener("keydown", function(e){
    var step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 5, PageDown: -5 }[e.key];
    if (e.key === "Home") steer(0); else if (e.key === "End") steer(M.maxAge); else if (step) steer(Math.round(target) + step); else return;
    e.preventDefault();
  });
  draw();
})();`;
  const fragment = `<div class="pg-art" data-wheel-corner><div class="iso wc"><div class="iso-stage" tabindex="0" role="slider" aria-label="Wheel corner with a tyre depth gauge: hover or use the arrow keys to change the tyre age (illustrative numbers)" aria-valuemin="0" aria-valuemax="${MODEL.maxAge}" aria-valuenow="${START}">${figure}</div></div><span class="art-cap" data-readout>${startText}</span></div>`;
  writeFileSync(join(HERE, "embed.css"), k.ISO_CSS.trim() + "\n" + SITE_CSS.trim() + "\n" + EMBED_CSS + "\n");
  writeFileSync(join(HERE, "embed.html"), fragment);
  writeFileSync(join(HERE, "embed.js"), script);
  console.log("wrote embed.css, embed.html, embed.js · viewBox", vb);
  process.exit(0);
}

const toggle = `<button class="wc-toggle" type="button" onclick="const b=document.body;b.dataset.theme=b.dataset.theme==='light'?'dark':'light'">Switch theme</button>`;
const body = `<style>@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap");${SITE_VARS}${SITE_CSS}</style>${toggle}<div class="wc" data-wheel-corner>${plate}</div>`;
const file = theme === "light" ? "wheel-corner-light.html" : "wheel-corner.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Wheel corner", theme, body: body.replace('class="wc"', 'class="wc"'), script: kitScript() + live }));
console.log("wrote", file);
