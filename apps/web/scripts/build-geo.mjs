#!/usr/bin/env node
// EnerMod Africa: build-time geometry for the "Editorial atlas" map plate (docs/design-system.md §6.6, §9.2–9.4, §10.1).
//
//   pnpm geo        → writes src/data/geo-africa.json (committed)
//
// Everything here is static: the projection, the graduated degree frame (about 280,000 projections
// to find where meridians and parallels cross the frame), the coastline merge, the graticule and the
// parallels. At runtime <AfricaMap> only picks a fill per country and scales the text (--k).
//
// Packages are resolved BY NAME from this app (d3-geo, topojson-client, world-atlas), never through
// .pnpm or absolute paths.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import {
  geoArea,
  geoAzimuthalEqualArea,
  geoContains,
  geoGraticule,
  geoPath,
} from "d3-geo";

const require = createRequire(import.meta.url);
const topojson = require("topojson-client");
const world = require("world-atlas/countries-110m.json");

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, "..");
const OUT = path.join(APP, "src/data/geo-africa.json");
const iso = JSON.parse(fs.readFileSync(path.join(APP, "src/data/iso.json"), "utf8"));

/* ── inputs ──────────────────────────────────────────────────────────────── */
// The 54 countries of the inventory plus Western Sahara (drawn, hatched: not in the inventory).
const AFRICA = new Set(
  ("DZA AGO BEN BWA BFA BDI CPV CMR CAF TCD COM COD COG DJI EGY GNQ ERI SWZ ETH GAB GMB GHA GIN GNB CIV KEN LSO LBR " +
    "LBY MDG MWI MLI MRT MUS MAR MOZ NAM NER NGA RWA STP SEN SYC SLE SOM ZAF SSD SDN TZA TGO TUN UGA ZMB ZWE ESH").split(" "),
);
// Island states absent from Natural Earth 1:110m: drawn as dots (lon, lat) with an ISO3 label.
// pos = where the label sits relative to the dot (n above, s below, e right, w left).
const ISLANDS = [
  { iso3: "CPV", ll: [-23.6, 15.1], pos: "n" },
  { iso3: "STP", ll: [6.6, 0.3], pos: "s" },
  { iso3: "COM", ll: [43.3, -11.7], pos: "e" },
  { iso3: "MUS", ll: [57.55, -20.25], pos: "s" },
  { iso3: "SYC", ll: [55.45, -4.6], pos: "n" },
];
// Natural Earth 110m has three features without an ISO numeric id. Fold them into their ISO3 so
// the Horn has no hole (Somaliland → Somalia); Cyprus and Kosovo matter only as context land.
const NAME_FIX = { Somaliland: "SOM", "N. Cyprus": "CYP", Kosovo: "XKX" };

const ROT = [-19, -2]; // centre 19°E 2°N
const TROPIC = 23.4362;
// Plate (§6.6): viewBox 600 × 640, frame x 42…560, y 24…612, graduated band 5 units.
const VW = 600, VH = 640, X0 = 42, Y0 = 24, X1 = VW - 40, Y1 = VH - 28, BAND = 5;

/* ── helpers ─────────────────────────────────────────────────────────────── */
const r1 = (v) => Math.round(v * 10) / 10;
const geoms = world.objects.countries.geometries;
const iso3Of = (g) =>
  (g.id !== undefined ? iso.numericToIso3[String(g.id).padStart(3, "0")] : NAME_FIX[g.properties?.name]) || "";

// group the TopoJSON geometries by ISO3 and merge each group (Somalia + Somaliland → one shape, no border)
const groups = new Map();
for (const g of geoms) {
  const k = iso3Of(g);
  if (!k || k === "ATA") continue;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(g);
}
const shapeOf = (k) => ({ type: "Feature", properties: { iso3: k }, geometry: topojson.merge(world, groups.get(k)) });
const africa = [...groups.keys()].filter((k) => AFRICA.has(k)).sort().map(shapeOf);
const others = [...groups.keys()].filter((k) => !AFRICA.has(k)).sort().map(shapeOf);
const coastline = topojson.merge(world, geoms.filter((g) => AFRICA.has(iso3Of(g))));

const missing = [...AFRICA].filter((k) => !groups.has(k)).sort();
const islandCodes = ISLANDS.map((i) => i.iso3).sort();
if (JSON.stringify(missing) !== JSON.stringify(islandCodes)) {
  throw new Error(`Unexpected set of countries absent from 110m: ${missing.join(", ")} (expected ${islandCodes.join(", ")})`);
}

/* ── 1. projection: continent AND island states inside the frame ─────────── */
const proj = geoAzimuthalEqualArea().rotate(ROT);
proj.fitExtent(
  [[X0 + 26, Y0 + 18], [X1 - 30, Y1 - 18]],
  { type: "FeatureCollection", features: [...africa, { type: "Feature", geometry: { type: "MultiPoint", coordinates: ISLANDS.map((i) => i.ll) } }] },
);
// A clipped copy for everything drawn inside the frame (context land, graticule, parallels): geometry
// outside the frame is dropped at build time, which keeps the JSON small.
const clipped = geoAzimuthalEqualArea().rotate(ROT).scale(proj.scale()).translate(proj.translate()).clipExtent([[X0, Y0], [X1, Y1]]);
const path1 = geoPath(proj).digits(1);
const pathClip = geoPath(clipped).digits(1);
// background layers (context land, graticule) are rounded to whole units: invisible at plate size, half the bytes
const pathBack = geoPath(clipped).digits(0);
const P = (ll) => proj(ll).map(r1);

/* ── 2. layers ───────────────────────────────────────────────────────────── */
const countries = africa.map((f) => ({ iso3: f.properties.iso3, d: path1(f), c: path1.centroid(f).map(r1) }));
// context land: every other country that reaches into the frame, as one path (each sub-path keeps its
// own outline, so the paper-coloured borders still show)
const context = others.map((f) => pathBack(f)).filter(Boolean).join("");
const graticule = pathBack(geoGraticule().step([10, 10]).extent([[-70, -80], [110, 80]])());
const parallel = (lat) => pathClip({ type: "LineString", coordinates: Array.from({ length: 181 }, (_, i) => [-70 + i, lat]) });
const parallels = { cancer: parallel(TROPIC), equator: parallel(0), capricorn: parallel(-TROPIC) };
// labels over the sea: Tropic of Cancer on the Red Sea side (right), the other two over the Atlantic (left)
const parallelLabels = {
  cancer: { x: X1 - 12, y: r1(proj([44, TROPIC])[1] - 5), a: "end" },
  equator: { x: X0 + 12, y: r1(proj([-24, 0])[1] - 5), a: "start" },
  capricorn: { x: X0 + 12, y: r1(proj([-24, -TROPIC])[1] - 5), a: "start" },
};
const coast = path1(coastline);
const islands = ISLANDS.map((i) => {
  const [x, y] = P(i.ll);
  return { iso3: i.iso3, x, y, pos: i.pos };
});

/* ── 3. graduated frame (§9.2): true 5° intervals along each edge ────────── */
function crossing(kind, val, edge) {
  let prev = null;
  for (let t = -80; t <= 80.001; t += 0.05) {
    const p = kind === "mer" ? proj([val, t]) : proj([t, val]);
    if (!p) { prev = null; continue; }
    const s = kind === "mer" ? p[1] - edge : p[0] - edge;
    if (prev && Math.sign(s) !== Math.sign(prev.s)) {
      const k = prev.s / (prev.s - s);
      return [prev.p[0] + k * (p[0] - prev.p[0]), prev.p[1] + k * (p[1] - prev.p[1])];
    }
    prev = { s, p };
  }
  return null;
}
let band = "";
const degrees = [];
for (const [edge, kind, side] of [[Y0, "mer", "t"], [Y1, "mer", "b"], [X0, "par", "l"], [X1, "par", "r"]]) {
  const horiz = side === "t" || side === "b";
  const [lo, hi] = kind === "mer" ? [-40, 75] : [-50, 50];
  const pts = [];
  for (let v = lo; v <= hi; v += 5) {
    const c = crossing(kind, v, edge);
    if (!c) continue;
    const pos = horiz ? c[0] : c[1];
    if (horiz ? pos < X0 || pos > X1 : pos < Y0 || pos > Y1) continue;
    pts.push([v, pos]);
  }
  pts.sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < pts.length - 1; i++) {
    if (((Math.round(pts[i][0] / 5) % 2) + 2) % 2 !== 0) continue; // every other 5° interval is ink
    const a = r1(pts[i][1]), len = r1(pts[i + 1][1] - pts[i][1]);
    if (horiz) band += `M${a} ${side === "t" ? Y0 : Y1 - BAND}h${len}v${BAND}h${-len}z`;
    else band += `M${side === "l" ? X0 : X1 - BAND} ${a}h${BAND}v${len}h${-BAND}z`;
  }
  for (const [v, pos] of pts) {
    if (v % 10 !== 0) continue;
    // runtime formats the label per locale ("10°E", "10° O"); axis: x = longitude, y = latitude
    degrees.push({ s: side, v, p: r1(pos) });
  }
}

/* ── 4. land raster for callouts (§6.6) ──────────────────────────────────── */
// One leader per map goes to the highest country. Where its label can sit depends on the label's
// measured width and on --k, so the runtime searches for the spot; it needs to know where the data
// is. This raster marks the 4-unit cells of the frame that fall on an African country (a label may
// cover sea or context land, never data). Bit-packed, row-major, base64.
const CELL = 4;
const NX = Math.ceil((X1 - X0) / CELL), NY = Math.ceil((Y1 - Y0) / CELL);
const bits = new Uint8Array(Math.ceil((NX * NY) / 8));
let landCells = 0;
for (let j = 0; j < NY; j++) {
  for (let i = 0; i < NX; i++) {
    const ll = proj.invert([X0 + (i + 0.5) * CELL, Y0 + (j + 0.5) * CELL]);
    if (ll && geoContains(coastline, ll)) {
      const n = j * NX + i;
      bits[n >> 3] |= 1 << (n & 7);
      landCells++;
    }
  }
}
const land = { cell: CELL, nx: NX, ny: NY, bits: Buffer.from(bits).toString("base64") };

/* ── 5. the mark (§10.1): the continent in a 40-unit plate ───────────────── */
function buildMark() {
  const big = {
    type: "MultiPolygon",
    coordinates: coastline.coordinates.filter((poly) => geoArea({ type: "Polygon", coordinates: poly }) > 0.002),
  };
  const pm = geoAzimuthalEqualArea().rotate(ROT).fitExtent([[7.0, 6.6], [33.0, 33.4]], big);
  const dp = (pts, tol) => {
    if (pts.length < 3) return pts;
    let dmax = 0, idx = 0;
    const [a, b] = [pts[0], pts[pts.length - 1]];
    for (let i = 1; i < pts.length - 1; i++) {
      const [x, y] = pts[i], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
      const d = Math.abs(dy * x - dx * y + b[0] * a[1] - b[1] * a[0]) / L;
      if (d > dmax) { dmax = d; idx = i; }
    }
    if (dmax <= tol) return [a, b];
    return [...dp(pts.slice(0, idx + 1), tol).slice(0, -1), ...dp(pts.slice(idx), tol)];
  };
  const dpRing = (r) => {
    const a = r[0];
    let k = 0, best = -1;
    r.forEach((p, i) => { const dd = Math.hypot(p[0] - a[0], p[1] - a[1]); if (dd > best) { best = dd; k = i; } });
    return [...dp(r.slice(0, k + 1), 0.2).slice(0, -1), ...dp(r.slice(k), 0.2)];
  };
  const rings = big.coordinates.map((poly) => poly[0].map((c) => pm(c))).map(dpRing).filter((r) => r.length > 3);
  const d = rings.map((r) => "M" + r.slice(0, -1).map(([x, y]) => `${r1(x)} ${r1(y)}`).join("L") + "Z").join("");
  const y = (lat) => Math.round(pm([19, lat])[1] * 100) / 100;
  return { d, eq: y(0), cancer: y(TROPIC), capricorn: y(-TROPIC) };
}

/* ── write ───────────────────────────────────────────────────────────────── */
const out = {
  $comment: "Generated by scripts/build-geo.mjs (pnpm geo) from world-atlas countries-110m. Do not edit.",
  viewBox: [VW, VH],
  frame: [X0, Y0, X1, Y1],
  bandWidth: BAND,
  countries,
  islands,
  context,
  graticule,
  parallels,
  parallelLabels,
  coast,
  band,
  degrees,
  land,
  mark: buildMark(),
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
const kb = (fs.statSync(OUT).size / 1024).toFixed(1);
console.log(`geo-africa.json: ${countries.length} countries, ${islands.length} island dots, ${degrees.length} degree labels, ${landCells}/${NX * NY} land cells, ${kb} KB`);
