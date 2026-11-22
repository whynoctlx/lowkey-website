<script lang="ts">
  import { L } from "./i18n";
  import type { Row } from "./Library.svelte";
  import { who } from "./who";
  import Marquee from "./Marquee.svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import { enter, exit } from "./motion.svelte";
  import { isIgnored } from "./ignored";
  import { ignored } from "./ignored.svelte";

  let {
    row,
    open,
    play,
    current,
    playing,
    quiet = false,
    glide = quiet,
    hush = false,
    shown = false,
  }: {
    row: Row;
    open: (row: Row) => void;
    /** Plays the item, or pauses/resumes it when it is already the playing source. */
    play: (uri: string) => void;
    /** Uri of the playing source. */
    current?: string;
    playing: boolean;
    /** Under the name only who plays on it (a playlist's artists, an album's), instead of Spotify's description
     *  (Home). */
    quiet?: boolean;
    /** One line each for name and description; pointed at (or focused), a long one glides to its end and back
     *  (.marquee.peek). Home's cards; on with `quiet`. */
    glide?: boolean;
    /** Its text shows only while `shown` (its shelf pointed at or focused, Home), taking no room till then: it unfolds
     *  and folds away as a sidebar section does (`collapse`), what is below following. No stagger: a delayed card stood
     *  at full height through its delay, so the page dropped and came back up. In and out take as long, so a shelf
     *  folding as another unfolds keeps what is below steady. */
    hush?: boolean;
    shown?: boolean;
  } = $props();

  const now = $derived(row.uri === current);
  // An ignored artist, or an album of theirs (Settings › Ignored): dimmed, as its songs are skipped.
  const off = $derived(!!ignored.by[row.uri] || isIgnored(row.artists ?? [], ignored.by));
  // An artist's round cover already says "Interpret".
  const desc = $derived(row.kind === "artists" ? "" : quiet && row.kind === "playlists" ? who(row.sub) : row.sub);
  let peek = $state(false);
</script>

<!-- A playlist, album or artist as a cover tile (.hl.bare): the whole tile opens it, the cover's disc plays it. -->
<li
  class="tile hl bare" class:quiet class:glide class:now class:hush class:ignored={off}
  onpointerenter={() => (peek = glide)} onpointerleave={() => (peek = false)}
  onfocusin={() => (peek = glide)} onfocusout={() => (peek = false)}
>
  <span class="cover veil" class:round={row.kind === "artists"}>
    {#if row.image}<img src={row.image} alt="" loading="lazy" />{/if}
    {#if now}<span class="eq swap-out" class:held={!playing} aria-label={playing ? L.common.playing : L.common.paused}><i></i><i></i><i></i></span>{/if}
    <button class="cover-play swap-in" aria-label={now && playing ? L.common.pause : L.common.playItem(row.name)} onclick={() => play(row.uri)}>
      <PlayIcon playing={now && playing} />
    </button>
  </span>
  <button class="open" onclick={() => open(row)} data-open={row.uri} aria-label={hush ? row.name : undefined}>
    {#if !hush || shown}
      <span class="text" in:enter={{ y: -6, collapse: true, f: 0.8 }} out:exit={{ y: 0, collapse: true, f: 0.8 }}>
        {#if glide}
          <!-- One line each, ending in "…"; pointed at, a long one glides to its end. -->
          <span class="name"><Marquee on={peek} peek title={row.name}>{row.name}</Marquee></span>
          {#if desc}<span class="desc"><Marquee on={peek} peek title={desc}>{desc}</Marquee></span>{/if}
        {:else}
          <span class="name">{row.name}</span>
          {#if desc}<span class="desc">{desc}</span>{/if}
        {/if}
      </span>
    {/if}
  </button>
</li>

<style>
  .tile { position: relative; display: grid; align-content: start; gap: var(--sp-3) var(--sp-2); min-width: 0; padding: var(--sp-2); border-radius: var(--r-3); }
  .cover { --disc: var(--tile-disc, 36px); display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: var(--r-2); background: var(--active); }
  .cover.round { --disc-at: 14%; border-radius: 50%; }
  .cover img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }

  /* The whole tile opens the item: the button's ::after stretches over it, under the cover's play disc. */
  .open { display: block; min-width: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
  .open::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
  .open:focus-visible { outline: none; }
  .tile:has(.open:focus-visible) { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 1px; }
  .name { color: var(--fg); overflow: hidden; font-size: var(--fs); font-weight: 500; line-height: 1.3; white-space: nowrap; text-overflow: ellipsis; }
  .now .name { color: var(--now); }
  .text { display: flex; flex-direction: column; gap: var(--sp-1); }
  .quiet .text { gap: var(--sp-0); }
  /* Hushed: the cover-to-text gap lives in the text, so it folds away with it. */
  .hush { row-gap: 0; }
  .hush .text { padding-top: var(--sp-3); }
  .desc { color: var(--fg-3); font-size: var(--meta-fs); line-height: 1.4; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; }
  .glide .desc { display: block; }
</style>
