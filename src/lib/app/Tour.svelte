<!-- The guided tour of the demo window: one part of the window at a time is lit through a dimmed veil (a hole cut by a
     wide shadow), with a small card beside it that says what it is and how to try it. The veil lets every press through,
     so each stop can be tried on the spot. Started by a `lowkey:tour` event on window (the toolbar, Features). -->
<script lang="ts" module>
  /** A stop: what to light (a selector inside the window; none: the card alone, centred), and what to do first.
   *  `did`: something the tip's action changes; once it differs from when the stop opened, the tip shows done and the tour moves on. */
  export type Stop = { at?: string; title: string; text: string; tip?: string; go?: () => void; did?: () => unknown; /** Does the tip's action for the visitor (a Try it button). */ try?: () => void };
</script>

<script lang="ts">
  import { onMount, tick } from "svelte";
  import { enter, exit } from "./motion.svelte";

  let { win, stops, done }: { win: HTMLElement; stops: Stop[]; done: (download: boolean) => void } = $props();

  let i = $state(0);
  let hole = $state<DOMRect | null>(null);
  let card = $state<HTMLElement>();
  let next = $state<HTMLButtonElement>();
  let place = $state({ x: 0, y: 0 });
  const stop = $derived(stops[i]);
  const last = $derived(i === stops.length - 1);
  let did = $state<boolean[]>([]);
  let base: { value: unknown } | null = null; // null while a stop is opening, so its own `go` never counts as the action
  const PAD = 6;
  const GAP = 12;

  const target = () => (stop.at ? win.querySelector<HTMLElement>(stop.at) : null);

  // Go to a stop: its action first (open a page), then bring what it lights into view.
  async function to(n: number) {
    i = n;
    base = null;
    stops[n].go?.();
    await tick();
    await new Promise((r) => setTimeout(r, 60));
    if (i === n) base = { value: stops[n].did?.() };
    target()?.scrollIntoView({ block: "nearest" });
    next?.focus();
  }

  // Follow the lit part while the tour is open (it moves as pages open, the window resizes or the page scrolls).
  onMount(() => {
    let raf = 0;
    let moveOn: ReturnType<typeof setTimeout> | undefined;
    const frame = () => {
      const w = win.getBoundingClientRect();
      const r = target()?.getBoundingClientRect();
      hole = r && r.width ? new DOMRect(r.left - w.left - PAD, r.top - w.top - PAD, r.width + 2 * PAD, r.height + 2 * PAD) : null;
      if (base && stop.did && !did[i] && stop.did() !== base.value) {
        const n = i;
        did[n] = true;
        // Done: let the tick show for a moment, then move on (unless they already did).
        if (n < stops.length - 1) moveOn = setTimeout(() => i === n && to(n + 1), 1100);
      }
      const c = card?.getBoundingClientRect();
      if (c) place = spot(hole, c.width, c.height, w.width, w.height);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    to(0);
    return () => (cancelAnimationFrame(raf), clearTimeout(moveOn));
  });

  /** Where the card goes: right of the lit part, else below, above, left; clamped inside the window. None: centred. */
  function spot(h: DOMRect | null, cw: number, ch: number, ww: number, wh: number) {
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
    const m = GAP;
    if (!h) return { x: (ww - cw) / 2, y: (wh - ch) / 2 };
    const fits = {
      right: h.right + GAP + cw <= ww - m,
      below: h.bottom + GAP + ch <= wh - m,
      above: h.top - GAP - ch >= m,
      left: h.left - GAP - cw >= m,
    };
    const y = clamp(h.top, m, wh - ch - m);
    const x = clamp(h.left + h.width / 2 - cw / 2, m, ww - cw - m);
    if (fits.right) return { x: h.right + GAP, y };
    if (fits.below) return { x, y: h.bottom + GAP };
    if (fits.above) return { x, y: h.top - GAP - ch };
    if (fits.left) return { x: h.left - GAP - cw, y };
    return { x, y: wh - ch - m };
  }

  function key(e: KeyboardEvent) {
    // Keys belong to a field being typed in, or to Settings while it's open over the tour.
    if ((e.target as Element).closest?.("input, textarea, [role=slider]") || win.querySelector(".sheet")) return;
    if (e.key === "Escape") (e.preventDefault(), done(false));
    if (e.key === "ArrowRight" && !last) to(i + 1);
    if (e.key === "ArrowLeft" && i) to(i - 1);
  }
</script>

<svelte:window onkeydown={key} />

<div class="tour" in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
  {#if hole}
    <i class="hole" style="left:{hole.x}px; top:{hole.y}px; width:{hole.width}px; height:{hole.height}px"></i>
  {:else}
    <i class="veil"></i>
  {/if}
  <div class="card" role="dialog" aria-modal="false" aria-labelledby="tour-title" aria-describedby="tour-text" bind:this={card} style="left:{place.x}px; top:{place.y}px">
    <p class="count" aria-live="polite">{i + 1} of {stops.length}</p>
    <h2 id="tour-title">{stop.title}</h2>
    <p id="tour-text">{stop.text}</p>
    {#if stop.tip}
      <p class="tip" class:done={did[i]}>
        {#if did[i]}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        {:else}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8V16h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z" /></svg>{/if}
        <span>{stop.tip}</span>{#if did[i]}<b aria-live="polite">Done</b>{:else if stop.try}<button class="try" onclick={stop.try}>Try it</button>{/if}
      </p>
    {/if}
    <div class="row">
      <span class="dots" aria-hidden="true">{#each stops as _, n}<i class:on={n === i} class:did={did[n]}></i>{/each}</span>
      {#if last}<button class="raised-n" onclick={() => done(false)}>Close</button>{:else if i}<button class="raised-n" onclick={() => to(i - 1)}>Back</button>{:else}<button class="skip" onclick={() => done(false)}>Skip</button>{/if}
      {#if last}
        <button class="raised" bind:this={next} onclick={() => done(true)}>Download</button>
      {:else}
        <button class="raised" bind:this={next} onclick={() => to(i + 1)}>{i ? "Next" : "Start"}</button>
      {/if}
    </div>
    {#if i && !last}<button class="close ic" aria-label="End the tour" title="End the tour (Esc)" onclick={() => done(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg></button>{/if}
  </div>
</div>

<style>
  /* Above the window's content and its menus, below nothing: the card is the only thing that floats. */
  .tour { position: absolute; inset: 0; z-index: 20; pointer-events: none; }
  .hole, .veil { position: absolute; border-radius: var(--r-3); transition: left var(--m-5) var(--ease), top var(--m-5) var(--ease), width var(--m-5) var(--ease), height var(--m-5) var(--ease); }
  .hole { box-shadow: 0 0 0 200vmax var(--scrim), inset 0 0 0 1.5px color-mix(in srgb, var(--accent) 70%, transparent); }
  .veil { inset: 0; border-radius: 0; background: var(--scrim); }

  .card {
    position: absolute;
    width: min(400px, calc(100% - 24px));
    box-sizing: border-box;
    padding: 24px 26px 22px;
    border-radius: 16px;
    /* Glass, as the app's sheets: the sheets' denser kind, over the lit window. */
    background: var(--glass-sheet);
    -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow), 0 0 0 0.5px var(--border-strong);
    color: var(--fg);
    pointer-events: auto;
    transition: left var(--m-5) var(--ease), top var(--m-5) var(--ease);
  }
  .count { margin: 0 0 6px; color: var(--accent); font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; }
  h2 { margin: 0 0 8px; font-size: 21px; font-weight: 650; letter-spacing: -0.01em; line-height: 1.25; text-wrap: balance; }
  p { margin: 0; color: var(--fg-2); font-size: 15px; line-height: 1.55; text-wrap: pretty; }
  .tip { display: flex; gap: 10px; margin-top: 16px; padding: 11px 14px; border-radius: 10px; background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--fg); font-size: 14px; line-height: 1.45; transition: background var(--m-5) var(--ease); }
  .tip svg { flex: none; width: 16px; height: 16px; margin-top: 2px; fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .tip.done { background: color-mix(in srgb, var(--accent) 20%, transparent); }
  .tip.done svg { stroke-width: 2.6; }
  .tip b { margin-left: auto; padding-left: 8px; color: var(--accent); font-weight: 650; white-space: nowrap; }
  .try { flex: none; align-self: center; margin-left: auto; height: 26px; padding: 0 12px; border: 0; border-radius: 13px; background: var(--accent); color: var(--on-accent); font: inherit; font-size: 13px; font-weight: 600; cursor: default; }
  .try:hover { background: color-mix(in srgb, var(--accent) 88%, var(--fg)); }
  .row { display: flex; align-items: center; gap: 8px; margin-top: 22px; }
  .dots { display: flex; gap: 6px; margin-right: auto; }
  .dots i { width: 7px; height: 7px; border-radius: 50%; background: var(--border-strong); transition: background var(--m-3) var(--ease), width var(--m-3) var(--ease); }
  .dots i.did { background: color-mix(in srgb, var(--accent) 55%, transparent); }
  .dots i.on { width: 18px; border-radius: 4px; background: var(--accent); }
  .row button { height: 36px; padding: 0 18px; border-radius: 18px; font: inherit; font-size: 14px; font-weight: 600; cursor: default; }
  .skip { border: 0; background: none; color: var(--fg-3); transition: color var(--m-5) var(--ease); }
  .skip:hover { color: var(--fg); transition-duration: var(--m-1); }
  .close { position: absolute; top: 14px; right: 14px; display: grid; place-items: center; width: 28px; height: 28px; padding: 0; border: 0; border-radius: 8px; background: none; color: var(--fg-3); }
  .close:hover { background: var(--hover); color: var(--fg); }
  .close svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  @media (prefers-reduced-motion: reduce) { .hole, .card { transition: none; } }
</style>
