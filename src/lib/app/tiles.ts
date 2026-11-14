import { glides, motion } from "./motion.svelte";

/** A `.tiles` grid: every item shows. This measures how many --tile-min columns fit and sets `--cols` and the fill: what is left over first widens the
 *  gap between columns (`--gap-x`, from --sp-2 up to --sp-5), then the tiles (`--tile`), so a row reaches both edges.
 *  While the window is being resized nothing changes (a narrowing grid that no longer fits is clipped and fades at its
 *  right edge, `data-squeezed`): no tile or gap resizes with the window. Once resizing stops for SETTLE ms every grid
 *  takes its new count, gap and tile size at once and its tiles glide there in one move, what is below following
 *  (motion `glides`). Live reflow sent dozens of tiles flying diagonally through each other. */
const SETTLE = 80;
type Grid = { n: number; min: number; tile: number };
const grids = new Map<HTMLElement, Grid>();
let timer = 0;
/** Held while the sidebar's edge is dragged: a pause mid-drag isn't the end of the resize, so the grids wait for the
 *  release (settling at every pause made them glide back and forth, a wiggle). */
let held = false;
export function holdTiles(on: boolean) {
  held = on;
  if (!on && !timer) settle();
}
const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => entries.forEach((e) => hold(e.target as HTMLElement)));

function measure(node: HTMLElement) {
  const cs = getComputedStyle(node);
  const px = (v: string, d: number) => parseFloat(cs.getPropertyValue(v)) || d;
  const min = px("--tile-min", 150);
  const gap = px("--sp-2", 8);
  return { min, gap, max: px("--sp-5", 24), width: node.clientWidth, fits: Math.max(1, Math.floor((node.clientWidth + gap) / (min + gap))) };
}

/** The gap and tile size that make `n` columns fill `width`: the gap grows first, up to `max`, then the tiles. */
export function fill(n: number, width: number, min: number, gap: number, max: number) {
  const spare = width - n * min - (n - 1) * gap;
  if (spare <= 0) return { gap, tile: min };
  const g = n > 1 ? Math.min(max, gap + spare / (n - 1)) : gap;
  return { gap: g, tile: (width - (n - 1) * g) / n };
}

const set = (node: HTMLElement, k: string, v: string) => node.style.getPropertyValue(k) !== v && node.style.setProperty(k, v);

function apply(node: HTMLElement, g: Grid, n: number) {
  const m = measure(node);
  const { gap, tile } = fill(n, m.width, m.min, m.gap, m.max);
  set(node, "--cols", String(n));
  set(node, "--gap-x", `${gap.toFixed(2)}px`);
  set(node, "--tile", `${tile.toFixed(2)}px`);
  node.removeAttribute("data-squeezed");
  Object.assign(g, { n, min: m.min, tile });
}

/** A resize: the first fit, a new tile size (density, scale) or no motion apply at once. Otherwise nothing changes
 *  until resizing stops: a widening grid leaves room at its right, a narrowing one is clipped there. */
function hold(node: HTMLElement) {
  const g = grids.get(node);
  if (!g) return;
  const m = measure(node);
  if (!g.n || m.min !== g.min || !motion.ms) return apply(node, g, m.fits);
  const gap = parseFloat(node.style.getPropertyValue("--gap-x")) || m.gap;
  const over = g.n * g.tile + (g.n - 1) * gap > m.width + 0.5;
  if (node.hasAttribute("data-squeezed") !== over) node.toggleAttribute("data-squeezed", over);
  clearTimeout(timer);
  timer = window.setTimeout(settle, SETTLE);
}

function settle() {
  timer = 0;
  if (held) return;
  const changed = [...grids].flatMap(([node, g]) => {
    const m = measure(node);
    const f = fill(m.fits, m.width, m.min, m.gap, m.max);
    const gap = parseFloat(node.style.getPropertyValue("--gap-x")) || m.gap;
    return m.fits !== g.n || Math.abs(f.tile - g.tile) >= 0.5 || Math.abs(f.gap - gap) >= 0.5 ? [{ node, g, n: m.fits }] : [];
  });
  if (changed.length) glides(changed.map((c) => c.node), () => changed.forEach(({ node, g, n }) => apply(node, g, n)));
}

/** Tokens changed (a density): the grids' boxes may keep their size, so no resize reports it; measure them again. */
export function retile() {
  for (const node of grids.keys()) hold(node);
}

export function tiles(node: HTMLElement) {
  grids.set(node, { n: 0, min: 0, tile: 0 });
  ro?.observe(node);
  return {
    destroy() {
      ro?.unobserve(node);
      grids.delete(node);
    },
  };
}
