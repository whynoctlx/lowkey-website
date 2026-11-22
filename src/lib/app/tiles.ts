import { glides, motion } from "./motion.svelte";

/** A `.tiles` grid: every item shows, in as many --tile-min columns as fit (`--cols`), the tiles sharing what is left
 *  over (`--tile`), so a row runs edge to edge. While the window is being resized nothing changes: the tiles keep their
 *  size, a widening row leaves room at its right, a narrowing one is clipped there. Once resizing stops for SETTLE ms
 *  every grid takes its new count and size at once and its tiles glide there in one move, what is below following
 *  (motion `glides`). A live change made every item jump or stretch at each step. */
const SETTLE = 120;
const grids = new Map<HTMLElement, string>();
/** Grids sized on their own (Home's half-size shortcuts): they keep their size and have no say in the page's. */
const ones = new WeakSet<HTMLElement>();
let timer = 0;
/** Held while the sidebar's edge is dragged or the body slides: the grids wait for the release. */
let held = false;
export function holdTiles(on: boolean) {
  held = on;
  if (!on && !timer) settle();
}
const ro = typeof ResizeObserver === "undefined" ? null : new ResizeObserver((entries) => entries.forEach((e) => hold(e.target as HTMLElement)));

/** The count and the filling size for the grid's width; `keeps(size)`: all its items sit in one row at that size, so
 *  a new width has nothing to rearrange and the size may stay. */
function fits(node: HTMLElement) {
  const cs = getComputedStyle(node);
  // --tile-k scales a grid's tiles (Home's half-size shortcuts); a calc() in --tile-min would come back unresolved.
  const min = (parseFloat(cs.getPropertyValue("--tile-min")) || 150) * (parseFloat(cs.getPropertyValue("--tile-k")) || 1);
  const gap = parseFloat(cs.columnGap) || 0;
  const width = node.clientWidth;
  // --tile-add: cards per row added to what fits (Home's setting, Settings › Home).
  const n = Math.max(1, Math.floor((width + gap) / (min + gap)) + (parseInt(cs.getPropertyValue("--tile-add")) || 0));
  const k = node.children.length;
  const keeps = (size: string) => !!size && k <= n && k * parseFloat(size) + (k - 1) * gap <= width + 0.5;
  return { n, tile: `${((width - (n - 1) * gap) / n).toFixed(2)}px`, keeps };
}

function apply(node: HTMLElement, f: { n: number; tile: string }) {
  grids.set(node, f.tile);
  node.style.setProperty("--cols", String(f.n));
  node.style.setProperty("--tile", f.tile);
  // Also on its parent, so what stands beside the grid (Home's shelf glyph) can line up with its covers.
  node.parentElement?.style.setProperty("--tile", f.tile);
}

/** The page (view) a grid is on: a leaving page still shows through its exit, and its size isn't the next one's. */
const pageOf = (node: HTMLElement) => node.closest(".view");
/** The size the grids of `node`'s page share now ("" before the first). */
const shared = (node: HTMLElement) => [...grids].find(([g, tile]) => tile && !ones.has(g) && pageOf(g) === pageOf(node))?.[1] ?? "";

/** A resize: the first fit (taking the page's size if its items keep it) or no motion apply at once; otherwise the
 *  count waits until resizing stops. */
function hold(node: HTMLElement) {
  if (!grids.has(node)) return;
  if (!grids.get(node) || !motion.ms) {
    const f = fits(node);
    const size = shared(node);
    return apply(node, !ones.has(node) && f.keeps(size) ? { n: f.n, tile: size } : f);
  }
  clearTimeout(timer);
  timer = window.setTimeout(settle, SETTLE);
}

function settle() {
  timer = 0;
  if (held) return;
  // One size for each page: it follows the width alone (never what it was before), so every row ends at the
  // right edge, unless every grid holds all its items in one row at the current size, when it stays.
  const all = [...grids].map(([node, tile]) => ({ node, tile, f: fits(node), own: ones.has(node), page: pageOf(node), size: shared(node) }));
  const keeps = new Map<Element | null, boolean>();
  for (const g of all) keeps.set(g.page, (keeps.get(g.page) ?? true) && (g.own || g.f.keeps(g.size)));
  const changed = all.flatMap(({ node, tile, f, own, page, size }) => {
    const next = { n: f.n, tile: keeps.get(page) && !own ? size : f.tile };
    return next.tile !== tile || node.style.getPropertyValue("--cols") !== String(next.n) ? [[node, next] as const] : [];
  });
  if (changed.length) glides(changed.map(([node]) => node), () => changed.forEach(([node, f]) => apply(node, f)));
}

/** Tokens changed (a density): the grids' boxes may keep their size, so no resize reports it; fit them again at once. */
export function retile() {
  for (const node of grids.keys()) {
    grids.set(node, "");
    apply(node, fits(node));
  }
}

export function tiles(node: HTMLElement, own = false) {
  grids.set(node, "");
  if (own) ones.add(node);
  ro?.observe(node);
  return {
    destroy() {
      ro?.unobserve(node);
      grids.delete(node);
    },
  };
}
