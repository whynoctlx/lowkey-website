<!-- The Lowkey window, 1:1: the app's shell (src/routes/+page.svelte) and its own components, on demo data. Soloist and
     Spotify are replaced by a small simulated player (`send`) and the made-up library in demo.ts. -->
<script lang="ts">
  import "./app.css";
  import { onMount, tick, untrack } from "svelte";
  import { pushState, replaceState } from "$app/navigation";
  import { page as kit } from "$app/state";
  import { SvelteMap } from "svelte/reactivity";
  import { L } from "./i18n";
  import Player, { type Entity, type Playback, PLAYER_LOOK } from "./Player.svelte";
  import Library, { type Density, type Lib, type LibItem, type LibSort, type Row } from "./Library.svelte";
  import Playlist, { type Track } from "./Playlist.svelte";
  import Search, { type Results } from "./Search.svelte";
  import Home from "./Home.svelte";
  import AddTo from "./AddTo.svelte";
  import { enter, exit, fitFloat, initMotion, motion } from "./motion.svelte";
  import { dismiss } from "./menu";
  import { shortLink, spotifyUri } from "./link";
  import { holdTiles } from "./tiles";
  import Site, { SITE, LEGAL, type SitePage, getLatest } from "./Site.svelte";
  import Settings from "./Settings.svelte";
  import Tour, { type Stop } from "./Tour.svelte";
  import * as demo from "./demo";
  import Hush from "./Hush.svelte";

  const MAC = typeof document !== "undefined" && document.documentElement.dataset.os === "mac"; // app.html sets it (?mac, ?windows)
  const MOD = MAC ? "⌘" : "Ctrl+";

  let mounted = $state(false);
  let settingsOpen = $state(false);
  // Home's shelves the demo's visitor hid (Home's own picker; `false` by shelf key).
  let shelfPicks = $state<Record<string, boolean>>({});
  let win = $state<HTMLElement>();
  let winW = $state(1100);

  // Library ------------------------------------------------------------------------------------------------------
  let lib = $state<Lib>(structuredClone(demo.lib));
  let pins = $state<string[]>([demo.lib.playlists[0].uri, ...["Luca Brassi10x", "Redzed", "Unaverage Gang"].map(demo.artistUri)]);
  let playedAt = $state<Record<string, number>>({});
  let libSort = $state<LibSort>("added");
  let libDensity = $state<Density>("regular");
  let libRecent = $state(true);
  // Your own playlists in a section of their own, as the app shows them; each section's dragged order (by section).
  let libOwn = $state(true);
  let orders = $state<Record<string, string[]>>({});
  const LIB_MINI = 84;
  const LIB_MIN = 200;
  const LIB_MAX = 440;
  let libWidth = $state(240);
  let libHidden = $state(false);
  let libGlide = $state(false);
  // A narrow window (a phone) starts on the covers-only sidebar, as the app does when dragged that narrow.
  const narrow = $derived(winW < 720);
  const width = $derived(narrow && libWidth > LIB_MINI ? LIB_MINI : libWidth);
  const libMini = $derived(width === LIB_MINI);
  let wideWidth = 240;
  let glideTimer: ReturnType<typeof setTimeout> | undefined;
  function glideLib(change: () => void) {
    if (motion.ms && !motion.reduce) {
      libGlide = true;
      clearTimeout(glideTimer);
      glideTimer = setTimeout(() => (libGlide = false), motion.ms + 50);
    }
    change();
  }
  const setLibHidden = (h: boolean) => h !== libHidden && glideLib(() => (libHidden = h));
  function setLibWidth(w: number) {
    libWidth = w < (LIB_MINI + LIB_MIN) / 2 ? LIB_MINI : Math.round(Math.min(LIB_MAX, Math.max(LIB_MIN, w)));
    if (libWidth !== LIB_MINI) wideWidth = libWidth;
  }
  function dragLib(e: PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const left = win!.getBoundingClientRect().left;
    const move = (m: PointerEvent) => setLibWidth(m.clientX - left);
    holdTiles(true);
    const end = () => {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      holdTiles(false);
    };
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }
  let libView = $state<{ focusSearch: () => void }>();

  const libKind = (r: Row) => (r.kind === "playlists" || r.kind === "albums" || r.kind === "artists" ? r.kind : null);
  const inLib = (r: Row) => (libKind(r) ? lib[libKind(r)!].some((i) => i.uri === r.uri) : undefined);
  function setSaved(r: Row, on: boolean) {
    const k = libKind(r);
    if (!k) return;
    const { kind, line, ...item } = r;
    item.image ??= info.image ?? null;
    lib[k] = on ? [item, ...lib[k].filter((i) => i.uri !== r.uri)] : lib[k].filter((i) => i.uri !== r.uri);
  }
  const likedSet = $derived(new Set(lib.liked.uris ?? []));
  function setLiked(uri: string, on: boolean) {
    if (likedSet.has(uri) === on) return;
    const rest = (lib.liked.uris ?? []).filter((u) => u !== uri);
    lib.liked = { ...lib.liked, uris: on ? [uri, ...rest] : rest, count: lib.liked.count + (on ? 1 : -1) };
  }
  const editable = $derived(lib.playlists.filter((p) => p.editable));
  const members = new SvelteMap<string, Set<string>>(demo.lib.playlists.map((p) => [p.uri, new Set(demo.itemData(p.uri).tracks.map((t) => t.uri))]));
  let picker = $state<AddTo>();
  const addTo = (uri: string, el: HTMLElement) => picker?.open(uri, el);
  const inPlaylist = (playlist: string, track: string) => members.get(playlist)?.has(track);
  function setInPlaylist(p: LibItem, track: string, on: boolean) {
    const next = new Set(members.get(p.uri));
    on ? next.add(track) : next.delete(track);
    members.set(p.uri, next);
    const item = lib.playlists.find((i) => i.uri === p.uri);
    if (item?.count != null) item.count = next.size;
  }

  /** Sidebar rows marked as playing, one tier only (as the app): the playlists holding the track, else its followed
   *  artists, else Liked songs; the source alone when it is in that tier. */
  const holding = $derived.by(() => {
    const t = playback.item?.uri;
    if (!t) return source ? [source] : [];
    const by = new Set((playback.item?.decorations?.creators ?? []).map((c) => c.entity?.uri));
    const tiers = [
      lib.playlists.filter((p) => p.uri === source || members.get(p.uri)?.has(t)).map((p) => p.uri),
      lib.artists.filter((a) => a.uri === source || by.has(a.uri)).map((a) => a.uri),
      source === lib.liked.uri || likedSet.has(t) ? [lib.liked.uri] : [],
    ];
    const tier = tiers.find((u) => u.length) ?? (source ? [source] : []);
    return source && tier.includes(source) ? [source] : tier;
  });

  // Views and history (the app's back/forward and breadcrumb) ----------------------------------------------------
  const RECENT = "lowkey:recent";
  let played = $state<Track[]>(structuredClone(demo.played));
  let selected = $state<Row | null>(null);
  let searchOpen = $state(false);
  let homeOpen = $state(true);
  let query = $state("");
  let results = $state<Results | null>(null);
  let searchEl = $state<HTMLInputElement>();
  let mainEl = $state<HTMLElement>();
  const loaded = (uri: string) => {
    if (uri === demo.LIKED) return [...lib.liked.uris ?? []].map((u) => demo.tracks.get(u)!).filter(Boolean);
    const t = demo.itemData(uri).tracks;
    const m = members.get(uri);
    return m ? [...t.filter((x) => m.has(x.uri)), ...[...m].filter((u) => !t.some((x) => x.uri === u)).map((u) => demo.tracks.get(u)!)] : t;
  };
  const asRow = (s: (typeof SITE)[number]): Row => ({ uri: s.uri, name: s.name, icon: s.icon, kind: "site", line: "" });
  const siteRows = SITE.map(asRow);
  const legalRows = LEGAL.map(asRow);
  // A changelog is a page of its own (lowkey:changelog/0.4), so back from it returns to the list.
  const LOG = "lowkey:changelog/";
  const sitePage = (uri?: string) => (uri?.startsWith(LOG) ? "changelog" : [...SITE, ...LEGAL].some((s) => s.uri === uri) ? (uri!.slice(7) as SitePage) : null);
  const openVersion = (v: string | null) => {
    const list = siteRows.find((r) => r.uri === "lowkey:changelog")!;
    open(v ? { ...list, uri: LOG + v, name: v } : list);
  };
  const tracks = $derived(selected && !sitePage(selected.uri) ? (selected.uri === RECENT ? played : loaded(selected.uri)) : null);
  const info = $derived(selected && selected.uri !== RECENT && !sitePage(selected.uri) ? demo.itemData(selected.uri).info : {});

  type View = { row: Row | null; search?: boolean; home?: boolean; root?: boolean; q?: string };
  let back = $state<View[]>([]);
  let fwd = $state<View[]>([]);
  let root = $state(false);
  const snap = (): View => ({ row: selected, search: searchOpen, home: homeOpen, root, q: searchOpen ? query.trim() : undefined });
  function show(v: View) {
    root = !!v.root;
    searchOpen = !!v.search;
    homeOpen = !!v.home;
    if (v.row?.uri !== selected?.uri) toTop();
    selected = v.row;
  }
  // Every page the window opens is also an entry in the browser's history (state.lk: its depth), so the mouse's
  // back/forward buttons, the browser's own and a trackpad swipe walk the window, not the site.
  // The legal pages have their own links (?privacy, ?tos) that open them and show while they're open.
  const LINKS: Record<string, string> = { privacy: "lowkey:privacy", tos: "lowkey:terms", terms: "lowkey:terms" };
  // Changelogs too: ?changelog for the list, ?changelog=0.4 for one version.
  const urlFor = (v: View, uri = v.row?.uri ?? "") =>
    uri.startsWith(LOG) ? `?changelog=${encodeURIComponent(uri.slice(LOG.length))}` : ({ "lowkey:privacy": "?privacy", "lowkey:terms": "?tos", "lowkey:changelog": "?changelog" })[uri] ?? location.pathname;
  function navigate(v: View) {
    back = [...back, snap()];
    fwd = [];
    show(v);
    pushState(urlFor(v), { lk: back.length });
  }
  function step(from: View[], to: View[]): [View[], View[]] {
    const v = from.at(-1)!;
    const next: [View[], View[]] = [from.slice(0, -1), [...to, snap()]];
    show(v);
    return next;
  }
  const goBack = () => back.length && history.back();
  const goFwd = () => fwd.length && history.forward();
  const goBackBy = (k: number) => history.go(-k);
  // The browser moved (its back/forward, the mouse's, a swipe): walk the window to that entry's depth (none: the start).
  $effect(() => {
    const depth = (kit.state as { lk?: number }).lk ?? 0;
    untrack(() => walkTo(depth));
  });
  /** Walk the window's stacks to the entry at `depth`. */
  function walkTo(depth: number) {
    const d = depth - back.length;
    if (d < 0 && back.length >= -d) backBy(-d);
    else for (let i = 0; i < d && fwd.length; i++) [fwd, back] = step(fwd, back);
  }
  function backBy(k: number) {
    const target = back.at(-k)!;
    fwd = [...fwd, snap(), ...back.slice(back.length - k + 1).reverse()];
    back = back.slice(0, -k);
    show(target);
  }
  const open = (row: Row, fromSidebar = false) => (row.uri !== selected?.uri || searchOpen || homeOpen) && navigate({ row, root: fromSidebar });
  const page = $derived(searchOpen ? "search" : homeOpen ? "home" : (selected?.uri ?? ""));
  const goHome = () => !(homeOpen && !searchOpen) && navigate({ row: selected, home: true });
  // A pasted Spotify link opens its item in the app; the demo can't reach Spotify, so it says so in the search view.
  let linkNote = $state("");
  function onSearch() {
    const q = query.trim();
    // An emptied query leaves the search for the page under it, as the app does.
    if (!q) {
      results = null;
      linkNote = "";
      if (!searchOpen) return;
      const prev = back.at(-1);
      if (prev && !prev.search) return void goBack();
      return show({ row: selected, home: !selected });
    }
    const link = spotifyUri(q) ?? shortLink(q);
    // The demo's one known link opens its album, as the app would; any other link only gets the note.
    const row = link && demo.linkRow(link);
    if (row) {
      query = "";
      results = null;
      linkNote = "";
      return void open(row);
    }
    if (!searchOpen) navigate({ row: selected, search: true });
    linkNote = link ? "In Lowkey, a pasted Spotify link opens right away: a song plays, an album, playlist or artist opens. This demo knows only one link, the one Try it in the tour pastes." : "";
    results = link ? null : demo.search(q);
  }
  async function toTop() {
    const y = mainEl?.scrollTop ?? 0;
    await tick();
    for (const el of mainEl?.querySelectorAll<HTMLElement>(".page") ?? [])
      if (el.style.position === "absolute") el.style.top = `${parseFloat(el.style.top) - y}px`;
    mainEl?.scrollTo(0, 0);
  }
  const crumbs = $derived.by(() => {
    if (homeOpen) return [];
    const views = [...back, snap()];
    let path: { key: string; name: string; at: number }[] = [];
    views.forEach((v, at) => {
      if (v.home) return void (path = []);
      if (v.root) path = [];
      const key = v.search ? "search" : v.row?.uri;
      if (!key) return;
      const seen = path.findIndex((c) => c.key === key);
      if (seen >= 0) path = path.slice(0, seen);
      path.push({ key, name: v.search ? (v.q ? L.common.quoted(v.q) : L.common.search) : v.row!.name, at });
    });
    const last = views.length - 1;
    return path.map((c) => ({ key: c.key, name: c.name, go: c.at < last ? () => goBackBy(last - c.at) : undefined }));
  });
  // A long path keeps its first step and the last three; the steps between fold into a "…" menu.
  const folded = $derived(crumbs.length > 4 ? crumbs.slice(1, -3) : []);
  const shownCrumbs = $derived(folded.length ? [crumbs[0], ...crumbs.slice(-3)] : crumbs);
  let foldMenu = $state<HTMLElement>();
  let foldBtn = $state<HTMLElement>();

  // The tour (Tour.svelte): every feature, lit in place in this window. Started by `lowkey:tour` (the hero, Features).
  let touring = $state(false);
  const liked = () => open({ uri: lib.liked.uri, name: L.library.likedSongs, kind: "liked", line: "" }, true);
  const download = () => open(siteRows.find((r) => r.uri === "lowkey:download")!, true);
  // The search stop's link: a real album link the demo opens as its own copy of that album (demo.linkRow).
  const LINK = "https://open.spotify.com/album/4eLPsYPBmXABThSJ821sqY";
  // Try it pastes the link into the field and lets it sit there a moment, so you see what was pasted, then opens it.
  let pasting = $state(false);
  function pasteLink() {
    searchEl?.focus(); // before the query: focusing a filled field would search at once
    query = LINK;
    pasting = true;
    setTimeout(() => ((pasting = false), onSearch()), 900);
  }
  const stops: Stop[] = [
    { title: "A one-minute tour", text: "Everything in this window is the real Lowkey, running on demo data. Each stop lights one part of it, and you can try it right there.", go: goHome },
    { at: ".side", title: "Your library, as in Spotify", text: "Playlists, albums and artists in one sidebar. Sort and filter it from the button by the search.", tip: "Drag its right edge: narrow enough and it becomes a column of covers.", did: () => libWidth },
    { at: ".side section.pins", title: "Pinned on top", text: "What you play most stays at the top, in the order you choose. Every row has a pin; pinned ones keep theirs showing.", tip: "Drag any row from below up here to pin it, or drag a pinned one out to unpin it.", did: () => pins.join() },
    { at: ".side section:has([data-k='h:own'])", title: "Made by you", text: "Your own playlists get a section of their own, apart from the ones you saved, and every section keeps the order you drag it into.", tip: "Drag a playlist up or down.", did: () => JSON.stringify(orders) },
    { at: ".side section:has([data-k='h:own']) li", title: "No waiting", text: "Point at a playlist and Lowkey loads it right then, so it's already there when you click.", tip: "Point at it, then open it.", did: () => selected?.uri },
    { at: "main .loaded", title: "Every card visible", text: "No “Show all”. Every shelf shows all of its albums, playlists and artists, as many per row as fit. Pick the shelves Home shows from the menu at its top.", tip: "Resize your browser: once you stop, the cards glide into place in one move.", go: goHome, did: () => winW },
    { at: ".dock", title: "A floating player", text: "The player floats over the page on glass, exactly as wide as what it shows. A long title glides so you can read all of it, instead of ending in “…”.", tip: "Press play, or skip to the next song.", did: () => `${playing}${playback.item?.uri}` },
    { at: "main .like.on", title: "Songs into your playlists", text: "The check next to a liked song opens the save menu: add it to your own or collaborative playlists, or take it out.", tip: "Press the check.", go: liked, did: () => !!win?.querySelector("[role=menu]:popover-open") },
    { at: ".top .history", title: "Back and forward", text: `Every page you open is a step. Go back with the arrows, ${MOD}[ and ${MOD}], your mouse's side buttons or a swipe. A long path folds its middle into “…”.` },
    { at: ".find", title: "Search, or paste a link", text: `Songs, albums, artists and playlists as you type, ${MOD}F from anywhere. Paste a Spotify link and Lowkey opens it at once: a song plays, an album or playlist opens.`, tip: "Press Try it: it pastes an album link and the album opens.", try: pasteLink },
    { at: ".gear", title: "Yours to tune", text: "Theme, accent colour, contrast, density, UI scale, motion and glass. Every change shows at once.", tip: `Open Settings with the gear or ${MOD},.`, did: () => settingsOpen },
    { title: "That's Lowkey", go: () => (settingsOpen = false), text: "Your Spotify Premium, in a quieter, native window. Free, forever, for macOS. Windows is coming soon." },
  ];
  // The first visit starts it once; a cookie remembers that, and the toolbar's Tour button starts it again.
  const startTour = () => {
    settingsOpen = false;
    touring = true;
    document.cookie = "lk-tour=seen; max-age=31536000; path=/; SameSite=Lax";
  };
  $effect(() => {
    addEventListener("lowkey:tour", startTour);
    const first = /(^|; )lk-tour=seen/.test(document.cookie) ? undefined : setTimeout(startTour, 900);
    return () => (removeEventListener("lowkey:tour", startTour), clearTimeout(first));
  });

  // The player: what Soloist does, simulated ---------------------------------------------------------------------
  const entity = (t: Track): Entity => ({
    uri: t.uri,
    decorations: {
      identity: { name: t.name },
      visual_identity: { cover: [{ url: t.image!, size: "small" }] },
      creators: t.artists.map((a) => ({ entity: { uri: a.uri!, decorations: { identity: { name: a.name } } } })),
      playback: { duration_ms: t.duration_ms },
    },
  });
  const first = demo.tracks.get("spotify:track:chase-status-generic-2")!;
  let queue: Track[] = demo.queueOf(first.album_uri!);
  let at = queue.findIndex((t) => t.uri === first.uri);
  let context = $state<string | undefined>(first.album_uri!);
  let origin = $state<string | undefined>();
  let playback = $state<Playback>({
    status: "paused", item: entity(first), volume: 0,
    position: { position_ms: 48_000, timestamp_ms: Date.now(), speed: 0 },
    options: { shuffle: false, repeat: "off" },
  });
  const playing = $derived(playback.status === "playing");
  const source = $derived(!context || context.startsWith("spotify:track:") ? origin : context);
  const nowTrack = $derived(demo.tracks.get(playback.item!.uri) ?? null);
  // Every few seconds of "playing" silence (not mid-tour): pause, and let a joke point to the real app. Play again, and it comes back.
  const HUSH_S = 2;
  let hush = $state(false);
  $effect(() => {
    if (!playing || touring || hush) return;
    const t = setTimeout(() => ((hush = true), send("pause")), HUSH_S * 1000);
    return () => clearTimeout(t);
  });
  const pos = () => { const p = playback.position!; return p.position_ms + (Date.now() - p.timestamp_ms) * p.speed; };
  let endTimer: ReturnType<typeof setTimeout> | undefined;
  function setPos(ms: number, run = playing) {
    playback.position = { position_ms: ms, timestamp_ms: Date.now(), speed: run ? 1 : 0 };
    playback.status = run ? "playing" : "paused";
    clearTimeout(endTimer);
    if (run) endTimer = setTimeout(ended, nowTrack!.duration_ms - ms);
  }
  function ended() {
    if (playback.options!.repeat === "track") return setPos(0, true);
    if (at < queue.length - 1 || playback.options!.repeat === "context") return go(1);
    setPos(nowTrack!.duration_ms, false);
  }
  function go(d: number, run = true) {
    at = (at + d + queue.length) % queue.length;
    playback.item = entity(queue[at]);
    setPos(0, run);
  }
  function start(uri: string, from?: string) {
    context = uri;
    origin = from;
    queue = demo.queueOf(from && uri.startsWith("spotify:track:") ? from : uri);
    if (from === RECENT) queue = played.slice();
    at = uri.startsWith("spotify:track:") ? Math.max(0, queue.findIndex((t) => t.uri === uri)) : playback.options!.shuffle ? Math.floor(Math.random() * queue.length) : 0;
    go(0);
  }
  function send(command: string, extra: Record<string, any> = {}) {
    const o = playback.options!;
    switch (command) {
      case "play": return extra.uri ? start(extra.uri) : setPos(pos(), true);
      case "pause": return setPos(pos(), false);
      case "skip_next": return go(o.shuffle ? 1 + Math.floor(Math.random() * (queue.length - 1)) : 1);
      case "skip_prev": return pos() > 3000 ? setPos(0, true) : go(-1);
      case "seek": return setPos(extra.position_ms);
      case "set_shuffle": return void (playback.options = { ...o, shuffle: extra.enabled });
      case "set_repeat_context": return extra.enabled && void (playback.options = { ...o, repeat: "context" });
      case "set_repeat_track": return void (playback.options = { ...o, repeat: extra.enabled ? "track" : o.repeat === "track" ? "off" : o.repeat });
    }
  }
  function play(uri: string, from?: string) {
    if (from === RECENT) { origin = RECENT; context = uri; queue = played.slice(); at = queue.findIndex((t) => t.uri === uri); return go(0); }
    start(uri, from);
  }
  const playContext = (uri: string) => (uri !== source ? play(uri) : send(playing ? "pause" : "play"));
  const playTrack = (uri: string, from?: string) => (uri !== playback.item?.uri ? play(uri, from) : send(playing ? "pause" : "play"));
  const shuffle = $derived(playback.options!.shuffle);
  // A track that plays goes to the top of Recently played; the item it plays from moves up in the sidebar's order.
  $effect(() => {
    const t = nowTrack;
    if (!t || !playing || untrack(() => played[0]?.uri) === t.uri) return;
    played = [{ ...t, added_at: Date.now() }, ...untrack(() => played).filter((p) => p.uri !== t.uri)].slice(0, 50);
    const from = untrack(() => source);
    if (from && from !== RECENT) playedAt = { ...untrack(() => playedAt), [from]: Date.now() };
  });

  // The floating player: as wide as its parts want, its width gliding (motion `fitFloat`).
  const look = { ...PLAYER_LOOK, float: true };
  let dock = $state<HTMLElement>();
  const fitDock = () => dock?.firstElementChild && fitFloat(dock, dock.firstElementChild as HTMLElement, true);
  $effect(() => {
    void [lib.liked.uris, dock, winW];
    tick().then(fitDock);
  });

  onMount(() => {
    document.documentElement.classList.add("player-float");
    initMotion();
    // A reload keeps the entry's old depth in the browser's history while the window starts at the start: reset it, or
    // the first page opened pushes a depth that's already there and back does nothing.
    const link = Object.keys(LINKS).find((k) => new URLSearchParams(location.search).has(k));
    const log = new URLSearchParams(location.search).get("changelog");
    replaceState(link || log !== null ? location.pathname : "", { lk: 0 });
    if (link) open(legalRows.find((r) => r.uri === LINKS[link])!, true);
    else if (log !== null) openVersion(log || null);
    // A shared or opened download link (?download=mac|win) starts that download.
    const os = new URLSearchParams(location.search).get("download");
    if (os) getLatest(os);
    const html = document.documentElement;
    const down = (e: PointerEvent) => (html.classList.add("pointer"), html.classList.toggle("alt-press", e.button !== 0 || (MAC && e.ctrlKey)));
    const key = (e: KeyboardEvent) => !["Shift", "Control", "Alt", "Meta", " "].includes(e.key) && html.classList.remove("pointer");
    addEventListener("pointerdown", down, true);
    addEventListener("keydown", key, true);
    // Images fade in once loaded (`load` doesn't bubble, so capture it).
    const shown = (e: Event) => e.target instanceof HTMLImageElement && e.target.classList.add("ready");
    document.addEventListener("load", shown, true);
    // Mouse back/forward (buttons 3 and 4): Safari has no default for them, so they're ours everywhere
    // (preventDefault on mouseup keeps Chrome and Firefox from going twice).
    const mouse = (e: MouseEvent) => (e.button === 3 || e.button === 4) && (e.preventDefault(), e.button === 3 ? history.back() : history.forward());
    addEventListener("mouseup", mouse);
    mounted = true;
    tick().then(() => win?.querySelectorAll("img").forEach((i) => i.complete && i.naturalWidth && i.classList.add("ready")));
    const ro = new ResizeObserver(([e]) => (winW = e.contentRect.width));
    ro.observe(win!);
    return () => {
      removeEventListener("pointerdown", down, true);
      removeEventListener("keydown", key, true);
      document.removeEventListener("load", shown, true);
      removeEventListener("mouseup", mouse);
      ro.disconnect();
      clearTimeout(endTimer);
      document.documentElement.classList.remove("player-float");
    };
  });
</script>

<!-- The desktop behind the window, for the glass to frost. -->
<div class="wall" aria-hidden="true"><i></i><i></i><i></i><b></b><b></b></div>
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="window lk" bind:this={win} role="application" aria-label="Lowkey, interactive demo"
  onkeydown={(e) => {
    if (e.key === " " && !(e.target as Element).closest("input, textarea, button, a, [role=slider]")) { e.preventDefault(); send(playing ? "pause" : "play"); }
    if (!(MAC ? e.metaKey : e.ctrlKey)) return;
    if (e.key === ",") { e.preventDefault(); settingsOpen = true; }
    if (e.code === "KeyF" && e.shiftKey) { e.preventDefault(); return libView?.focusSearch(); }
    if (e.key === "f") { e.preventDefault(); searchEl?.select(); }
    if (e.key === "[") goBack();
    if (e.key === "]") goFwd();
  }}
>
    <span class="lights" aria-hidden="true"><i></i><i></i><i></i></span>
    {#if mounted}
  <div class="app with-lib" class:mini={libMini} class:no-lib={libHidden} class:gliding={libGlide} style="--lib-w: {libHidden ? 0 : width}px">
    <header class="top">
      <!-- Two glass capsules, as in the app: panel toggle, history and path; then search, the site's Tour, settings. -->
      <div class="cap nav">
      <div class="history">
        <button class="ic side-toggle"
          aria-label={libHidden ? L.app.showLibrary : libMini ? L.app.expandLibrary : L.app.hideLibrary}
          title={libHidden ? L.app.showLibrary : libMini ? L.app.expandLibrary : L.app.hideLibrary}
          onclick={() => (libHidden ? setLibHidden(false) : libMini ? glideLib(() => setLibWidth(narrow ? LIB_MINI : wideWidth)) : setLibHidden(true))}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="17" height="14" rx="2.5" /><path d="M9.5 5v14" /></svg>
        </button>
        {#if !libMini || libHidden}
          <button class="ic" aria-label={L.app.back} title="{L.app.back} ({MOD}[)" disabled={!back.length} onclick={goBack}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          </button>
          <button class="ic" aria-label={L.app.forward} title="{L.app.forward} ({MOD}])" disabled={!fwd.length} onclick={goFwd}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </button>
        {/if}
      </div>
      <nav class="crumbs" aria-label={L.app.location}>
        <button class="home ic" class:on={!crumbs.length} aria-current={crumbs.length ? undefined : "page"} title={L.app.home} onclick={goHome}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" /></svg>
          {#if !crumbs.length}<span>{L.app.home}</span>{/if}
        </button>
        {#each shownCrumbs as c, i (c.key)}
          {#if i === 1 && folded.length}
            <span class="step fold">
              <span class="sep" aria-hidden="true">/</span>
              <button class="ic" aria-label={L.app.morePath} title={L.app.morePath} popovertarget="crumb-fold" bind:this={foldBtn}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.25" /><circle cx="12" cy="12" r="1.25" /><circle cx="18" cy="12" r="1.25" /></svg>
              </button>
            </span>
          {/if}
          <span class="step">
            <span class="sep" aria-hidden="true">/</span>
            {#if c.go}
              <button class="crumb ic" onclick={c.go}>{c.name}</button>
            {:else}
              <span class="crumb" aria-current="page">{c.name}</span>
            {/if}
          </span>
        {/each}
      </nav>
      </div>
      <div class="cap tools">
      <label class="find">
        <span class="lens" aria-hidden="true">{#if pasting}<svg class="spin" viewBox="0 0 24 24"><path d="M12 4a8 8 0 1 1-8 8" /></svg>{:else}<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>{/if}</span>
        <input
          type="search" placeholder={L.app.searchSpotify} aria-label={L.app.searchSpotify} title="{L.common.search} ({MOD}F)" spellcheck="false"
          bind:this={searchEl} bind:value={query} oninput={onSearch} onfocus={() => query && !searchOpen && onSearch()}
          onkeydown={(e) => e.key === "Escape" && (query ? ((query = ""), onSearch()) : searchEl?.blur())}
        />
        {#if query}
          <button class="clear ic" aria-label={L.common.clearSearch} title={L.common.clearSearch} onclick={(e) => { e.preventDefault(); query = ""; onSearch(); searchEl?.focus(); }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" /></svg>
          </button>
        {:else}
          <kbd class="kbd" aria-hidden="true">{MOD}F</kbd>
        {/if}
      </label>
      <!-- The tour (the site's own, not the app's): starts it again after the first visit's. -->
      <button class="tour-btn" class:on={touring} aria-pressed={touring} title="Take the tour" onclick={startTour}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z" /></svg><span>Tour</span>
      </button>
      <!-- Settings: the demo has Appearance only. -->
      <button class="gear ic" class:on={settingsOpen} aria-label={L.app.settings} aria-pressed={settingsOpen} title="{L.app.settings} ({MOD},)" onclick={() => (settingsOpen = !settingsOpen)}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
        </svg>
      </button>
      </div>
    </header>
    <!-- Outside the header, so the toolbar's button styles don't reach the menu's rows. -->
    <div id="crumb-fold" class="menu" popover="manual" use:dismiss={() => foldBtn} bind:this={foldMenu} role="menu" aria-label={L.app.morePath}>
      {#each folded as c (c.key)}
        <button role="menuitem" onclick={() => { foldMenu?.hidePopover(); c.go?.(); }}>{c.name}</button>
      {/each}
    </div>
    {#if !libHidden}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
      <div
        class="resizer" role="separator" aria-orientation="vertical" aria-label={L.app.libraryWidth}
        aria-valuemin={LIB_MINI} aria-valuemax={LIB_MAX} aria-valuenow={width} tabindex="0" title={L.app.libraryWidthTip}
        onpointerdown={dragLib} ondblclick={() => setLibWidth(240)}
        onkeydown={(e) => {
          if (e.key === "ArrowLeft") setLibWidth(libWidth <= LIB_MIN ? LIB_MINI : libWidth - 16);
          if (e.key === "ArrowRight") setLibWidth(libWidth === LIB_MINI ? LIB_MIN : libWidth + 16);
        }}
      ></div>
      <div class="side">
        <nav class="strip" aria-label={L.app.navigation}>
          {#if !libMini}
            <span class="logo">
              <svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15a6 6 0 0 1 12 0M3 15h18M7 19h10" /></svg>
              <span class="wordmark">low<span>key</span></span>
              <span class="ver">demo</span>
            </span>
          {/if}
        </nav>
        <Library bind:this={libView} kbd={MAC ? "⇧⌘F" : "Ctrl+Shift+F"} mini={libMini}
          {lib} error="" current={source} holds={holding} {playing} selected={searchOpen || homeOpen ? undefined : selected?.uri.startsWith(LOG) ? "lowkey:changelog" : selected?.uri}
          recent={libRecent && played.length ? { uri: RECENT, name: L.app.recentlyPlayed, kind: "recent", line: `${L.kind.playlist} · ${L.common.songs(played.length)}` } : undefined}
          open={(r) => open(r, true)} home={goHome} homeOn={homeOpen && !searchOpen} reload={() => {}} login={() => {}}
          {pins} setPins={(p) => (pins = p)} sort={libSort} setSort={(s) => (libSort = s)} {playedAt} play={playContext} density={libDensity} setDensity={(d) => (libDensity = d)}
          site={siteRows} legal={legalRows} showRecent={libRecent} setShowRecent={(on) => (libRecent = on)}
          splitOwn={libOwn} setSplitOwn={(on) => (libOwn = on)} {orders} setOrders={(o) => (orders = o)}
          remove={(r) => (setSaved(r, false), (pins = pins.filter((u) => u !== r.uri)))}
        />
      </div>
    {/if}

    <div class="stage">
      <main bind:this={mainEl}>
        {#key page}
          <div class="page" in:enter={{ y: 8 }} out:exit>
            {#if untrack(() => page) === "search"}
              <Search query={query.trim()} {results} error={linkNote} {open} {playTrack} play={playContext} current={source} playingTrack={playback.item?.uri} {playing} />
            {:else if untrack(() => page) === "home"}
              <Site page="hero" {openVersion} />
              <Home feed={demo.feed} hush={false} picks={shelfPicks} setShelf={(sh, on) => { const { [sh.key]: _, ...rest } = shelfPicks; shelfPicks = on ? rest : { ...rest, [sh.key]: false }; }} error="" retry={() => {}} {open} play={playContext} current={source} {playing} />
            {:else if sitePage(untrack(() => page))}
              {@const uri = untrack(() => page)}
              <Site page={sitePage(uri)!} version={uri.startsWith(LOG) ? uri.slice(LOG.length) : undefined} {openVersion} />
            {:else if untrack(() => selected)}
              {@const own = untrack(() => selected)!}
              <Playlist
                item={own} tracks={untrack(() => tracks)} info={untrack(() => info)} error=""
                playingTrack={playback.item?.uri} playingContext={source} {playing}
                playContext={() => (own.uri === RECENT ? played[0] && play(played[0].uri, RECENT) : play(own.uri))}
                playTrack={(uri) => playTrack(uri, own.uri)} pause={() => send("pause")} retry={() => {}}
                {open} play={playContext} {shuffle} setShuffle={(enabled) => send("set_shuffle", { enabled })}
                saved={inLib(own)} setSaved={(on) => setSaved(own, on)} liked={likedSet} {setLiked} {addTo}
                findArtist={async (name) => { const r = demo.search(name).artists; return r.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? r[0]; }}
              />
            {/if}
          </div>
        {/key}
      </main>
    </div>
    <div class="dock" bind:this={dock}>
      <Player {playback} {playing} note="Demo, no sound" track={nowTrack} {look} fit={fitDock} {send} {open}
        liked={(uri) => likedSet.has(uri)} {setLiked} {addTo}
        openArtist={(uri, name) => open({ ...lib.artists.find((a) => a.uri === uri), uri, name, kind: "artists", line: L.kind.artist })} />
    </div>
    <AddTo bind:this={picker} playlists={editable} has={inPlaylist} set={setInPlaylist} liked={(u) => likedSet.has(u)} {setLiked} />
  </div>
  {/if}
  {#if touring && win}<Tour {win} {stops} done={(dl) => { touring = false; if (dl) download(); }} />{/if}
  {#if hush}<Hush track={nowTrack?.name ?? "this song"} artist={nowTrack?.artists[0]?.name ?? "the artist"} secs={HUSH_S} {download} close={() => (hush = false)} />{/if}
  {#if settingsOpen}<Settings close={() => { settingsOpen = false; win?.querySelector<HTMLElement>(".gear")?.focus(); }} />{/if}
</div>

<style>
  /* The whole page is the window. Its ground is the app's glass (--chrome over the native vibrancy): here a soft
     wallpaper behind it, frosted the way macOS frosts the desktop. */
  /* The desktop: the theme's own ground with three dim washes of its accent (and two neighbouring hues) drifting slowly
     underneath, enough movement for the glass to show it is glass, never loud. Only transforms animate. */
  /* Our own wallpaper in the macOS manner: a deep sky in the accent's family, two broad soft bands of colour sweeping
     across it (b) and three glows drifting underneath (i). Original, no Apple artwork; hues follow the accent. */
  .wall {
    position: fixed;
    inset: 0;
    overflow: hidden;
    /* Light: pale, low-chroma hues so the frosted sidebar reads near-white, as on a macOS light desktop. */
    --mix: 40%;
    --h1: oklch(from var(--accent) 0.8 0.1 calc(h - 70));
    --h2: oklch(from var(--accent) 0.84 0.09 h);
    --h3: oklch(from var(--accent) 0.9 0.07 calc(h + 70));
    background:
      radial-gradient(120% 80% at 80% 110%, color-mix(in oklab, var(--h3) 45%, transparent), transparent 60%),
      linear-gradient(165deg, oklch(from var(--accent) 0.88 0.06 calc(h - 40)), oklch(from var(--accent) 0.93 0.04 h) 55%, oklch(from var(--accent) 0.9 0.07 calc(h + 60)));
  }
  :global(html.dark) .wall {
    --mix: 62%;
    --h1: oklch(from var(--accent) 0.42 0.2 calc(h - 70));
    --h2: oklch(from var(--accent) 0.48 0.2 h);
    --h3: oklch(from var(--accent) 0.55 0.17 calc(h + 70));
    background:
      radial-gradient(120% 80% at 80% 110%, color-mix(in oklab, var(--h3) 40%, transparent), transparent 60%),
      linear-gradient(165deg, oklch(from var(--accent) 0.16 0.06 calc(h - 40)), oklch(from var(--accent) 0.12 0.04 h) 55%, oklch(from var(--accent) 0.18 0.07 calc(h + 60)));
  }
  .wall i {
    position: absolute;
    width: 75vmax;
    height: 75vmax;
    border-radius: 50%;
    background: radial-gradient(closest-side, color-mix(in oklab, var(--c) var(--mix), transparent), transparent);
    animation: drift var(--t) ease-in-out infinite alternate;
    will-change: transform;
  }
  .wall i:nth-child(1) { --c: var(--h2); --t: 48s; left: -25vmax; top: -30vmax; }
  .wall i:nth-child(2) { --c: var(--h1); --t: 56s; right: -30vmax; top: -10vmax; animation-delay: -18s; }
  .wall i:nth-child(3) { --c: var(--h3); --t: 64s; left: 10vw; bottom: -40vmax; animation-delay: -33s; }
  /* The bands: wide ellipses of the three hues, blurred to silk and tilted, the lower one a little later in its sway. */
  .wall b {
    position: absolute;
    left: -35vmax;
    width: 170vmax;
    height: 46vmax;
    border-radius: 50%;
    background: linear-gradient(90deg, var(--h1), var(--h2) 45%, var(--h3));
    opacity: 0.5;
    filter: blur(6vmax);
    animation: sway 40s ease-in-out infinite alternate;
    will-change: transform;
  }
  .wall b:nth-of-type(1) { top: 30vh; transform: rotate(-14deg); }
  .wall b:nth-of-type(2) { top: 62vh; opacity: 0.4; background: linear-gradient(90deg, var(--h3), var(--h1) 55%, var(--h2)); animation-delay: -20s; animation-duration: 52s; }
  :global(html.dark) .wall b { opacity: 0.6; }
  :global(html.dark) .wall b:nth-of-type(2) { opacity: 0.45; }
  @keyframes drift {
    0% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(14vw, 10vh) scale(1.12); }
    100% { transform: translate(-8vw, 16vh) scale(0.94); }
  }
  @keyframes sway {
    0% { transform: rotate(-14deg) translateY(0); }
    100% { transform: rotate(-6deg) translateY(-6vh); }
  }
  @media (prefers-reduced-motion: reduce) { .wall i, .wall b { animation: none; } }

  /* A window on the desktop: inset from the edges, rounded, a hairline rim and a deep soft shadow, as macOS draws it.
     It takes the viewport's height above the footer (the page is a flex column, see +page.svelte). */
  .window {
    position: relative;
    flex: 1 0 480px;
    width: calc(100% - 2 * var(--desk));
    margin: var(--desk) auto 0;
    border-radius: 12px;
    background: var(--chrome);
    -webkit-backdrop-filter: blur(60px) saturate(1.8);
    backdrop-filter: blur(60px) saturate(1.8);
    box-shadow: 0 0 0 0.5px rgb(0 0 0 / 0.2), 0 30px 80px -20px rgb(0 0 0 / 0.4), 0 10px 24px -12px rgb(0 0 0 / 0.2);
    overflow: hidden;
    text-align: left;
  }
  :global(:root) { --desk: clamp(10px, 2.5vw, 32px); }
  :global(html.dark) .window { box-shadow: inset 0 0 0 0.5px rgb(255 255 255 / 0.14), 0 0 0 0.5px rgb(0 0 0 / 0.8), 0 30px 80px -20px rgb(0 0 0 / 0.8); }
  /* The traffic lights at 20, centred in the 52pt toolbar row. */
  .lights { position: absolute; z-index: 5; top: 20px; left: 20px; display: flex; gap: 8px; pointer-events: none; }
  .lights i { width: 12px; height: 12px; border-radius: 50%; background: #ff5f57; box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.15); }
  .lights i:nth-child(2) { background: #febc2e; }
  .lights i:nth-child(3) { background: #28c840; }

  /* From here on: the app's shell styles, as in src/routes/+page.svelte (html.mac applied). */
  .app.with-lib {
    display: grid;
    grid-template-columns: var(--lib-w) minmax(0, 1fr);
    grid-template-rows: var(--top-h) minmax(0, 1fr) var(--bar-h);
    --frame: var(--sp-1);
    --body-r: var(--r-3);
    background: color-mix(in srgb, var(--wash) 5%, transparent);
    transition: background var(--m-7) var(--ease);
    position: relative;
    height: 100%;
    box-sizing: border-box;
  }
  .with-lib .stage {
    position: relative;
    min-height: 0;
    background: var(--ground);
    margin: var(--frame) var(--frame) 0 0;
    border-radius: var(--body-r);
    container-type: inline-size;
  }
  /* Under the toolbar a veil of the panel over what scrolls up: 80% at the body's top, clear a little below the
     capsules' top edge, so the strip above them is masked and little else. */
  .with-lib .stage::before {
    content: ""; position: absolute; inset: 0 0 auto; z-index: 1; height: var(--top-h);
    border-radius: inherit; pointer-events: none;
    background: linear-gradient(color-mix(in srgb, var(--ground) 80%, transparent), transparent calc(var(--top-h) / 3));
  }
  .with-lib .stage::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 3;
    border: 0.5px solid var(--border);
    border-radius: inherit;
    pointer-events: none;
  }
  .page { position: relative; }
  .with-lib main {
    position: relative;
    height: 100%;
    overflow-y: auto;
    border-radius: inherit;
    padding: var(--top-h) 0 var(--sp-7);
    /* Sharp at the top (the toolbar's veil is .stage::before), leaving over --fade-end at the bottom. */
    -webkit-mask: var(--bar-keep), var(--edge-fade);
    -webkit-mask-composite: source-over;
    mask: var(--bar-keep), var(--edge-fade);
    mask-composite: add;
    --edge-fade: linear-gradient(#000 calc(100% - var(--fade-end)), transparent);
    box-sizing: border-box;
    container-type: inline-size;
  }
  .top {
    grid-column: 2;
    grid-row: 1;
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    padding: 0 calc(12px + var(--frame)) 0 var(--sp-3);
    min-width: 0;
    /* The search and the path size to the toolbar's own width (its @container rules below). */
    container-type: inline-size;
  }
  /* The toolbar floats on two glass capsules (--glass-panel over --glass-blur, no border), a little taller than a control.
     In the right one the search field is a flat --ctl well. On glass the glyphs and text sit a step stronger. */
  .top .cap {
    display: flex; align-items: center; gap: var(--sp-0); min-width: 0;
    height: calc(var(--ctl-h) + var(--sp-1)); padding: 0 var(--sp-0); box-sizing: border-box; border-radius: var(--r-3);
    background: var(--glass-panel);
    -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
  }
  .top .nav { flex: 0 1 auto; margin-right: auto; }
  .top .nav .history .side-toggle { margin-right: var(--sp-2); }
  .top .nav .crumbs { flex: 0 1 auto; margin-left: var(--sp-2); }
  .top .tools { flex: none; }
  .top .tools .find { background: none; box-shadow: none; padding-left: var(--sp-3); margin-right: var(--sp-1); }
  .top .cap button { color: var(--fg); }
  .top .cap :is(.sep, .find, .find .kbd) { color: var(--fg-2); }
  .top .cap .find input::placeholder { color: var(--fg-2); }
  .top .tools .find:hover { background: var(--hover); }
  .top .tools .find:focus-within { background: var(--ctl); box-shadow: none; }
  .history { display: flex; align-items: center; gap: var(--sp-0); flex: none; }
  .history .side-toggle { margin-right: var(--sp-3); }
  .top button {
    display: grid;
    place-items: center;
    width: 28px;
    height: 26px;
    border: none;
    border-radius: var(--r-2);
    background: none;
    color: var(--fg-2);
    padding: 0;
    cursor: default;
  }
  .top button:disabled { opacity: 0.35; }
  .top button.on { color: var(--fg); background: var(--active); }
  .top .tour-btn { flex: none; display: flex; gap: 6px; width: auto; padding: 0 var(--sp-2); font: inherit; font-weight: 500; transition: background var(--m-5) var(--ease), color var(--m-5) var(--ease); }
  .top .tour-btn:hover { background: var(--hover); color: var(--fg); transition-duration: var(--m-1); }
  @container (max-width: 560px) { .top .tour-btn span { display: none; } }
  .crumbs { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; gap: var(--sp-0); margin-left: var(--sp-2); }
  .step { display: flex; align-items: center; gap: var(--sp-0); min-width: 0; flex: 0 1 auto; }
  .step:has(.crumb.ic) { flex-shrink: 999; }
  .top .crumbs button { width: auto; display: flex; gap: var(--sp-2); padding: 0 var(--sp-2); font: inherit; font-weight: 500; white-space: nowrap; flex: none; }
  .top .crumbs .home { padding-left: 6px; }
  .top .crumbs .home:not(:has(span)) { width: var(--ctl-h); padding: 0; justify-content: center; }
  .top .crumbs .crumb.ic { flex: 0 1 auto; min-width: 3ch; max-width: 22ch; display: block; overflow: hidden; text-overflow: ellipsis; }
  .top .home.on { background: none; color: var(--fg); font-weight: 600; }
  .top .home.on svg { fill: currentColor; }
  .top .sep { flex: none; color: var(--fg-3); font-weight: 400; }
  .crumb[aria-current] { min-width: 0; padding: 0 var(--sp-2); font-weight: 600; color: var(--fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  @container (max-width: 560px) { .top .crumbs .home span { display: none; } }
  /* The folded middle of a long path: "…" opens the global .menu under it. */
  .step.fold { flex: none; }
  .top .crumbs .fold button { width: var(--ctl-h); padding: 0; justify-content: center; anchor-name: --crumb-fold; }
  .top .crumbs .fold svg { fill: currentColor; stroke: none; }
  #crumb-fold { position-anchor: --crumb-fold; top: calc(anchor(bottom) + var(--sp-1)); left: anchor(left); max-width: 22rem; transform-origin: top left; }
  #crumb-fold button { display: block; overflow: hidden; text-overflow: ellipsis; }
  .find {
    flex: none;
    width: 240px;
    display: flex;
    align-items: center;
    gap: var(--sp-2);
    height: var(--ctl-h);
    padding: 0 var(--sp-1) 0 var(--sp-2);
    box-sizing: border-box;
    border-radius: var(--r-2);
    color: var(--fg-3);
    background-color: var(--panel);
    box-shadow: inset 0 0 0 1px var(--border);
    transition: background var(--m-5) var(--ease), box-shadow var(--m-5) var(--ease), color var(--m-5) var(--ease);
  }
  .find:hover { background-image: linear-gradient(var(--hover), var(--hover)); transition-duration: var(--m-1); }
  .find:focus-within { color: var(--fg-2); background: var(--panel); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 70%, transparent); transition-duration: var(--m-2); }
  .find .kbd { transition: opacity var(--m-3) var(--ease); }
  .find:is(:focus-within, :has(input:not(:placeholder-shown))) .kbd { opacity: 0; }
  .lens { flex: none; display: grid; place-items: center; }
  .lens svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  .lens .spin { color: var(--accent); animation: spin 0.7s linear infinite; }
  @keyframes spin { to { transform: rotate(1turn); } }
  .find input { flex: 1; min-width: 0; border: none; background: none; color: var(--fg); font: inherit; font-size: var(--fs); outline: none; padding: 0; }
  .find input::placeholder { color: var(--fg-3); }
  .find input::-webkit-search-cancel-button { display: none; }
  .find .clear { flex: none; display: grid; place-items: center; width: calc(var(--ctl-h) - var(--sp-2)); height: calc(var(--ctl-h) - var(--sp-2)); padding: 0; border-radius: var(--r-1); color: var(--fg-3); }
  .find .clear svg { width: 12px; height: 12px; }
  @container (max-width: 560px) { .find { width: 160px; } .find .kbd { display: none; } }
  /* The demo's own narrowest: a phone. The search gives the path its room. */
  @container (max-width: 380px) { .find { width: 120px; } }
  .top svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .side { grid-column: 1; grid-row: 1 / -1; display: flex; flex-direction: column; min-height: 0; container-type: inline-size; }
  .strip { flex: none; display: flex; align-items: center; gap: 2px; height: var(--top-h); padding: 0 var(--sp-3) 0 calc(72px + var(--sp-5)); overflow: hidden; }
  .logo { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; color: var(--fg-2); line-height: 1; white-space: nowrap; pointer-events: none; }
  .logo .mark { flex: none; width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  /* The name in the sidebar: one colour, small spaced capitals (not the two-tone wordmark of About). */
  .logo :global(.wordmark) { font-size: var(--micro-fs); font-weight: 600; letter-spacing: 0.16em; text-transform: uppercase; }
  .logo :global(.wordmark > span) { color: inherit; }
  .logo .ver { color: var(--fg-3); font-size: var(--micro-fs); font-variant-numeric: tabular-nums; }
  .side > :global(.lib) { flex: 1; }
  .with-lib .stage { grid-column: 2; grid-row: 1 / 3; }
  .no-lib:not(.gliding) .side { display: none; }
  .app.gliding { transition: grid-template-columns var(--m-4) var(--ease), background var(--m-7) var(--ease); }
  .gliding .side { overflow: hidden; }
  .gliding .stage, .gliding .dock, .gliding .top { transition: margin-left var(--m-4) var(--ease), padding var(--m-4) var(--ease); }
  .gliding .resizer { display: none; }
  .with-lib.no-lib .stage { margin-left: var(--frame); }
  .no-lib .dock { margin-left: var(--frame); }
  /* Closed, the left capsule takes the traffic lights in (at 20–72px: it starts 8px before them, its content --sp-3
     after), and the right one keeps the same 12px from the window's edge. */
  .no-lib .top { padding-left: 12px; padding-right: 12px; }
  .no-lib .top .nav { padding-left: calc(60px + var(--sp-3)); }
  .dock { grid-column: 2; grid-row: 3; min-width: 0; margin-right: var(--frame); container-type: inline-size; }
  /* Floating (the app's Settings › Player, on in the demo): the body runs to the window's foot and the player floats
     over it, centred, on glass with the floating layers' shadow, as wide as its parts want (fitFloat). */
  :global(html.player-float) .with-lib .stage { grid-row: 1 / 4; margin-bottom: var(--frame); }
  :global(html.player-float) .with-lib main { padding-bottom: calc(var(--player-cover) + 2 * var(--sp-2) + var(--sp-3) + var(--sp-7)); }
  :global(html.player-float) .dock {
    grid-row: 2 / 4; align-self: end; justify-self: center; z-index: 4; height: calc(var(--player-cover) + 2 * var(--sp-2)); box-sizing: border-box;
    max-width: calc(100% - 2 * var(--gutter));
    display: flex; justify-content: center;
    margin: 0 0 calc(var(--frame) + var(--sp-3));
    border-radius: var(--r-3);
    background: var(--glass-panel);
    -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
    box-shadow: var(--shadow);
  }
  :global(html.player-float) .resizer { bottom: 0; }
  .resizer { position: absolute; top: var(--top-h); bottom: var(--bar-h); left: calc(var(--lib-w) - 6px); width: 12px; z-index: 2; cursor: col-resize; }
  .resizer::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 4px;
    width: 4px;
    height: 36px;
    margin-top: -18px;
    border-radius: 2px;
    background: var(--fg-3);
    opacity: 0;
    transform: scaleY(0.7);
    transition: opacity var(--m-3) var(--ease), transform var(--m-3) var(--ease), background var(--m-2) var(--ease);
  }
  .resizer:hover::after, .resizer:focus-visible::after { opacity: 0.55; transform: none; }
  .resizer:active::after { opacity: 1; background: var(--fg-2); transform: scaleY(1.5); }
  .resizer:focus-visible { outline: none; }
  .resizer:focus-visible::after { box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 60%, transparent); }
</style>
