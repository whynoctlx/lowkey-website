<script lang="ts" module>
  export type LibItem = { uri: string; name: string; image?: string | null; sub?: string; count?: number; /** Songs can be added (own or collaborative playlist). */ editable?: boolean };
  export type Lib = {
    /** `uris`: the liked songs (missing in a cache from an older build). */
    liked: { uri: string; count: number; uris?: string[] };
    playlists: LibItem[];
    albums: LibItem[];
    artists: LibItem[];
  };
  /** The sidebar's order (Sort by): Spotify's own (newest saved first), last played here, by name, by creator. */
  export type LibSort = "added" | "played" | "name" | "creator";
  export type Density = "compact" | "regular" | "spacious";
  export const DENSITIES: Density[] = ["compact", "regular", "spacious"];
  export type Row = LibItem & { kind: "playlists" | "albums" | "artists" | "liked" | "recent" | "home" | "site"; line: string; icon?: string };

</script>

<script lang="ts">
  import { L } from "./i18n";
  import { enter, exit, glides, reorders, settle } from "./motion.svelte";
  import { dismiss } from "./menu";
  import { flushSync } from "svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import Marquee from "./Marquee.svelte";
  let {
    lib,
    error,
    current,
    artists = [],
    playing = false,
    selected,
    open,
    reload,
    login,
    mini = false,
    recent,
    home,
    homeOn = false,
    pins = [],
    setPins,
    sort = "added",
    setSort,
    playedAt = {},
    play,
    remove,
    density = "regular",
    setDensity,
    showRecent = true,
    setShowRecent,
    kbd = "",
    site = [],
  }: {
    lib: Lib | null;
    error: string;
    /** Uri of the playing context, highlighted in the list. */
    current?: string;
    /** Artist uris of the playing track: their library rows are marked as playing too. */
    artists?: string[];
    /** Whether that context is playing (the equaliser bounces) or paused (it holds still). */
    playing?: boolean;
    /** Uri of the item open on the main screen. */
    selected?: string;
    open: (row: Row) => void;
    reload: () => void;
    login: () => void;
    /** Icon-only view: covers without text, search or filters. */
    mini?: boolean;
    /** Recently played as one playlist row, under Liked songs in Quick access (none until a track played). */
    recent?: Row;
    /** Home, the first row of Quick access. */
    home: () => void;
    /** Home is the open view. */
    homeOn?: boolean;
    /** Pinned items' uris, in their order: a section of their own under Quick access. */
    pins?: string[];
    setPins: (uris: string[]) => void;
    sort?: LibSort;
    setSort: (s: LibSort) => void;
    /** When each item last played here (ms), for the Recently played order. */
    playedAt?: Record<string, number>;
    /** Plays an item, or pauses / resumes it when it is the one playing. */
    play: (uri: string) => void;
    /** Takes an item out of the library (unfollows an artist or playlist, removes an album). */
    remove: (r: Row) => void;
    /** The sidebar's own density (AGENTS.md "Density"): compact rows are one line each, spacious ones larger. */
    density?: Density;
    setDensity: (d: Density) => void;
    /** Recently played in Quick access (the filter menu and Settings › Sidebar). */
    showRecent?: boolean;
    setShowRecent: (on: boolean) => void;
    /** The search field's shortcut, shown at its right end. */
    kbd?: string;
    /** The website's own pages (Lowkey's demo): a labelled section of icon rows under Quick access. */
    site?: Row[];
  } = $props();

  type Filter = "playlists" | "albums" | "artists";
  const filters: [Filter, string][] = [
    ["playlists", L.library.playlists],
    ["albums", L.library.albums],
    ["artists", L.library.artists],
  ];
  let filter = $state<Filter | null>(null);
  /** Uri of the row under the pointer (or focused): its long name glides to its end. */
  let pointed = $state<string | undefined>();
  let query = $state("");
  let menu: HTMLElement;
  let filterBtn: HTMLElement;
  let searchEl = $state<HTMLInputElement>();
  /** The sidebar's search shortcut (⇧⌘F / Ctrl+Shift+F) lands here. */
  export const focusSearch = () => searchEl?.select();

  // The section label (or the filter) already names the kind, so a row shows only what follows "Playlist · ";
  // an artist row is the name alone.
  const meta = (r: Row) => r.line.split(" · ").slice(1).join(" · ");

  const rows = $derived.by((): Row[] => {
    if (!lib) return [];
    const all: Row[] = [
      ...lib.playlists.map((p) => ({ ...p, kind: "playlists" as const, line: p.count == null ? L.kind.playlist : `${L.kind.playlist} · ${L.common.songs(p.count)}` })),
      ...lib.albums.map((a) => ({ ...a, kind: "albums" as const, line: `${L.kind.album} · ${a.sub ?? ""}` })),
      ...lib.artists.map((a) => ({ ...a, kind: "artists" as const, line: L.kind.artist })),
    ];
    const q = query.trim().toLocaleLowerCase(L.locale);
    return all.filter(
      (r) =>
        (!filter || r.kind === filter) && (!q || r.name.toLocaleLowerCase(L.locale).includes(q)),
    );
  });
  // Quick access: Home, Liked songs and Recently played; always there, whatever the filter. The search
  // narrows it too.
  const quick = $derived.by((): Row[] => {
    if (!lib) return [];
    const q = query.trim().toLocaleLowerCase(L.locale);
    const liked: Row[] = lib.liked.count ? [{ uri: lib.liked.uri, name: L.library.likedSongs, kind: "liked", line: `${L.kind.playlist} · ${L.common.songs(lib.liked.count)}` }] : [];
    const start: Row = { uri: "lowkey:home", name: L.app.home, kind: "home", line: "" };
    return [start, ...liked, ...(recent ? [recent] : [])].filter((r) => !q || r.name.toLocaleLowerCase(L.locale).includes(q));
  });
  const available = $derived(filters.filter(([f]) => (lib?.[f].length ?? 0) > 0));
  // Sections like ChatGPT's "Projekty"/"Nedávne", each under its label; a filter leaves Quick access and its own kind.
  let drag = $state<{ uri: string; y: number; dy: number; moved: boolean; h: number; order: string[] } | null>(null);
  // Sort by: a stable sort, so ties (never played, the same creator) keep Spotify's order.
  const sorted = $derived.by(() => {
    const by: Record<LibSort, ((a: Row, b: Row) => number) | null> = {
      added: null,
      played: (a, b) => (playedAt[b.uri] ?? 0) - (playedAt[a.uri] ?? 0),
      name: (a, b) => a.name.localeCompare(b.name, L.locale, { sensitivity: "base" }),
      creator: (a, b) => (a.sub ?? "").localeCompare(b.sub ?? "", L.locale, { sensitivity: "base" }) || a.name.localeCompare(b.name, L.locale, { sensitivity: "base" }),
    };
    return by[sort] ? [...rows].sort(by[sort]!) : rows;
  });
  // Pinned: in the order the user set (a drag shows its own until it drops), whatever the sort; the filter and the
  // search narrow it as any section.
  const order = $derived(drag ? drag.order : pins);
  const pinned = $derived(order.map((u) => rows.find((r) => r.uri === u)).filter((r): r is Row => !!r));
  const sections = $derived(
    [
      { f: "quick", label: L.library.quick, rows: quick },
      { f: "site", label: "Lowkey", rows: site.filter((r) => !query.trim() || r.name.toLocaleLowerCase(L.locale).includes(query.trim().toLocaleLowerCase(L.locale))) },
      { f: "pinned", label: L.library.pinned, rows: pinned },
      ...filters.map(([f, label]) => ({ f: f as string, label, rows: sorted.filter((r) => r.kind === f && !order.includes(r.uri)) })),
    ].filter((s) => s.rows.length),
  );

  const pinnable = (r: Row) => r.kind === "playlists" || r.kind === "albums" || r.kind === "artists";
  // The row glides into (or out of) Pinned and the rest make way, instead of the list jumping.
  let listEl = $state<HTMLElement>();
  const togglePin = (r: Row) =>
    reorders(listEl, () => flushSync(() => setPins(pins.includes(r.uri) ? pins.filter((u) => u !== r.uri) : [...pins, r.uri])));

  // The row's own menu (right-click, or the keyboard's menu key), at the pointer, kept inside the window: Play (Pause
  // on the playing item), Pin / Unpin, then what takes it out of the library: Unfollow for an artist or someone
  // else's playlist, Remove from library for an album or the user's own playlist.
  let ctx: HTMLElement;
  let ctxRow = $state<Row | null>(null);
  let ctxAt = $state({ x: 0, y: 0 });
  let ctxFrom: HTMLElement | null = null;
  // While its menu is open the row it was opened on stays lit (`data-menu`), as in a native sidebar. Closed with the
  // pointer, the menu hands focus back to that row (popover focus restore); drop it there, keep it after Esc.
  function ctxClosed(e: ToggleEvent) {
    if (e.newState !== "closed") return;
    ctxFrom?.removeAttribute("data-menu");
    if (document.documentElement.classList.contains("pointer")) (document.activeElement as HTMLElement | null)?.blur();
  }
  function menuFor(e: MouseEvent, r: Row) {
    if (!pinnable(r)) return;
    e.preventDefault();
    ctxRow = r;
    ctxFrom?.removeAttribute("data-menu");
    ctxFrom = e.currentTarget as HTMLElement;
    ctxFrom.setAttribute("data-menu", "");
    const box = ctxFrom.getBoundingClientRect();
    const [x, y] = e.clientX || e.clientY ? [e.clientX, e.clientY] : [box.left + 8, box.bottom];
    ctx.showPopover();
    ctxAt = { x: Math.min(x, innerWidth - ctx.offsetWidth - 8), y: Math.min(y, innerHeight - ctx.offsetHeight - 8) };
    ctx.querySelector<HTMLElement>("button")?.focus();
  }

  // Pinned rows reorder by dragging (only with every pin shown: no filter, no search). Past 4 px the row lifts and
  // follows the pointer; each row it crosses glides out of its way (motion `glides`), and it settles into its slot on
  // release. The click that ends a drag opens nothing.
  let dragged = false;
  // Listened on the window, not with pointer capture: the keyed list moves the row's element as it reorders, and a
  // moved element loses its capture (the drag would stop following, or never drop).
  function grab(e: PointerEvent, r: Row) {
    if (e.button !== 0 || filter || query.trim() || pinned.length < 2) return;
    const li = (e.currentTarget as HTMLElement).parentElement!;
    drag = { uri: r.uri, y: e.clientY, dy: 0, moved: false, h: li.offsetHeight, order: pinned.map((p) => p.uri) };
    const end = (ev: PointerEvent) => {
      removeEventListener("pointermove", move);
      removeEventListener("pointerup", end);
      removeEventListener("pointercancel", end);
      drop(ev.type === "pointerup");
    };
    addEventListener("pointermove", move);
    addEventListener("pointerup", end);
    addEventListener("pointercancel", end);
  }
  const rowOf = (uri: string) => listEl?.querySelector<HTMLElement>(`li[data-k="${CSS.escape(uri)}"]`);
  function move(e: PointerEvent) {
    const d = drag;
    if (!d) return;
    d.dy = e.clientY - d.y;
    if (!d.moved && Math.abs(d.dy) < 4) return;
    if (!d.moved) getSelection()?.removeAllRanges();
    d.moved = true;
    const i = d.order.indexOf(d.uri);
    const steps = Math.max(-i, Math.min(d.order.length - 1 - i, Math.round(d.dy / d.h)));
    if (!steps) return;
    const li = rowOf(d.uri);
    if (!li) return;
    glides([li.parentElement!], () => {
      const next = d.order.filter((u) => u !== d.uri);
      next.splice(i + steps, 0, d.uri);
      d.order = next;
      flushSync();
    });
    // The lifted row is under the pointer already: it doesn't glide, it only takes its new slot as its origin.
    li.getAnimations().forEach((a) => a.id === "glide" && a.cancel());
    d.y += steps * d.h;
    d.dy -= steps * d.h;
  }
  function drop(keep: boolean) {
    const d = drag;
    drag = null;
    if (!d?.moved) return;
    // The click that follows the release opens nothing (cleared on the next frame if no click comes).
    dragged = true;
    requestAnimationFrame(() => setTimeout(() => (dragged = false)));
    if (!keep) return;
    setPins(d.order);
    const row = rowOf(d.uri)?.firstElementChild;
    if (row) settle(row, d.dy);
  }
  const segments = $derived<[Filter | null, string][]>([[null, L.library.all], ...available]);
  // How many items each choice shows.
  const counts = $derived.by(() => {
    const n = (f: Filter) => lib?.[f].length ?? 0;
    return { all: n("playlists") + n("albums") + n("artists"), playlists: n("playlists"), albums: n("albums"), artists: n("artists") };
  });
  // One drawn glyph per kind, in the toolbar icons' stroke.
  const glyphs = {
    all: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
    playlists: "M4 6h11M4 11h11M4 16h7M19 5v10.5M19 15.5a2.5 2.5 0 1 1-2.5-2.5 2.5 2.5 0 0 1 2.5 2.5z",
    albums: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 10a2 2 0 1 1 0 4 2 2 0 0 1 0-4z",
    artists: "M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM4.5 20a7.5 7.5 0 0 1 15 0",
  };
</script>

<aside class="lib" class:mini class:compact={density === "compact"} class:spacious={density === "spacious"} aria-label={L.library.label}>
  <div class="panel">
    <!-- One row: library search and a filter menu and refresh, like T3 Code's sidebar. -->
    <header>
      <label class="search">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
        <input type="search" placeholder={L.library.search} aria-label={L.library.searchLabel} title="{L.library.searchLabel} ({kbd})" bind:this={searchEl} bind:value={query} disabled={!lib} onkeydown={(e) => e.key === "Escape" && (query ? (query = "") : searchEl?.blur())} />
        {#if kbd}<kbd class="kbd" aria-hidden="true">{kbd}</kbd>{/if}
      </label>
      <button class="icon filter ic" class:on={filter} aria-label={L.library.filterLabel} title={L.library.filter} popovertarget="lib-menu" disabled={!lib} bind:this={filterBtn}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4" /></svg>
      </button>
      <button class="icon refresh ic" aria-label={L.library.refreshLabel} title={L.library.refresh} onclick={reload} disabled={!lib && !error}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>
      </button>
    </header>
    <div id="lib-menu" class="menu" popover="manual" use:dismiss={() => filterBtn} bind:this={menu} role="menu" aria-label={L.library.filterLabel}>
      {#if available.length > 1}<p class="t-label head">{L.library.show}</p>{/if}
      {#each available.length > 1 ? segments : [] as [f, label] (f ?? "all")}
        <button class="hl" role="menuitemradio" aria-checked={filter === f} onclick={() => { filter = f; menu.hidePopover(); }}>
          <svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d={glyphs[f ?? "all"]} /></svg>
          <span class="label">{label}</span>
          <span class="n">{counts[f ?? "all"]}</span>
          <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      {/each}
      {#if available.length > 1}<hr />{/if}
      <p class="t-label head">{L.library.sortBy}</p>
      {#each Object.entries(L.library.sort) as [k, label] (k)}
        <button class="hl" role="menuitemradio" aria-checked={sort === k} onclick={() => { setSort(k as LibSort); menu.hidePopover(); }}>
          <span class="label">{label}</span>
          <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      {/each}
      <hr />
      <p class="t-label head">{L.library.density}</p>
      {#each DENSITIES as d (d)}
        {@const label = L.library[d]}
        <button class="hl" role="menuitemradio" aria-checked={density === d} onclick={() => { setDensity(d); menu.hidePopover(); }}>
          <span class="label">{label}</span>
          <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
        </button>
      {/each}
      <hr />
      <button class="hl" role="menuitemcheckbox" aria-checked={showRecent} onclick={() => { menu.hidePopover(); reorders(listEl, () => flushSync(() => setShowRecent(!showRecent))); }}>
        <span class="label">{L.library.showRecent}</span>
        <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
      </button>
    </div>
    <!-- A row's own menu (right-click): Play, Pin, then Unfollow / Remove from library, per kind. -->
    <div class="menu ctx" popover="manual" use:dismiss={() => ctxFrom} bind:this={ctx} ontoggle={ctxClosed} role="menu" aria-label={ctxRow?.name} style:left="{ctxAt.x}px" style:top="{ctxAt.y}px">
      {#if ctxRow}
        {@const r = ctxRow}
        {@const on = pins.includes(r.uri)}
        {@const live = r.uri === current && playing}
        <button class="hl" role="menuitem" onclick={() => { ctx.hidePopover(); play(r.uri); }}>
          <svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d={live ? "M8 5v14M16 5v14" : "M7 5.5v13l11-6.5z"} /></svg>
          <span class="label">{live ? L.common.pause : L.common.play}</span>
        </button>
        <button class="hl" role="menuitem" onclick={() => { ctx.hidePopover(); togglePin(r); }}>
          <svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d={on ? "M4 4l16 16M9 4h6l-1 6 4 4H6l4-4zM12 14v6" : "M9 4h6l-1 6 4 4H6l4-4zM12 14v6"} /></svg>
          <span class="label">{on ? L.library.unpin : L.library.pin}</span>
        </button>
        <hr />
        <button class="hl" role="menuitem" onclick={() => { ctx.hidePopover(); remove(r); }}>
          {#if r.kind === "artists"}
            <svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zM3 20a7 7 0 0 1 12.5-4.3M16 18h6" /></svg>
          {:else}
            <svg class="kind" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M8.5 12h7" /></svg>
          {/if}
          <span class="label">{r.kind === "artists" || r.kind === "playlists" && !r.editable ? L.item.unfollow : L.item.unsave}</span>
        </button>
      {/if}
    </div>

    {#if lib}
      <div class="list" bind:this={listEl} in:enter={{ y: 4 }} out:exit>
        {#each sections as sec (sec.f)}
          <section aria-label={sec.label} class:quick={sec.f === "quick" || sec.f === "site"} class:site={sec.f === "site"}>
            <!-- Quick access (Home, Liked songs, Recently played) stands free at the top, without a label. -->
            {#if sec.f !== "quick"}<h3 class="t-label" data-k="h:{sec.f}">{sec.label}</h3>{/if}
            <ul>
              {#each sec.rows as r (r.uri)}
                {@const on = r.uri === current || (r.kind === "artists" && artists.includes(r.uri))}
                {@const sel = r.kind === "home" ? homeOn : r.uri === selected}
                <li data-k={r.uri}>
                  <button
                    class="row hl" class:playing={on} class:selected={sel}
                    class:lifted={drag?.moved && drag.uri === r.uri} style:--dy={drag?.moved && drag.uri === r.uri ? `${drag.dy}px` : undefined}
                    aria-current={sel ? "page" : undefined} onclick={() => (dragged ? (dragged = false) : r.kind === "home" ? home() : open(r))} title={r.name}
                    oncontextmenu={(e) => menuFor(e, r)}
                    onpointerdown={sec.f === "pinned" ? (e) => grab(e, r) : undefined}
                    data-open={r.kind === "home" ? undefined : r.uri}
                    onpointerenter={() => (pointed = r.uri)} onpointerleave={() => (pointed = undefined)}
                    onfocusin={() => (pointed = r.uri)} onfocusout={() => (pointed = undefined)}
                  >
                    {#if r.kind === "home"}
                      <span class="art liked" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
                      </span>
                    {:else if r.kind === "liked"}
                      <span class="art liked" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path class="fill" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                      </span>
                    {:else if r.kind === "site"}
                      <span class="art liked" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={r.icon} /></svg></span>
                    {:else if r.kind === "recent"}
                      <span class="art liked" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /><path d="M12 8v4l2.5 2" /></svg>
                      </span>
                    {:else}
                      <!-- The span keeps the grey placeholder while the image fades in over it. Hovered, the cover dims
                           under the player's play/pause glyph (no disc); a click there plays or pauses instead of opening. -->
                      <span class="art" class:empty={!r.image} class:round={r.kind === "artists"}>
                        {#if r.image}<img src={r.image} alt="" width="48" height="48" loading="lazy" />
                        {:else}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>{/if}
                        {#if pinnable(r)}
                          {@const live = r.uri === current && playing}
                          <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (the keyboard plays from the row's menu) -->
                          <span class="cue" class:live title={live ? L.common.pause : L.common.playItem(r.name)} onclick={(e) => { if (dragged) return; e.stopPropagation(); play(r.uri); }}><PlayIcon playing={live} /></span>
                        {/if}
                      </span>
                    {/if}
                    <span class="text">
                      <!-- The playing row glides while it plays (hover holds it); any other glides while pointed at. -->
                      <span class="name"><Marquee on={on ? playing : pointed === r.uri} peek={!on}>{r.name}</Marquee></span>
                      {#if meta(r)}<span class="line">{meta(r)}</span>{/if}
                    </span>
                    {#if pinnable(r)}
                      {@const isPinned = pins.includes(r.uri)}
                      <!-- Pin / Unpin under the pointer too, not only in the row's menu (where the keyboard reaches it). -->
                      <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
                      <span
                        class="pin" class:pinned={isPinned} title={isPinned ? L.library.unpin : L.library.pin}
                        onpointerdown={(e) => e.stopPropagation()}
                        onclick={(e) => { e.stopPropagation(); togglePin(r); }}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path class:fill={isPinned} d="M9 4h6l-1 6 4 4H6l4-4z" /><path d="M12 14v6" /></svg>
                      </span>
                    {/if}
                    {#if on}
                      <span class="eq" class:held={!playing} aria-label={playing ? L.common.playing : L.common.paused}><i></i><i></i><i></i></span>
                    {/if}
                  </button>
                </li>
              {/each}
            </ul>
          </section>
        {:else}
          <p class="note">{query ? L.common.notFound : L.library.empty}</p>
        {/each}
      </div>
    {:else if error}
      <div class="note">
        <p>{error}</p>
        {#if error === L.rust.notSignedIn || error.startsWith(L.rust.signInExpired)}
          <p>{L.library.signInHint}</p>
          <button class="primary" onclick={login}>{L.library.signIn}</button>
        {:else}
          <button class="primary" onclick={reload}>{L.common.retry}</button>
        {/if}
      </div>
    {:else}
      <ul class="list" aria-busy="true" aria-label={L.library.loading} in:enter={{ y: 0 }} out:exit={{ y: 0 }}>
        {#each Array(10) as _}
          <li class="row skeleton"><span class="art"></span><span class="bar"></span></li>
        {/each}
      </ul>
    {/if}
  </div>
</aside>

<style>
  .lib { display: flex; flex-direction: column; min-height: 0; container-type: inline-size; }

  .panel { display: flex; flex-direction: column; min-height: 0; }
  header { display: flex; align-items: center; gap: 2px; padding: 0 var(--sp-2) var(--sp-2); }

  /* The global .menu, anchored under the filter button. */
  .filter { anchor-name: --lib-filter; }
  .menu { position-anchor: --lib-filter; top: calc(anchor(bottom) + 4px); left: anchor(left); width: 208px; transform-origin: top left; }
  /* Rows like Select's (AGENTS.md): kind glyph, name, count in --fg-3, and an accent check at the right on the chosen
     one; no fill but the hover. */
  .menu .kind { flex: none; width: 16px; height: 16px; color: var(--fg-3); }
  .menu .head { margin: 0; padding: var(--sp-2) var(--sp-2) var(--sp-1); }
  .menu hr { height: 0.5px; margin: var(--sp-1) calc(var(--sp-1) * -1); border: 0; background: var(--border); }
  /* The row menu opens at the pointer (left/top set from it). */
  .menu .kind { fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .menu.ctx { position: fixed; position-anchor: none; inset: auto; width: auto; min-width: 140px; transform-origin: top left; }
  /* A pinned row being dragged: lifted over the others (a floating layer: --panel, --shadow), under the pointer. */
  .row.lifted { position: relative; z-index: 1; transform: translateY(var(--dy)); background: var(--panel); box-shadow: 0 0 0 0.5px var(--border-strong), var(--shadow); transition: none; }
  .menu .label { flex: 1; min-width: 0; }
  .menu .n { color: var(--fg-3); font-size: var(--meta-fs); font-variant-numeric: tabular-nums; }
  .menu .check { flex: none; width: 14px; height: 14px; color: var(--accent); stroke-width: 2.25; visibility: hidden; }
  .menu [aria-checked="true"] .check { visibility: visible; }

  button { font: inherit; color: inherit; border: none; background: none; cursor: default; padding: 0; }
  .icon { display: grid; place-items: center; width: var(--ctl-h); height: var(--ctl-h); border-radius: var(--r-2); color: var(--fg-3); }
  .icon.on { color: var(--accent); }
  .icon:disabled { opacity: 0.4; }

  svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  svg .fill { fill: currentColor; stroke: none; }

  /* Search reads as a row (like "Nový čet") until focused. */
  .search {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 var(--sp-2);
    border-radius: var(--r-2);
    color: var(--fg-3);
    transition: background var(--m-2) var(--ease), color var(--m-2) var(--ease);
  }
  .search:hover { background: var(--hover); }
  .search:focus-within { background: var(--active); color: var(--fg-2); }
  .search svg { width: 16px; height: 16px; flex: none; }
  .search input { flex: 1; min-width: 0; border: none; background: none; color: var(--fg); font: inherit; font-size: var(--fs); height: var(--ctl-h); padding: 0; outline: none; }
  .search input::placeholder { color: var(--fg-3); }
  .search input::-webkit-search-cancel-button { display: none; }
  /* Its shortcut rests at the right end, as the toolbar search's, and fades out once the field is focused or filled. */
  .search .kbd { transition: opacity var(--m-3) var(--ease); }
  .search:is(:focus-within, :has(input:not(:placeholder-shown))) .kbd { opacity: 0; }
  @container (max-width: 240px) { .search .kbd { display: none; } }

  .list { list-style: none; margin: 0; padding: 0 var(--sp-2) var(--sp-4); overflow-y: auto; flex: 1; min-height: 0; }
  /* The scroll edges: rows fade to clear over --sp-3 at the top (inside the first heading's padding) and --sp-6 at
     the bottom, like the body's (AGENTS.md). */
  .list {
    padding-bottom: var(--sp-6);
    -webkit-mask: var(--bar-keep), linear-gradient(transparent, #000 var(--sp-3), #000 calc(100% - var(--sp-6)), transparent);
    mask: var(--bar-keep), linear-gradient(transparent, #000 var(--sp-3), #000 calc(100% - var(--sp-6)), transparent);
  }
  ul { list-style: none; margin: 0; padding: 0; }
  h3 { padding: var(--sp-4) var(--sp-2) var(--sp-1); }
  /* Quick access has no label, but keeps the room a label's top padding gave it under the search. */
  .quick:not(.site) { padding-top: var(--sp-4); }
  .mini .quick { padding-top: 0; }
  /* Quick access is the app's own navigation, not library items: a bare glyph in the cover column (so names line up
     with the rows below), the name alone, rows --row-h tall. --fg-2 at rest, --fg when open; the playing one is --now
     as any row. The icon-only view keeps its covers. */
  .lib:not(.mini) .quick .row { height: var(--row-h); }
  .lib:not(.mini) .quick .art { height: auto; background: none; outline: none; color: var(--fg-2); transition: color var(--m-5) var(--ease); }
  .lib:not(.mini) .quick .art svg { width: 18px; height: 18px; }
  .lib:not(.mini) .quick .line { display: none; }
  .lib:not(.mini) .quick .name { font-size: var(--fs); color: var(--fg-2); transition: color var(--m-5) var(--ease); }
  .lib:not(.mini) .quick .row:hover :is(.art, .name) { transition-duration: var(--m-1); }
  .lib:not(.mini) .quick .row:is(.selected, :hover) :is(.art, .name) { color: var(--fg); }
  .lib:not(.mini) .quick .playing .name { color: var(--now); }

  .row { display: flex; align-items: center; gap: var(--sp-3); width: 100%; height: var(--lib-row); padding: 0 var(--sp-2); border-radius: var(--r-2); text-align: left; }
  .row.selected, button.row.selected:hover { background: var(--active); }
  .row:global([data-menu]):not(.selected) { background: var(--hover); box-shadow: var(--hover-edge); transition-duration: var(--m-1); }

  /* Art with the tiles' hairline, so dark and white covers both keep an edge on the glass. */
  .art > img { width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
  .art { overflow: hidden; width: var(--lib-art); height: var(--lib-art); border-radius: var(--r-2); object-fit: cover; flex: none; background: var(--active); display: grid; place-items: center; color: var(--fg-3); outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent); outline-offset: -0.5px; transition: background var(--m-5) var(--ease), color var(--m-5) var(--ease); }
  .art.round { border-radius: 50%; }
  /* The cover's play: a flat --on-cover-dim veil over the art (light in light, dark in dark) and the bare --accent glyph
     on it, so it reads on any cover. Arrives with hover, leaves slower. */
  .art { position: relative; }
  .cue { position: absolute; inset: 0; display: grid; place-items: center; background: var(--on-cover-dim); color: var(--accent); opacity: 0; transition: opacity var(--m-5) var(--ease); }
  .cue :global(svg.pp) { width: 44%; height: 44%; }
  .row:not(.lifted):is(:hover, :focus-visible) .cue { opacity: 1; transition-duration: var(--m-1); }
  .art svg { width: 36%; height: 36%; }
  /* No cover: a faint well with a small note, so placeholders recede behind real art. */
  .art.empty { background: color-mix(in srgb, var(--fg) 5%, transparent); color: color-mix(in srgb, var(--fg) 30%, transparent); }
  .liked { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); }

  .text { display: flex; flex-direction: column; gap: 2px; flex: 1; min-width: 0; }
  .name, .line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .name { font-size: var(--name-fs); font-weight: 500; color: var(--fg); line-height: 1.3; }
  .line { font-size: var(--sub-fs); color: var(--fg-3); line-height: 1.3; font-variant-numeric: tabular-nums; }
  /* Compact rows are one line, like the ChatGPT list. */
  .compact .line { display: none; }
  .playing .name { color: var(--now); font-weight: 600; }

  .note { margin: 0; padding: var(--sp-3) var(--sp-2); color: var(--fg-2); }
  .note p { margin: 0 0 var(--sp-3); }
  .primary { padding: var(--sp-1) var(--sp-3); border-radius: var(--r-2); background: var(--accent); color: var(--on-accent); font-weight: 500; }
  .primary:hover { filter: brightness(1.08); }

  .skeleton .art, .skeleton .bar { background: var(--active); }
  .skeleton .bar { height: 9px; border-radius: var(--r-1); width: 60%; }
  .skeleton:nth-child(3n) .bar { width: 42%; }
  .skeleton { animation: pulse 1.4s ease-in-out infinite, wait var(--m-4) var(--ease) var(--m-4) backwards; }
  @keyframes pulse { 50% { opacity: 0.5; } }

  /* Icon-only view. */
  .mini header { display: none; }
  /* Pin / Unpin: a bare --fg-2 glyph at the row's end, only under the pointer or focus (quiet until touched); --fg
     when pointed at itself; pinned, it is on: filled --accent (outline and fill, so it keeps its size). */
  /* It lies over the row's end, so names use the whole width at rest; under the pointer the text fades out beneath it. */
  .row { position: relative; }
  .pin { position: absolute; right: var(--sp-1); top: 50%; translate: 0 -50%; display: grid; place-items: center; width: calc(var(--ctl-h) - var(--sp-1)); height: calc(var(--ctl-h) - var(--sp-1)); border-radius: var(--r-1); color: var(--fg-2); opacity: 0; transition: opacity var(--m-5) var(--ease), color var(--m-5) var(--ease), background var(--m-5) var(--ease); }
  .pin svg { width: 16px; height: 16px; }
  .pin.pinned, .pin.pinned:hover { color: var(--accent); }
  .pin.pinned svg .fill { stroke: currentColor; }
  .row:not(.lifted):is(:hover, :focus-visible) .pin { opacity: 1; transition-duration: var(--m-1); }
  .row:not(.lifted):has(.pin):is(:hover, :focus-visible) :is(.text, .eq) { -webkit-mask: linear-gradient(to left, transparent var(--ctl-h), #000 calc(var(--ctl-h) + var(--sp-4))); mask: linear-gradient(to left, transparent var(--ctl-h), #000 calc(var(--ctl-h) + var(--sp-4))); }
  .pin:hover { color: var(--fg); background: var(--hover); }
  .pin:active { background: var(--press); }
  .mini .pin, .mini .text, .mini .eq, .mini .skeleton .bar { display: none; }
  /* Covers are centred under the traffic lights (x 20pt, 3 × 14pt + 2 × 6pt: centre ≈ 48pt measured, window points). */
  .mini { --mini-x: calc(48px / var(--zoom, 1) - 22px); }
  :global(html:not(.mac)) .mini { --mini-x: 20px; }
  .mini h3 { width: 32px; height: 0; padding: 0; margin: 8px 6px; border-top: 1px solid var(--border); font-size: 0; }
  .mini section:first-child h3 { display: none; }
  .mini .list { padding: var(--sp-3) 0 var(--sp-6) var(--mini-x); scrollbar-width: none; }
  .mini .row { width: 44px; height: auto; padding: var(--sp-1) 0; }
  .mini .art { width: 44px; height: 44px; border-radius: var(--r-2); }
  .mini .art.round { border-radius: 50%; }
  /* Collapsed rows have no fill: hover, selection and playing are rings around the cover. */
  .mini button.row:is(:hover, :active, :has(:focus-visible)), .mini .row.selected, .mini button.row.selected:hover { background: none; box-shadow: none; }
  .mini .art { outline: 2px solid transparent; outline-offset: 2px; transition: outline-color var(--m-2) var(--ease), filter var(--m-2) var(--ease), background var(--m-5) var(--ease), color var(--m-5) var(--ease); }
  .mini button.row:is(:hover, :global([data-menu])) .art { outline-color: var(--border-strong); filter: brightness(1.06); }
  .mini .row.selected .art { outline-color: var(--fg-3); }
  .mini .playing .art, .mini button.row.playing:hover .art { outline-color: var(--now); }
  .mini .row:focus-visible { outline: none; }
  .mini .row:focus-visible .art { outline-color: color-mix(in srgb, var(--accent) 60%, transparent); }
  .mini .note { display: none; }
  @media (prefers-reduced-motion: reduce) { .skeleton { animation: none; } }
</style>
