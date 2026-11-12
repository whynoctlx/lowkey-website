<script lang="ts">
  import { fly } from "svelte/transition";
  import { get, home, items, library, kindName, mmss, type Item } from "./data";
  import { cover } from "./cover";
  import { p, liked, playFrom, playItem, tune } from "./state.svelte";
  import { underline } from "./actions";
  import Tile from "./Tile.svelte";
  import Tracks from "./Tracks.svelte";
  import Player from "./Player.svelte";
  import PlayIcon from "./PlayIcon.svelte";

  // Views: "home", "liked", "recent", "search" or an item's id. Back/forward walk this list.
  let hist = $state(["home"]);
  let at = $state(0);
  let query = $state("");
  let full = $state(false);
  let side = $state(true);
  let main = $state<HTMLElement>();
  const view = $derived(hist[at]);

  function open(v: string) {
    if (v !== "search") query = "";
    if (v === view) return;
    hist = [...hist.slice(0, at + 1), v];
    at = hist.length - 1;
    main?.scrollTo({ top: 0 });
  }
  const go = (d: number) => ((at += d), main?.scrollTo({ top: 0 }));
  $effect(() => {
    if (query && view !== "search") open("search");
  });

  const names: Record<string, string> = { home: "Home", liked: "Liked songs", recent: "Recently played", search: "Search" };
  const title = (v: string) => (v === "search" ? `“${query}”` : names[v] ?? get(v).name);

  let greeting = $state("Good evening");
  let today = $state("");
  $effect(() => {
    const h = new Date().getHours();
    greeting = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
    today = new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  });

  const likedTracks = $derived(items.filter((i) => i.kind === "album").flatMap((a) => a.tracks).filter((t) => liked.has(t.id)));
  const found = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { items: [] as Item[], tracks: [] };
    return {
      items: items.filter((i) => `${i.name} ${i.by}`.toLowerCase().includes(q)),
      tracks: items.filter((i) => i.kind === "album").flatMap((a) => a.tracks).filter((t) => `${t.name} ${t.artists.join(" ")}`.toLowerCase().includes(q)).slice(0, 8),
    };
  });
  const length = (i: Item) => {
    const s = i.tracks.reduce((n, t) => n + t.dur, 0);
    return `${i.tracks.length} songs, ${Math.floor(s / 60)} min`;
  };
  const line = (i: Item) => (i.kind === "artist" ? kindName.artist : `${kindName[i.kind]} · ${i.by}`);
</script>

{#snippet hero(i: Item | null)}
  <header class="hero">
    {#if i}<img class="hero-cover" class:round={i.kind === "artist"} src={cover(i)} alt="" />
    {:else}<div class="hero-cover liked" aria-hidden="true"><svg viewBox="0 0 24 24"><path class="fill" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg></div>{/if}
    <div class="info">
      <h1>{i ? i.name : "Liked songs"}</h1>
      <p class="line">
        {#if i}<span class="kind">{kindName[i.kind]}</span>{#if i.by}<span class="sep">·</span><span class="lead">{i.by}</span>{/if}{#if i.year}<span class="sep">·</span>{i.year}{/if}<span class="sep">·</span>{length(i)}
        {:else}<span class="kind">Playlist</span><span class="sep">·</span>{likedTracks.length} songs{/if}
      </p>
      {#if i?.desc}<p class="desc">{i.desc}</p>{/if}
    </div>
    <div class="actions">
      {#if i}<button class="shuffle raised-n" aria-label="Save" title="Save to library"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg></button>{/if}
      <button class="shuffle raised-n" class:on={p.shuffle} aria-pressed={p.shuffle} aria-label="Shuffle" onclick={() => (p.shuffle = !p.shuffle)}>
        <svg viewBox="0 0 24 24"><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" /></svg>
      </button>
      <button class="big-play raised" aria-label="Play" onclick={() => (i ? playItem(i.id) : p.from === "liked" ? (p.playing = !p.playing) : playFrom("liked", likedTracks))}>
        <PlayIcon playing={p.from === (i?.id ?? "liked") && p.playing} />
      </button>
    </div>
  </header>
{/snippet}

{#snippet grid(list: Item[])}
  <ul class="tiles">{#each list as it (it.id)}<Tile item={it} {open} />{/each}</ul>
{/snippet}

<div class="shell">
<div class="win {tune.density}" class:no-lib={!side} role="application" aria-label="Quietify live preview">
  <aside class="side" aria-label="Library">
    <div class="strip">
      <span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
      <span class="logo"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5a6 6 0 0 1 12 0Z" /><rect x="3" y="16.5" width="18" height="1.5" rx=".75" /></svg>Quietify</span>
    </div>
    <nav class="quick">
      {#each [["home", "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"], ["liked", "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"], ["recent", "M12 7v5l3 2M21 12a9 9 0 1 1-9-9"]] as [v, d] (v)}
        <button class="qrow" class:open={view === v} onclick={() => open(v)}><svg viewBox="0 0 24 24" aria-hidden="true"><path {d} /></svg><span>{names[v]}</span></button>
      {/each}
    </nav>
    <p class="t-label lib-label">Your library</p>
    <ul class="rows">
      {#each library.map(get) as it (it.id)}
        {@const now = p.from === it.id}
        <li class="row hl" class:now class:active={view === it.id}>
          <button class="pic" class:round={it.kind === "artist"} aria-label={now && p.playing ? "Pause" : `Play ${it.name}`} onclick={() => playItem(it.id)}>
            <img src={cover(it)} alt="" /><span class="glyph"><PlayIcon playing={now && p.playing} /></span>
          </button>
          <button class="txt" onclick={() => open(it.id)}><span class="name">{it.name}</span><span class="sub">{line(it)}</span></button>
          {#if now}<span class="eq" class:held={!p.playing} aria-hidden="true"><i></i><i></i><i></i></span>{/if}
        </li>
      {/each}
    </ul>
  </aside>

  <div class="top">
    <div class="history">
      <button class="ic side-toggle" aria-label="Toggle sidebar" onclick={() => (side = !side)}><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></svg></button>
      <button class="ic" aria-label="Back" disabled={at === 0} onclick={() => go(-1)}><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6" /></svg></button>
      <button class="ic" aria-label="Forward" disabled={at === hist.length - 1} onclick={() => go(1)}><svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6" /></svg></button>
    </div>
    <nav class="crumbs" aria-label="Path">
      <button class="ic home" class:on={view === "home"} onclick={() => open("home")}><svg viewBox="0 0 24 24"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>{#if view === "home"}<span>Home</span>{/if}</button>
      {#if view !== "home"}<span class="sep">/</span><span class="crumb" aria-current="page">{title(view)}</span>{/if}
    </nav>
    <label class="find">
      <span class="lens"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg></span>
      <input type="search" placeholder="Search" bind:value={query} />
      <span class="kbd">⌘F</span>
    </label>
  </div>

  <div class="stage">
    <main bind:this={main}>
      {#key view}
        <div class="page" in:fly={{ y: 6, duration: tune.motion * 2 }}>
          {#if view === "home"}
            <article class="view">
              <header class="head">
                <div><h1 class="t-page">{greeting}</h1><p class="lede">{today}</p></div>
                <div class="seg" role="radiogroup" aria-label="Home feed" use:underline={full ? 1 : 0}>
                  <button role="radio" aria-checked={!full} onclick={() => (full = false)}>Curated</button>
                  <button role="radio" aria-checked={full} onclick={() => (full = true)}>Full feed</button>
                </div>
              </header>
              {#each home as s (s.title)}
                <section><div class="sec-head"><h2 class="t-section">{s.title}</h2></div>{@render grid(s.ids.map(get))}</section>
              {/each}
              {#if full}
                <section><div class="sec-head"><h2 class="t-section">Your playlists</h2></div>{@render grid(items.filter((i) => i.kind === "playlist"))}</section>
              {/if}
            </article>
          {:else if view === "liked"}
            {@render hero(null)}
            <Tracks tracks={likedTracks} from="liked" {open} />
          {:else if view === "recent"}
            <article class="view">
              <header class="head"><h1 class="t-page">Recently played</h1></header>
              {@render grid(p.recent.filter((r) => r !== "liked").map(get))}
            </article>
          {:else if view === "search"}
            <article class="view">
              {#if found.items.length || found.tracks.length}
                {#if found.items.length}<section><div class="sec-head"><h2 class="t-section">Top results</h2></div>{@render grid(found.items)}</section>{/if}
                {#if found.tracks.length}<section><div class="sec-head"><h2 class="t-section">Songs</h2></div></section>{/if}
              {:else}
                <p class="empty">{query.trim() ? `Nothing for “${query}” in this sample library.` : "Type to search the sample library."}</p>
              {/if}
            </article>
            {#if found.tracks.length}<div class="songs"><Tracks tracks={found.tracks} from={`search:${query}`} {open} /></div>{/if}
          {:else}
            {@const it = get(view)}
            {@render hero(it)}
            {#if it.kind === "artist"}<div class="sec-head pad"><h2 class="t-section">Popular</h2></div>{/if}
            <Tracks tracks={it.tracks} from={it.id} album={it.kind === "album"} {open} />
            {#if it.kind === "artist"}
              <section class="view more"><div class="sec-head"><h2 class="t-section">Discography</h2></div>{@render grid(items.filter((a) => a.kind === "album" && a.by === it.name))}</section>
            {:else if it.kind === "album"}
              <p class="credits pad">Released {it.year} · {it.tracks.length} songs · {mmss(it.tracks.reduce((n, t) => n + t.dur, 0))}</p>
            {/if}
          {/if}
        </div>
      {/key}
    </main>
  </div>

  <div class="dock"><Player {open} /></div>
</div>
</div>

<style>
  .shell { container-type: inline-size; }
  /* The window: the app's grid (sidebar beside a toolbar, the body panel and the player) on the window glass. */
  .win {
    --lib-w: 248px;
    --frame: var(--sp-1);
    position: relative;
    display: grid;
    grid-template-columns: var(--lib-w) minmax(0, 1fr);
    grid-template-rows: var(--top-h) minmax(0, 1fr) var(--bar-h);
    height: min(760px, 86svh);
    border-radius: 14px;
    background: color-mix(in srgb, var(--wash) 6%, var(--bg));
    box-shadow: 0 0 0 0.5px var(--border-strong), 0 1px 1px rgb(0 0 0 / 0.04), 0 24px 64px -24px rgb(0 0 0 / 0.28), 0 48px 120px -48px color-mix(in srgb, var(--now) 40%, transparent);
    font-size: var(--fs);
    line-height: 1.45;
    user-select: none;
    -webkit-user-select: none;
    cursor: default;
    overflow: hidden;
    container-type: inline-size;
    transition: grid-template-columns var(--m-4) var(--ease), background var(--m-7) var(--ease), box-shadow var(--m-7) var(--ease);
    text-align: left;
  }
  .win.no-lib { --lib-w: 0px; }
  .win button { font: inherit; cursor: default; }
  :global(html.dark) .win { box-shadow: 0 0 0 0.5px var(--border-strong), 0 24px 64px -24px rgb(0 0 0 / 0.8), 0 48px 120px -48px color-mix(in srgb, var(--now) 45%, transparent); }

  /* Sidebar */
  .side { grid-column: 1; grid-row: 1 / -1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
  .strip { flex: none; display: flex; align-items: center; gap: var(--sp-5); height: var(--top-h); padding: 0 var(--sp-3) 0 20px; }
  .lights { display: flex; gap: 8px; }
  .lights i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.12); }
  .lights i:nth-child(2) { background: #febc2e; }
  .lights i:nth-child(3) { background: #28c840; }
  .logo { display: flex; align-items: center; gap: var(--sp-2); color: var(--fg); font-size: 16px; font-weight: 600; white-space: nowrap; }
  .logo svg { width: 1.25em; height: 1.25em; fill: currentColor; }
  .quick { display: flex; flex-direction: column; padding: var(--sp-1) var(--sp-2); }
  .qrow { display: flex; align-items: center; gap: var(--sp-3); height: var(--row-h); padding: 0 var(--sp-2); border: 0; border-radius: var(--r-2); background: none; color: var(--fg-2); font-weight: 500; white-space: nowrap; transition: color var(--m-2) var(--ease); }
  .qrow svg { width: var(--lib-art); height: 16px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .qrow:hover, .qrow.open { color: var(--fg); }
  .qrow.open { background: var(--active); }
  .lib-label { padding: var(--sp-4) var(--sp-4) var(--sp-2); }
  .rows { flex: 1; margin: 0; padding: 0 var(--sp-2) var(--sp-4); list-style: none; overflow-y: auto; scrollbar-width: none; mask-image: linear-gradient(#000 calc(100% - var(--sp-5)), transparent); }
  .row { display: flex; align-items: center; gap: var(--sp-3); height: var(--lib-row); padding: 0 var(--sp-2); border-radius: var(--r-2); }
  .row.active { background: var(--active); }
  .pic { position: relative; flex: none; width: var(--lib-art); height: var(--lib-art); padding: 0; border: 0; border-radius: var(--r-1); background: none; }
  .pic.round { border-radius: 50%; }
  .pic img { width: 100%; height: 100%; border-radius: inherit; display: block; }
  .pic .glyph { position: absolute; inset: 0; display: grid; place-items: center; color: var(--on-cover); opacity: 0; transition: opacity var(--m-3) var(--ease); }
  .pic .glyph :global(svg) { width: 45%; height: 45%; filter: drop-shadow(0 0 1px var(--on-cover-edge)); }
  .row:hover .glyph { opacity: 1; }
  .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; padding: 0; border: 0; background: none; text-align: left; color: inherit; }
  .txt .name { font-size: var(--name-fs); font-weight: 500; color: var(--fg); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.25; }
  .now .txt .name { color: var(--now); }
  .txt .sub { font-size: var(--sub-fs); color: var(--fg-3); overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.3; }

  /* Toolbar */
  .top { grid-column: 2; grid-row: 1; z-index: 2; display: flex; align-items: center; gap: var(--sp-2); min-width: 0; padding: 0 var(--sp-3); }
  .top button { display: grid; place-items: center; width: 28px; height: 26px; padding: 0; border: 0; border-radius: var(--r-2); background: none; color: var(--fg-2); }
  .top button:disabled { opacity: 0.35; }
  .top svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .history { display: flex; align-items: center; gap: 2px; }
  .side-toggle { margin-right: var(--sp-3); }
  .crumbs { flex: 1; min-width: 0; display: flex; align-items: center; gap: 2px; margin-left: var(--sp-2); }
  .crumbs .home { width: auto; display: flex; gap: 6px; padding: 0 6px; font-weight: 500; }
  .crumbs .home.on { color: var(--fg); font-weight: 600; }
  .crumbs .home.on svg { fill: currentColor; }
  .sep { color: var(--fg-3); }
  .crumb { min-width: 0; padding: 0 var(--sp-2); font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .find { flex: none; width: 220px; display: flex; align-items: center; gap: var(--sp-2); height: var(--ctl-h); padding: 0 var(--sp-1) 0 var(--sp-2); box-sizing: border-box; border-radius: var(--r-2); color: var(--fg-3); box-shadow: inset 0 0 0 1px var(--border); transition: background var(--m-5) var(--ease), box-shadow var(--m-5) var(--ease); }
  .find:hover { background: var(--hover); transition-duration: var(--m-1); }
  .find:focus-within { color: var(--fg-2); background: var(--panel); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 70%, transparent); }
  .find:is(:focus-within, :has(input:not(:placeholder-shown))) .kbd { opacity: 0; }
  .lens { display: grid; }
  .lens svg { width: 14px; height: 14px; stroke-width: 2; }
  .find input { flex: 1; min-width: 0; padding: 0; border: 0; background: none; color: var(--fg); font: inherit; outline: none; }
  .find input::placeholder { color: var(--fg-3); }
  .find input::-webkit-search-cancel-button { display: none; }

  /* Body */
  .stage { grid-column: 2; grid-row: 1 / 3; position: relative; min-height: 0; margin: var(--frame) var(--frame) 0 0; border-radius: var(--r-3); background: var(--panel); container-type: inline-size; }
  .no-lib .stage, .no-lib .dock { margin-left: var(--frame); }
  .stage::after { content: ""; position: absolute; inset: 0; z-index: 3; border: 0.5px solid var(--border); border-radius: inherit; pointer-events: none; }
  main {
    height: 100%; overflow-y: auto; box-sizing: border-box; border-radius: inherit; padding: var(--top-h) 0 var(--sp-7);
    mask: linear-gradient(transparent var(--top-h), #000 calc(var(--top-h) + var(--sp-4)), #000 calc(100% - var(--fade-end)), transparent);
    container-type: inline-size; scrollbar-width: thin; scrollbar-color: var(--border-strong) transparent;
  }
  .dock { grid-column: 2; grid-row: 3; min-width: 0; margin-right: var(--frame); container-type: inline-size; }

  .view { padding: var(--sp-5) var(--gutter) var(--sp-6); }
  .view > .head { display: flex; align-items: flex-end; justify-content: space-between; gap: var(--sp-4); margin-bottom: var(--sp-5); }
  .lede { margin: var(--sp-1) 0 0; color: var(--fg-3); font-size: var(--sub-fs); min-height: 1.4em; }
  section + section { margin-top: var(--sp-6); }
  .sec-head { margin-bottom: var(--sp-3); }
  .pad { margin-inline: var(--gutter); }
  /* Tiles fill the row (the app's tiles.ts measures and glides; here plain CSS grid). */
  .win :global(.tiles) { grid-template-columns: repeat(auto-fill, minmax(var(--tile-min), 1fr)); }
  .empty { margin: var(--sp-7) auto; color: var(--fg-3); text-align: center; }
  .songs { margin-top: calc(-1 * var(--sp-5)); }
  .more { padding-top: var(--sp-6); }
  .credits { margin-top: var(--sp-5); color: var(--fg-3); font-size: var(--sub-fs); }

  /* Item hero: cover, title over one meta line, the raised buttons at the right. */
  .hero { display: flex; align-items: center; gap: var(--sp-6); padding: var(--sp-6) var(--gutter); }
  .hero-cover { flex: none; width: var(--hero-cover); height: var(--hero-cover); border-radius: var(--r-2); box-shadow: 0 0 0 0.5px color-mix(in srgb, var(--fg) 10%, transparent); }
  .hero-cover.round { border-radius: 50%; }
  .hero-cover.liked { display: grid; place-items: center; background: color-mix(in srgb, var(--accent) 14%, var(--panel)); color: var(--accent); box-shadow: none; }
  .hero-cover.liked svg { width: 34%; height: 34%; fill: currentColor; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-2); }
  .info h1 { margin: 0; font-size: var(--hero-title); font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; }
  .line { margin: 0; color: var(--fg-2); font-size: var(--sub-fs); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
  .kind { font-weight: 500; }
  .lead { color: var(--fg); font-weight: 500; }
  .line .sep { margin: 0 var(--sp-1); }
  .desc { margin: var(--sp-1) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .actions { flex: none; display: flex; align-items: center; gap: var(--sp-2); }
  .shuffle, .big-play { display: grid; place-items: center; width: var(--play-h); height: var(--play-h); padding: 0; border-radius: 50%; }
  .shuffle svg { width: 45%; height: 45%; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .big-play :global(svg) { width: 46%; height: 46%; }

  /* Narrow: the sidebar steps aside, the hero stacks (layouts follow the window, not the page). */
  @container (max-width: 820px) {
    .win:not(.no-lib) { --lib-w: 76px; }
    .lib-label, .txt, .row .eq, .qrow span, .logo { display: none; }
    .lights { display: none; }
    .strip { padding: 0; justify-content: center; }
    .strip::before { content: ""; }
    .find { width: 150px; }
    .find .kbd { display: none; }
  }
  @container (max-width: 560px) {
    .win:not(.no-lib) { --lib-w: 0px; }
    .side-toggle { display: none !important; }
    .stage, .dock { margin-left: var(--frame) !important; }
    .find { width: 120px; }
    .hero { flex-wrap: wrap; gap: var(--sp-4); }
    .hero .actions { width: 100%; }
    .view { --gutter: var(--sp-4); }
  }
  @container (max-width: 600px) { main { --gutter: var(--sp-4); } }
</style>
