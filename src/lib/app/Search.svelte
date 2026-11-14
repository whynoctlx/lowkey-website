<script lang="ts" module>
  import type { LibItem } from "./Library.svelte";
  import type { Track } from "./Playlist.svelte";
  export type Results = { tracks: Track[]; artists: LibItem[]; albums: LibItem[]; playlists: LibItem[] };
</script>

<script lang="ts">
  import { L } from "./i18n";
  import { enter, exit } from "./motion.svelte";
  import type { Row } from "./Library.svelte";
  import Tile from "./Tile.svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import { tiles } from "./tiles";

  let {
    query,
    results,
    error,
    playingTrack,
    playing,
    playTrack,
    open,
    play,
    current,
  }: {
    query: string;
    /** null while the first answer for `query` is loading. */
    results: Results | null;
    error: string;
    playingTrack?: string;
    playing: boolean;
    playTrack: (uri: string) => void;
    open: (row: Row) => void;
    /** Plays an item, or pauses/resumes it when it is already the playing source. */
    play: (uri: string) => void;
    /** Uri of the playing context. */
    current?: string;
  } = $props();

  const mmss = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  // Artists, albums and playlists as Home's shelves: one row of tiles.
  const sections = $derived(
    results
      ? ([
          ["artists", L.library.artists],
          ["albums", L.library.albums],
          ["playlists", L.library.playlists],
        ] as const)
          .map(([kind, label]) => ({ kind, label, rows: results[kind].map((i): Row => ({ ...i, kind, line: "" })) }))
          .filter((s) => s.rows.length)
      : [],
  );
  const empty = $derived(results && !results.tracks.length && !sections.length);
</script>

<article class="view" aria-busy={!results && !error}>
  <header class="head">
    <h1 class="t-page">{L.common.search}</h1>
    {#if query}<p class="lede">{L.search.results(query)}</p>{/if}
  </header>
  {#if !query}
    <p class="note">{L.search.hint}</p>
  {:else if error}
    <p class="note">{error}</p>
  {:else if empty}
    <p class="note">{L.search.none(query)}</p>
  {:else}
    {#if !results || results.tracks.length}
      <section aria-label={L.search.songs}>
        <div class="sec-head"><h2 class="t-section">{L.search.songs}</h2></div>
        {#if results}
          <div class="tracks" role="list" in:enter={{ y: 4 }} out:exit>
            {#each results.tracks.slice(0, 8) as t (t.uri)}
              {@const now = t.uri === playingTrack}
              <!-- A click anywhere on the row plays it; keyboard users have the play button over the cover. -->
              <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
              <div class="track hl" class:now role="listitem" onclick={() => playTrack(t.uri)}>
                <span class="cover veil">
                  {#if t.image}<img src={t.image} alt="" loading="lazy" />{/if}
                  {#if now}<span class="eq swap-out" class:held={!playing} aria-label={playing ? L.common.playing : L.common.paused}><i></i><i></i><i></i></span>{/if}
                  <button class="swap-in cover-play" aria-label={now && playing ? L.common.pause : L.common.playItem(t.name)} onclick={(e) => (e.stopPropagation(), playTrack(t.uri))}>
                    <PlayIcon playing={now && playing} />
                  </button>
                </span>
                <span class="text">
                  <span class="name">{#if t.explicit}<span class="explicit" title={L.common.explicit} aria-label={L.common.explicit}>E</span>{/if}<span class="nm">{t.name}</span></span>
                  <span class="sub links">{#each t.artists as a, j}{#if j}<span class="sep">{", "}</span>{/if}{#if a.uri}<button class="link" data-open={a.uri} onclick={(e) => (e.stopPropagation(), open({ uri: a.uri!, name: a.name, kind: "artists", line: L.kind.artist }))}>{a.name}</button>{:else}<span>{a.name}</span>{/if}{/each}</span>
                </span>
                <span class="sub dur">{mmss(t.duration_ms)}</span>
              </div>
            {/each}
          </div>
        {:else}
          <div class="tracks" aria-hidden="true" in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
            {#each Array(8) as _}
              <div class="track skeleton" aria-hidden="true"><span class="cover"></span><span class="text"><span></span><span></span></span></div>
            {/each}
          </div>
        {/if}
      </section>
    {/if}

    {#each sections as s (s.kind)}
      <section aria-label={s.label}>
        <div class="sec-head"><h2 class="t-section">{s.label}</h2></div>
        <ul class="tiles" use:tiles>
          {#each s.rows as r (r.uri)}<Tile row={r} {open} {play} {current} {playing} />{/each}
        </ul>
      </section>
    {/each}
  {/if}
</article>

<style>
  /* Home's page: the same gutter, .t-page title and .t-section shelves; tracks are larger rows in two columns. */
  .view { padding: var(--sp-5) var(--gutter) var(--sp-6); }
  .note { margin: var(--sp-7) auto; max-width: 40ch; text-align: center; color: var(--fg-3); }
  section + section { margin-top: var(--sp-6); }
  .sec-head { margin-bottom: var(--sp-3); }

  /* Eight tracks, top to bottom then the next column (1–4 left, 5–8 right). */
  .tracks {
    --thumb: 48px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(4, auto);
    grid-auto-flow: column;
    gap: 2px var(--sp-5);
    margin: 0 calc(-1 * var(--sp-2));
  }
  .track {
    display: grid;
    grid-template-columns: var(--thumb) minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sp-3);
    min-width: 0;
    padding: var(--sp-2);
    border-radius: var(--r-3);
  }
  .cover { display: grid; place-items: center; width: var(--thumb); height: var(--thumb); border-radius: var(--r-2); background: var(--active); --disc: 28px; }
  .cover img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
  .cover img { outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent); outline-offset: -0.5px; }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name, .sub { white-space: nowrap; line-height: 1.3; }
  .name { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; font-size: var(--name-fs); font-weight: 500; color: var(--fg); }
  .nm { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .now .name { color: var(--now); font-weight: 600; }
  /* Not on .links: the global rule scrolls that row sideways to reach every artist. */
  .sub:not(.links) { overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: var(--sub-fs); color: var(--fg-3); }
  .dur { padding-right: var(--sp-1); font-variant-numeric: tabular-nums; }

  .skeleton .cover, .skeleton .text span { animation: pulse 1.4s ease-in-out infinite, wait var(--m-4) var(--ease) var(--m-4) backwards; }
  .skeleton .text { gap: var(--sp-2); }
  .skeleton .text span { height: 12px; width: 40%; border-radius: var(--r-1); background: var(--active); }
  .skeleton .text span:first-child { width: 60%; }
  @keyframes pulse { 50% { opacity: 0.5; } }
  @media (prefers-reduced-motion: reduce) { .skeleton .cover, .skeleton .text span { animation: none; } }
  @container (max-width: 760px) {
    .tracks { grid-template-columns: minmax(0, 1fr); grid-template-rows: none; grid-auto-flow: row; }
  }
  @container (max-width: 600px) { .view { --gutter: var(--sp-4); } }
</style>
