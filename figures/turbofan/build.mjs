// Turbofan cutaway: a generic high-bypass engine on a display stand, for notebook Chapter 04 (Planes).
// The nacelle and core casing are cut open in a wedge facing the reader; the fan turns; on hover the
// core modules slide apart along the shaft. The readout comes from an ideal Brayton cycle (illustrative).
// Build: node build.mjs [--light] [--embed]. No manufacturer, model name or logo.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { homedir } from "node:os";

const SKILL = join(homedir(), ".claude", "skills", "anatomy");
const k = await import(pathToFileURL(join(SKILL, "kit", "iso-kit.mjs")).href);
const G = await import(pathToFileURL(join(SKILL, "kit", "lathe.mjs")).href);
const { kitScript } = await import(pathToFileURL(join(SKILL, "scripts", "inline-kit.mjs")).href);

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";
const TAU = Math.PI * 2;

// ---------- the cycle: ideal Brayton, cold air (gamma 1.4), chosen ratios; illustrative, not a real engine ----------
const CYCLE = (() => {
  const g = 0.4 / 1.4, T0 = 288, p0 = 1.0, FPR = 1.5, LPC = 3, OPR = 40, T4 = 1700, BPR = 10;
  const T13 = T0 * FPR ** g, T25 = T0 * LPC ** g, T3 = T0 * OPR ** g;
  const T45 = T4 - (T3 - T25); // the HP turbine drives the HP compressor
  const T5 = T45 - ((1 + BPR) * (T13 - T0) + (T25 - T13)); // the LP turbine drives the fan (all the air) and the LP compressor (core air)
  const p45 = OPR * (T45 / T4) ** (1 / g), p5 = p45 * (T5 / T45) ** (1 / g);
  const r = (v) => Math.round(v);
  return { T0, FPR, LPC, OPR, T4: r(T4), BPR, T13: r(T13), T25: r(T25), T3: r(T3), T45: r(T45), T5: r(T5), p45: p45.toFixed(0), p5: p5.toFixed(1) };
})();

// ---------- world: x along the shaft (intake at +x), y to the side, z up; fan radius 40 ----------
const WIDTH = 640, HEIGHT = 380;
const ZA = 72; // shaft height above the floor
const XF = 40; // fan plane (a slice boundary)
const BIN = 4; // slice width along x
const BLADES = 20;

// modules: x range at rest (boundaries on slice edges), how far each slides when apart, and its readout
const MODS = {
  nacelle: { dx: 0, name: "nacelle and fan case", say: `bypass ratio ${CYCLE.BPR}:1` },
  fan: { dx: 24, name: "fan", say: `pressure ratio ${CYCLE.FPR} · ${CYCLE.T0} K to ${CYCLE.T13} K` },
  lpc: { dx: 12, name: "LP compressor", say: `${CYCLE.LPC} bar · ${CYCLE.T25} K out` },
  hpc: { dx: 4, name: "HP compressor", say: `${CYCLE.OPR} bar · ${CYCLE.T3} K out` },
  comb: { dx: -4, name: "combustor", say: `${CYCLE.OPR} bar · ${CYCLE.T4} K out` },
  hpt: { dx: -12, name: "HP turbine", say: `${CYCLE.p45} bar · ${CYCLE.T45} K out` },
  lpt: { dx: -24, name: "LP turbine", say: `${CYCLE.p5} bar · ${CYCLE.T5} K out` },
  exh: { dx: -36, name: "exhaust", say: "expands to 1 bar" },
};
const ORDER = ["fan", "lpc", "hpc", "comb", "hpt", "lpt", "exh", "nacelle"];
const modOf = (x) => (x >= 36 ? "fan" : x >= 16 ? "lpc" : x >= -4 ? "hpc" : x >= -20 ? "comb" : x >= -28 ? "hpt" : x >= -48 ? "lpt" : "exh");
const HEAT = { comb: 34, hpt: 26, lpt: 16, exh: 8 }; // amber tint (percent) on the hot section

// fit to the engine at rest and with the core apart
const reach = [];
for (const x of [-80 - 36, -62, 0, 54 + 24, 84]) for (const t of [0, 1, 2, 3, 4, 5, 6, 7]) reach.push([x, 48 * Math.cos((t * TAU) / 8), ZA + 48 * Math.sin((t * TAU) / 8)]);
for (const x of [-66, 80]) for (const y of [-36, 36]) reach.push([x, y, 0]);
const P = k.fitProjection(reach, WIDTH, HEIGHT, { pad: 16, azimuth: 50 });
const V = G.viewOf(P);
const depth = (p) => k.depthOf(p, P);
const at = (p) => k.iso(p, P);
const LIGHT = G.lightOf(P);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => { const l = Math.hypot(...v) || 1; return v.map((c) => c / l); };
const near = depth([V[0] * 10, V[1] * 10, V[2] * 10]) > depth([0, 0, 0]) ? 1 : -1; // larger depth = nearer when 1

// the cut: a wedge of the casings centred on the direction the reader looks from
const PHI = Math.atan2(V[2], V[1]);
const CUT0 = PHI - 0.95, CUT1 = PHI + 0.8; // removed angles
const KEEP = [CUT1, CUT0 + TAU]; // what is left of a cut casing
const FULL = [0, TAU];
const SEEN = [CUT0 - 0.5, CUT1 + 0.5]; // internals only need drawing where the cut shows them (plus margin)
const W3 = (x, r, th) => [x, r * Math.cos(th), ZA + r * Math.sin(th)];

// ---------- the facet renderer: every item lands in a slice along x, slices paint back to front ----------
const items = []; // { bin, z, mod, kind: "f" | "l", cls, d }
const binOf = (x) => Math.floor(x / BIN + 1e-6);
const P2 = (p) => { const q = at(p); return `${q[0].toFixed(1)} ${q[1].toFixed(1)}`; };
const r1 = (v) => { const t = (Math.round(v * 10) / 10).toFixed(1).replace(/^(-?)0./, "$1.").replace(/.0$/, ""); return t === "-0" ? "0" : t; };
function pathD(pts, close) {
  const q = pts.map(at).map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  let d = `M${r1(q[0][0])} ${r1(q[0][1])}l`, px = q[0][0], py = q[0][1];
  const parts = [];
  for (let i = 1; i < q.length; i++) { const dx = q[i][0] - px, dy = q[i][1] - py; if (Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) continue; parts.push(r1(dx) + (dy < 0 ? "" : " ") + r1(dy)); px = q[i][0]; py = q[i][1]; }
  return d + parts.join(" ").replace(/ -/g, "-") + (close ? "z" : "");
}
function toneOfN(n) {
  if (n[2] > 0.8) return "st";
  const t = G.toneOf(n, P);
  return "s" + Math.max(0, Math.min(3, t - 1));
}
function facet(pts, n, mod, { cls = null, bias = 0, bin = null } = {}) {
  if (dot(n, V) <= 1e-4) return;
  const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const c = [cx, pts.reduce((s, p) => s + p[1], 0) / pts.length, pts.reduce((s, p) => s + p[2], 0) / pts.length];
  items.push({ x: cx, bin: bin ?? binOf(cx), z: near * depth(c) + bias, mod, kind: "f", cls: cls ?? toneOfN(n), d: pathD(pts, true) });
}
function line(pts, mod, tone = "mid", bias = 0.35) {
  // split at slice boundaries so each piece sits in one slice
  const out = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const ba = binOf(Math.min(a[0], b[0]) + 1e-4), bb = binOf(Math.max(a[0], b[0]) - 1e-4);
    if (ba !== bb) {
      const xs = [];
      for (let q = ba + 1; q <= bb; q++) xs.push(q * BIN);
      if (b[0] < a[0]) xs.reverse();
      for (const x of xs) { const t = (x - a[0]) / (b[0] - a[0]); const m = [x, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; out[out.length - 1].push(m); out.push([m]); }
    }
    out[out.length - 1].push(b);
  }
  for (const seg of out) {
    if (seg.length < 2) continue;
    // pieces never leave their slice, and long arcs are split further so they sort with the facets they lie on
    const pieces = [];
    for (let s = 0; s < seg.length - 1; s++) {
      const bin = binOf((seg[s][0] + seg[s + 1][0]) / 2), last = pieces[pieces.length - 1];
      if (last && last.bin === bin && last.pts.length < 6) last.pts.push(seg[s + 1]);
      else pieces.push({ bin, pts: [seg[s], seg[s + 1]] });
    }
    for (const { pts: piece } of pieces) {
      const c = piece.reduce((m, p) => [m[0] + p[0] / piece.length, m[1] + p[1] / piece.length, m[2] + p[2] / piece.length], [0, 0, 0]);
      items.push({ x: c[0], bin: binOf(c[0]), z: near * depth(c) + bias, mod, kind: "l", cls: tone, d: pathD(piece, false) });
    }
  }
}
// x samples on [x0, x1] that include every slice edge, at most `step` apart, plus extra knots
function xsOf(x0, x1, step = 3, extra = []) {
  const set = new Set([x0, x1, ...extra.filter((x) => x > x0 && x < x1)]);
  for (let q = Math.ceil(x0 / BIN); q * BIN < x1; q++) if (q * BIN > x0) set.add(q * BIN);
  const xs = [...set].sort((a, b) => a - b);
  const out = [xs[0]];
  for (let i = 1; i < xs.length; i++) { const n = Math.ceil((xs[i] - xs[i - 1]) / step); for (let j = 1; j <= n; j++) out.push(xs[i - 1] + ((xs[i] - xs[i - 1]) * j) / n); }
  return out;
}
const thetasOf = ([a0, a1], step = TAU / 44) => { const n = Math.max(2, Math.ceil((a1 - a0) / step)); return Array.from({ length: n + 1 }, (_, i) => a0 + ((a1 - a0) * i) / n); };
const slope = (f, x) => (f(x + 0.01) - f(x - 0.01)) / 0.02;

// a surface of revolution r(x) over an angle range; side +1 faces away from the shaft, -1 toward it
function surface(f, xs, range, mod, { side = 1, modAt = null, step, shade = 0.25 } = {}) {
  const th = thetasOf(range, step);
  for (let i = 0; i < xs.length - 1; i++) {
    const xa = xs[i], xb = xs[i + 1], xm = (xa + xb) / 2, ra = f(xa), rb = f(xb), dr = (rb - ra) / (xb - xa);
    const m = modAt ? modAt(xm) : mod;
    let run = null;
    const flush = () => {
      if (!run) return;
      const a = run.t0, b = run.t1, ts = th.filter((t) => t >= a - 1e-9 && t <= b + 1e-9);
      const pts = [...ts.map((t) => W3(xa, ra, t)), ...ts.slice().reverse().map((t) => W3(xb, rb, t))];
      facet(pts, run.n, m, { cls: run.cls });
      run = null;
    };
    for (let j = 0; j < th.length - 1; j++) {
      const t0 = th[j], t1 = th[j + 1], tm = (t0 + t1) / 2;
      const n = unit([-dr * side, Math.cos(tm) * side, Math.sin(tm) * side]);
      if (dot(n, V) <= 1e-4) { flush(); continue; }
      const cls = toneOfN(unit([-dr * side * shade, Math.cos(tm) * side, Math.sin(tm) * side]));
      if (run && run.cls === cls && t1 - run.t0 < 0.45) { run.t1 = t1; run.n = unit([run.n[0] + n[0], run.n[1] + n[1], run.n[2] + n[2]]); }
      else { flush(); run = { t0, t1, cls, n }; }
    }
    flush();
  }
}
// the outline of a turned surface: where it turns away from the reader, plus seams at given x
function silhouette(f, xs, range, mod, { side = 1, tone = "hi", modAt = null } = {}) {
  const Vyz = Math.hypot(V[1], V[2]);
  for (const sign of [-1, 1]) {
    let run = [];
    const flush = () => { if (run.length > 1) line(run, modAt ? modAt(run[0][0]) : mod, tone, 9); run = []; };
    for (const x of xs) {
      const c = (slope(f, x) * V[0]) / Vyz;
      if (Math.abs(c) > 1) { flush(); continue; }
      let t = PHI + sign * Math.acos(c);
      if (side < 0) t = PHI + Math.PI + sign * Math.acos(-c);
      const inRange = (a) => { for (const w of [a - TAU, a, a + TAU]) if (w >= range[0] && w <= range[1]) return w; return null; };
      const w = inRange(t);
      if (w === null) { flush(); continue; }
      if (run.length && modAt && modAt(run[run.length - 1][0]) !== modAt(x) && Math.abs(x - run[run.length - 1][0]) > 0) { /* keep one run per module */ }
      run.push(W3(x, f(x), w));
    }
    flush();
  }
}
const ring = (x, r, range, mod, tone = "mid", bias = 3) => line(thetasOf(range, TAU / 60).map((t) => W3(x, r, t)), mod, tone, bias);
// a flat annulus at x facing +x (dir 1) or -x (dir -1)
function annulus(x, r0, r1, range, mod, dir = 1, opts = {}) {
  const th = thetasOf(range, opts.step);
  for (let j = 0; j < th.length - 1; j += 6) {
    const ts = th.slice(j, Math.min(th.length, j + 7));
    facet([...ts.map((t) => W3(x, r0, t)), ...ts.slice().reverse().map((t) => W3(x, r1, t))], [dir, 0, 0], mod, opts);
  }
}
// the faces left where a casing is cut, between its inner and outer surfaces
function cutFaces(fo, fi, xs, mod, { modAt = null, tone = "hi" } = {}) {
  for (const [t, s] of [[KEEP[0], -1], [KEEP[1], 1]]) {
    const n = [0, -Math.sin(t) * s, Math.cos(t) * s];
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1], m = modAt ? modAt((xa + xb) / 2) : mod;
      facet([W3(xa, fo(xa), t), W3(xb, fo(xb), t), W3(xb, fi(xb), t), W3(xa, fi(xa), t)], n, m, { cls: "sx" });
    }
    const outer = xs.map((x) => W3(x, fo(x), t)), inner = xs.map((x) => W3(x, fi(x), t));
    if (modAt) {
      for (const key of new Set(xs.map(modAt))) {
        const pick = (pts) => pts.filter((p, i) => modAt(xs[Math.min(i, xs.length - 2)] + 1e-3) === key || modAt(xs[Math.max(0, i - 1)] + 1e-3) === key);
        line(pick(outer), key, tone, 9); line(pick(inner), key, tone, 9);
      }
    } else { line(outer, mod, tone, 9); line(inner, mod, tone, 9); }
  }
}

// ---------- the engine ----------
const smooth01 = (t) => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

// NACELLE: rounded intake lip, fan case, cowl tapering to the bypass nozzle
const LIP = 82, NOZ = -40;
const nacOut = (x) => (x >= 60 ? 43.6 + 4.4 * Math.sqrt(Math.max(0, 1 - ((x - 60) / 22) ** 2)) : 48 - 9.6 * ((60 - x) / 100) ** 2);
const nacIn = (x) => (x >= 60 ? 43.6 - 3.1 * Math.sqrt(Math.max(0, 1 - ((x - 60) / 22) ** 2)) : x >= 30 ? 40.5 : 40.5 - 4.2 * ((30 - x) / 70) ** 1.5);
{
  const xs = xsOf(NOZ, LIP, 3.5, [60, 30, 74, 78, 80, 81, 81.6]);
  surface(nacOut, xs, KEEP, "nacelle", { side: 1 });
  surface(nacIn, xs, KEEP, "nacelle", { side: -1 });
  silhouette(nacOut, xs, KEEP, "nacelle");
  silhouette(nacIn, xs, KEEP, "nacelle", { side: -1 });
  cutFaces(nacOut, nacIn, xs, "nacelle");
  annulus(NOZ, nacIn(NOZ), nacOut(NOZ), KEEP, "nacelle", -1);
  ring(NOZ, nacOut(NOZ), KEEP, "nacelle", "hi");
  ring(NOZ, nacIn(NOZ), KEEP, "nacelle", "mid");
  // panel seams: fan cowl, thrust-reverser sleeve, and the acoustic liner joints inside
  for (const x of [58, 22, -8]) ring(x, nacOut(x), KEEP, "nacelle", "lo");
  for (const x of [70, 50, 31]) ring(x, nacIn(x), KEEP, "nacelle", "lo");
  // a latch row on the fan cowl
  for (const t of thetasOf(KEEP, 0.55).slice(1, -1)) line([W3(40, nacOut(40) + 0.05, t), W3(44, nacOut(44) + 0.05, t)], "nacelle", "lo");
}

// FAN: spinner, hub, and the blades (drawn as one group in the plane x = XF so they can turn)
const spin = (x) => 12.2 * Math.max(0, 1 - ((x - XF) / 15) ** 2) ** 0.62;
{
  const xs = xsOf(XF, XF + 15, 1.2, [XF + 14, XF + 14.7]);
  surface(spin, xs.slice(0, -1), FULL, "fan", { shade: 1 });
  silhouette(spin, xs.slice(0, -1), FULL, "fan");
  // a painted swirl line on the spinner and the bolt circle where it meets the hub
  line(Array.from({ length: 16 }, (_, i) => { const x = XF + 1 + i * 0.85; return W3(x, spin(x) + 0.02, PHI + 0.2 + i * 0.16); }), "fan", "mid");
  ring(XF + 1.2, spin(XF + 1.2) + 0.02, FULL, "fan", "lo");
  const hub = () => 12.2;
  surface(hub, xsOf(36, XF, 2), FULL, "fan");
  ring(36, 12.2, FULL, "fan", "mid");
}
const bladeShape = (i) => {
  const base = (i * TAU) / BLADES, pts = [], back = [];
  for (let s = 0; s <= 10; s++) {
    const r = 12.2 + (39.4 - 12.2) * (s / 10), u = s / 10;
    const sweep = 0.42 * u * u, chord = (0.2 + 0.07 * u) * (1 - 0.15 * u * u * u);
    pts.push([r, base + sweep]); back.push([r, base + sweep + chord]);
  }
  return { lead: pts, trail: back };
};
const bladesSvg = (() => {
  const out = [];
  for (let i = 0; i < BLADES; i++) {
    const { lead, trail } = bladeShape(i);
    const mid = lead.map(([r, a], j) => [r, (a + trail[j][1]) / 2]);
    const poly = (a, b) => "M" + [...a, ...b.slice().reverse()].map(([r, t]) => P2(W3(XF, r, t))).join("L") + "Z";
    out.push(`<path class="f s3" d="${poly(lead, mid)}"/><path class="f s1" d="${poly(mid, trail)}"/>`);
    out.push(`<path class="iso-line" data-tone="hi" d="M${lead.map(([r, t]) => P2(W3(XF, r, t))).join("L")}"/>`);
    out.push(`<path class="iso-line" data-tone="lo" d="M${trail.map(([r, t]) => P2(W3(XF, r, t))).join("L")}"/>`);
  }
  // the tip path: a faint ring where the blade tips run, rubbed into the fan case liner
  return out.join("");
})();
items.push({ x: XF, bin: binOf(XF), z: -1e9, mod: "fan", kind: "blades", d: bladesSvg });

// CORE COWL (the bypass duct's inner wall) and the core flow path
const cowlOut = (x) => (x >= 26 ? 20.6 + 3.6 * Math.sqrt(Math.max(0, 1 - ((x - 26) / 7) ** 2)) : x >= -22 ? 24.2 + 0.4 * Math.sin(((x + 22) / 48) * Math.PI) : mix(24.2, 19.6, smooth01((-22 - x) / 40)));
const cowlIn = (x) => {
  if (x >= 30) return mix(19.2, 20.4, (x - 30) / 3);
  if (x >= 16) return mix(18.2, 19.2, (x - 16) / 14);
  if (x >= -4) return mix(12.8, 17.2, (x + 4) / 20);
  if (x >= -20) return 12.8 + 2.6 * Math.sin(((x + 20) / 16) * Math.PI); // the combustor bulge
  if (x >= -28) return mix(14.6, 13.2, (x + 28) / 8);
  if (x >= -48) return mix(18.6, 14.6, (x + 48) / 20);
  return mix(18.9, 18.6, (x + 48) / -14);
};
const COWL0 = -62, COWL1 = 33;
{
  const xs = xsOf(COWL0, COWL1, 3, [26, 30, 31.5, 32.4]);
  surface(cowlOut, xs, KEEP, null, { side: 1, modAt: modOf });
  surface(cowlIn, xs, KEEP, null, { side: -1, modAt: modOf });
  silhouette(cowlOut, xs, KEEP, null, { modAt: modOf });
  silhouette(cowlIn, xs, KEEP, null, { side: -1, modAt: modOf });
  cutFaces(cowlOut, cowlIn, xs, null, { modAt: modOf });
  annulus(COWL0, cowlIn(COWL0), cowlOut(COWL0), KEEP, "exh", -1);
  ring(COWL0, cowlOut(COWL0), KEEP, "exh", "hi");
  // module flanges: a raised ring and a bolt row at every joint of the casing
  for (const x of [16, -4, -20, -28, -48]) {
    const m = modOf(x + 0.01);
    surface(() => cowlOut(x) + 0.7, [x, x + 1.2], KEEP, m);
    ring(x + 1.2, cowlOut(x) + 0.7, KEEP, m, "mid");
    for (const t of thetasOf(KEEP, 0.16).slice(1, -1)) line([W3(x + 0.6, cowlOut(x) + 0.75, t), W3(x + 0.62, cowlOut(x) + 0.75, t + 0.02)], m, "hi", 0.6);
  }
}

// HUB / DRUMS inside: the rotor drums the blades sit on, ending in the exhaust cone
const hubR = (x) => {
  if (x >= 16) return mix(11.6, 12.2, (x - 16) / 20);
  if (x >= -4) return mix(10, 11.4, (x + 4) / 20);
  if (x >= -20) return 9.2;
  if (x >= -28) return 10.4;
  if (x >= -48) return mix(11.6, 10.6, (x + 48) / 20);
  return 11.6 * Math.max(0, 1 - ((x + 48) / -32) ** 2) ** 0.55;
};
{
  const xs = xsOf(-80, 36, 2, [-79.4, -78.6, -77]);
  surface(hubR, xs.slice(1), FULL, null, { modAt: modOf, shade: 1 });
  silhouette(hubR, xs.slice(1), FULL, null, { modAt: modOf, tone: "mid" });
}

// STAGES: rotor discs and stator rows as thin annuli with blades drawn as swept spokes
function stage(x, mod, { rotor = true, tip = null, hub = null, blades = 36, thick = 1.1, tone = rotor ? "mid" : "lo" } = {}) {
  const r0 = hub ?? hubR(x) - 0.05, r1 = tip ?? cowlIn(x) - 0.25;
  const range = [SEEN[0] - 0.4, SEEN[1] + 0.4];
  annulus(x, r0, r1, range, mod, 1, { cls: rotor ? "s3" : "s1" });
  surface(() => r1, [x - thick, x], range, mod);
  const th = thetasOf(range, TAU / blades);
  for (const t of th.slice(1, -1)) line([W3(x + 0.02, r0, t), W3(x + 0.02, (r0 + r1) / 2, t + (rotor ? 0.05 : -0.05)), W3(x + 0.02, r1, t + (rotor ? 0.12 : -0.1))], mod, tone, 0.25);
  ring(x + 0.02, r1, range, mod, "mid");
}
// outlet guide vanes in the bypass duct, part of the fan frame on the core side
stage(30.5, "lpc", { rotor: false, hub: cowlOut(30.5) - 0.1, tip: nacIn(30.5) - 0.3, blades: 44, thick: 1.4, tone: "mid" });
// LP compressor: 3 stages behind the splitter
for (const [i, x] of [29, 26.5, 24, 21.5, 19, 17.2].entries()) stage(x, "lpc", { rotor: i % 2 === 0 });
// HP compressor: 9 stages, the blades getting shorter as the air is squeezed
for (let i = 0; i < 12; i++) stage(15 - i * 1.55, "hpc", { rotor: i % 2 === 0, blades: 40, thick: 0.8 });
// combustor: an annular liner with fuel nozzles reaching in from the casing
{
  const lo = (x) => 10.6 + 0.4 * Math.sin(((x + 18) / 13) * Math.PI), hi = (x) => 14.4 + 0.6 * Math.sin(((x + 18) / 13) * Math.PI);
  const xs = xsOf(-18, -5, 1.3);
  const range = [SEEN[0] - 0.3, SEEN[1] + 0.3];
  surface(hi, xs, range, "comb");
  surface(lo, xs, range, "comb");
  silhouette(hi, xs, range, "comb", { tone: "mid" });
  annulus(-5, lo(-5), hi(-5), range, "comb", 1, { cls: "s2" });
  // dilution holes and cooling rings on the outer liner
  for (const x of [-15.5, -11.5, -8]) ring(x, hi(x) + 0.03, range, "comb", "lo");
  for (const t of thetasOf(range, 0.2).slice(1, -1)) line([W3(-13.5, hi(-13.5) + 0.05, t), W3(-13.4, hi(-13.4) + 0.05, t + 0.03)], "comb", "hi", 0.4);
  // fuel nozzles: stems from the casing to the dome
  for (const t of thetasOf(SEEN, 0.42).slice(1, -1)) {
    line([W3(-6.2, cowlIn(-6.2) - 0.1, t), W3(-4.6, 12.6, t)], "comb", "hi", 0.4);
    items.push({ x: -4.6, bin: binOf(-4.6), z: near * depth(W3(-4.6, 12.6, t)) + 0.6, mod: "comb", kind: "dot", cls: "hi", d: P2(W3(-4.6, 12.6, t)) });
  }
}
// HP turbine: 2 stages; LP turbine: 5 stages, the blades growing as the gas expands
for (let i = 0; i < 4; i++) stage(-21.2 - i * 1.7, "hpt", { rotor: i % 2 === 1, blades: 40, thick: 0.9 });
for (let i = 0; i < 8; i++) stage(-29.8 - i * 2.25, "lpt", { rotor: i % 2 === 1, blades: 38, thick: 1 });
// exhaust: struts of the rear frame
stage(-50, "exh", { rotor: false, blades: 14, thick: 1.6, tone: "mid" });

// ---------- the stand: a base on feet with two cradle posts under the nacelle ----------
function stand() {
  const S = (paths, style) => k.solidSvg(paths, style);
  const box = (x0, x1, y0, y1, z0, z1, r = 0.8, bevel = 0) => k.slabOf({ x: x0, y: y0, w: x1 - x0, d: y1 - y0, r }, z0, z1 - z0, P, 3, bevel);
  const out = [];
  for (const [x, y] of [[-60, -30], [72, -30], [-60, 30], [72, 30]].sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]))) out.push(S(box(x - 4, x + 4, y - 4, y + 4, 0, 2.4, 1.2), { tone: "lo" }));
  out.push(S(box(-66, 78, -34, 34, 2.4, 7.4, 3, 0.8), { tone: "lo" }));
  out.push(k.lineSvg(k.onTop([[-62, -30], [74, -30], [74, 30], [-62, 30]], 7.4, P, true), { tone: "faint" }));
  out.push(k.dotsSvg([[-63, -31, 7.4], [75, -31, 7.4], [-63, 31, 7.4], [75, 31, 7.4]].map(at), { size: 0.5 }));
  // a ruler along the near edge, every 4 units, longer every 20
  for (let x = -60; x <= 72; x += 4) out.push(k.lineSvg(`M${P2([x, 34, 7.4 - 0.6])}L${P2([x, 34, (x % 20 === 0 ? 4.2 : 5.6)])}`, { tone: x % 20 === 0 ? "mid" : "lo" }));
  for (const x of [-26, 50]) {
    const top = ZA - nacOut(x) + 0.6;
    out.push(S(box(x - 5, x + 5, -9, 9, 7.4, 10.4, 1.4, 0.4), { tone: "mid" }));
    out.push(S(box(x - 2.6, x + 2.6, -2.6, 2.6, 10.4, top - 3, 0.8), { tone: "mid" }));
    out.push(S(box(x - 4.4, x + 4.4, -11, 11, top - 3, top, 0.8, 0.3), { tone: "mid" }));
    out.push(k.dotsSvg([[x - 3.4, -7, 10.4], [x + 3.4, -7, 10.4], [x - 3.4, 7, 10.4], [x + 3.4, 7, 10.4]].map(at), { size: 0.45 }));
  }
  return out.join("");
}

// ---------- assemble: slices back to front, then depth inside a slice ----------
const shiftZ = (dx) => near * (depth([dx, 0, 0]) - depth([0, 0, 0]));
const cmp = (a, b) => a.bin - b.bin || a.z - b.z;
items.sort(cmp);
{
  const apart = items.map((it, i) => { const dx = MODS[it.mod].dx; return { i, bin: it.bin + dx / BIN, z: it.z === -1e9 ? -1e9 : it.z + shiftZ(dx) }; });
  apart.sort(cmp).forEach((a, pos) => { items[a.i].alt = pos; });
}
if (process.argv.includes("--debug")) { const bi = items.findIndex((i) => i.kind === "blades"); const after = items.slice(bi + 1).filter((i) => i.kind === "f"); const by = {}; for (const i of after) { const key = i.mod + ":" + i.bin; by[key] = (by[key] || 0) + 1; } console.log("blades at", bi, "bin", items[bi].bin, JSON.stringify(by)); }
const runs = [];
for (const it of items) {
  const last = runs[runs.length - 1];
  if (last && last.mod === it.mod && last.kind === it.kind && last.cls === it.cls && it.kind !== "blades" && it.alt === last.altEnd + 1) { last.d += it.kind === "dot" ? "|" + it.d : it.d; last.altEnd = it.alt; }
  else runs.push({ ...it, altEnd: it.alt });
}
const runSvg = (r) => {
  const c = `m-${r.mod}`;
  if (r.kind === "f") return `<path class="f ${r.cls} ${c}" d="${r.d}"/>`;
  if (r.kind === "l") return `<path class="iso-line ${c}" data-tone="${r.cls}" d="${r.d}"/>`;
  if (r.kind === "dot") return `<g class="${c}">` + r.d.split("|").map((p) => { const [x, y] = p.split(" "); return `<circle class="tf-dot" cx="${x}" cy="${y}" r="0.55"/>`; }).join("") + "</g>";
  return `<g class="${c}"><g data-spin>${r.d}</g></g>`;
};
const shadow = `<path class="iso-halo" d="${k.haloOf({ x: -70, y: -38, w: 152, d: 76, r: 10 }, 0, 0.1, P)}" style="filter:blur(10px)"/>`;
if (process.argv.includes("--debug")) { const by = {}; for (const r of runs) { const key = r.mod + "." + r.kind; by[key] = (by[key] || 0) + r.d.length; } console.log(Object.entries(by).sort((a, b) => b[1] - a[1]).map(([k2, v]) => k2 + " " + Math.round(v / 1024) + "K").join(", ")); }
const ALT = runs.map((r, i) => [r.alt, i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
const body = shadow + `<g data-static>${stand()}</g><g data-runs>` + runs.map(runSvg).join("") + "</g>";
const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label: "A generic high-bypass turbofan on a display stand, its nacelle and core casing cut open. On hover the core slides apart along the shaft into fan, LP compressor, HP compressor, combustor, HP turbine, LP turbine and exhaust.",
  body,
});

// ---------- styles: tones from the kit's palette, a warm tint on the hot section, accent when lit ----------
const modCss = Object.keys(MODS).map((m) => `.tf svg[data-hot="${m}"] .m-${m}{--lit:30%}.tf svg[data-hot="${m}"] .iso-line.m-${m}{stroke:var(--accent)}`).join("");
const heatCss = Object.entries(HEAT).map(([m, v]) => `.tf .m-${m}{--heat:${v}%}`).join("");
const TF_CSS = `
.tf .f{stroke-width:.5;stroke-linejoin:round;fill:color-mix(in srgb,var(--accent) var(--lit,0%),color-mix(in srgb,var(--amber) var(--heat,0%),var(--sh)));stroke:color-mix(in srgb,var(--accent) var(--lit,0%),color-mix(in srgb,var(--amber) var(--heat,0%),var(--sh)))}
.tf .s0{--sh:var(--anatomy-shade-0)}.tf .s1{--sh:var(--anatomy-shade-1)}.tf .s2{--sh:var(--anatomy-shade-2)}.tf .s3{--sh:var(--anatomy-shade-3)}.tf .st{--sh:var(--anatomy-top)}
.tf .sx{--sh:var(--anatomy-faint)}
.tf .tf-dot{fill:var(--anatomy-dot)}
.tf svg .f,.tf svg .iso-line{transition:fill .25s,stroke .25s}
${heatCss}${modCss}
`;

// ---------- the live script (shared by the standalone page and the notebook embed) ----------
const cam = k.cameraOf(P);
const live = (sel) => `(function(){
  var root = document.querySelector("${sel}"); if (!root) return;
  var stage = root.querySelector(".iso-stage"), svg = stage.querySelector("svg"), cap = root.querySelector("[data-readout]"), face = root.closest(".face");
  var MODS = ${JSON.stringify(Object.fromEntries(Object.entries(MODS).map(([key, m]) => [key, { dx: m.dx, name: m.name, say: m.say }])))};
  var order = ${JSON.stringify(ORDER)};
  var still = typeof reduce !== "undefined" ? reduce : matchMedia("(prefers-reduced-motion: reduce)").matches;
  var SA = ${cam.sinA}, CA = ${cam.cosA}, SE = ${cam.sinE}, CE = ${cam.cosE}, K = ${cam.k};
  var C = ${JSON.stringify(at([XF, 0, ZA]))};
  // the fan turns in its own plane: screen axes of world y and z, conjugate a rotation by them
  var A = ${JSON.stringify((() => { const c = at([XF, 0, ZA]), y = at([XF, 1, ZA]), z = at([XF, 0, ZA + 1]); return [y[0] - c[0], y[1] - c[1], z[0] - c[0], z[1] - c[1]]; })())}, det = A[0] * A[3] - A[1] * A[2];
  var spinners = [].slice.call(svg.querySelectorAll("[data-spin]"));
  var mods = Object.keys(MODS).map(function(key){ return { key: key, els: [].slice.call(svg.querySelectorAll(".m-" + key)), dx: MODS[key].dx, e: 0, v: 0 }; });
  var target = 0, since = 0, frame = 0, last = 0, clock = 0, angle = 0, touring = !still, visible = false, idle = 0, lit, shown = "";
  function say(t){ if (t !== shown){ cap.textContent = t; shown = t; } }
  function light(key){
    if (key === lit) return; lit = key;
    if (key) svg.setAttribute("data-hot", key); else svg.removeAttribute("data-hot");
    if (!key){ say(target ? "7 modules apart" : "hover to take the core apart"); return; }
    say(MODS[key].name + " · " + MODS[key].say + " · ideal");
  }
  function turn(a){
    var c = Math.cos(a), s = Math.sin(a);
    // M = A R A^-1, with A = [[A0, A2], [A1, A3]] (columns are the screen images of y and z)
    var r00 = c, r01 = -s, r10 = s, r11 = c;
    var i00 = A[3] / det, i01 = -A[2] / det, i10 = -A[1] / det, i11 = A[0] / det;
    var t00 = A[0] * r00 + A[2] * r10, t01 = A[0] * r01 + A[2] * r11, t10 = A[1] * r00 + A[3] * r10, t11 = A[1] * r01 + A[3] * r11;
    var m00 = t00 * i00 + t01 * i10, m01 = t00 * i01 + t01 * i11, m10 = t10 * i00 + t11 * i10, m11 = t10 * i01 + t11 * i11;
    var e = C[0] - m00 * C[0] - m01 * C[1], f = C[1] - m10 * C[0] - m11 * C[1];
    var tr = "matrix(" + [m00, m10, m01, m11, e, f].map(function(v){ return v.toFixed(4); }).join(" ") + ")";
    spinners.forEach(function(g){ g.setAttribute("transform", tr); });
  }
  var SX = ${JSON.stringify((() => { const a = at([0, 0, 0]), b = at([1, 0, 0]); return [b[0] - a[0], b[1] - a[1]]; })())};
  function shift(dx){ return "translate(" + (dx * SX[0]).toFixed(2) + "px," + (dx * SX[1]).toFixed(2) + "px)"; }
  // two painter orders, assembled and apart: swap when the core is half way out
  var box = svg.querySelector("[data-runs]"), kids = [].slice.call(box.children), ALT = ${JSON.stringify(ALT)}, apartOrder = false;
  function arrange(on){ if (on === apartOrder) return; apartOrder = on; (on ? ALT.map(function(i){ return kids[i]; }) : kids).forEach(function(el){ box.appendChild(el); }); }
  function open(){ return visible && !(face && face.classList.contains("off")); }
  function tick(now){
    var dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60; last = now; since += dt;
    if (touring){ clock += dt; var c = clock % 13, want = c > 1.5 && c < 10 ? 1 : 0; if (want !== target){ target = want; since = 0; } light(target && c > 3 && c < 9.8 ? order[Math.floor((c - 3) / 0.85) % order.length] : null); }
    if (!still){ angle += dt * (0.9 + 0.5 * (mods[1] ? mods[1].e : 0)); turn(angle); }
    var moving = false;
    mods.forEach(function(m, i){
      var delay = (target ? i : mods.length - i) * 0.035, want = since > delay ? target : 1 - target;
      if (still){ m.e = want; m.v = 0; } else { for (var j = 0; j < 4; j++){ m.v += ((want - m.e) * 90 - m.v * 17) * dt / 4; m.e += m.v * dt / 4; } }
      if (Math.abs(want - m.e) < 0.0005 && Math.abs(m.v) < 0.0005){ m.e = want; m.v = 0; } else moving = true;
      var t = shift(m.dx * m.e); if (t !== m.t){ m.t = t; m.els.forEach(function(el){ el.style.transform = t; }); }
    });
    arrange(mods.reduce(function(s, m){ return s + m.e; }, 0) / mods.length > 0.5);
    frame = open() && (!still || touring || moving || since < 0.5) ? requestAnimationFrame(tick) : 0;
  }
  function run(){ if (!frame && open()){ last = 0; frame = requestAnimationFrame(tick); } }
  function set(t){ touring = false; clearTimeout(idle); if (t !== target){ target = t; since = 0; } if (!t || !lit){ lit = undefined; light(null); } run(); }
  new IntersectionObserver(function(e){ visible = e[e.length - 1].isIntersecting; run(); }, { rootMargin: "80px 0px" }).observe(stage);
  if (face) new MutationObserver(run).observe(face, { attributes: true, attributeFilter: ["class"] });
  stage.addEventListener("pointerenter", function(){ set(1); });
  stage.addEventListener("pointerleave", function(){ set(0); idle = setTimeout(function(){ touring = !still; clock = 0; run(); }, 4000); });
  stage.addEventListener("pointermove", function(e){ if (!target) set(1); var el = e.target.closest("[class*='m-']"), m = el && /m-(\\w+)/.exec(el.getAttribute("class")); light(m ? m[1] : null); });
  stage.addEventListener("keydown", function(e){
    if (e.key === "Enter" || e.key === " "){ e.preventDefault(); set(target ? 0 : 1); return; }
    if (e.key === "ArrowRight" || e.key === "ArrowLeft"){ e.preventDefault(); if (!target) set(1); var i = order.indexOf(lit), n = order.length; light(order[i < 0 ? (e.key === "ArrowRight" ? 0 : n - 1) : (i + (e.key === "ArrowRight" ? 1 : n - 1)) % n]); }
  });
  turn(0.3); light(null);
})();`;

const caption = `A generic high-bypass turbofan with no maker, model or logo; proportions are approximate. Readouts come from an ideal Brayton cycle with chosen ratios (fan ${CYCLE.FPR}, overall ${CYCLE.OPR}, bypass ${CYCLE.BPR}:1, turbine entry ${CYCLE.T4} K): illustrative, not a real engine.`;
const shared = readFileSync(join(HERE, "..", "wheel-corner", "embed.css"), "utf8");
const mapping = shared.slice(shared.indexOf("\n.wc{") + 1, shared.indexOf("[data-wheel-corner]")).split("\n").filter((l) => !l.includes("wc-pit")).join("\n");

if (process.argv.includes("--embed")) {
  // the strip has no room for the stand: fit to the engine alone, assembled and apart
  const eng = [];
  for (let x = -80 - 36; x <= 84; x += 4) for (let t = 0; t < 48; t++) { const r = x > -40 ? nacOut(Math.min(x, LIP)) : x > -62 ? cowlOut(x) : Math.max(4, hubR(x + 36)); eng.push(W3(x, r, (t * TAU) / 48)); }
  const pts = eng.map(at);
  let [x0, y0, x1, y1] = [Math.min(...pts.map((p) => p[0])), Math.min(...pts.map((p) => p[1])), Math.max(...pts.map((p) => p[0])), Math.max(...pts.map((p) => p[1]))];
  x0 -= 4; x1 += 4; y0 -= 4; y1 += 4;
  const w = x1 - x0, h = y1 - y0;
  const vb = [x0, y0, w, h].map((v) => Math.round(v * 10) / 10).join(" ");
  // the strip under the globe is wide and short: keep the engine to the right, the readout chip sits at the left
  const svgEmbed = k.figureSvg({ width: WIDTH, height: HEIGHT, label: "A generic high-bypass turbofan, its nacelle and core casing cut open. On hover the core slides apart along the shaft.", body: `<g data-runs>` + runs.map(runSvg).join("") + "</g>" });
  const figure = svgEmbed.replace(/viewBox="[^"]*"/, `viewBox="${vb}"`).replace("<svg ", '<svg preserveAspectRatio="xMaxYMid meet" ');
  const embedCss = [
    ".pg.pg-fanpage{display:flex;flex-direction:column}.pg.pg-fanpage>*{flex:none}",
    ".pg-fan{position:relative;flex:1 1 0!important;min-height:44px;margin:8px 0 18px;border:1px solid var(--line2);border-radius:8px;overflow:hidden;background:var(--paper)}",
    ".book-scroll.flat .pg-fan{flex:none!important;aspect-ratio:${(w / h).toFixed(2)}}",
    ".pg-fan .wc,.pg-fan .iso-stage{position:absolute;inset:0;outline:none}.pg-fan .iso-stage:focus-visible{box-shadow:inset 0 0 0 2px var(--accent);border-radius:8px}.pg-fan svg{width:100%;height:100%;display:block}",
    "[data-turbofan] .art-cap{white-space:nowrap;max-width:calc(100% - 16px);overflow:hidden;text-overflow:ellipsis}@media (max-width:420px){[data-turbofan] .art-cap{font-size:.56rem}}",
  ].join("");
  writeFileSync(join(HERE, "embed.css"), TF_CSS.trim() + "\n" + embedCss + "\n");
  writeFileSync(join(HERE, "embed.html"), `<div class="pg-fan" data-turbofan><div class="iso wc tf"><div class="iso-stage" tabindex="0" role="img" aria-label="A generic turbofan, cut open: hover, or press Enter, to slide the core apart; arrow keys step through the modules. Numbers are from an ideal cycle and are illustrative.">${figure}</div></div><span class="art-cap" data-readout>hover to take the core apart</span></div>`);
  writeFileSync(join(HERE, "embed.js"), live("[data-turbofan]"));
  console.log("wrote embed.css, embed.html, embed.js · viewBox", vb, "· svg", Math.round(figure.length / 1024), "KB");
  process.exit(0);
}

const plate = k.plateHtml({
  fig: "Fig 03",
  title: "Turbofan, cut open",
  hint: "Hover to take the core apart",
  readout: "hover to take the core apart",
  keys: [
    { mark: "lit", label: "The module under the pointer" },
    { mark: "raised", label: "Nacelle and stand stay put" },
  ],
  caption,
  body: `<div class="iso-stage" tabindex="0" role="img" aria-label="Turbofan: hover, or press Enter, to slide the core apart; arrow keys step through the modules">${svg}</div>`,
});
const CSS = `
body[data-theme="light"]{--bg:#f6f5f0;--paper:#fffefa;--text:#16191f;--text2:#4a505a;--text3:#737985;--line2:rgba(22,25,31,.16);--accent:#1d4ed8;--pink:#c8324b;--green:#2f7d5b;--amber:#a86a12}
body[data-theme="dark"]{--bg:#161a1d;--paper:#1e2327;--text:#ecebe4;--text2:#b3b6b8;--text3:#84898d;--line2:rgba(236,235,228,.16);--accent:#8db4ff;--pink:#ff8f8f;--green:#7fcf9f;--amber:#e3b56a}
body{background:var(--bg)}
.wc-toggle{font:500 12px/1 "JetBrains Mono",ui-monospace,monospace;color:var(--text2);background:var(--paper);border:1px solid var(--line2);border-radius:999px;padding:8px 14px;cursor:pointer;margin-bottom:16px}
`;
const toggle = `<button class="wc-toggle" type="button" onclick="const b=document.body;b.dataset.theme=b.dataset.theme==='light'?'dark':'light'">Switch theme</button>`;
const page = `<style>@import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap");${CSS}${TF_CSS}</style>${toggle}<div class="wc tf" data-turbofan>${plate}</div>`;
const file = theme === "light" ? "turbofan-light.html" : "turbofan.html";
let html = k.pageHtml({ title: "Turbofan", theme, body: page, script: kitScript() + live("[data-turbofan]"), width: 700 });
html = html.replace("</style>", `${mapping}</style>`);
writeFileSync(join(HERE, file), html);
console.log("wrote", file, "·", items.length, "items ·", runs.length, "runs ·", Math.round(svg.length / 1024), "KB svg · cycle", JSON.stringify(CYCLE));
