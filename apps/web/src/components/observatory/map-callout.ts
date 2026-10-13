/** Callout placement on the Africa plate: one leader line to the highest country.
 *
 *  The label's size depends on its measured text and on the text factor --k, so the spot is found
 *  at runtime. Candidates cover the whole plate on a 6-unit grid, with the label west of the
 *  country (anchored at its left edge, "start") or east of it ("end"). Each candidate is scored:
 *  a label may cover sea or context land but never data (the land raster from build-geo.mjs), it
 *  must clear the island and parallel labels, and the leader should be short and cross little land.
 *  Plain module; no React. */

export type Box = [number, number, number, number]; // x0, y0, x1, y1 in viewBox units
/** x: the label's anchor (left edge for "start", right edge for "end"); y: the leader's horizontal,
 *  line 1 sits on it and line 2 under it; ex: the elbow where the diagonal from the country meets it. */
export type CalloutPlacement = { x: number; y: number; ex: number; a: "start" | "end" };
export type LandRaster = { cell: number; nx: number; ny: number; bits: string };

type LandIndex = { cellsIn: (b: Box) => number; isLand: (x: number, y: number) => boolean };

const cache = new WeakMap<LandRaster, LandIndex>();

/** Decodes the bit-packed raster once and builds a summed-area table (land cells in a box in O(1)). */
function landIndex(land: LandRaster, x0: number, y0: number): LandIndex {
  const hit = cache.get(land);
  if (hit) return hit;
  const { cell, nx, ny } = land;
  const raw = atob(land.bits);
  const grid = new Uint8Array(nx * ny);
  for (let n = 0; n < nx * ny; n++) grid[n] = (raw.charCodeAt(n >> 3) >> (n & 7)) & 1;
  const W = nx + 1;
  const sat = new Int32Array(W * (ny + 1));
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) sat[(j + 1) * W + i + 1] = grid[j * nx + i] + sat[j * W + i + 1] + sat[(j + 1) * W + i] - sat[j * W + i];
  }
  const index: LandIndex = {
    cellsIn: ([bx0, by0, bx1, by1]) => {
      const i0 = Math.max(0, Math.floor((bx0 - x0) / cell)), j0 = Math.max(0, Math.floor((by0 - y0) / cell));
      const i1 = Math.min(nx, Math.ceil((bx1 - x0) / cell)), j1 = Math.min(ny, Math.ceil((by1 - y0) / cell));
      if (i1 <= i0 || j1 <= j0) return 0;
      return sat[j1 * W + i1] - sat[j0 * W + i1] - sat[j1 * W + i0] + sat[j0 * W + i0];
    },
    isLand: (x, y) => {
      const i = Math.floor((x - x0) / cell), j = Math.floor((y - y0) / cell);
      return i >= 0 && j >= 0 && i < nx && j < ny && grid[j * nx + i] === 1;
    },
  };
  cache.set(land, index);
  return index;
}

const overlaps = (a: Box, b: Box) => a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1];

export function placeCallout({
  at,
  width,
  k,
  obstacles,
  soft,
  frame,
  land,
}: {
  /** the country's centroid (or island dot) */
  at: [number, number];
  /** measured width of the longer label line, viewBox units */
  width: number;
  /** text factor --k */
  k: number;
  /** boxes the label must clear (island and parallel labels) */
  obstacles: Box[];
  /** boxes the label should rather not cross (the parallels themselves) */
  soft?: Box[];
  frame: [number, number, number, number];
  land: LandRaster;
}): CalloutPlacement | null {
  // a label that fits nowhere over sea (a long name on a narrow plate) may cover a little land;
  // every covered cell still costs, so open sea wins whenever it is close enough
  for (const maxCover of [6, 24, 96]) {
    const p = search({ at, width, k, obstacles, soft, frame, land }, maxCover);
    if (p) return p;
  }
  return null;
}

type SearchArgs = { at: [number, number]; width: number; k: number; obstacles: Box[]; soft?: Box[]; frame: [number, number, number, number]; land: LandRaster };

function search({ at, width, k, obstacles, soft = [], frame, land }: SearchArgs, maxCover: number): CalloutPlacement | null {
  const [X0, Y0, X1, Y1] = frame;
  const idx = landIndex(land, X0, Y0);
  const [cx, cy] = at;
  const W = width + 4;
  // text extent around the leader: line 1 (12.5px) above it, line 2 (13px, dy 1.25em) under it
  const up = 16 * k, down = 21 * k;
  // land cells a segment passes over, sampled every 2 units
  const crossed = (xa: number, ya: number, xb: number, yb: number) => {
    const n = Math.max(1, Math.ceil(Math.hypot(xb - xa, yb - ya) / 2));
    let c = 0;
    for (let i = 0; i <= n; i++) if (idx.isLand(xa + ((xb - xa) * i) / n, ya + ((yb - ya) * i) / n)) c++;
    return c / 2;
  };
  let best: (CalloutPlacement & { cost: number }) | null = null;
  for (const a of ["start", "end"] as const) {
    for (let x = X0 + 14; x <= X1 - 14; x += 6) {
      const L = a === "start" ? x : x - W, R = a === "start" ? x + W : x;
      if (L < X0 + 8 || R > X1 - 8) continue;
      // the elbow lies beyond the label and short of the country
      const lo = a === "start" ? R + 6 : cx + 8;
      const hi = a === "start" ? cx - 8 : L - 6;
      if (lo > hi) continue;
      for (let ly = Y0 + 8 + up; ly <= Y1 - 8 - down; ly += 6) {
        const box: Box = [L, ly - up, R, ly + down];
        const cover = idx.cellsIn(box);
        if (cover > maxCover) continue;
        if (obstacles.some((o) => overlaps(o, box))) continue;
        const ideal = a === "start" ? cx - Math.abs(cy - ly) : cx + Math.abs(cy - ly); // 45° when there is room
        const ex = Math.min(Math.max(ideal, lo), hi);
        const diag = Math.hypot(ex - cx, ly - cy), horiz = Math.abs(ex - x);
        const base = cover * 40 + soft.filter((o) => overlaps(o, box)).length * 30 + diag + horiz * 0.25;
        if (best && base >= best.cost) continue;
        const cost = base + crossed(cx, cy, ex, ly) * 3 + crossed(ex, ly, x, ly) * 6;
        if (!best || cost < best.cost) best = { cost, x, y: ly, ex: Math.round(ex * 10) / 10, a };
      }
    }
  }
  if (!best) return null;
  return { x: best.x, y: best.y, ex: best.ex, a: best.a };
}
