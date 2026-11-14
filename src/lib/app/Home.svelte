<script lang="ts" module>
  import type { LibItem } from "./Library.svelte";
  type Card = LibItem & { kind: "playlists" | "albums" | "artists" };
  export type HomeFeed = { greeting: string | null; sections: { title: string | null; shortcuts: boolean; items: Card[] }[] };
</script>

<script lang="ts">
  import { L } from "./i18n";
  import type { Density, Row } from "./Library.svelte";
  import Tile from "./Tile.svelte";
  import { enter, exit, underline } from "./motion.svelte";
  import { tiles } from "./tiles";

  let {
    feed,
    full = false,
    setFull,
    density = "regular",
    error,
    retry,
    open,
    play,
    current,
    playing,
  }: {
    /** null while loading. */
    feed: HomeFeed | null;
    /** Every section as Spotify sends it, shortcuts included, instead of the pruned home. */
    full?: boolean;
    setFull: (on: boolean) => void;
    /** Home's own density (Settings › Layout › Home). */
    density?: Density;
    error: string;
    retry: () => void;
    open: (row: Row) => void;
    /** Plays an item, or pauses/resumes it when it is already the playing source. */
    play: (uri: string) => void;
    /** Uri of the playing context. */
    current?: string;
    playing: boolean;
  } = $props();

  const date = new Intl.DateTimeFormat(L.locale, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  const today = date.charAt(0).toUpperCase() + date.slice(1);
  const kind = { playlists: L.kind.playlist, albums: L.kind.album, artists: L.kind.artist };
  const row = (i: Card): Row => ({ ...i, line: i.kind === "artists" || !i.sub ? kind[i.kind] : `${kind[i.kind]} · ${i.sub}` });

  // Full feed: every section in Spotify's order, all items, as cover tiles.
  // Curated: only the shelves made from the user's own listening (made for them, their mixes and top, recently
  // played), as cleaner cards: larger covers, the name and only who plays on it; shortcuts and recommendation shelves (stations, "for fans of", "more like") stay
  // in the full feed. An item shows once: a later shelf drops what is already above.
  const all = $derived((feed?.sections ?? []).filter((s) => s.items.length).map((s) => ({ title: s.title ?? "", rows: s.items.map(row) })));
  const MINE = /^(zostavené pre|made for|tvoje|your|nedávno|recently)/i;
  const lists = $derived.by(() => {
    const seen = new Set<string>();
    return (feed?.sections ?? [])
      .filter((s) => !s.shortcuts && MINE.test(s.title ?? ""))
      .map((s) => ({ title: s.title ?? "", rows: s.items.filter((i) => !seen.has(i.uri) && seen.add(i.uri)).map(row) }))
      .filter((l) => l.rows.length);
  });
</script>

<article class="view" class:compact={density === "compact"} class:spacious={density === "spacious"} aria-busy={!feed && !error}>
  {#if error}
    <div class="note">
      <p>{error}</p>
      <button class="btn" onclick={retry}>{L.common.retry}</button>
    </div>
  {:else if feed}
    <!-- Loading: the skeleton leaves (pinned in place) as the feed rises in (motion engine). -->
    <div class="loaded" in:enter={{ y: 6 }} out:exit>
    <!-- The toolbar already says Home, so the page greets instead: Spotify's greeting over today's date. -->
    <header class="head">
      <div class="hello">
        <h1 class="t-page">{feed.greeting ?? L.app.home}</h1>
        <p class="lede">{today}</p>
      </div>
      <!-- Curated/Full feed lives only here. -->
      <div class="seg" role="radiogroup" aria-label={L.home.label} use:underline={full ? 1 : 0}>
        <button role="radio" aria-checked={!full} onclick={() => setFull(false)}>{L.home.curated}</button>
        <button role="radio" aria-checked={full} onclick={() => setFull(true)}>{L.home.full}</button>
      </div>
    </header>
    {#if full}
      {#each all as l, i (i)}
        <section aria-label={l.title || L.home.shortcuts}>
          {#if l.title}<div class="sec-head"><h2 class="t-section">{l.title}</h2></div>{/if}
          <ul class="tiles cards" use:tiles>
            {#each l.rows as r (r.uri)}<Tile row={r} glide {open} {play} {current} {playing} />{/each}
          </ul>
        </section>
      {/each}
    {:else}
      {#each lists as l, i (i)}
        <section aria-label={l.title}>
          {#if l.title}<div class="sec-head"><h2 class="t-section">{l.title}</h2></div>{/if}
          <ul class="tiles cards" use:tiles>
            {#each l.rows as r (r.uri)}<Tile row={r} quiet {open} {play} {current} {playing} />{/each}
          </ul>
        </section>
      {/each}
    {/if}
    </div>
  {:else}
    <div class="skeleton" aria-hidden="true" in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
      <span class="bar title"></span>
      {#if full}
        <div class="tiles cards" use:tiles>{#each Array(8) as _}<span class="tile"><span class="cover"></span><span class="bar"></span></span>{/each}</div>
      {:else}
        <span class="bar head"></span>
        <div class="tiles cards" use:tiles>{#each Array(6) as _}<span class="tile"><span class="cover"></span><span class="bar"></span></span>{/each}</div>
      {/if}
    </div>
  {/if}
</article>

<style>
  .view { padding: var(--sp-5) var(--gutter) var(--sp-6); }
  /* Greeting and date on the left, the feed choice set to the date's line on the right. */
  .head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--sp-4); }
  .hello { min-width: 0; }
  .note { margin: var(--sp-7) auto; max-width: 40ch; text-align: center; color: var(--fg-3); }

  /* Both feeds: the larger --card-min covers with more air between the rows (the demo keeps the full feed as big as curated). */
  .cards { --tile-min: var(--card-min); row-gap: var(--sp-5); }

  section + section { margin-top: var(--sp-6); }
  .sec-head { margin-bottom: var(--sp-3); }

  .skeleton { animation: pulse 1.4s ease-in-out infinite, wait var(--m-4) var(--ease) var(--m-4) backwards; }
  .skeleton .bar { display: block; width: 50%; height: 12px; border-radius: var(--r-1); background: var(--active); }
  .skeleton .bar.title { width: 160px; height: 24px; margin-bottom: var(--sp-5); }
  .skeleton .bar.head { width: 120px; height: 16px; margin-bottom: var(--sp-3); }
  .skeleton .tile { display: grid; gap: var(--sp-3); padding: var(--sp-2); }
  .skeleton .cover { aspect-ratio: 1; border-radius: var(--r-2); background: var(--active); }
  @keyframes pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }

  @container (max-width: 600px) { .view { --gutter: var(--sp-4); } }
</style>
