<script lang="ts" module>
  import type { Row } from "./Library.svelte";
  export type Track = {
    uri: string;
    name: string;
    artists: { name: string; uri?: string }[];
    album: string;
    album_uri?: string;
    image?: string | null;
    duration_ms: number;
    explicit?: boolean;
    popularity?: number | null;
    disc?: number | null;
    number?: number | null;
    version?: string | null;
    year?: number | null;
    added_at?: number | null;
    added_by?: string | null;
  };
  /** Header details from `library_tracks`: playlists fill the first two, albums the rest. */
  export type Info = {
    description?: string | null;
    collaborative?: boolean;
    album_type?: string | null;
    label?: string | null;
    date?: { year?: number; month?: number; day?: number } | null;
    copyright?: { type?: string; text: string }[];
    /** Artists: portrait, bio, genres and the discography / related shelves. */
    image?: string | null;
    bio?: string | null;
    genres?: string[] | null;
    sections?: { key: string; title: string; total?: number; rows: Row[] }[];
    active?: { start: number; end?: number | null } | null;
  };
</script>

<script lang="ts">
  import { untrack } from "svelte";
  import { L } from "./i18n";
  import Tile from "./Tile.svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import SaveIcon from "./SaveIcon.svelte";
  import { enter, exit, pop, underline } from "./motion.svelte";
  import { tiles } from "./tiles";
  import { who } from "./who";

  let {
    item,
    tracks,
    info,
    error,
    missing = 0,
    playingTrack,
    playingContext,
    playing,
    playContext,
    playTrack,
    pause,
    retry,
    open,
    play,
    shuffle,
    setShuffle,
    saved,
    setSaved,
    liked,
    setLiked,
    addTo,
  }: {
    item: Row;
    tracks: Track[] | null;
    info: Info;
    error: string;
    /** Tracks whose details didn't load (Spotify busy): the list is short by this many. */
    missing?: number;
    playingTrack?: string;
    playingContext?: string;
    playing: boolean;
    playContext: () => void;
    playTrack: (uri: string) => void;
    pause: () => void;
    retry: () => void;
    open: (row: Row) => void;
    play: (uri: string) => void;
    /** The player's shuffle (Soloist's option, or the choice waiting for it): on, a play starts this item shuffled. */
    shuffle: boolean;
    setShuffle: (on: boolean) => void;
    /** In the library (an artist followed, a playlist or album saved); undefined: it can't be (liked songs, recent). */
    saved?: boolean;
    setSaved: (on: boolean) => void;
    /** The liked songs' URIs, for each row's heart; undefined: not known yet (no hearts). */
    liked?: Set<string>;
    setLiked: (uri: string, on: boolean) => void;
    /** Opens the save menu (Liked songs, playlists) at a row's saved button. */
    addTo?: (uri: string, at: HTMLElement) => void;
  } = $props();

  const isArtist = $derived(item.kind === "artists");
  const cover = $derived(item.image ?? info.image);
  // An artist shows five popular tracks until asked for all ten, as in Spotify.
  let more = $state(false);
  const shown = $derived(isArtist && !more ? tracks?.slice(0, 5) : tracks);
  // Discography: the artist's own release groups behind one switch; "appears on" and related artists get shelves of their own.
  const disco = $derived((info.sections ?? []).filter((s) => !["related", "appears_on"].includes(s.key) && s.rows.length));
  const appears = $derived(info.sections?.find((s) => s.key === "appears_on"));
  const related = $derived(info.sections?.find((s) => s.key === "related"));
  let group = $state(0);
  const shelf = $derived(disco[Math.min(group, disco.length - 1)]);
  // About: two lines of bio in the hero; "Read more" opens the whole of it (with the years active) in a sheet.
  let aboutOpen = $state(false);
  const active = $derived(info.active ? (info.active.end ? L.item.active(info.active.start, info.active.end) : L.item.active(info.active.start)) : "");
  const count = (d: { total?: number; rows: unknown[] }) => d.total ?? d.rows.length;
  // Shelves are named here by their key (Rust's title is only the fallback), so they follow the UI language.
  const shelfName = (d: { key: string; title: string }) => (L.item.shelves as Record<string, string>)[d.key] ?? d.title;
  // The sheet takes focus itself (top layer: focus stays inside, Esc and a backdrop click close it), as Settings does.
  const modal = (d: HTMLDialogElement) => (d.showModal(), d.focus());
  // A playlist's "Harper, Bad Omens, Sakoya a ďalší" (its line or description): each name that plays on one of its
  // tracks opens that artist. Split keeps the separators at odd indices; "a ďalší" before " a " so it stays whole.
  const SPLIT = /(\s+(?:a ďalší|a ďalšie|and more)\.?$|,\s+|\s+(?:a|and)\s+)/i;
  const byName = $derived(new Map(tracks?.flatMap((t) => t.artists).filter((a) => a.uri).map((a) => [a.name.toLowerCase(), a])));
  const openArtist = (a: { name: string; uri?: string }) => open({ uri: a.uri!, name: a.name, kind: "artists", line: L.kind.artist });

  const ALBUM_TYPES: Record<string, string> = { ALBUM: L.kind.album, SINGLE: L.kind.single, EP: L.kind.ep, COMPILATION: L.kind.compilation };
  const kindLabel = $derived(
    item.kind === "albums"
      ? (ALBUM_TYPES[info.album_type ?? ""] ?? L.kind.album)
      : item.kind === "artists"
        ? L.kind.artist
        : info.collaborative
          ? L.kind.collabPlaylist
          : L.kind.playlist,
  );
  const isCurrent = $derived(playingContext === item.uri);
  const isAlbum = $derived(item.kind === "albums");
  // Disc headings only when the album really has more than one disc.
  const multiDisc = $derived(isAlbum && new Set(tracks?.map((t) => t.disc ?? 1)).size > 1);

  // A long list draws only the rows near the view (and OVER on each side), spacers standing in for the rest, so a
  // playlist of thousands opens at once and weighs about as little as a short one. Rows are one height (--track-h,
  // measured); disc headings break that, so a multi-disc album draws whole. Updated on scroll and resize, never on a
  // timer; a leaving page (pinned by the motion engine) keeps the rows it showed.
  const WHOLE = 100;
  const OVER = 20;
  let listEl = $state<HTMLOListElement>();
  let rowH = $state(0);
  let first = $state(0);
  let last = $state(60);
  const windowed = $derived(!!shown && shown.length > WHOLE && !multiDisc);
  const start = $derived(windowed ? first : 0);
  const rows = $derived(windowed ? shown!.slice(first, last) : (shown ?? []));
  function measure() {
    const sc = listEl?.closest("main");
    if (!listEl || !sc || !windowed || listEl.closest<HTMLElement>(".page")?.style.position === "absolute") return;
    rowH = listEl.querySelector<HTMLElement>(".track")?.offsetHeight || rowH;
    if (!rowH) return;
    const n = shown!.length;
    const top = listEl.getBoundingClientRect().top - sc.getBoundingClientRect().top;
    const a = Math.max(0, Math.min(n, Math.floor(-top / rowH) - OVER));
    const b = Math.max(a, Math.min(n, Math.ceil((sc.clientHeight - top) / rowH) + OVER));
    if (a !== first) first = a;
    if (b !== last) last = b;
  }
  $effect(() => {
    void shown?.length;
    const sc = listEl?.closest("main");
    if (!windowed || !listEl || !sc) return;
    let raf = 0;
    const go = () => (cancelAnimationFrame(raf), (raf = requestAnimationFrame(measure)));
    untrack(measure);
    sc.addEventListener("scroll", go, { passive: true });
    const ro = new ResizeObserver(go);
    ro.observe(sc);
    ro.observe(listEl);
    return () => (cancelAnimationFrame(raf), sc.removeEventListener("scroll", go), ro.disconnect());
  });

  const fullDate = (d: Date) => d.toLocaleDateString(L.locale, { day: "numeric", month: "long", year: "numeric" });
  const released = $derived.by(() => {
    const d = info.date;
    if (!d?.year) return "";
    return d.month && d.day ? fullDate(new Date(d.year, d.month - 1, d.day)) : String(d.year);
  });

  // "Pillars Of Creation - Radio Edit" with version "Radio Edit": the title without it, the quiet tag says it once.
  const title = (t: Track) => (t.version && t.name.endsWith(` - ${t.version}`) ? t.name.slice(0, -t.version.length - 3) : t.name);
  const mmss = (ms: number) => {
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  // Added: relative for the last month ("yesterday", "3 days ago", "2 weeks ago"), then the date.
  const rtf = new Intl.RelativeTimeFormat(L.locale, { numeric: "auto" });
  const dtf = new Intl.DateTimeFormat(L.locale, { day: "numeric", month: "short", year: "numeric" });
  const addedAt = (ms: number) => {
    const d = Math.floor((Date.now() - ms) / 864e5);
    return d < 7 ? rtf.format(-Math.max(0, d), "day") : d < 30 ? rtf.format(-Math.floor(d / 7), "week") : dtf.format(ms);
  };
  const dated = $derived(!isAlbum && !!tracks?.some((t) => t.added_at));
  const songs = L.common.songs;
  // Lead (owner or album artist) in fg-2, the rest as meta: count for albums, total length.
  // An album's artists are the ones on every track (none in common: a various-artists release); until the tracks
  // load, the row's sub stands in, unless it is an artist-page card's "2021 · Album", which the meta repeats.
  const albumArtists = $derived(isAlbum && tracks?.length ? tracks[0].artists.filter((a) => tracks!.every((t) => t.artists.some((b) => b.name === a.name))) : []);
  // A playlist row's line is "Playlist · Owner" or "Playlist · 31 skladieb": the owner leads, a count joins the meta.
  const plLine = $derived(item.kind === "albums" || item.kind === "artists" ? "" : item.line.replace(`${L.kind.playlist} · `, "").replace(new RegExp(`^${L.kind.playlist}$`), ""));
  const plCount = $derived(plLine === songs(parseInt(plLine)) ? plLine : "");
  const lead = $derived(
    item.kind === "albums"
      ? tracks?.length ? (albumArtists.length ? "" : L.item.variousArtists) : /^\d{4} · /.test(item.sub ?? "") ? "" : (item.sub ?? "")
      : item.kind === "artists" ? "" : plLine && !plCount ? plLine : "",
  );
  const total = $derived.by(() => {
    if (!tracks?.length) return "";
    const min = Math.round(tracks.reduce((a, t) => a + (t.duration_ms ?? 0), 0) / 60000);
    return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
  });
  const meta = $derived(
    isArtist
      ? (info.genres ?? []).slice(0, 3)
      : [isAlbum && info.date?.year ? String(info.date.year) : "", isAlbum && tracks?.length ? songs(tracks.length) : plCount, total].filter(Boolean),
  );
</script>

{#snippet names(s: string)}{#if who(s)}{#each s.split(SPLIT) as p, j}{@const a = j % 2 ? undefined : byName.get(p.toLowerCase())}{#if a}<button class="link" onclick={() => openArtist(a)} data-open={a.uri}>{p}</button>{:else}{p}{/if}{/each}{:else}{s}{/if}{/snippet}

<article class="view" class:artist={item.kind === "artists"}>
  <header class="hero">
    <div class="art">
      {#if item.kind === "liked"}
        <div class="cover liked" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path class="fill" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
        </div>
      {:else if item.kind === "recent"}
        <div class="cover liked" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
        </div>
      {:else if cover}
        <img class="cover" src={cover} alt="" width="232" height="232" />
      {:else}
        <div class="cover empty" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
        </div>
      {/if}
    </div>
    <div class="info">
      <h1 class:long={item.name.length > 24}>{item.name}</h1>
      <!-- An artist's line is only its genres: the round portrait already says it is an artist. -->
      {#if !isArtist}<p class="line">
        <span class="kind">{kindLabel}</span>{#if albumArtists.length}<span class="sep">·</span><span class="lead">{#each albumArtists as a, j}{#if j}{", "}{/if}{#if a.uri}<button class="link" onclick={() => openArtist(a)} data-open={a.uri}>{a.name}</button>{:else}{a.name}{/if}{/each}</span>{:else if lead}<span class="sep">·</span><span class="lead">{@render names(lead)}</span>{/if}{#each meta as m}<span class="sep">·</span><span>{m}</span>{/each}
      </p>{:else if meta.length}<p class="line">{#each meta as m, j}{#if j}<span class="sep">·</span>{/if}<span>{m}</span>{/each}</p>{/if}
      <!-- Header details arrive after the page: they grow in instead of pushing the title. -->
      <!-- A mix's description is often its line again ("Harper, Bad Omens a ďalší"): said once. -->
      {#if info.description && info.description.trim() !== lead.trim()}<p class="desc" in:enter={{ y: 0, collapse: true }} out:exit={{ y: 0, collapse: true }}>{@render names(info.description)}</p>{/if}
      {#if isArtist && info.bio}
        <div class="about" aria-label={L.item.aboutArtist} in:enter={{ y: 0, collapse: true }} out:exit={{ y: 0, collapse: true }}>
          <p class="clamp">{info.bio}</p>
          <button class="more-row" aria-haspopup="dialog" onclick={() => (aboutOpen = true)}>
            {L.item.readMore}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      {/if}
    </div>
    <!-- Shuffle beside the play, the player's own switch: on, the play starts this item in shuffled order. -->
    <div class="actions">
    <!-- Follow (artists) or save (playlists, albums), as in Spotify: an artist's is a push button with its state in words. -->
    {#if saved !== undefined}
      {#if isArtist}
        <button class="follow" class:raised={!saved} class:raised-n={saved} class:on={saved} aria-pressed={saved} title={saved ? L.item.unfollow : L.item.follow} onclick={() => setSaved(!saved)}>
          {saved ? L.item.following : L.item.follow}
        </button>
      {:else}
        <button class="shuffle raised-n" class:on={saved} use:pop aria-pressed={saved} aria-label={saved ? L.item.unsave : L.item.save} title={saved ? L.item.unsave : L.item.save} onclick={() => setSaved(!saved)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{#if saved}<path d="M5 12.5l4.5 4.5L19 7.5" />{:else}<path d="M12 5v14M5 12h14" />{/if}</svg>
        </button>
      {/if}
    {/if}
    <button
      class="shuffle raised-n" class:on={shuffle} use:pop aria-pressed={shuffle}
      aria-label={shuffle ? L.item.shuffleOn : L.item.shuffleOff} title={shuffle ? L.item.shuffleOnTip : L.item.shuffleOffTip}
      onclick={() => setShuffle(!shuffle)}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5" /></svg>
    </button>
    <button
      class="big-play raised"
      aria-label={isCurrent && playing ? L.common.pause : L.common.playItem(item.name)}
      title={isCurrent && playing ? L.common.pause : L.common.play}
      onclick={() => (isCurrent && playing ? pause() : playContext())}
    >
      <PlayIcon playing={isCurrent && playing} />
    </button>
    </div>
  </header>

  {#if isArtist}<div class="sec-head pad"><h2 class="t-section">{L.item.popular}</h2></div>{/if}

  {#if error}
    <div class="note">
      <p>{error}</p>
      <button class="btn" onclick={retry}>{L.common.retry}</button>
    </div>
  {:else}
    {#if missing}
      <div class="note">
        <p>{L.item.notLoaded(missing)}</p>
        <button class="btn" onclick={retry}>{L.common.retry}</button>
      </div>
    {/if}
    <!-- Loading: the skeleton list leaves (pinned in place) as the real one arrives. -->
    {#if tracks}
    <ol class="list" class:album={isAlbum} class:artist={isArtist} class:dated aria-label={L.item.tracks} bind:this={listEl} in:enter={{ y: 4 }} out:exit>
        {#if windowed}<li class="spacer" aria-hidden="true" style:height="{start * rowH}px"></li>{/if}
        {#each rows as t, j (t.uri + (start + j))}
          {@const i = start + j}
          {@const now = t.uri === playingTrack}
          {#if multiDisc && (t.disc ?? 1) !== (tracks[i - 1]?.disc ?? (i ? 1 : 0))}
            <li class="disc"><span class="t-label">{L.item.disc(t.disc ?? 1)}</span></li>
          {/if}
          <!-- A click anywhere on the row plays it; keyboard users have the row's play button. -->
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
          <li class="track hl" class:now in:enter={{ y: -6, collapse: true, f: windowed ? 0 : 1 }} out:exit={{ y: -6, collapse: true, f: windowed ? 0 : 1 }} onclick={() => playTrack(t.uri)}>
            <!-- The number (track number on albums, position elsewhere) swaps for the play glyph or the equaliser; playlists show the cover after it. -->
            <span class="num">
              {#if now}
                <span class="eq swap-out" class:held={!playing} aria-label={playing ? L.common.playing : L.common.paused}><i></i><i></i><i></i></span>
              {:else}
                <span class="idx swap-out">{isAlbum ? (t.number ?? i + 1) : i + 1}</span>
              {/if}
              <button class="row-play swap-in row-glyph" aria-label={now && playing ? L.common.pause : L.common.playItem(t.name)} onclick={(e) => (e.stopPropagation(), playTrack(t.uri))}>
                <PlayIcon playing={now && playing} />
              </button>
            </span>
            {#if !isAlbum}
              <span class="pic">{#if t.image}<img src={t.image} alt="" width="40" height="40" loading="lazy" />{:else}<span class="thumb"></span>{/if}</span>
            {/if}
            <span class="text">
              <span class="name">
                <span class="title">{title(t)}</span>
                {#if t.explicit}<span class="explicit" title={L.common.explicit} aria-label={L.common.explicit}>E</span>{/if}
                {#if t.version}<span class="ver">{t.version}</span>{/if}
                <!-- Save right after the name (as in Spotify's lists): shown pointed at, always when saved. -->
                {#if liked && t.uri.startsWith("spotify:track:")}
                  {@const on = liked.has(t.uri)}
                  <button class="like" class:on use:pop aria-haspopup={on ? "menu" : undefined} aria-label={on ? L.common.saved : L.common.like} title={on ? L.common.saved : L.common.like} onclick={(e) => (e.stopPropagation(), on ? (addTo ? addTo(t.uri, e.currentTarget) : setLiked(t.uri, false)) : setLiked(t.uri, true))}>
                    <SaveIcon {on} />
                  </button>
                {/if}
              </span>
              <!-- Artists, then the album (a single's album is its own name: left out rather than repeated). -->
              <span class="sub"><span class="who links">{#each t.artists as a, j}{#if j}<span>{", "}</span>{/if}{#if a.uri}<button class="link" onclick={(e) => (e.stopPropagation(), openArtist(a))} data-open={a.uri}>{a.name}</button>{:else}<span>{a.name}</span>{/if}{/each}{#if !isAlbum && !isArtist && t.album && t.album.toLowerCase() !== t.name.toLowerCase() && t.album.toLowerCase() !== title(t).toLowerCase()}<span class="dot">·</span>{#if t.album_uri}<button class="link" title={t.album} data-open={t.album_uri} onclick={(e) => (e.stopPropagation(), open({ uri: t.album_uri!, name: t.album, image: t.image, kind: "albums", line: L.kind.album }))}>{t.album}</button>{:else}<span>{t.album}</span>{/if}{/if}</span></span>
            </span>
            {#if dated}<span class="added" title={t.added_at ? L.item.added(dtf.format(t.added_at)) : undefined}>{t.added_at ? addedAt(t.added_at) : ""}</span>{/if}
            <span class="dur">{mmss(t.duration_ms)}</span>
          </li>
        {:else}
          <li class="note">{L.item.noTracks}</li>
        {/each}
        {#if windowed}<li class="spacer" aria-hidden="true" style:height="{(shown!.length - start - rows.length) * rowH}px"></li>{/if}
    </ol>
    {:else}
    <ol class="list" class:album={isAlbum} aria-hidden="true" in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
        {#each Array(isArtist ? 5 : 10) as _}
          <li class="track skeleton" aria-hidden="true">
            <span class={isAlbum ? "num" : "pic"}></span><span class="text"><span></span><span></span></span>
          </li>
        {/each}
    </ol>
    {/if}

    {#if isArtist && tracks && tracks.length > 5}
      <button class="more-row pad" aria-expanded={more} onclick={() => (more = !more)}>
        {more ? L.item.showLess : L.item.showMore(tracks.length - 5)}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
    {/if}

    {#if isAlbum && tracks && (released || info.label || info.copyright?.length)}
      <footer class="credits">
        {#if released}<p class="released">{released}</p>{/if}
        {#each info.copyright ?? [] as c}<p>{c.type === "P" ? "℗" : "©"} {c.text}</p>{/each}
        {#if info.label && !info.copyright?.some((c) => c.text.includes(info.label!))}<p>{info.label}</p>{/if}
      </footer>
    {/if}

    {#if isArtist && tracks}
      <div class="blocks">
        {#if shelf}
          <section aria-label={L.item.discography}>
            <div class="sec-head">
              <h2 class="t-section">{L.item.discography}{#if disco.length === 1}<span class="n">{count(shelf)}</span>{/if}</h2>
              {#if disco.length > 1}
                <div class="seg" role="radiogroup" aria-label={L.item.releaseKinds} use:underline={disco.indexOf(shelf)}>
                  {#each disco as d, i (d.key)}
                    <button role="radio" aria-checked={d === shelf} onclick={() => (group = i)}>{shelfName(d)}<span class="n">{count(d)}</span></button>
                  {/each}
                </div>
              {/if}
            </div>
            {#key shelf.key}
              <ul class="tiles" use:tiles in:enter={{ y: 6 }} out:exit>
                {#each shelf.rows as r (r.uri)}
                  <Tile row={r} {open} {play} current={playingContext} {playing} />
                {/each}
              </ul>
            {/key}
          </section>
        {/if}
        {#if appears?.rows.length}
          <section aria-label={shelfName(appears)}>
            <div class="sec-head"><h2 class="t-section">{shelfName(appears)}</h2></div>
            <ul class="tiles" use:tiles>
              {#each appears.rows as r (r.uri)}
                <Tile row={r} {open} {play} current={playingContext} {playing} />
              {/each}
            </ul>
          </section>
        {/if}
        {#if related?.rows.length}
          <section aria-label={shelfName(related)}>
            <div class="sec-head"><h2 class="t-section">{shelfName(related)}</h2></div>
            <ul class="tiles" use:tiles>
              {#each related.rows as r (r.uri)}
                <Tile row={r} {open} {play} current={playingContext} {playing} />
              {/each}
            </ul>
          </section>
        {/if}
      </div>
    {/if}
  {/if}
</article>

<!-- About the artist: the whole bio in a reading sheet (the global .sheet, smaller). -->
{#if aboutOpen}
  <dialog
    class="sheet small" aria-label={L.item.aboutArtist} tabindex="-1" use:modal
    in:enter={{ y: 8, sheet: true }} out:exit={{ y: 8, sheet: true, f: 0.6 }}
    oncancel={(e) => (e.preventDefault(), (aboutOpen = false))}
    onclick={(e) => e.target === e.currentTarget && (aboutOpen = false)}
  >
    <header class="about-bar">
      <h2 class="t-group">{item.name}</h2>
      <button class="close ic" aria-label={L.common.close} title={L.common.closeEsc} onclick={() => (aboutOpen = false)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
      </button>
    </header>
    <div class="about-body">
      {#if active || info.genres?.length}<p class="t-label">{[active, ...(info.genres ?? [])].filter(Boolean).join(" · ")}</p>{/if}
      <p class="bio">{info.bio}</p>
    </div>
  </dialog>
{/if}

<style>
  .view { min-height: 100%; padding-bottom: var(--sp-6); }
  /* .btn is the global push button; :where keeps this reset as weak as a plain `button`. */
  button:where(:not(.btn, .raised, .raised-n)) { font: inherit; color: inherit; border: none; background: none; padding: 0; cursor: default; }
  svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  svg .fill { fill: currentColor; stroke: none; }

  /* Header: the cover is the only colour, and throws a soft shadow in its own colours (as in the player). */
  /* One row: cover, then title over one meta line (kind first), and the play at the far right, all centred on the cover. */
  .hero { display: flex; align-items: center; gap: var(--sp-6); padding: var(--sp-6) var(--gutter); }
  .art { position: relative; flex: none; width: var(--hero-cover); height: var(--hero-cover); isolation: isolate; }
  .cover {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    border-radius: var(--r-2);
    object-fit: cover;
    background: var(--active);
    color: var(--fg-3);
    box-shadow: 0 0 0 0.5px color-mix(in srgb, var(--fg) 10%, transparent);
  }
  .artist .cover { border-radius: 50%; }
  .cover svg { width: 34%; height: 34%; }
  .cover.liked { background: color-mix(in srgb, var(--accent) 14%, var(--panel)); color: var(--accent); box-shadow: none; }
  .cover.empty { box-shadow: inset 0 0 0 0.5px var(--border); }

  /* Three steps, each a size and a colour down, with air only before the prose: title (--hero-title --fg) › one meta
     line (--sub-fs --fg-2: kind, who in --fg, counts, length; hairline-quiet dots) › description (--sub-fs --fg-3, a
     reading measure, two lines). */
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
  h1 {
    margin: 0;
    font-size: var(--hero-title);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--fg);
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  h1.long { font-size: var(--t-section); }
  .line { margin: 0; color: var(--fg-2); font-size: var(--sub-fs); line-height: 1.4; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .kind { font-weight: 500; }
  .lead { color: var(--fg); font-weight: 500; }
  .sep { margin: 0 var(--sp-1); color: var(--fg-3); }
  .desc {
    margin: var(--sp-1) 0 0;
    max-width: 72ch;
    color: var(--fg-3);
    font-size: var(--sub-fs);
    line-height: 1.5;
    text-wrap: pretty;
    overflow-wrap: anywhere;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .actions { flex: none; display: flex; align-items: center; gap: var(--sp-2); }
  /* Follow: a raised pill of the round buttons' height; not followed the accent one (.raised, as the play), followed
     the neutral one pressed in (.raised-n.on). One width, so the words swapping don't move the buttons beside it. */
  .follow {
    flex: none; height: var(--play-h); min-width: calc(var(--play-h) * 2.6); padding: 0 var(--sp-4); border-radius: 999px;
    font: inherit; font-weight: 600; letter-spacing: 0.01em; white-space: nowrap;
  }
  /* Shuffle and save: raised neutral discs (.raised-n) of the play's size; on, pressed in with the accent glyph. */
  .shuffle { flex: none; display: grid; place-items: center; width: var(--play-h); height: var(--play-h); padding: 0; border-radius: 50%; }
  .shuffle svg { width: 45%; height: 45%; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }

  /* The play: the raised accent disc (.raised). */
  .big-play {
    flex: none;
    display: grid;
    place-items: center;
    width: var(--play-h);
    height: var(--play-h);
    padding: 0;
    border: 0;
    border-radius: 50%;
  }
  .big-play :global(svg) { width: 46%; height: 46%; }

  .pad { margin-inline: var(--gutter); }

  /* Track list: a plain list, not a table: no column heads, no rules, no empty cells. Rows are set apart by air and
     the hover fill alone; each reads number, cover, name over "artists · album", then the quiet date and time. */
  .list { margin: 0; padding: 0 calc(var(--gutter) - var(--sp-2)); list-style: none; display: flex; flex-direction: column; }
  .list:not(.album) { --pos-w: 32px; }
  .spacer { flex: none; }
  .list:not(.album) .track:not(.skeleton) { grid-template-columns: var(--pos-w) auto minmax(0, 1fr) auto; }
  .list.dated .track:not(.skeleton) { grid-template-columns: var(--pos-w) auto minmax(0, 1fr) auto auto; }
  .list:not(.album) .num { width: var(--pos-w); }
  .added { width: 112px; color: var(--fg-3); font-size: var(--sub-fs); text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .track {
    position: relative;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: var(--sp-3);
    height: var(--track-h);
    padding: 0 var(--sp-3) 0 var(--sp-2);
    border-radius: var(--r-2);
  }

  .num { position: relative; flex: none; width: var(--thumb); height: var(--thumb); display: grid; place-items: center; color: var(--fg-3); font-size: var(--small-fs); font-variant-numeric: tabular-nums; }
  /* Index and play glyph swap in place (global .swap-out/.swap-in/.row-glyph, AGENTS.md "Interaction"). */
  .row-play { position: absolute; inset: 0; margin: auto; }
  /* Cover cell: plain art; play and the playing mark live in the number column. */
  .pic { position: relative; flex: none; width: var(--thumb); height: var(--thumb); border-radius: var(--r-2); background: var(--active); }
  .pic img, .pic .thumb { position: absolute; inset: 0; width: 100%; height: 100%; }
  .album .track, .track.skeleton { grid-template-columns: auto minmax(0, 1fr) auto; }
  .dot { flex: none; margin: 0 var(--sp-2); color: var(--fg-3); }
  /* The heart after the name, sized to its line (the button overhangs it, the glyph stays inside the line). */
  .name .like { opacity: 0; }
  .track:is(:hover, :has(:focus-visible)) .like, .name .like.on { opacity: 1; }
  .dur { flex: none; width: 40px; text-align: right; color: var(--fg-3); font-size: var(--sub-fs); font-variant-numeric: tabular-nums; }

  .pic img, .thumb { width: var(--thumb); height: var(--thumb); border-radius: var(--r-2); flex: none; object-fit: cover; background: var(--active); }
  .pic img { outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent); outline-offset: -0.5px; }
  .text { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name, .sub { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name { display: flex; align-items: baseline; gap: var(--sp-2); color: var(--fg); font-weight: 500; font-size: var(--name-fs); line-height: 1.3; }
  .name .title { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .ver { flex: none; max-width: 40%; overflow: hidden; text-overflow: ellipsis; color: var(--fg-3); font-size: var(--meta-fs); font-weight: 400; }

  .disc { padding: var(--sp-5) var(--sp-2) var(--sp-2); }
  .disc:first-child { padding-top: 0; }

  /* Artist page: the hero carries the About, then .t-section blocks (Popular, Discography, shelves), wide air between, tight under each head. */
  .artist .sec-head { margin-bottom: var(--sp-3); }
  .artist .sec-head.pad { margin-top: var(--sp-2); }
  .artist .sec-head .seg { margin-left: auto; align-self: center; }
  .more-row.pad { margin: var(--sp-2) 0 0 calc(var(--gutter) - var(--sp-3)); }
  .blocks { padding: var(--sp-7) var(--gutter) 0; }
  .blocks > section + section { margin-top: var(--sp-7); }
  /* About in the hero: two lines of bio at a reading measure, the rest in the sheet. */
  .about { margin-top: var(--sp-2); }
  .about .more-row { margin-top: var(--sp-1); }
  .about p { margin: 0; max-width: 72ch; color: var(--fg-2); font-size: var(--sub-fs); line-height: 1.6; }
  .about p.clamp { display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  /* The release count beside the Discography heading, with one kind only (in the switch the global .seg .n draws it). */
  .t-section .n { margin-left: var(--sp-1); color: var(--fg-3); font-weight: 400; font-variant-numeric: tabular-nums; }
  .about-bar { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); height: calc(var(--ctl-h) + 2 * var(--sp-3)); padding: 0 var(--sp-3) 0 var(--sp-5); }
  .about-bar h2 { margin: 0; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .close { flex: none; display: grid; place-items: center; width: var(--ctl-h); height: var(--ctl-h); border-radius: var(--r-2); color: var(--fg-3); }
  .close svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  /* Under the bar without a rule: the text fades out at the scroll edges, like every scroller (AGENTS.md). */
  .about-body {
    overflow-y: auto;
    padding: var(--sp-2) var(--sp-5) var(--sp-5);
    -webkit-mask-image: linear-gradient(transparent, #000 var(--sp-2), #000 calc(100% - var(--sp-5)), transparent);
    mask-image: linear-gradient(transparent, #000 var(--sp-2), #000 calc(100% - var(--sp-5)), transparent);
  }
  .about-body .t-label { margin: 0 0 var(--sp-3); }
  .bio { margin: 0; color: var(--fg-2); font-size: var(--sub-fs); line-height: 1.7; white-space: pre-line; }
  .credits { padding: var(--sp-5) var(--gutter) 0; color: var(--fg-3); font-size: var(--small-fs); }
  .credits p { margin: 0; }
  .credits .released { margin-bottom: var(--sp-1); color: var(--fg-2); font-size: var(--meta-fs); }
  .sub { color: var(--fg-3); font-size: var(--sub-fs); line-height: 1.3; transition: color var(--m-2) var(--ease); }
  .track:hover .sub { color: var(--fg-2); }



  .note { padding: var(--sp-4) var(--gutter); color: var(--fg-2); }
  .note p { margin: 0 0 var(--sp-3); }

  .skeleton { animation: pulse 1.4s ease-in-out infinite, wait var(--m-4) var(--ease) var(--m-4) backwards; }
  .skeleton .pic { border-radius: var(--r-1); background: var(--active); }
  .skeleton .text { gap: var(--sp-2); flex: 1; }
  .skeleton .text span { display: block; height: 8px; border-radius: var(--r-1); background: var(--active); width: 60%; }
  .skeleton .text span + span { width: 35%; }
  @keyframes pulse { 50% { opacity: 0.5; } }

  @media (prefers-reduced-motion: reduce) {
    .skeleton { animation: none; }
  }

  /* The main panel is narrow when the library is dragged wide. */
  /* Narrow panel: the date goes, the name takes its room. */
  @container (max-width: 760px) {
    .list.dated .track:not(.skeleton) { grid-template-columns: var(--pos-w) auto minmax(0, 1fr) auto; }
    .added { display: none; }
  }
  @container (max-width: 600px) {
    .view { --gutter: var(--sp-4); }
    .hero { gap: var(--sp-4); padding-bottom: var(--sp-4); }
    .art { width: 112px; height: 112px; }
    h1, h1.long { font-size: var(--t-section); }
    .ver { display: none; }
  }
</style>
