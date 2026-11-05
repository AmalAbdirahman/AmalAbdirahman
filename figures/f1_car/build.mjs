// F1 car: a generic, unbranded modern car that comes apart on hover, for notebook Chapter 01.
// Build: node build.mjs [--light]. Writes f1-car(-light).html next to this file.
// No team names, sponsors or logos. Proportions are approximate; tyre numbers are illustrative.
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const SKILL = join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit", "iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit", "lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts", "inline-kit.mjs")).href);
const { tubePieces, tubeSvg } = await import(pathToFileURL(join(SKILL, "kit", "tube.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

// ---------- world: 1 unit is about 20 mm; x forward (nose at +x), y to the car's left, z up ----------
const WIDTH = 640;
const HEIGHT = 340;
const R = 18; // tyre radius (720 mm)
const RIM = 11.4; // 18 inch rim
const FRONT_X = 100, REAR_X = -80; // 3.6 m wheelbase
const FRONT_W = 15, REAR_W = 20; // 305 mm and 405 mm tyres
const TRACK = 50; // outer tyre faces at y = +-50 (2 m wide)

// illustrative tyre model, the same one the wheel-corner figure uses
const MODEL = { age: 18, base: 0.05, growth: 1 / 600 };
const rateAt = (n) => MODEL.base + MODEL.growth * n;

// where each assembly goes when the car comes apart (world units) and in what order
const EXPLODE = {
  floor: { dir: [0, 0, -14], delay: 0.0, name: "floor" },
  wheelRL: { dir: [0, -24, 0], delay: 0.05, name: "rear-right wheel" },
  wheelFL: { dir: [0, -24, 0], delay: 0.08, name: "front-right wheel" },
  podFar: { dir: [0, -26, 0], delay: 0.12, name: "sidepods" },
  rearWing: { dir: [-38, 0, 10], delay: 0.16, name: "rear wing" },
  gearbox: { dir: [-18, 0, 40], delay: 0.2, name: "gearbox" },
  pu: { dir: [28, 0, 74], delay: 0.24, name: "power unit" },
  nose: { dir: [22, 0, 6], delay: 0.28, name: "nose" },
  halo: { dir: [0, 0, 30], delay: 0.32, name: "halo" },
  podNear: { dir: [0, 26, 0], delay: 0.12, name: "sidepods" },
  wheelRR: { dir: [0, 24, 0], delay: 0.05, name: "rear-left wheel" },
  wheelFR: { dir: [0, 24, 0], delay: 0.08, name: "front-left wheel" },
  frontWing: { dir: [48, 0, 0], delay: 0.36, name: "front wing" },
};

// fit to the car at rest and fully apart
const reach = [];
const boxPts = (x0, x1, y0, y1, z0, z1) => { for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) reach.push([x, y, z]); };
boxPts(-138, 146, -TRACK, TRACK, 0, 50);
boxPts(-138 - 38, -110, -40, 40, 20, 60); // rear wing apart
boxPts(-27, 18, -12, 12, 74, 106); // power unit apart
boxPts(146, 194, -48, 48, 2, 14); // front wing apart
boxPts(-100, 118, -TRACK - 24, TRACK + 24, 0, 2 * R); // wheels apart
boxPts(-100, 75, -46, 46, -12, -10); // floor apart
const P = k.fitProjection(reach, WIDTH, HEIGHT, { pad: 18, azimuth: 58 });

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (points, style) => k.dotsSvg(points, style);
const V = G.viewOf(P);
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const len = (v) => Math.hypot(v[0], v[1], v[2]);
const unit = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const depth = (p) => k.depthOf(p, P);
const mean = (pts) => pts.reduce((a, p) => add(a, p), [0, 0, 0]).map((c) => c / pts.length);

// ---------- loft: a solid through convex cross-sections, shaded by the kit's light ----------
// section(x, yc, hw, z0, z1): a rounded (superellipse) section in the y-z plane at station x
const N = 28;
function section(x, yc, hw, z0, z1, n = 3.2) {
  const zc = (z0 + z1) / 2, hh = (z1 - z0) / 2, e = 2 / n;
  return Array.from({ length: N }, (_, i) => {
    const t = (i / N) * Math.PI * 2, c = Math.cos(t), s = Math.sin(t);
    return [x, yc + hw * Math.sign(c) * Math.abs(c) ** e, zc + hh * Math.sign(s) * Math.abs(s) ** e];
  });
}
function faceInto(pts, centre, bins) {
  let n = [0, 0, 0];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    n = add(n, [(a[1] - b[1]) * (a[2] + b[2]), (a[2] - b[2]) * (a[0] + b[0]), (a[0] - b[0]) * (a[1] + b[1])]);
  }
  if (len(n) < 1e-9) return;
  if (dot(n, sub(mean(pts), centre)) < 0) n = n.map((c) => -c);
  n = unit(n);
  if (dot(n, V) <= 1e-4) return;
  const d = k.pathOf(pts.map(at), true);
  if (n[2] > 0.8) bins.top.push(d);
  else bins.shades[Math.max(0, Math.min(3, G.toneOf(n, P) - 1))].push(d);
}
function loft(rings, { caps = true } = {}) {
  const all = rings.flat();
  const centre = mean(all);
  const bins = { top: [], shades: [[], [], [], []] };
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < N; j++) {
      const a = rings[i][j], b = rings[i][(j + 1) % N], c = rings[i + 1][(j + 1) % N], d = rings[i + 1][j];
      faceInto([a, b, c, d], centre, bins);
    }
  if (caps) { faceInto(rings[0], centre, bins); faceInto(rings[rings.length - 1], centre, bins); }
  const hull = k.pathOf(G.hullOf(all.map(at)), true);
  return { fill: hull, outline: hull, top: bins.top.join(""), shades: bins.shades.map((a) => a.join("")), crease: "", seamless: true };
}
// a thin flat element (wing plane, endplate, strake) as a box between two corners
const box = (x0, x1, y0, y1, z0, z1, r = 0.6, bevel = 0) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 3, bevel);
// a slender rod with rod-end balls
const rod = (a, b, r, tone = "mid") => S(G.disc(0, len(sub(b, a)), r, G.frameAlong(a, unit(sub(b, a))), P, { steps: 14 }), { tone, crease: "none" });
const ball = (c, r, tone = "mid") => S(G.sphereOf(c, r, P), { tone });
// a profile plate standing in the x-z plane, thickness along y (fins, pylons)
const plateXZ = (poly, y0, y1) => G.prismOf(G.frameOf([0, y0, 0], [0, 1, 0], [1, 0, 0], [0, 0, 1]), poly, 0, y1 - y0, P);
// line along the top of a loft at a ring index, visible part only
const sortBy = (items, key) => [...items].sort((a, b) => key(a) - key(b));

// ---------- the parts ----------
// FLOOR: a carbon plate with edge fences and a diffuser between the rear wheels
function floor() {
  const half = [[78, 0], [76, 12], [44, 24], [26, 44], [-58, 44], [-66, 36], [-70, 28], [-100, 28], [-102, 0]];
  const ring = [...half, ...half.slice(1, -1).reverse().map(([x, y]) => [x, -y])];
  const out = [];
  out.push(S(k.extrude(ring, 2, 1.2, P, { convex: false, bevel: 0.4 }), { tone: "mid" }));
  out.push(L(k.onTop(ring.map(([x, y]) => [x * 0.985 - 0.5, y * 0.9]), 3.2, P, true), { tone: "faint" }));
  // plank seam down the centre line
  out.push(L(k.lineOnTop([76, 0], [-100, 0], 3.2, P), { tone: "faint" }));
  // edge fences near the floor's leading edge
  for (const side of [-1, 1]) for (const y of [16, 20, 24]) out.push(S(box(42, 60, side * y - 0.4, side * y + 0.4, 3.2, 7.5, 0.2), { tone: "mid", crease: "none" }));
  // diffuser: roof plus strakes, drawn far to near
  out.push(S(box(-102, -84, -27, 27, 9, 10.2, 0.8, 0.3), { tone: "mid" }));
  for (const y of sortBy([-21, -13, -5, 5, 13, 21], (y) => depth([-93, y, 6]))) out.push(S(box(-101, -85, y - 0.4, y + 0.4, 3.2, 9, 0.2), { tone: "mid", crease: "none" }));
  return out.join("");
}

// TYRES and WHEELS: superellipse tyre section, rim flange, wheel cover, centre nut
function tyreParts(cx, side, W, near) {
  const half = W / 2;
  const radiusAt = (s) => RIM + (R - RIM) * Math.pow(1 - Math.pow(Math.min(1, Math.abs((s - half) / half)), 4), 0.25);
  const slopeAt = (s) => { const u = (s - half) / half, a = Math.min(Math.abs(u), 0.9995); return Math.max(-60, Math.min(60, -((R - RIM) / half) * Math.pow(1 - a ** 4, -0.75) * a ** 3 * Math.sign(u))); };
  const yIn = side * (TRACK - W);
  const F = G.frameOf([cx, yIn, R], [0, side, 0], [0, 0, 1], [1, 0, 0]);
  const prof = Array.from({ length: 33 }, (_, i) => { const s = half - half * Math.cos((Math.PI * i) / 32); return [s, radiusAt(s), i === 0 || i === 32 ? 0 : 1]; });
  const face = near ? W : 0; // the face the viewer sees
  const inward = near ? -1 : 1; // into the wheel from that face
  const out = [];
  out.push(`<g class="wc-rubber">`);
  out.push(S(G.lathe(prof, F, P, { smooth: { slope: slopeAt, radius: radiusAt }, hole: [face, RIM] }), { tone: "hi", crease: "none" }));
  let ringS = face; while (radiusAt(ringS) < 15 && Math.abs(ringS - half) > 0.1) ringS += inward * 0.02;
  out.push(`<g class="wc-band">${L(G.circleOf(F, ringS, 15, P), { tone: "lo" })}</g>`);
  out.push(`</g>`);
  out.push(S(G.ringBand(face - 0.4, face + 0.4, RIM - 0.6, RIM + 0.9, F, P), { tone: "mid" }));
  const id = `cf-well-${near ? "n" : "f"}${cx > 0 ? "f" : "r"}`;
  out.push(`<clipPath id="${id}"><path d="${G.circleOf(F, face, RIM - 0.6, P)}"/></clipPath><g clip-path="url(#${id})">`);
  const s0 = face + inward * 3, s1 = face + inward * 2.6;
  out.push(S(G.lathe([[Math.min(face, s0), RIM - 0.6], [Math.max(face, s0), RIM - 0.6]], F, P, { fill: "facets", rims: "none" }), { tone: "lo", crease: "none" }));
  out.push(S(G.disc(Math.min(s0, s1), Math.max(s0, s1), RIM - 0.6, F, P), { tone: "mid", crease: "none" }));
  out.push(L(G.circleOf(F, s1, RIM - 2.4, P), { tone: "faint" }));
  out.push(D(G.dotsOf(F, s1, RIM - 3.4, 10, P, { all: true }), { size: 0.35 }));
  out.push(`</g>`);
  if (near) {
    const hex = Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3 + Math.PI / 6) * 2.4, Math.sin((i * Math.PI) / 3 + Math.PI / 6) * 2.4]);
    out.push(S(G.disc(s1, face - 0.6, 4, F, P), { tone: "mid" }));
    out.push(S(G.prismOf(F, hex, face - 0.6, face + 1.2, P), { tone: "mid" }));
    out.push(L(G.circleOf(F, face + 1.2, 1, P), { tone: "lo" }));
  } else {
    // brake duct drum seen from the inside of the far wheel
    out.push(S(G.disc(s1, face + 1.6, 6, F, P), { tone: "mid" }));
    out.push(L(G.circleOf(F, face + 1.6, 3.6, P), { tone: "faint" }));
  }
  return out.join("");
}

// SIDEPODS: lofted pods with a dark inlet, one per side
function pod(side) {
  const y = (v) => side * v;
  const rings = [section(30, y(30), 9.5, 9, 25), section(22, y(31), 11, 7.5, 27), section(6, y(30), 12, 6.5, 27), section(-18, y(26), 10, 6, 22), section(-44, y(19), 6, 6, 14)];
  const out = [S(loft(rings), { tone: "hi", crease: "none" })];
  // inlet: a dark rounded opening on the front face, with a lip line
  const lip = section(30.2, y(30), 7.6, 11, 23.4).map((p) => p);
  out.push(`<path class="cf-void" d="${k.pathOf(lip.map(at), true)}"/>`);
  out.push(L(k.pathOf(lip.map(at), true), { tone: "mid" }));
  // cooling louvres on top, near the rear (closed slots)
  for (let i = 0; i < 4; i++) {
    const x = -6 - i * 5;
    const slot = [[x, y(23)], [x - 2.4, y(23)], [x - 2.4, y(33)], [x, y(33)]];
    out.push(L(k.onTop(slot, 25.2 - i * 0.9, P, true), { tone: "lo" }));
  }
  return out.join("");
}

// CHASSIS (static): tub, cockpit, engine cover, airbox, fin, mirrors
const TUB = [section(-12, 0, 19, 6, 35), section(18, 0, 18.5, 6, 34), section(48, 0, 15, 7, 30), section(70, 0, 12, 8, 26)];
const COVER = [section(-12, 0, 16.5, 6, 41), section(-30, 0, 14, 6, 37), section(-56, 0, 10, 6, 29), section(-86, 0, 4.5, 8, 19)];
function chassis() {
  const out = [];
  out.push(S(loft(COVER), { tone: "hi", crease: "none" }));
  // shark fin along the cover's spine
  out.push(S(plateXZ([[-14, 40], [-14, 46], [-60, 31], [-80, 22], [-80, 20]], -0.4, 0.4), { tone: "mid", crease: "none" }));
  // airbox and roll hoop above the driver's head
  const air = [section(-16, 0, 6, 38, 48, 2.6), section(-6, 0, 6.5, 38, 49, 2.6), section(0, 0, 5.5, 39, 47.5, 2.6)];
  out.push(S(loft(air), { tone: "hi", crease: "none" }));
  const mouth = section(0.2, 0, 3.8, 41, 46, 2.6);
  out.push(`<path class="cf-void" d="${k.pathOf(mouth.map(at), true)}"/>`, L(k.pathOf(mouth.map(at), true), { tone: "mid" }));
  out.push(S(loft(TUB), { tone: "hi", crease: "none" }));
  // cockpit opening and headrest
  const topAt = (x) => (x > 18 ? 34 - ((x - 18) / 30) * 4 : 34.6);
  const opening = Array.from({ length: 40 }, (_, i) => { const t = (i / 40) * Math.PI * 2; const x = 26 + 16 * Math.cos(t), yy = 10 * Math.sin(t) * (x < 26 ? 1 : 0.85); return [x, yy, topAt(x) + 0.2]; });
  out.push(`<path class="cf-void" d="${k.pathOf(opening.map(at), true)}"/>`, L(k.pathOf(opening.map(at), true), { tone: "mid" }));
  // steering wheel rim glimpsed in the opening
  out.push(L(k.pathOf(Array.from({ length: 13 }, (_, i) => { const t = Math.PI * (i / 12); return at([37, 4.2 * Math.cos(t), 30 + 3 * Math.sin(t)]); })), { tone: "lo", free: true }));
  // headrest pads either side of the opening's rear
  for (const s of [-1, 1]) out.push(S(box(8, 16, s * 13 - 2.5, s * 13 + 2.5, 34, 36.4, 1.2, 0.3), { tone: "mid" }));
  // number board on the tub top: a plain panel (no numbers, no branding)
  out.push(L(k.onTop([[52, -6], [62, -5], [62, 5], [52, 6]], 29.6, P, true), { tone: "faint" }));
  return out.join("");
}
function mirror(side) {
  const out = [];
  out.push(rod([40, side * 15, 31], [40, side * 22, 33], 0.5));
  out.push(S(loft([section(41.5, side * 24, 3.4, 31.5, 35.5, 2.4), section(38.5, side * 24, 3.4, 31.5, 35.5, 2.4)]), { tone: "mid", crease: "none" }));
  return out.join("");
}

// SUSPENSION (static arms): wishbones and push/pull rods from chassis to uprights
function arms(side) {
  const y = (v) => side * v;
  const legs = [
    // front: upper and lower wishbones, push rod
    [[68, y(11.4), 23], [FRONT_X, y(33), 24]], [[54, y(14), 26], [FRONT_X, y(33), 24]],
    [[68, y(11.2), 11], [FRONT_X, y(34), 9]], [[52, y(14.6), 10], [FRONT_X, y(34), 9]],
    [[62, y(12.6), 27], [FRONT_X - 2, y(32), 10]],
    // rear: upper and lower, pull rod, toe link
    [[-64, y(9), 22], [REAR_X, y(28), 26]], [[-92, y(8), 22], [REAR_X, y(28), 26]],
    [[-66, y(9), 9], [REAR_X, y(29), 8]], [[-94, y(8), 9], [REAR_X, y(29), 8]],
    [[-74, y(9), 12], [REAR_X + 2, y(28), 24]],
  ];
  const out = [];
  for (const [a, b] of sortBy(legs, (l) => depth(mean(l)))) out.push(rod(a, b, 0.75), ball(b, 1.1));
  // uprights (mostly hidden by the wheels)
  out.push(S(box(FRONT_X - 3, FRONT_X + 3, y(32) - 1.5, y(32) + 1.5, R - 9, R + 7, 1), { tone: "mid" }));
  out.push(S(box(REAR_X - 3, REAR_X + 3, y(27) - 1.5, y(27) + 1.5, R - 9.5, R + 8.5, 1), { tone: "mid" }));
  return out.join("");
}

// NOSE
function nose() {
  const rings = [section(70, 0, 12, 8, 26), section(92, 0, 9, 8.5, 22.5), section(112, 0, 6, 8.5, 17), section(126, 0, 4, 8.6, 13.5), section(132, 0, 2.4, 9.4, 12.2)];
  const out = [S(loft(rings), { tone: "hi", crease: "none" })];
  // front camera pods either side of the nose (no branding)
  for (const s of [-1, 1]) out.push(S(loft([section(100, s * 9.6, 0.9, 19, 21, 2), section(94, s * 9.6, 0.9, 19, 21, 2)]), { tone: "mid", crease: "none" }));
  // seam where the nose meets the tub
  out.push(L(k.pathOf(section(70.4, 0, 12.05, 8, 26).filter((p) => dot(sub(p, [70, 0, 17]), V) > -2 && p[1] > -12.1).map(at)), { tone: "faint" }));
  return out.join("");
}

// HALO: a titanium hoop with a centre pillar, drawn as a chain of rods sorted far to near
function halo() {
  // one smooth tube: left mount, up, round the front of the cockpit, down to the right mount
  const route = [[19, -15.5, 32.6], [21, -15.5, 38.6]];
  for (let i = 0; i <= 24; i++) {
    const t = -Math.PI / 2 + (Math.PI * i) / 24;
    route.push([22 + 33 * Math.cos(t), 15.5 * Math.sin(t), 38.6 + 1.8 * Math.cos(t)]);
  }
  route.push([21, 15.5, 38.6], [19, 15.5, 32.6]);
  const hoop = tubePieces(G.fillet(route, 4, 7), 1.5, P, { maxLength: 8 });
  const pillar = tubePieces([[55, 0, 40.2], [67.5, 0, 26]], 1.3, P, { maxLength: 6, caps: [false, true] });
  const items = [...hoop, ...pillar].map((p) => ({ key: depth(p.mid), svg: tubeSvg(p, { tone: "mid" }) }));
  items.push({ key: depth([55, 0, 40.2]) + 0.5, svg: ball([55, 0, 40.4], 1.9) });
  // mounting feet on the tub, under each rear leg and the pillar
  const feet = [[19, -15.5, 32.4], [19, 15.5, 32.4], [67.5, 0, 25.6]].map((c) => ({ key: depth(c) - 1, svg: S(k.cylinder(c[0], c[1], 2.4, c[2] - 1.2, 1.2, P, 18), { tone: "mid" }) }));
  return [...feet, ...items].sort((a, b) => a.key - b.key).map((i) => i.svg).join("");
}

// POWER UNIT: a V6 block with two banks, plenum and trumpets, turbo and exhaust
function powerUnit() {
  const out = [];
  out.push(S(box(-50, -12, -9, 9, 7, 20, 1.5, 0.4), { tone: "mid" }));
  out.push(L(k.sideSeam({ x: -50, y: -9, w: 38, d: 18, r: 1.5 }, 12, P, 3), { tone: "faint" }));
  const bankF = (s) => G.frameOf([-48, 0, 20], [1, 0, 0], [0, s, 0], [0, 0, 1]);
  for (const s of [-1, 1]) {
    out.push(S(G.prismOf(bankF(s), [[2, 0], [11, 7], [7.5, 11], [-0.5, 4]], 0, 34, P), { tone: "mid" }));
    // cam cover ribs, closed between the bank ends
    for (let i = 1; i < 6; i++) out.push(L(k.segment([-48 + i * 5.6, s * 9.3, 29.2], [-48 + i * 5.6, s * 5.8, 31], P), { tone: "faint" }));
  }
  // plenum between the banks with six intake trumpets
  out.push(S(box(-45, -17, -3.5, 3.5, 22, 27, 1.5, 0.3), { tone: "mid" }));
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) out.push(L(k.ring(-40 + i * 9, s * 1.6, 1.2, 27, P, 12), { tone: "lo" }));
  // turbo at the front of the block, exhaust running back to the tail
  const tF = G.frameAlong([-11, 0, 15], [1, 0, 0]);
  out.push(S(G.disc(0, 5, 6.5, tF, P), { tone: "hi" }));
  out.push(L(G.circleOf(tF, 5, 3.6, P), { tone: "lo" }));
  // energy recovery motor on the near side of the block
  const kF = G.frameAlong([-30, 9, 11], [0, 1, 0]);
  out.push(S(G.disc(0, 4, 4.2, kF, P), { tone: "mid" }));
  out.push(D(G.dotsOf(kF, 4, 3, 6, P, { all: true }), { size: 0.35 }));
  return out.join("");
}

// GEARBOX: tapering casing, bell-housing flange and the rear crash structure
function gearbox() {
  const out = [];
  out.push(S(G.disc(0, 2, 9, G.frameAlong([-54, 0, 15], [-1, 0, 0]), P), { tone: "mid" }));
  out.push(S(loft([section(-56, 0, 9, 7, 23), section(-80, 0, 8, 7, 21), section(-98, 0, 5.5, 8, 19)]), { tone: "mid", crease: "none" }));
  out.push(D([-62, -70, -78, -86].map((x) => at([x, 8.6, 20.5])), { size: 0.4 }));
  out.push(S(loft([section(-98, 0, 4.5, 9, 18), section(-112, 0, 3, 10.5, 16.5)]), { tone: "mid", crease: "none" }));
  // exhaust tailpipe resting on the crash structure, open at the back
  const tF = G.frameAlong([-96, 0, 19.6], [-1, 0, -0.04]);
  out.push(S(G.disc(0, 15, 1.9, tF, P), { tone: "mid" }));
  out.push(`<path class="cf-void" d="${G.circleOf(tF, 15, 1.2, P)}"/>`);
  return out.join("");
}

// REAR WING: endplates, mainplane, flap (the moving element), beam wing and swan-neck pylon
function rearWing() {
  const out = [];
  out.push(S(box(-134, -112, -38.4, -37, 20, 48, 0.4), { tone: "mid", crease: "none" }));
  out.push(S(plateXZ([[-118, 17], [-112, 17], [-116, 37], [-121, 37]], -0.6, 0.6), { tone: "mid", crease: "none" }));
  out.push(S(box(-128, -116, -30, 30, 21, 22.4, 0.6, 0.3), { tone: "mid" }));
  out.push(S(box(-133, -118, -37, 37, 34, 36, 0.8, 0.4), { tone: "hi" }));
  out.push(S(box(-122, -112, -37, 37, 40, 41.6, 0.8, 0.4), { tone: "hi" }));
  out.push(L(k.lineOnTop([-127, -36], [-127, 36], 36, P), { tone: "faint" }));
  out.push(S(box(-134, -112, 37, 38.4, 20, 48, 0.4), { tone: "mid", crease: "none" }));
  out.push(D([[-130, 38.4, 45], [-115, 38.4, 45], [-130, 38.4, 23], [-115, 38.4, 23]].map(at), { size: 0.4 }));
  return out.join("");
}

// FRONT WING: mainplane under the nose, two flaps each side, endplates and pillars
function frontWing() {
  const out = [];
  out.push(S(box(126, 144, -46, 46, 3, 4.4, 1.2, 0.3), { tone: "hi" }));
  for (const s of [-1, 1]) {
    const y0 = s > 0 ? 9 : -46, y1 = s > 0 ? 46 : -9;
    out.push(S(box(124, 134, y0, y1, 6, 7.2, 1, 0.3), { tone: "hi" }));
    out.push(S(box(122, 129, s > 0 ? 14 : -46, s > 0 ? 46 : -14, 9, 10.1, 1, 0.3), { tone: "hi" }));
  }
  for (const s of [-1, 1]) out.push(S(box(127, 131, s * 3 - 0.4, s * 3 + 0.4, 4.4, 10, 0.2), { tone: "mid", crease: "none" }));
  // endplates last: far one is hidden behind the planes, near one in front of them
  out.splice(0, 0, S(box(120, 144, -47.4, -46, 1.6, 12, 0.5), { tone: "mid", crease: "none" }));
  out.push(S(box(120, 144, 46, 47.4, 1.6, 12, 0.5), { tone: "mid", crease: "none" }));
  out.push(D([[124, 47.4, 10], [140, 47.4, 10]].map(at), { size: 0.4 }));
  return out.join("");
}

// ---------- assemble, back to front ----------
const group = (key, body) => `<g data-asm="${key}" data-name="${EXPLODE[key].name}">${body}</g>`;
const shadow = `<path class="iso-halo" d="${k.haloOf({ x: -120, y: -50, w: 260, d: 100, r: 30 }, 0, 0.1, P)}" style="filter:blur(10px)"/>`;
const body = [
  shadow,
  group("wheelRL", tyreParts(REAR_X, -1, REAR_W, false)),
  group("wheelFL", tyreParts(FRONT_X, -1, FRONT_W, false)),
  group("floor", `<g class="cf-carbon">${floor()}</g>`),
  group("podFar", pod(-1)),
  `<g data-static>${arms(-1)}${mirror(-1)}</g>`,
  group("rearWing", rearWing()),
  group("gearbox", gearbox()),
  group("pu", powerUnit()),
  `<g data-static>${chassis()}</g>`,
  group("nose", nose()),
  group("halo", halo()),
  group("podNear", pod(1)),
  `<g data-static>${arms(1)}${mirror(1)}</g>`,
  group("wheelRR", tyreParts(REAR_X, 1, REAR_W, true)),
  group("wheelFR", tyreParts(FRONT_X, 1, FRONT_W, true)),
  group("frontWing", frontWing()),
];
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A generic, unbranded modern Formula 1 car. On hover it comes apart into its assemblies: front wing, nose, halo, sidepods, floor, power unit, gearbox, rear wing and four wheels, while the chassis stays in place.",
  body,
});

const live = `
const P = ${JSON.stringify(P)};
const X = ${JSON.stringify(EXPLODE)};
const M = ${JSON.stringify(MODEL)};
const root = document.querySelector("[data-f1-car]");
const stage = root.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const readout = root.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const groups = [...svg.querySelectorAll("[data-asm]")].map((el) => ({ el, key: el.dataset.asm, name: el.dataset.name, x: X[el.dataset.asm], e: 0, v: 0 }));
const order = ["frontWing", "nose", "halo", "podNear", "floor", "pu", "gearbox", "rearWing", "wheelFR", "wheelRR", "wheelFL", "wheelRL"];
const rate = (n) => M.base + M.growth * n;
let target = 0, since = 0, frame = 0, last = 0, clock = 0, touring = !still.matches, visible = false, idle = 0, lit = null, shown = "";
function say(text) { if (text !== shown) { readout.textContent = text; shown = text; } }
function light(key) {
  if (key === lit) return;
  lit = key;
  groups.forEach((g) => { const on = g.key === key || (key === "podNear" && g.key === "podFar") || (key === "podFar" && g.key === "podNear"); g.el.querySelectorAll(".iso-solid").forEach((s) => on ? s.setAttribute("data-lit", "") : s.removeAttribute("data-lit")); });
  if (!key) { say(target ? "12 assemblies" : "assembled"); return; }
  const g = groups.find((g) => g.key === key);
  say(/wheel/.test(key) ? g.name + " · tyre age " + M.age + " laps · deg " + rate(M.age).toFixed(2) + " s/lap (illustrative)" : g.name);
}
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now; since += dt;
  if (touring) {
    clock += dt;
    const c = clock % 12;
    const want = c > 1.5 && c < 9.5 ? 1 : 0;
    if (want !== target) { target = want; since = 0; }
    light(target && c > 3 && c < 9.2 ? order[Math.floor((c - 3) / 0.52) % order.length] : null);
  }
  let moving = false;
  groups.forEach((g) => {
    const delay = target ? g.x.delay : 0.36 - g.x.delay;
    const want = since > delay ? target : 1 - target;
    if (still.matches) { g.e = want; g.v = 0; }
    else { for (let i = 0; i < 4; i++) { g.v += ((want - g.e) * 90 - g.v * 17) * dt / 4; g.e += g.v * dt / 4; } }
    if (Math.abs(want - g.e) < 0.0005 && Math.abs(g.v) < 0.0005) { g.e = want; g.v = 0; } else moving = true;
    g.el.setAttribute("transform", translateAlong(P, g.x.dir.map((c) => c * g.e)));
  });
  frame = visible && (touring || moving || since < 0.5) ? requestAnimationFrame(tick) : 0;
}
const run = () => { if (!frame && visible) { last = 0; frame = requestAnimationFrame(tick); } };
const set = (t) => { touring = false; clearTimeout(idle); if (t !== target) { target = t; since = 0; } if (!t || !lit) { lit = undefined; light(null); } run(); };
new IntersectionObserver((e) => { visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
stage.addEventListener("pointerenter", () => set(1));
stage.addEventListener("pointerleave", () => { set(0); idle = setTimeout(() => { touring = !still.matches; clock = 0; run(); }, 4000); });
stage.addEventListener("pointermove", (e) => { if (!target) set(1); const g = e.target.closest("[data-asm]"); light(g ? g.dataset.asm : null); });
stage.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); set(target ? 0 : 1); return; }
  if (e.key === "ArrowRight" || e.key === "ArrowLeft") { e.preventDefault(); if (!target) set(1); touring = false; const i = order.indexOf(lit); light(order[(i + (e.key === "ArrowRight" ? 1 : order.length - 1) + (i < 0 && e.key === "ArrowLeft" ? 1 : 0)) % order.length]); }
});
still.addEventListener("change", () => { touring = !still.matches; run(); });
groups.forEach((g) => g.el.setAttribute("transform", "translate(0 0)"));
`;

const plate = k.plateHtml({
  fig: "Fig 02",
  title: "F1 car, apart",
  hint: "Hover to take it apart",
  readout: "assembled",
  keys: [
    { mark: "lit", label: "The assembly under the pointer" },
    { mark: "raised", label: "Chassis, engine cover and suspension stay put" },
  ],
  caption:
    "A generic modern Formula 1 car with no team, sponsor or logo. Proportions are approximate (5.6 m long, 2 m wide, 3.6 m wheelbase, 18 inch wheels). Tyre numbers are illustrative.",
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="F1 car: hover, or press Enter, to take it apart; arrow keys step through the assemblies">${svg}</div>`,
});

const CSS = `
body[data-theme="light"]{--bg:#f6f5f0;--paper:#fffefa;--text:#16191f;--text2:#4a505a;--text3:#737985;--line2:rgba(22,25,31,.16);--accent:#1d4ed8;--pink:#c8324b;--green:#2f7d5b;--amber:#a86a12}
body[data-theme="dark"]{--bg:#161a1d;--paper:#1e2327;--text:#ecebe4;--text2:#b3b6b8;--text3:#84898d;--line2:rgba(236,235,228,.16);--accent:#8db4ff;--pink:#ff8f8f;--green:#7fcf9f;--amber:#e3b56a}
body{background:var(--bg)}
.wc-toggle{font:500 12px/1 "JetBrains Mono",ui-monospace,monospace;color:var(--text2);background:var(--paper);border:1px solid var(--line2);border-radius:999px;padding:8px 14px;cursor:pointer;margin-bottom:16px}
.wc .cf-void{fill:color-mix(in srgb,var(--text) 82%,var(--paper))}
[data-theme="dark"] .wc .cf-void{fill:color-mix(in srgb,var(--paper),#000 55%)}
.wc .wc-rubber,.wc .cf-carbon{--anatomy-face:var(--anatomy-paper);--anatomy-lit-top:color-mix(in srgb,var(--accent) 35%,var(--anatomy-top));--anatomy-lit-shade:color-mix(in srgb,var(--accent) 35%,var(--anatomy-shade-1))}
[data-theme="light"] .wc .cf-carbon{--anatomy-paper:color-mix(in srgb,var(--text) 30%,var(--paper));--anatomy-top:color-mix(in srgb,var(--text) 26%,var(--paper));
  --anatomy-shade-3:color-mix(in srgb,var(--text) 32%,var(--paper));--anatomy-shade-2:color-mix(in srgb,var(--text) 37%,var(--paper));
  --anatomy-shade-1:color-mix(in srgb,var(--text) 42%,var(--paper));--anatomy-shade-0:color-mix(in srgb,var(--text) 47%,var(--paper));
  --anatomy-faint:color-mix(in srgb,var(--text) 44%,var(--paper));--anatomy-lo:color-mix(in srgb,var(--text) 52%,var(--paper))}
[data-theme="dark"] .wc .cf-carbon{--anatomy-paper:color-mix(in srgb,var(--paper),#000 22%);--anatomy-top:color-mix(in srgb,var(--paper),#000 14%);
  --anatomy-shade-3:color-mix(in srgb,var(--paper),#000 18%);--anatomy-shade-2:color-mix(in srgb,var(--paper),#000 26%);
  --anatomy-shade-1:color-mix(in srgb,var(--paper),#000 33%);--anatomy-shade-0:color-mix(in srgb,var(--paper),#000 40%)}
`;
// the site's token mapping is shared with the wheel-corner figure (figures/wheel-corner/embed.css)
const { readFileSync } = await import("node:fs");
const shared = readFileSync(join(HERE, "..", "wheel-corner", "embed.css"), "utf8").split("\n").filter((l) => !l.startsWith(".iso{") ).join("\n");
// ---------- embed fragment for index.html (notebook Chapter 01, right page) ----------
if (process.argv.includes("--embed")) {
  const pts = reach.map(at);
  let [x0, y0, x1, y1] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  x0 -= 6; x1 += 6; y0 -= 6; y1 += 22; // room under the car for the caption chip
  let w = x1 - x0, h = y1 - y0;
  if (w / h < 1.6) { const nw = h * 1.6; x0 -= (nw - w) / 2; w = nw; } else { const nh = w / 1.6; y0 -= (nh - h) / 2; h = nh; }
  const vb = [x0, y0, w, h].map((v) => Math.round(v * 10) / 10).join(" ");
  const figure = svg.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`).replace("<svg ", '<svg preserveAspectRatio="xMidYMid meet" ');
  const cam = k.cameraOf(P);
  const tokens = readFileSync(join(HERE, "..", "wheel-corner", "embed.css"), "utf8");
  const mapping = tokens.slice(tokens.indexOf("\n.wc{") + 1, tokens.indexOf("[data-wheel-corner]")).split("\n").filter((l) => !l.includes("wc-pit")).join("\n");
  const carCss = CSS.slice(CSS.indexOf(".wc .cf-void"));
  const embedCss = `[data-f1-car] .art-cap{white-space:nowrap}@media (max-width:420px){[data-f1-car] .art-cap{font-size:.56rem}}.pg-art .wc{position:absolute;inset:0}.pg-art .wc .iso-stage{position:absolute;inset:0;outline:none}.pg-art .wc .iso-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--accent);border-radius:8px}.pg-art .wc svg{width:100%;height:100%;display:block}`;
  const script = `(function(){
  var root = document.querySelector("[data-f1-car]"); if (!root) return;
  var stage = root.querySelector(".iso-stage"), svg = stage.querySelector("svg"), cap = root.querySelector("[data-readout]"), face = root.closest(".face");
  var X = ${JSON.stringify(EXPLODE)}, M = ${JSON.stringify(MODEL)}, still = typeof reduce !== "undefined" ? reduce : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SA = ${cam.sinA}, CA = ${cam.cosA}, SE = ${cam.sinE}, CE = ${cam.cosE}, K = ${cam.k};
  function shift(d){ return "translate(" + ((d[0] * SA - d[1] * CA) * K).toFixed(2) + " " + (((d[0] * CA + d[1] * SA) * SE - d[2] * CE) * K).toFixed(2) + ")"; }
  var groups = [].slice.call(svg.querySelectorAll("[data-asm]")).map(function(el){ return { el: el, key: el.getAttribute("data-asm"), name: el.getAttribute("data-name"), x: X[el.getAttribute("data-asm")], e: 0, v: 0 }; });
  var order = ["frontWing", "nose", "halo", "podNear", "floor", "pu", "gearbox", "rearWing", "wheelFR", "wheelRR", "wheelFL", "wheelRL"];
  var target = 0, since = 0, frame = 0, last = 0, clock = 0, touring = !still, visible = false, idle = 0, lit, shown = "";
  function say(t){ if (t !== shown){ cap.textContent = t; shown = t; } }
  function light(key){
    if (key === lit) return; lit = key;
    groups.forEach(function(g){ var on = g.key === key || (/pod/.test(key || "") && /pod/.test(g.key)); [].forEach.call(g.el.querySelectorAll(".iso-solid"), function(s){ if (on) s.setAttribute("data-lit", ""); else s.removeAttribute("data-lit"); }); });
    if (!key){ say(target ? "12 assemblies" : "hover to take it apart"); return; }
    var g = groups.filter(function(g){ return g.key === key; })[0];
    say(/wheel/.test(key) ? "tyre " + M.age + " laps · deg " + (M.base + M.growth * M.age).toFixed(2) + " s/lap · illustrative" : g.name);
  }
  function open(){ return visible && !(face && face.classList.contains("off")); }
  function tick(now){
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now; since += dt;
    if (touring){ clock += dt; var c = clock % 12, want = c > 1.5 && c < 9.5 ? 1 : 0; if (want !== target){ target = want; since = 0; } light(target && c > 3 && c < 9.2 ? order[Math.floor((c - 3) / 0.52) % order.length] : null); }
    var moving = false;
    groups.forEach(function(g){
      var delay = target ? g.x.delay : 0.36 - g.x.delay, want = since > delay ? target : 1 - target;
      if (still){ g.e = want; g.v = 0; } else { for (var i = 0; i < 4; i++){ g.v += ((want - g.e) * 90 - g.v * 17) * dt / 4; g.e += g.v * dt / 4; } }
      if (Math.abs(want - g.e) < 0.0005 && Math.abs(g.v) < 0.0005){ g.e = want; g.v = 0; } else moving = true;
      g.el.setAttribute("transform", shift([g.x.dir[0] * g.e, g.x.dir[1] * g.e, g.x.dir[2] * g.e]));
    });
    frame = open() && (touring || moving || since < 0.5) ? requestAnimationFrame(tick) : 0;
  }
  function run(){ if (!frame && open()){ last = 0; frame = requestAnimationFrame(tick); } }
  function set(t){ touring = false; clearTimeout(idle); if (t !== target){ target = t; since = 0; } if (!t || !lit){ lit = undefined; light(null); } run(); }
  new IntersectionObserver(function(e){ visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
  if (face) new MutationObserver(run).observe(face, { attributes: true, attributeFilter: ["class"] });
  stage.addEventListener("pointerenter", function(){ set(1); });
  stage.addEventListener("pointerleave", function(){ set(0); idle = setTimeout(function(){ touring = !still; clock = 0; run(); }, 4000); });
  stage.addEventListener("pointermove", function(e){ if (!target) set(1); var g = e.target.closest("[data-asm]"); light(g ? g.getAttribute("data-asm") : null); });
  stage.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); set(target ? 0 : 1); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); if (!target) set(1); var i = order.indexOf(lit), n = order.length; light(order[i < 0 ? (e.key === "ArrowRight" ? 0 : n - 1) : (i + (e.key === "ArrowRight" ? 1 : n - 1)) % n]); }
  });
  light(null);
})();`;
  const fragment = `<div class="pg-art" data-f1-car><div class="iso wc"><div class="iso-stage" tabindex="0" role="img" aria-label="A generic F1 car: hover, or press Enter, to take it apart into its assemblies; arrow keys step through them. Tyre numbers are illustrative.">${figure}</div></div><span class="art-cap" data-readout>hover to take it apart</span></div>`;
  writeFileSync(join(HERE, "embed.css"), k.ISO_CSS.trim() + "\n" + mapping.trim() + "\n" + carCss.trim() + "\n" + embedCss + "\n");
  writeFileSync(join(HERE, "embed.html"), fragment);
  writeFileSync(join(HERE, "embed.js"), script);
  console.log("wrote embed.css, embed.html, embed.js · viewBox", vb);
  process.exit(0);
}

const toggle = `<button class="wc-toggle" type="button" onclick="const b=document.body;b.dataset.theme=b.dataset.theme==='light'?'dark':'light'">Switch theme</button>`;
const page = `<style>@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap");${CSS}</style>${toggle}<div class="wc" data-f1-car>${plate}</div>`;
const file = theme === "light" ? "f1-car-light.html" : "f1-car.html";
let html = k.pageHtml({ title: "F1 car", theme, body: page, script: kitScript() + live, width: 700 });
html = html.replace("</style>", `${shared.replace(/^[\s\S]*?(\.wc\{)/, "$1")}</style>`);
writeFileSync(join(HERE, file), html);
console.log("wrote", file);
