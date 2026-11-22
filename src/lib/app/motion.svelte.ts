import { remember } from "./settings";
// The animation engine (AGENTS.md "Motion"). Every animation in the app goes through here:
// - CSS uses the time tokens --m-1 … --m-7, all derived from --motion (this file sets it), never literal ms.
// - Elements that appear or disappear use `in:enter` and `out:exit` together: a start and an end, always.
// The speed is one setting in ms (Settings › Appearance › Interface, localStorage `motion`), 0 turns motion off.
import { cubicOut } from "svelte/easing";

export const MOTION_DEFAULT = 200;
export const MOTION_MAX = 400;

/** `reduce` follows the system's Reduce Motion live, so a switch while the app runs applies at once. */
export const motion = $state({ ms: MOTION_DEFAULT, reduce: false });

const reduced = () => motion.reduce;

export function setMotion(ms: number) {
  motion.ms = Math.max(0, Math.min(MOTION_MAX, Math.round(ms)));
  document.documentElement.style.setProperty("--motion", `${motion.ms}ms`);
  remember("motion", String(motion.ms));
}

export function initMotion() {
  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  motion.reduce = mq.matches;
  mq.addEventListener("change", (e) => (motion.reduce = e.matches));
  let ms = MOTION_DEFAULT;
  try {
    const v = localStorage.getItem("motion");
    if (v !== null && Number.isFinite(+v)) ms = +v;
  } catch {}
  setMotion(ms);
}

type Opts = {
  /** Travel in px (positive = from/to below). */
  y?: number;
  /** Sideways travel in px (positive = from/to the right). */
  x?: number;
  /** Start/end scale, 1 = none. */
  scale?: number;
  /** Duration as a multiple of the speed setting. */
  f?: number;
  /** Delay as a multiple of the speed setting. */
  delay?: number;
  /** Grow from / shrink to zero height, so the content around follows instead of jumping. */
  collapse?: boolean;
  /** A dialog in the top layer: fades and travels `y` by layout (--dy, added to its inset), never a transform, since
   *  WebKit draws a transformed top-layer element without the page zoom (UI scale): it opened small and stretched. */
  sheet?: boolean;
};

/** Where a leaving element stands as it starts to leave: its opacity, lift and scale as drawn, so one still entering
 *  leaves from there. `in:` and `out:` are two transitions in Svelte; an exit doesn't stop the entrance, it starts at
 *  rest, so a page swapped mid-entrance snapped full and in place before fading (switching playlists quickly). */
type From = { o: number; tx: number; ty: number; s: number };

function run(node: Element, { x = 0, y = 0, scale = 1, f = 1, delay = 0, collapse = false, sheet = false }: Opts, intro = false, from: From = { o: 1, tx: 0, ty: 0, s: 1 }) {
  const still = reduced();
  const h = collapse ? (node as HTMLElement).offsetHeight : 0;
  // Collapsing shrinks the padding and margins with the height (and lifts min-height), or a padded row stops at its
  // padding and min-height, then jumps the rest of the way at the end.
  const box = collapse ? getComputedStyle(node) : null;
  const edges = box ? (["padding-top", "padding-bottom", "margin-top", "margin-bottom"] as const).map((k) => [k, parseFloat(box.getPropertyValue(k)) || 0] as const) : [];
  // A sheet: opacity in keyframes; --dy and its backdrop's --t per frame, since WebKit doesn't animate custom
  // properties in keyframes. An entering sheet gets its start state at once: the first tick comes a frame late.
  if (sheet) {
    const el = node as HTMLElement;
    const tick = (t: number, u: number) => {
      el.style.setProperty("--t", String(t));
      el.style.setProperty("--dy", `${still ? 0 : u * y}px`);
    };
    if (intro) tick(still || !motion.ms ? 1 : 0, 1);
    return { duration: motion.ms * f, delay: motion.ms * delay, easing: cubicOut, css: (t: number) => `opacity:${t};`, tick };
  }
  return {
    duration: motion.ms * f,
    delay: motion.ms * delay,
    easing: cubicOut, // quintOut spends most of the change in the first 50 ms, so a page swap read as a cut
    css: (t: number, u: number) =>
      `opacity:${t * from.o};--t:${t};` +
      (still || (!x && !y && scale === 1 && !from.tx && !from.ty && from.s === 1) ? "" : `transform:translate(${from.tx + u * x}px, ${from.ty + u * y}px) scale(${from.s + (scale - from.s) * u});`) +
      // border-box: `h` is the offsetHeight, padding included; content-box added the padding again, so a padded
      // element grew past its size and dropped back at the end.
      (collapse ? `box-sizing:border-box;height:${t * h}px;min-height:0;overflow:hidden;` + edges.map(([k, v]) => `${k}:${t * v}px;`).join("") : ""),
  };
}

/** The start: fades in, rising `y` px and growing from `scale`. Pair it with `out:exit`. */
export const enter = (node: Element, o: Opts = {}) => run(node, { y: 8, ...o }, true);

/** The end: the start played back, at the same speed. Unless it collapses, the leaving element is pinned
 *  where it stands (absolute, same box), so what replaces it takes its place at once instead of stacking below. */
export function exit(node: Element, o: Opts = {}) {
  const el = node as HTMLElement;
  // Read before pinning: an entrance still running is in the computed style.
  const cs = getComputedStyle(el);
  const m = cs.transform === "none" ? null : new DOMMatrixReadOnly(cs.transform);
  const from = { o: parseFloat(cs.opacity) || 0, tx: m?.m41 ?? 0, ty: m?.m42 ?? 0, s: m?.a ?? 1 };
  // One already out of the flow (absolute, fixed) stays as it is: pinned to its rounded offsetWidth, a text sized by
  // its content wrapped onto a second line as it left.
  if (!o.collapse && el.offsetParent && cs.position !== "absolute" && cs.position !== "fixed") {
    const { offsetTop: top, offsetLeft: left, offsetWidth: width, offsetHeight: height } = el;
    Object.assign(el.style, { position: "absolute", top: `${top}px`, left: `${left}px`, width: `${width}px`, height: `${height}px`, margin: "0", pointerEvents: "none" });
  }
  return run(node, { y: -4, ...o }, false, from);
}

/** One observer for every marquee (a track list holds dozens): each observed box runs its marquee's fit. */
const fits = new WeakMap<Element, () => void>();
let mqRo: ResizeObserver | undefined;
const mqObserver = () => (mqRo ??= new ResizeObserver((es) => new Set(es.map((e) => fits.get(e.target))).forEach((f) => f?.())));

/** A line too long for its box glides to its end and back (.marquee in +page.svelte), only while `on` (playing); hover
 *  holds it so its links can be clicked. Measured on resize only: no timers. The first child is what moves. */
export function marquee(node: HTMLElement, on: boolean) {
  const inner = node.firstElementChild as HTMLElement | null;
  const fit = () => {
    const d = inner ? inner.scrollWidth - node.clientWidth : 0;
    node.classList.toggle("mq-on", (on || !!ending) && d > 1 && motion.ms > 0);
    node.style.setProperty("--mq", `${-Math.max(0, d)}px`);
    // About 30px a second across, never under four --m-7 steps (the holds at each end included).
    node.style.setProperty("--mq-n", String(Math.max(4, d / 13)));
  };
  const ro = mqObserver();
  const boxes = inner ? [node, inner] : [node];
  for (const b of boxes) fits.set(b, fit), ro.observe(b);
  // The glide's own leg in WAAPI: back to the start once stopped, or on to the end when it starts again mid-way back.
  let leg: Animation | null = null;
  // The CSS glide let run to the start after a stop that came while it was already gliding back.
  let ending: Animation | null = null;
  return {
    update(v: boolean) {
      if (ending) {
        // Asked to glide again before it got home: it just keeps going, as if never stopped.
        const a = ending;
        ending = null;
        a.onfinish = null;
        a.effect?.updateTiming({ iterations: Infinity });
        if (v) return void ((on = v), fit());
      }
      // Stopped while already gliding back (an odd, reversed iteration, between its holds): the CSS glide finishes
      // this leg itself and ends at its 20 % point, home, instead of a new leg from rest (that stalled, then sped up).
      const css = !v && !leg ? inner?.getAnimations().find((a) => a instanceof CSSAnimation) : undefined;
      const c = css?.effect?.getComputedTiming();
      if (css && c && c.currentIteration! % 2 === 1 && c.progress! > 0.2 && c.progress! <= 0.8) {
        on = false;
        ending = css;
        css.effect!.updateTiming({ iterations: c.currentIteration! + 0.8 });
        css.onfinish = () => ((ending = null), fit());
        return;
      }
      // Where the line stands now (mid-glide, or mid-way back), so neither stopping nor starting again jumps.
      const x = inner && (leg || node.classList.contains("mq-on")) ? new DOMMatrix(getComputedStyle(inner).transform).m41 : 0;
      leg?.cancel();
      leg = null;
      node.classList.remove("mq-back");
      if (inner) inner.style.animationDelay = "";
      on = v;
      fit();
      // A peek starting from rest runs its first leg here too, so it can leave already moving (below).
      const peekStart = v && x >= 0 && node.classList.contains("peek");
      if (!inner || (x >= 0 && !peekStart)) return;
      const d = Math.max(inner.scrollWidth - node.clientWidth, 1);
      // One iteration of the CSS glide (.marquee: --m-7 × --mq-n, a peek 1.5 × that); the move itself is its middle 60 %.
      const t = motion.ms * 3 * Math.max(4, d / 13) * (node.classList.contains("peek") ? 1.5 : 1);
      const easing = getComputedStyle(node).getPropertyValue("--ease-glide").trim() || "ease-in-out";
      if (node.classList.contains("mq-on")) {
        // Started again on the way back: it glides on from here to the end, and the CSS glide takes over there
        // at its hold at the end (80 % of an iteration), so it never starts over.
        const ms = t * 0.6 * Math.min(1, (d + x) / d);
        // A peek waits a beat (two --m-4 steps) before it sets off, so a pointer passing over doesn't stir every line.
        const wait = peekStart ? motion.ms * 2 : 0;
        inner.style.animationDelay = `${ms + wait - t * 0.8}ms`;
        // From rest under the pointer it eases off gently but soon gets going (the glide's symmetric in-out curve crept for
        // a second), then eases into the hold at the end as the CSS glide does.
        leg = inner.animate([{ transform: `translateX(${x}px)` }, { transform: `translateX(${-d}px)` }], { duration: ms, delay: wait, easing: peekStart ? "cubic-bezier(0.3, 0, 0.4, 1)" : easing });
      } else if (!v) {
        // Stopped mid-glide (a card left by the pointer): it glides back from where it stands, not a jump to the start.
        // Meanwhile .mq-back keeps the line at full width.
        node.classList.add("mq-back");
        leg = inner.animate([{ transform: `translateX(${x}px)` }, { transform: "none" }], { duration: t * 0.6 * Math.min(1, -x / d), easing });
        leg.onfinish = () => node.classList.remove("mq-back");
      }
    },
    destroy: () => boxes.forEach((b) => (ro.unobserve(b), fits.delete(b))),
  };
}

/** The floating player's width (+page.svelte): as wide as `bar` wants (measured unbounded, so no container query
 *  trims it; the dock's CSS max-width keeps it inside the body). A new width glides on --ease over --m-4, the one
 *  animated width (AGENTS.md); meanwhile the bar already has its final size, so nothing inside reflows each frame, and
 *  its parts glide from where they stood (transform). A fit asking for the width it already glides to lets it run on.
 *  The first fit, and any with no motion, lands at once. */
let dockRun: Animation | null = null;
let dockTo = 0;
export function fitFloat(dock: HTMLElement, bar: HTMLElement, on: boolean) {
  // Where it all stands as drawn now (a glide under way included), read before the glide stops.
  const parts = [...bar.children] as HTMLElement[];
  const before = parts.map((p) => p.getBoundingClientRect().left);
  const shown = dock.style.width ? dock.getBoundingClientRect().width : 0;
  const run = dockRun;
  const at = run?.playState === "running" ? run.currentTime : null;
  if (run) (run.onfinish = null), run.cancel();
  dockRun = null;
  bar.style.width = "";
  if (!on) return void ((dock.style.width = ""), (dockTo = 0));
  dock.style.maxWidth = "none";
  dock.style.width = "9999px";
  bar.style.width = "max-content";
  const want = Math.ceil(bar.getBoundingClientRect().width);
  bar.style.width = dock.style.maxWidth = "";
  dock.style.width = `${want}px`;
  const end = dock.getBoundingClientRect().width;
  const hold = (r: Animation) => {
    dockRun = r;
    // The bar keeps its final width while the dock glides around it; then it follows the dock again.
    bar.style.width = `${end}px`;
    r.onfinish = () => dockRun === r && ((bar.style.width = ""), (dockRun = null));
  };
  // Asked again for where it already goes (a second change in one song): the glide carries on untouched.
  if (run && at != null && want === dockTo) {
    run.currentTime = at;
    run.play();
    return hold(run);
  }
  dockTo = want;
  if (!shown || Math.abs(shown - end) < 1 || !motion.ms) return;
  const timing = { duration: motion.ms, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }; // --ease, --m-4
  hold(dock.animate([{ width: `${shown}px` }, { width: `${end}px` }], timing));
  // Centred in the dock, the bar's parts stand at their final places at once: each glides there from where it stood.
  parts.forEach((p, i) => {
    p.getAnimations().forEach((a) => a.id === "dock" && a.cancel());
    const dx = before[i] - p.getBoundingClientRect().left;
    if (Math.abs(dx) > 0.5 && !reduced()) p.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], { ...timing, id: "dock" });
  });
}

/** Fake-smooth progress: while `ms` > 0 the progress fill runs linearly from `from` (0–1) to the end in `ms`, as
 *  compositor animations (Web Animations), over whatever the clock sets underneath. A new report restarts them; `ms` 0
 *  (paused, dragging) cancels them and the live value shows. Nothing is re-created, so the input under them is untouched. */
export function glide(node: HTMLElement, o: { from: number; ms: number }) {
  let runs: Animation[] = [];
  const set = ({ from, ms }: { from: number; ms: number }) => {
    runs.forEach((a) => a.cancel());
    runs = [];
    if (!(ms > 0)) return;
    const timing = { duration: ms, easing: "linear", fill: "forwards" } as const;
    // The fill slides in from the left (.lit) while its content slides back the same (.lit-in), so it stays put.
    const lit = node.querySelector(".lit");
    const litIn = node.querySelector(".lit-in");
    if (lit) runs.push(lit.animate([{ transform: `translateX(${(from - 1) * 100}%)` }, { transform: "translateX(0%)" }], timing));
    if (litIn) runs.push(litIn.animate([{ transform: `translateX(${(1 - from) * 100}%)` }, { transform: "translateX(0%)" }], timing));
  };
  set(o);
  return { update: set, destroy: () => set({ from: 0, ms: 0 }) };
}

/** The sidebar's glide (+page.svelte): each element already stands where the change puts it and slides there from
 *  its `dx` px aside, on --ease over --m-4, transform only; `fade` fades in (1) or out (-1) beside them.
 *  `done` runs when all rest, or at once with no motion. */
export function slide(moves: [HTMLElement, number][], fade: { el: HTMLElement; dir: 1 | -1 } | null, done: () => void) {
  if (!motion.ms || reduced()) return done();
  const timing = { id: "slide", duration: motion.ms, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }; // --ease
  const runs = moves.filter(([, dx]) => Math.abs(dx) > 0.5).map(([el, dx]) => el.animate([{ transform: `translateX(${dx}px)` }, { transform: "none" }], timing));
  if (fade) runs.push(fade.el.animate([{ opacity: fade.dir > 0 ? 0 : 1 }, { opacity: fade.dir > 0 ? 1 : 0 }], { ...timing, fill: "forwards" }));
  Promise.all(runs.map((a) => a.finished)).then(done, () => {});
}

/** One layout change, animated (FLIP): records where the tiles of `grids` and everything below the grids (up to their
 *  scroller) stand, runs `change`, then glides each from its old place to its new one. Only what is on screen moves.
 *  Used by the sidebar (Library.svelte). */
/** `scale` off: a resized element only moves (a section a row joined or left isn't stretched). */
export function glides(grids: HTMLElement[], change: () => void, scale = true) {
  if (!motion.ms || reduced()) return change();
  const scroller = grids[0] && findScroller(grids[0]);
  const view = scroller?.getBoundingClientRect() ?? { top: 0, bottom: innerHeight };
  const els = new Set<HTMLElement>();
  for (const g of grids) {
    for (const k of g.children) els.add(k as HTMLElement);
    for (let el: Element | null = g; el && el !== scroller && el.parentElement; el = el.parentElement)
      for (let s = el.nextElementSibling; s; s = s.nextElementSibling) els.add(s as HTMLElement);
  }
  const list = [...els];
  // Where each is seen now (an unfinished glide included), so a new glide carries on from there instead of jumping.
  const before = list.map((el) => el.getBoundingClientRect());
  for (const el of list) el.getAnimations().forEach((a) => a.id === "glide" && a.cancel());
  change();
  const after = list.map((el) => el.getBoundingClientRect());
  // Page deltas; an element inside another that moves (a section below, its own grid's tiles) moves only by the
  // difference, since its transform adds to its parent's.
  const delta = new Map(list.map((el, i) => [el, [before[i].left - after[i].left, before[i].top - after[i].top]]));
  const timing = { id: "glide", duration: motion.ms, easing: "cubic-bezier(0.33, 1, 0.68, 1)" }; // cubicOut, as enter/exit
  const seen = (r: DOMRect) => r.bottom > view.top - 100 && r.top < view.bottom + 100;
  list.forEach((el, i) => {
    let [dx, dy] = delta.get(el)!;
    for (let p = el.parentElement; p && p !== scroller; p = p.parentElement) {
      const d = delta.get(p as HTMLElement);
      if (d) {
        dx -= d[0];
        dy -= d[1];
        break;
      }
    }
    // An element that changed size also scales from its old size, from its top-left corner.
    const sx = after[i].width ? before[i].width / after[i].width : 1;
    const sy = after[i].height ? before[i].height / after[i].height : 1;
    const scaled = scale && (Math.abs(sx - 1) > 0.005 || Math.abs(sy - 1) > 0.005);
    if ((Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5 || scaled) && (seen(before[i]) || seen(after[i])))
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` + (scaled ? ` scale(${sx}, ${sy})` : ""), transformOrigin: "0 0" },
          { transform: "none", transformOrigin: "0 0" },
        ],
        timing,
      );
  });
}

function findScroller(node: Element) {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const o = getComputedStyle(el).overflowY;
    if (o === "auto" || o === "scroll") return el;
  }
  return null;
}

/** A skip button's answer to a click: its arrow (`.fill` in the glyph) darts `dx` px the way it skips and springs back,
 *  while the bar holds still. Off under reduced motion or with motion 0. */
export function nudge(node: HTMLElement, dx: number) {
  const go = () => {
    const arrow = node.querySelector(".fill");
    if (!arrow || !motion.ms || reduced()) return;
    arrow.animate(
      [{ transform: "none" }, { transform: `translateX(${dx}px)`, offset: 0.35 }, { transform: "none" }],
      { duration: motion.ms * 1.5, easing: "cubic-bezier(0.33, 1, 0.68, 1)" },
    );
  };
  node.addEventListener("click", go);
  node.addEventListener("press", go);
  return { update: (v: number) => void (dx = v), destroy: () => (node.removeEventListener("click", go), node.removeEventListener("press", go)) };
}

/** A press that came from a key (media keys, Space), not the pointer: the button dips as `:active` does, then its
 *  own click move (`nudge`, `pop`) runs. Nothing on a disabled button; off under reduced motion or with motion 0. */
export function press(node: HTMLElement | undefined) {
  if (!node || node.matches(":disabled") || !motion.ms || reduced()) return;
  node.animate([{ transform: "none" }, { transform: "scale(0.9)", offset: 0.3 }, { transform: "none" }], { duration: motion.ms, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }); // --m-4, --ease
  node.dispatchEvent(new Event("press"));
}

/** A dragged row let go `dy` px from its slot: it glides the rest of the way in (transform only). */
export function settle(node: Element, dy: number) {
  if (!dy || !motion.ms || reduced()) return;
  node.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: motion.ms, easing: "cubic-bezier(0.33, 1, 0.68, 1)" });
}

/** A list whose rows move between its sections (a pin, an unpin): `change` runs, then every `[data-k]` inside `list`
 *  glides from where its key was to where it is now (see `flips`). */
export function reorders(list: HTMLElement | undefined, change: () => void) {
  const play = flips(list);
  change();
  play?.();
}

/** Notes where every `[data-k]` inside `list` stands; the returned function, called once the list has changed, glides
 *  each from where its key was to where it is now, even when a row is a new element in another section; a key that
 *  wasn't there fades in. Rows off screen before and after are left alone. Keys must be unique in the list. Only fades
 *  under reduced motion; nothing (undefined) with motion 0 or no list. */
export function flips(list: HTMLElement | undefined) {
  if (!list || !motion.ms) return;
  const all = () => [...list.querySelectorAll<HTMLElement>("[data-k]")];
  const was = new Map(all().map((el) => [el.dataset.k!, el.getBoundingClientRect().top]));
  const view = list.getBoundingClientRect();
  const seen = (y: number) => y > view.top - 100 && y < view.bottom + 100;
  return () => {
    const timing = { duration: motion.ms, easing: "cubic-bezier(0.33, 1, 0.68, 1)" };
    for (const el of all()) {
      const from = was.get(el.dataset.k!);
      const top = el.getBoundingClientRect().top;
      if (!seen(top) && (from == null || !seen(from))) continue;
      const dy = from == null ? 0 : from - top;
      if (from == null) el.animate([{ opacity: 0 }, { opacity: 1 }], timing);
      else if (Math.abs(dy) > 0.5 && !reduced()) el.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], timing);
    }
  };
}

/** A toggle's answer to a click: its glyph turns in from `turn` degrees back (repeat's arrows come round) or, at 0,
 *  dips and springs back (shuffle, mute). Off under reduced motion or with motion 0. */
export function pop(node: HTMLElement, turn = 0) {
  const go = () => {
    const glyph = node.querySelector("svg");
    if (!glyph || !motion.ms || reduced()) return;
    glyph.animate(
      turn ? [{ transform: `rotate(${-turn}deg)` }, { transform: "none" }] : [{ transform: "none" }, { transform: "scale(0.8)", offset: 0.3 }, { transform: "none" }],
      { duration: motion.ms, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }, // --m-4, --ease: brief (AGENTS.md › Motion)
    );
  };
  node.addEventListener("click", go);
  return { update: (v: number) => void (turn = v), destroy: () => node.removeEventListener("click", go) };
}

/** `.seg`'s underline: one bar under the chosen option that glides to the next one (transform only). Placed without
 *  a transition on mount; re-measured when the switcher resizes (Scale, fonts, counts). */
export function underline(node: HTMLElement, i: number) {
  const place = () => {
    const b = node.children[i] as HTMLElement | undefined;
    if (!b) return;
    node.style.setProperty("--x", `${b.offsetLeft}px`);
    node.style.setProperty("--w", String(b.offsetWidth / 100));
  };
  const ro = new ResizeObserver(place);
  ro.observe(node);
  place();
  requestAnimationFrame(() => (node.dataset.ready = ""));
  return { update: (n: number) => ((i = n), place()), destroy: () => ro.disconnect() };
}
