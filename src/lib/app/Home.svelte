<script lang="ts" module>
  import type { LibItem } from "./Library.svelte";
  import { tiles } from "./tiles";
  import { L } from "./i18n";
  type Card = LibItem & { kind: "playlists" | "albums" | "artists" };
  type Section = { id?: string | null; title: string | null; shortcuts: boolean; items: Card[]; artist?: Card };
  export type HomeFeed = { greeting: string | null; sections: Section[] };
  /** A shelf as the user picks it: `key` is Spotify's section id (so a renamed shelf keeps its choice), else its name. */
  export type Shelf = { key: string; name: string };
  /** A shelf's name as shown (and as picks are kept): "Made for <nick>" is "Made for You", so no nick shows and a
   *  renamed account keeps its picks. */
  const MADE_FOR = /^(?:zostavené pre|made for):? .+$/i;
  export const shelfName = (title: string | null) => (title && MADE_FOR.test(title) ? L.home.madeForYou : (title ?? ""));
  const shelfOf = (s: Section): Shelf =>
    s.shortcuts ? { key: "shortcuts", name: L.home.shortcuts } : { key: s.id ?? shelfName(s.title), name: shelfName(s.title) };
  /** Every shelf shows unless the user hid it (`picks` keeps only `false`), so a shelf Spotify adds shows at once.
   *  A choice kept by name (before ids) still counts. */
  export const isPicked = (s: Shelf, picks: Record<string, boolean>) => picks[s.key] ?? picks[s.name] ?? true;
  /** The shelves Home can show: the shortcuts, then every titled one that isn't empty, each once. */
  export const shelvesOf = (feed: HomeFeed | null) => [
    ...new Map((feed?.sections ?? []).filter((s) => (s.shortcuts || s.title) && s.items.length).map((s) => [shelfOf(s).key, shelfOf(s)])).values(),
  ];
</script>

<script lang="ts">
  import type { Row } from "./Library.svelte";
  import Tile from "./Tile.svelte";
  import MultiSelect from "./MultiSelect.svelte";
  import { glyph } from "./glyph";
  import { quip } from "./quip";
  import { enter, exit, motion } from "./motion.svelte";

  let {
    feed,
    picks = {},
    setShelf,
    hush = true,
    cols = 0,
    error,
    retry,
    open,
    play,
    current,
    playing,
  }: {
    /** null while loading. */
    feed: HomeFeed | null;
    /** Cards show their names only while their shelf is pointed at or focused (Settings › Home). */
    hush?: boolean;
    /** The shelves the user hid, by `Shelf` key. */
    picks?: Record<string, boolean>;
    setShelf: (shelf: Shelf, on: boolean) => void;
    /** Cards per row, added to what the width fits (Settings › Home). */
    cols?: number;
    error: string;
    retry: () => void;
    open: (row: Row) => void;
    /** Plays an item, or pauses/resumes it when it is already the playing source. */
    play: (uri: string) => void;
    /** Uri of the playing context. */
    current?: string;
    playing: boolean;
  } = $props();

  const kind = { playlists: L.kind.playlist, albums: L.kind.album, artists: L.kind.artist };
  const row = (i: Card): Row => ({ ...i, line: i.kind === "artists" || !i.sub ? kind[i.kind] : `${kind[i.kind]} · ${i.sub}` });

  // Only the shelves the user picked (Settings › Home › Content, `isPicked`), as clean cards: the name and only who plays on it. An item shows once: a later shelf drops
  // what is already above. Spotify's shortcuts lead, their cards at 85% size.
  const shortcuts = $derived((feed?.sections ?? []).find((s) => s.shortcuts && s.items.length)?.items.map(row) ?? []);
  const SHORTCUTS: Shelf = { key: "shortcuts", name: L.home.shortcuts };
  const TOP_MIXES = /top mix/i;
  /** The shelf pointed at or focused: its cards unfold their text (every shelf's is hidden otherwise). */
  let hot = $state<string | null>(null);
  // One shelf at a time: the pointer opens a shelf a moment after it moves onto it (--m-1); an open one folds at the
  // same time (a hand-over: the one above folding lifts the new one by what its own text adds below, so it stays
  // under the pointer). Nothing opens while a fold or unfold still runs (Tile's text, --m-4 × 0.8), so a sweep over
  // several shelves opens at most one per step; one pointed at meanwhile opens once it ends. Leaving, a shelf folds
  // after a moment (--m-1: a slip off its edge doesn't fold it), never mid-unfold. Focus acts at once. Timers run only on these events.
  let wait = 0;
  let pending: string | null = null;
  let busyTill = 0;
  // The fold or unfold is timed from when it really starts (its name's intro or outro, which runs with the cards' text):
  // timed from the change, a frame spent laying out a big feed let the next swap cut in before the last had ended.
  // Till it starts, a guess with room to spare.
  const busy = (slack: number) => (busyTill = performance.now() + motion.ms * 0.8 + slack);
  function set(title: string | null) {
    pending = null;
    if (title !== hot) (hot = title), hush && busy(100);
  }
  function aim(title: string | null, ms: number) {
    clearTimeout(wait);
    pending = title;
    const fire = () => {
      const left = busyTill - performance.now();
      if (left > 0) wait = window.setTimeout(fire, left);
      else set(title);
    };
    wait = window.setTimeout(fire, ms);
  }
  const after = () => Math.max(motion.ms / 3, busyTill - performance.now());
  function move(title: string) {
    if (hot === title) return void (clearTimeout(wait), (pending = null));
    if (pending !== title) aim(title, after());
  }
  function leave(title: string) {
    // Waits out an unfold too, so darting in and out runs at most one fold or unfold at a time.
    if (hot === title) aim(null, after());
    else if (pending === title) clearTimeout(wait), (pending = null);
  }
  function focusOn(title: string | null) {
    clearTimeout(wait);
    set(title);
  }
  $effect(() => () => clearTimeout(wait));
  const shelves = $derived(shelvesOf(feed));
  const picked = $derived(shelves.filter((s) => isPicked(s, picks)).map((s) => s.key));
  const lists = $derived.by(() => {
    const seen = new Set<string>();
    return (feed?.sections ?? [])
      .filter((s) => !s.shortcuts && isPicked(shelfOf(s), picks))
      .map((s) => ({ ...shelfOf(s), rows: s.items.filter((i) => !seen.has(i.uri) && seen.add(i.uri)).map(row), face: s.artist?.image }))
      .filter((l) => l.rows.length);
  });
</script>

<!-- A shelf: at the left its glyph (by its title, utils/glyph.ts; top mixes a disc; "More like <artist>" that artist's
     picture, `face`) over its name (only while pointed at, on every shelf), in a narrow column; its cards beside it. Their text shows only while
     the shelf is pointed at or focused (`hush`), on every shelf; long names glide. Shortcuts' cards are smaller, sized on their own (`strip`). -->
{#snippet shelf({ key, name: title }: Shelf, rows: Row[], strip = false, face?: string | null)}
  <section
    class="shelf" class:strip aria-label={title}
    onpointermove={() => move(key)} onpointerleave={() => leave(key)}
    onfocusin={() => focusOn(key)} onfocusout={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && focusOn(null)}
  >
    <h2 class="side-mark" aria-label={title}>
      <span class="glyph">
        {#if face}<img class="face" src={face} alt="" />{:else}<svg viewBox="0 0 24 24" aria-hidden="true"><path d={glyph(TOP_MIXES.test(title) ? "album" : title)} /></svg>{/if}
        {#if !hush || hot === key}<span class="t-label" in:enter={{ y: -4, f: 0.8 }} out:exit={{ y: -2, f: 0.8 }} onintrostart={() => busy(16)} onoutrostart={() => busy(16)}>{title}</span>{/if}
      </span>
    </h2>
    <ul class="tiles" use:tiles={strip}>
      {#each rows as r (r.uri)}<Tile row={r} quiet glide {hush} shown={hot === key} {open} {play} {current} {playing} />{/each}
    </ul>
  </section>
{/snippet}

<article class="view" style:--tile-add={cols} aria-busy={!feed && !error}>
  {#if error}
    <div class="note">
      <p>{error}</p>
      <button class="btn" onclick={retry}>{L.common.retry}</button>
    </div>
  {:else if feed}
    <!-- Loading: the skeleton leaves (pinned in place) as the feed rises in (motion engine). -->
    <div class="loaded" in:enter={{ y: 6 }} out:exit>
    <!-- The toolbar already says Home, so the page is headed by the day's dry joke (utils/quip.ts), not a Spotify greeting. -->
    <!-- The joke, and at the right what Home shows (the same choice as Settings › Home › Content). -->
    <header class="head">
      <h1 class="t-section hello">{quip(L.home.quips, new Date(), feed.sections.filter((s) => !s.shortcuts).flatMap((s) => s.items.map((i) => i.name)))}</h1>
      {#if shelves.length}
        <span class="pick"><label class="t-label" for="home-content">{L.settings.shelves}</label>
        <MultiSelect id="home-content" checked={picked} summary={L.settings.shelvesOf(picked.length, shelves.length)} options={shelves.map((s) => ({ value: s.key, name: s.name }))} toggle={(k) => { const s = shelves.find((s) => s.key === k); if (s) setShelf(s, !isPicked(s, picks)); }} /></span>
      {/if}
    </header>
    {#if shortcuts.length && isPicked(SHORTCUTS, picks)}
      {@render shelf(SHORTCUTS, shortcuts, true)}
    {/if}
    {#each lists as l, i (i)}{@render shelf(l, l.rows, false, l.face)}{/each}
    </div>
  {:else}
    <div class="skeleton" aria-hidden="true" in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
      <span class="bar title"></span>
      <span class="bar head"></span>
      <div class="tiles" use:tiles>{#each Array(6) as _}<span class="tile"><span class="cover"></span><span class="bar"></span></span>{/each}</div>
    </div>
  {/if}
</article>

<style>
  .view { padding: var(--sp-5) var(--gutter) var(--sp-6); }
  /* The day's joke on the left, what Home shows at the right. */
  .head { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); margin-bottom: var(--sp-5); }
  .hello { min-width: 0; }
  /* What Home shows: its name before the picker, quiet. */
  .pick { display: flex; align-items: center; gap: var(--sp-2); }
  .pick label { color: var(--fg-2); }
  .note { margin: var(--sp-7) auto; max-width: 40ch; text-align: center; color: var(--fg-3); }

  .shelf + .shelf { margin-top: var(--sp-6); }
  /* The shortcuts strip: smaller cards, in as many rows as they need. */
  .strip .tiles { --tile-k: 0.85; }
  /* Every shelf: the glyph at the left, the cards after it. */
  .shelf { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: var(--sp-5); }
  /* The glyph stands still at the middle of the first row's covers (--tile, from the grid, tiles.ts; a tile's inset
     above and below), whatever unfolds beside it; the name hangs under it on its own, quiet and short (a long one
     wraps), so its coming and going moves nothing. */
  .side-mark { display: grid; place-items: center; width: 9ch; height: calc(var(--tile) - 2 * var(--sp-2)); margin: var(--sp-2) 0 0; color: var(--fg); text-align: center; }
  .glyph { position: relative; display: grid; place-items: center; }
  .side-mark .t-label { position: absolute; top: calc(100% + var(--sp-2)); left: 50%; translate: -50% 0; width: max-content; max-width: 13ch; color: var(--fg-2); text-wrap: balance; }
  .side-mark svg { width: 28px; height: 28px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .face { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; background: var(--active); }

  .skeleton .bar { display: block; width: 50%; height: 12px; border-radius: var(--r-1); background: var(--active); }
  .skeleton .bar.title { width: 160px; height: 24px; margin-bottom: var(--sp-5); }
  .skeleton .bar.head { width: 120px; height: 16px; margin-bottom: var(--sp-3); }
  .skeleton .tile { display: grid; gap: var(--sp-3); padding: var(--sp-2); }
  .skeleton .cover { aspect-ratio: 1; border-radius: var(--r-2); background: var(--active); }

  @container (max-width: 600px) { .view { --gutter: var(--sp-4); } }
</style>
