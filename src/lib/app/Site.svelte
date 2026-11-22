<!-- The website's own pages, drawn as pages of the app: its .view, .t-page head, .t-section labels, hairline cards
     and raised buttons. "hero" sits above Home's feed; the rest open from the sidebar's Lowkey section. -->
<script lang="ts" module>
  import { motion } from "./motion.svelte";
  export const RELEASES = "https://github.com/whynoctlx/lowkey-build/releases";
  /** The installer files of the newest release, by their ending (Tauri's names: Lowkey_<version>_<arch>…). */
  const FILES: Record<string, RegExp> = { mac: /_aarch64\.dmg$/, win: /_x64-setup\.exe$/ };
  /** The download links: ?download=mac|win on the site itself, so no GitHub address shows; App and the buttons act on it. */
  export const DOWNLOAD = (os: string) => `?download=${os}`;

  /** Download the newest installer for `os`, asked of GitHub in the visitor's browser, so a new release needs no
   *  change here. If GitHub can't answer (offline, its 60-an-hour limit per visitor), the releases page instead. */
  export async function getLatest(os: string) {
    // Counted on our server (once per browser); keepalive lets it finish as the page goes to the installer.
    fetch("/api/downloads", { method: "POST", keepalive: true }).then((r) => r.json()).then((d: { total: number }) => (count.total = count.shown = d.total)).catch(() => {});
    let url = RELEASES;
    try {
      const res = await fetch("https://api.github.com/repos/whynoctlx/lowkey-build/releases/latest");
      const release: { assets: { name: string; browser_download_url: string }[] } = await res.json();
      url = release.assets.find((a) => FILES[os]?.test(a.name))?.browser_download_url ?? RELEASES;
    } catch {}
    location.href = url;
  }
  /** Total downloads (Turso, via /api/downloads), shared by every page that shows it: fetched once per visit.
   *  total is undefined while it loads (a dash holds its place) and null if it can't (the fact steps aside);
   *  shown rolls up to it once (ease-out, ~0.9s), or lands at once with motion off. */
  const count = $state<{ total?: number | null; shown: number }>({ shown: 0 });
  let asked = false;
  function loadCount() {
    if (asked) return;
    asked = true;
    fetch("/api/downloads").then((r) => (r.ok ? r.json() : Promise.reject())).then((d: { total: number }) => {
      count.total = d.total;
      if (motion.reduce || !motion.ms || d.total < 2) return void (count.shown = d.total);
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 900);
        count.shown = Math.round(d.total * (1 - (1 - k) ** 4));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }).catch(() => (count.total = null));
  }
  /** The newest release's version as the changelogs name it (tag v0.5.0 → 0.5, v0.4.1 stays), asked of GitHub once per visit; null if it can't answer. */
  const release = $state<{ version?: string | null }>({});
  function loadRelease() {
    if (release.version !== undefined) return;
    release.version = null;
    fetch("https://api.github.com/repos/whynoctlx/lowkey-build/releases/latest")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((r: { tag_name: string }) => (release.version = r.tag_name.replace(/^v/i, "").replace(/\.0$/, "")))
      .catch(() => {});
  }
  export const GITHUB = "https://github.com/whynoctlx";
  export type SitePage = "hero" | "features" | "compare" | "download" | "changelog" | "privacy" | "terms";
  /** The sidebar's Lowkey section: uri, name, icon path(s). */
  export const SITE: { uri: string; name: string; icon: string }[] = [
    { uri: "lowkey:features", name: "Features", icon: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" },
    { uri: "lowkey:compare", name: "Side by side", icon: "M4 5h16M4 12h16M4 19h16M10 5v14" },
    { uri: "lowkey:download", name: "Download", icon: "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" },
    { uri: "lowkey:changelog", name: "Changelogs", icon: "M4.5 12a7.5 7.5 0 1 0 2.2-5.3M4.5 4v3.5H8M12 8v4l2.5 2" },
  ];

  /** The changelogs: changelogs/<version>.md in the build repo (0.4.md, 0.4.1.md…), listed by GitHub's API in the visitor's browser (two requests a visit) (newest
   *  first) and read from raw.githubusercontent.com, so a new file needs no change here. Listed once per visit;
   *  list is undefined while it loads, null if GitHub can't answer, [] while the folder doesn't exist yet. */
  export type Changelog = {
    name: string; version: string; url: string;
    /** From the file once read: its # title (null without one), a plain summary line, "4 new · 6 improved" from its
     *  ## sections, the rest as HTML (null if it can't load). */
    title?: string | null; summary?: string; tally?: string; html?: string | null;
  };
  const logs = $state<{ list?: Changelog[] | null }>({});
  function loadText(l: Changelog) {
    l.html = undefined;
    fetch(l.url).then((r) => (r.ok ? r.text() : Promise.reject())).then((t) => {
      const p = parts(t);
      const tally = p.sections.filter((x) => x.n).map((x) => `${x.n} ${x.name.toLowerCase()}`).join(" · ");
      Object.assign(l, { title: p.title, summary: p.summary, tally, html: md(p.body) });
    }).catch(() => (l.html = null));
  }
  function loadLogs() {
    if (logs.list) return;
    logs.list = undefined;
    // Listed at the newest commit, so each file's raw URL names that commit: raw.githubusercontent.com keeps a
    // branch URL cached for 5 minutes, a commit URL is always that commit's text.
    const repo = "https://api.github.com/repos/whynoctlx/lowkey-build";
    fetch(`${repo}/commits/main`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((c: { sha: string }) => fetch(`${repo}/contents/changelogs?ref=${c.sha}`))
      .then((r) => (r.ok ? r.json() : r.status === 404 ? [] : Promise.reject()))
      .then((files: { name: string; type: string; download_url: string }[]) => {
        logs.list = files
          .filter((f) => f.type === "file" && /\.md$/i.test(f.name))
          // Newest version first: numeric, so 0.10 comes after 0.9 and 0.4.1 after 0.4.
          .map((f) => ({ name: f.name, url: f.download_url, version: f.name.replace(/\.md$/i, "").replace(/^v/i, "") }))
          .sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
        // Read every file at once (raw.githubusercontent.com has no visitor limit): the list shows each one's title.
        for (const l of logs.list) loadText(l);
      })
      .catch(() => (logs.list = null));
  }
  /** The sidebar's Legal section, under Lowkey: same shape as SITE. */
  export const LEGAL: { uri: string; name: string; icon: string }[] = [
    { uri: "lowkey:privacy", name: "Privacy policy", icon: "M12 3.5 5 6v5.5c0 4.2 3 7.8 7 9 4-1.2 7-4.8 7-9V6z" },
    { uri: "lowkey:terms", name: "Terms of use", icon: "M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 16h5" },
  ];
</script>

<script lang="ts">
  import Marquee from "./Marquee.svelte";
  import { inline, md, parts } from "./md";
  import { legal, UPDATED } from "./legal";

  let { page, version, openVersion = () => {} }: {
    page: SitePage;
    /** On the Changelogs page: the version open (its own page in the window's history), none for the list. */
    version?: string;
    /** Opens a version's page, or the list (null). */
    openVersion?: (v: string | null) => void;
  } = $props();
  const tour = () => dispatchEvent(new Event("lowkey:tour"));

  $effect(loadCount);
  $effect(() => void (page === "hero" && loadRelease()));
  $effect(() => void (page === "changelog" && loadLogs()));

  /** The open changelog's place in the list (0 is the newest): -1 while the list loads or if there's no such version. */
  const at = $derived(version === undefined ? null : (logs.list ?? []).findIndex((l) => l.version === version));
  const show = (i: number | null) => openVersion(i === null ? null : logs.list![i].version);



  const platforms = [
    { os: "mac", name: "macOS", detail: "Apple Silicon", logo: "M12.15 6.9c-.95 0-2.42-1.08-3.96-1.04-2.04.03-3.91 1.18-4.96 3.01-2.12 3.68-.55 9.1 1.52 12.09 1.01 1.45 2.2 3.09 3.79 3.04 1.52-.07 2.09-.99 3.94-.99 1.83 0 2.35.99 3.96.95 1.64-.03 2.68-1.48 3.68-2.95 1.16-1.69 1.64-3.33 1.66-3.42-.04-.01-3.18-1.22-3.22-4.86-.03-3.04 2.48-4.49 2.6-4.56-1.43-2.09-3.62-2.32-4.39-2.38-2-.16-3.68 1.09-4.62 1.09zm3.38-3.07c.84-1.01 1.4-2.43 1.25-3.83-1.21.05-2.66.8-3.53 1.82-.78.9-1.46 2.34-1.27 3.71 1.34.1 2.71-.69 3.55-1.7z" },
    { os: "win", name: "Windows", detail: "Windows 10 and 11 · x64", soon: true, logo: "M2 2h9.5v9.5H2zM12.5 2H22v9.5h-9.5zM2 12.5h9.5V22H2zM12.5 12.5H22V22h-9.5z" },
  ];

  /** Features in groups, as the app's Settings groups: icon path(s), name, what it does, and where to see it in this window. */
  type Feature = { icon: string; name: string; text: string; try?: string; glide?: boolean };
  const groups: { title: string; note: string; items: Feature[] }[] = [
    {
      title: "Feels at home on your computer",
      note: "Built like the apps that came with your Mac or PC, not a web page in a frame.",
      items: [
        { icon: "M3.5 5.5h17v13h-17zM3.5 9h17M6.5 7.25h.01M8.75 7.25h.01", name: "Native, not a website in a window", text: "System font, native title bar, macOS vibrancy and Windows 11 Mica, platform scrollbars. Everything is clickable, just like in Spotify." },
        { icon: "M4 12h10M4 7h16M4 17h7M17 14l3 3-3 3", name: "Nothing cut off", text: "Where Spotify trims long titles with “…”, Lowkey glides the text so you can read all of it.", glide: true },
        { icon: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", name: "Every card visible", text: "No “Show all” on card rows. Home, search and artist pages show every album, playlist and artist, rearranged to fit the window.", try: "Scroll Home: every row is complete." },
      ],
    },
    {
      title: "Fast, and light on your machine",
      note: "Rust and Tauri 2 instead of Electron, so there is no second browser running in the background.",
      items: [
        { icon: "M13 3 5 13.5h6L10 21l8-10.5h-6z", name: "Light", text: "It opens instantly from local cache and uses nothing while paused or hidden." },
        { icon: "M5 12h11M12 7l5 5-5 5M20 5v14", name: "No waiting", text: "Lowkey loads a playlist, album or artist the moment you point at it, so it's already there when you click.", try: "Point at a playlist in the sidebar, then open it." },
        { icon: "M8 4v16M4 8l-2 4 2 4M20 8l2 4-2 4M12 12h8", name: "Smooth resizing", text: "Spotify stutters while you resize. Lowkey waits until you stop, then glides every tile into place in one smooth move.", try: "Drag the edge of the sidebar and let go." },
        { icon: "M5 12h14M12 5l7 7-7 7", name: "Paste a link", text: "Paste a Spotify link into search and Lowkey opens it at once: a song plays, an album, artist or playlist opens.", try: "Take the tour and press Try it at the search stop: a pasted album link opens the album." },
      ],
    },
    {
      title: "Calm, and yours",
      note: "Your music first. Everything else is there when you want it.",
      items: [
        { icon: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", name: "Just your music", text: "Library, search, playlists, albums, artists and a home page without promos." },
        { icon: "M12 17v4M8 3h8l-1 5 3 4H6l3-4z", name: "Your sidebar, your order", text: "Drag any row to reorder it, or up to the top to pin it. Playlists you made get their own section under the pins.", try: "Drag a sidebar row up to the pinned ones." },
        { icon: "M3.5 15.5h17v4h-17zM8 17.5h.01M12 17.5h5", name: "A floating player", text: "The player floats over the page as a glass bar, or sits docked under it, as you like." },
        { icon: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM6 6l12 12", name: "Ignore an artist", text: "One press on an artist's page: their songs dim in every list and are skipped when they come up. Press again to skip the songs they're featured on too.", try: "Open an artist and press the ignore button next to shuffle." },
        { icon: "M4 6h12M4 11h12M4 16h7M17 14v6M14 17h6", name: "Songs into your playlists", text: "Add a song to your own or collaborative playlists, or take it out, from the save menu next to its name.", try: "Open Liked songs and press the check next to a song." },
        { icon: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4", name: "Yours to tune", text: "Theme, accent colour, contrast, density, UI scale, motion, glass and page background. On Home, pick which shelves show and how large the cards are.", try: "Open Settings with the gear, top right." },
      ],
    },
  ];
  /** Privacy, from the app's source: it talks to Spotify, checks GitHub for updates, and keeps its secrets encrypted on disk. */
  const privacy: [string, string][] = [
    ["No analytics, no tracking", "Lowkey has no telemetry, no crash reporter and no ads, and records nothing about how you use it. Playback runs through Spotify's Soloist, so Spotify sees what you play, just as in its own app."],
    ["No Lowkey account, no Lowkey server", "There is nothing of ours to sign up for. The app talks to Spotify directly, the same way Spotify's own app does."],
    ["Your sign-in stays on your computer", "Your Spotify session and Soloist key are stored encrypted (ChaCha20-Poly1305) with a key tied to your computer, so they're useless in a backup or on another computer."],
    ["One other request: updates", "Lowkey checks GitHub for a newer release. It downloads a small file and sends nothing about you or your music."],
    ["Streams only, never downloads", "Lowkey never touches the audio. Spotify's own player, Soloist, streams it, and Lowkey only tells it what to play. Nothing is downloaded, recorded, converted or saved, and Lowkey will never add a way to."],
  ];
  /** The comparison in groups. Each row: aspect, Spotify, Lowkey, Spotatui; `win` marks a row where Lowkey leads. */
  type Row = { k: string; v: [string, string, string]; win?: boolean };
  const apps = [
    { name: "Spotify", focus: "Complete music ecosystem", us: false },
    { name: "Lowkey", focus: "Native feel and user experience", us: true },
    { name: "Spotatui", focus: "Lightweight playback", us: false, href: "https://github.com/LargeModGames/spotatui" },
  ];
  const compare: { title: string; rows: Row[] }[] = [
    {
      title: "Speed",
      rows: [
        { k: "Cold start", v: ["Slow", "Nearly instant", "Slower than Lowkey"], win: true },
        { k: "Opening a page", v: ["Slower", "Nearly instant", "—"], win: true },
        { k: "Resource use", v: ["High", "Low, nothing while idle", "Low"], win: true },
        { k: "App size", v: ["Over 430 MB", "8.6 MB", "23.4 MB"], win: true },
      ],
    },
    {
      title: "Feel",
      rows: [
        { k: "Feels like Spotify", v: ["Yes", "Yes", "Partly"] },
        { k: "Everything clickable", v: ["Yes", "Yes", "Some elements aren't"] },
        { k: "Adapts to window size", v: ["Partly", "Fully", "Not at all"], win: true },
        { k: "Resizing", v: ["Stutters", "Smooth, tiles glide into place", "No rearranging"], win: true },
        { k: "Card rows", v: ["One row + “Show all”", "All cards, as many per row as fit", "—"], win: true },
        { k: "Sidebar", v: ["Sort options, a few pins", "Drag to reorder and pin, your playlists in their own section", "Plain list"], win: true },
        { k: "Pasting a link", v: ["—", "Opens it right away from search", "—"], win: true },
        { k: "Ignoring an artist", v: ["Only on mobile", "Dimmed and skipped, optionally their features too", "No"], win: true },
        { k: "Long text", v: ["Cut off with “…”", "Glides so all of it is readable", "—"], win: true },
        { k: "Window", v: ["Its own title bar", "Native title bar, macOS vibrancy, Windows 11 Mica", "Terminal, or a desktop app without the native feel"], win: true },
      ],
    },
    {
      title: "Look and content",
      rows: [
        { k: "Appearance settings", v: ["None", "Theme, accent, contrast, density, scale, motion, glass, background", "None"], win: true },
        { k: "Home page", v: ["Yes, with promos", "Yes, music only, you pick the shelves", "No"], win: true },
        { k: "Player", v: ["Docked at the bottom", "Floating glass bar, or docked", "Docked at the bottom"], win: true },
      ],
    },
    {
      title: "Privacy",
      rows: [
        { k: "Tracking and ads", v: ["Listening data collected, ads on Free", "None of its own; Spotify still sees what you play, through Soloist", "None of its own; Spotify still sees what you play"] },
        { k: "Downloading music", v: ["Offline, inside the app, with Premium", "Never, streams only", "—"] },
        { k: "Signing in", v: ["Email and password, in the app", "A short code at spotify.com/pair, your password never touches Lowkey. Tokens stay encrypted on your computer", "A short code at spotify.com/pair"] },
      ],
    },
    {
      title: "Account and price",
      rows: [
        { k: "Account", v: ["Free or Premium", "Premium", "Free or Premium"] },
        { k: "Setup", v: ["Easiest", "Easy, a guided setup explains each step", "Harder, no guided setup"] },
        { k: "Price", v: ["Free with ads, or subscription", "Free, forever", "Free, open source"] },
      ],
    },
    {
      title: "Under the hood",
      rows: [
        { k: "Built with", v: ["Chromium (CEF)", "Rust, Tauri 2, SvelteKit 5", "Rust, Tauri + terminal UI"] },
        { k: "Playback", v: ["Spotify's engine", "Spotify Soloist (official)", "librespot or Soloist"] },
        { k: "Updates", v: ["Automatic", "Automatic and signed, installed when you quit", "By hand, through cargo"], win: true },
      ],
    },
  ];
</script>

{#snippet get()}
  <!-- The visitor's platform leads: one large button in that platform's own shape (a macOS capsule, Windows' 4px
       Fluent corners) with its logo; the other platform is a quiet line under it. Both orders are in the page and
       html[data-os="win"] (set in app.html before paint) picks one, so it never flips. -->
  {#each [platforms, [platforms[1], platforms[0]]] as [me, other]}
    <div class="get" data-for={me.os}>
      {#if me.soon}
        <!-- Not built yet: the same button, inert, saying when. -->
        <p class={["raised-n", "main", "soon", me.os]}>
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={me.logo} /></svg>
          <span class="words"><b>Coming soon for {me.name}</b><small>{me.detail}</small></span>
        </p>
      {:else}
        <a class={["raised-n", "main", me.os]} href={DOWNLOAD(me.os)} onclick={(e) => (e.preventDefault(), getLatest(me.os))}>
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={me.logo} /></svg>
          <span class="words"><b>Download for {me.name}</b></span>
          <!-- The count as the button's own end: a hairline, then the total in a soft capsule, its label for readers only. -->
          {#if count.total !== null}<span class="tally" aria-live="polite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" /></svg>{count.total === undefined ? "–" : count.shown.toLocaleString("en")}<span class="sr"> {count.total === 1 ? "download" : "downloads"}</span></span>{/if}
        </a>
      {/if}
      <!-- The other platform, right under the button: a small labelled row with its logo. -->
      <p class="other">
        <span>Other platforms</span>
        {#if other.soon}
          <span class="plat"><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={other.logo} /></svg>{other.name}<em>Soon</em></span>
        {:else}
          <a class="plat" href={DOWNLOAD(other.os)} onclick={(e) => (e.preventDefault(), getLatest(other.os))}><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={other.logo} /></svg>{other.name}</a>
        {/if}
      </p>
    </div>
  {/each}
{/snippet}

{#if page === "hero"}
  <!-- Centred over the feed, lit faintly by the cover that plays (--now), so the hero changes colour with the music. -->
  <!-- Drawn as the app's own item hero (Playlist.svelte): a wash from the window's top, the cover (here the app's icon),
       then one meta line, the title, a line of prose and the actions; centred and stacked when narrow. -->
  <section class="hero" aria-label="Lowkey">
    <div class="icon" aria-hidden="true">
      <svg viewBox="112 176 800 672">
        <defs>
          <linearGradient id="hk-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sun-a" /><stop offset="1" class="sun-b" /></linearGradient>
          <mask id="hk-cut"><rect x="-200" y="-200" width="1424" height="1424" fill="#fff" /><g fill="#000"><rect y="486" width="1024" height="8" /><rect y="522" width="1024" height="12" /><rect y="558" width="1024" height="16" /></g></mask>
          <clipPath id="hk-up"><rect width="1024" height="586" /></clipPath>
        </defs>
        <g transform="translate(512 512) scale(1.25) translate(-512 -497)">
          <circle cx="512" cy="470" r="230" fill="url(#hk-sun)" mask="url(#hk-cut)" clip-path="url(#hk-up)" />
          <rect x="200" y="596" width="624" height="18" rx="9" class="bar" />
          <g class="refl">
            <rect x="330" y="644" width="364" height="14" rx="7" opacity=".6" /><rect x="380" y="682" width="264" height="12" rx="6" opacity=".42" />
            <rect x="430" y="716" width="164" height="10" rx="5" opacity=".28" /><rect x="470" y="746" width="84" height="8" rx="4" opacity=".16" />
          </g>
        </g>
      </svg>
    </div>
    <div class="info">
      <!-- The current version, a quiet pill that opens its changelog; absent until GitHub answers. -->
      {#if release.version}
        <button class="ver" onclick={() => openVersion(release.version!)}>
          <b>Lowkey {release.version}</b><span>What's new</span>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
        </button>
      {/if}
      <h1>Spotify, <span>quieter.</span></h1>
      <p class="lead">A native, lightweight player for Spotify Premium.</p>
      {@render get()}
    </div>
    <p class="note">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14m0 0-5-5m5 5 5-5" /></svg>
      This window is the real app, running live on demo data. Just a demo: no music plays.
    </p>
  </section>
{:else}
  <article class="view">
    {#if page === "features"}
      <header class="head">
        <h1 class="t-page">The same Spotify, with the noise taken out</h1>
        <p class="lede">What changes when you switch, and what stays exactly as it is. Or <button class="link-btn" onclick={tour}>take the one-minute tour</button> of this window.</p>
      </header>

      <!-- What a switcher fears losing first: nothing moves. -->
      <div class="same">
        <span class="tile" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></svg></span>
        <p><strong>Nothing to move.</strong> Your account, your library, your playlists and Spotify's own playback stay exactly as they are. Lowkey only changes the window you look at.</p>
      </div>

      {#each groups as g (g.title)}
        <section class="group">
          <h2 class="t-section">{g.title}</h2>
          <p class="gnote">{g.note}</p>
          <ul class="card feats">
            {#each g.items as f (f.name)}
              <li>
                <span class="tile" aria-hidden="true"><svg viewBox="0 0 24 24"><path d={f.icon} /></svg></span>
                <div class="body">
                  <h3 class="fname">{f.name}</h3>
                  <p class="ftext">{f.text}</p>
                  {#if f.glide}
                    <p class="spec" aria-hidden="true"><Marquee on={true}>PUNO PARA PUNO PROBLEMA · Luca Brassi10x · BRASSISLAVA (2026)</Marquee></p>
                  {/if}
                  {#if f.try}<p class="try"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v13l3.5-3.5L13 19l2-1-2.5-5H17z" /></svg>{f.try}</p>{/if}
                </div>
              </li>
            {/each}
          </ul>
        </section>
      {/each}

      <section class="group privacy" aria-labelledby="privacy-title">
        <div class="card">
          <div class="phead">
            <span class="tile big" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3 5 6v5.5c0 4.4 3 8.1 7 9.5 4-1.4 7-5.1 7-9.5V6zM9 12l2 2 4-4" /></svg></span>
            <div>
              <h2 class="t-section" id="privacy-title">Private by design</h2>
              <p class="gnote">Everything stays on your device. Lowkey sends nothing anywhere except to Spotify, to play your music.</p>
            </div>
          </div>
          <ul class="facts">
            {#each privacy as [name, text] (name)}
              <li>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                <div><h3 class="fname">{name}</h3><p class="ftext">{text}</p></div>
              </li>
            {/each}
          </ul>
        </div>
      </section>

      <section class="group switch">
        <h2 class="t-section">Switch in a few minutes</h2>
        <ol class="steps">
          <li><span class="n">1</span><div><h3 class="fname">Download Lowkey</h3><p class="ftext">For macOS on Apple Silicon, Windows coming soon. Free, forever.</p></div></li>
          <li><span class="n">2</span><div><h3 class="fname">Sign in with Spotify</h3><p class="ftext">With your own Spotify Premium account.</p></div></li>
          <li><span class="n">3</span><div><h3 class="fname">Add your Soloist key</h3><p class="ftext">In Settings. Lowkey then downloads Soloist, Spotify's official player, from Spotify's servers.</p></div></li>
        </ol>
        {@render get()}
      </section>
    {:else if page === "compare"}
      <header class="head">
        <h1 class="t-page">Side by side</h1>
        <p class="lede">How Lowkey stands next to the official app and <a href="https://github.com/LargeModGames/spotatui">Spotatui</a>, a great project with a different goal.</p>
      </header>

      <!-- The three apps once, kept in view while the groups scroll under them; each group is its own table. -->
      <div class="apps" aria-hidden="true">
        <span></span>
        {#each apps as a (a.name)}
          <div class:us={a.us}><p class="aname">{a.name}</p><p class="afocus">{a.focus}</p></div>
        {/each}
      </div>

      {#each compare as g (g.title)}
        <section class="group cmp">
          <table class="card">
            <caption class="t-section">{g.title}</caption>
            <thead class="sr"><tr><th scope="col">Aspect</th>{#each apps as a (a.name)}<th scope="col">{a.name}</th>{/each}</tr></thead>
            <tbody>
              {#each g.rows as r (r.k)}
                <tr>
                  <th scope="row">{r.k}</th>
                  {#each r.v as v, i (i)}
                    <td class:us={i === 1} class:dash={v === "—"} data-app={apps[i].name}>
                      {#if i === 1 && r.win}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>{/if}{v}
                    </td>
                  {/each}
                </tr>
              {/each}
            </tbody>
          </table>
        </section>
      {/each}

      <section class="group switch">
        <h2 class="t-section">Try the difference yourself</h2>
        {@render get()}
      </section>
    {:else if page === "changelog"}
      {@const list = logs.list ?? []}
      {@const l = at === null || at < 0 ? null : list[at]}
      {#snippet latest()}<span class="latest">Latest</span>{/snippet}
      {#if version !== undefined && !l}
        <header class="head">
          <button class="back" onclick={() => show(null)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" /></svg>All changelogs
          </button>
          <h1 class="t-page">Lowkey {version}</h1>
        </header>
        <div class="card doc md" aria-busy={logs.list === undefined}>
          {#if logs.list === undefined}<span class="bar w60"></span><span class="bar"></span><span class="bar w80"></span>
          {:else if logs.list === null}<p class="state">Couldn't reach GitHub just now. <button class="link-btn" onclick={loadLogs}>Try again</button></p>
          {:else}<p class="state">There's no changelog for this version.</p>{/if}
        </div>
      {:else if l && at !== null}
        <!-- One release: back to the list, its version over its tally, the notes in the reading card, then the neighbours. -->
        <header class="head">
          <button class="back" onclick={() => show(null)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6 8.5 12l6 6" /></svg>All changelogs
          </button>
          <!-- The release's own name leads when it has one; the version, Latest and the tally share the line under it. -->
          <h1 class="t-page">{l.title ?? `Lowkey ${l.version}`}</h1>
          <p class="meta">
            {#if l.title}<span class="v">Lowkey {l.version}</span>{/if}
            {#if at === 0}{@render latest()}{/if}
            {#if l.tally}<span class="dot" aria-hidden="true"></span><span>{l.tally}</span>{/if}
          </p>
        </header>
        <article class="card doc md" aria-busy={l.html === undefined}>
          {#if l.html}{@html l.html}
          {:else if l.html === null}<p class="state">Couldn't load this changelog. <button class="link-btn" onclick={() => loadText(l)}>Try again</button></p>
          {:else}<span class="bar w60"></span><span class="bar"></span><span class="bar w80"></span>{/if}
        </article>
        {#if list.length > 1}
          <nav class="steps" aria-label="More changelogs">
            {#each [[at - 1, "Newer"], [at + 1, "Older"]] as const as [i, dir] (dir)}
              {#if list[i]}
                <button class="card step" class:older={dir === "Older"} onclick={() => show(i)}>
                  <span class="dir">{dir}</span>
                  <span class="ttl">Lowkey {list[i].version}</span>
                  {#if list[i].summary}<span class="sum">{list[i].summary}</span>{/if}
                </button>
              {/if}
            {/each}
          </nav>
        {/if}
      {:else}
        <header class="head">
          <h1 class="t-page">Changelogs</h1>
          <p class="lede">What changed in each version of Lowkey, newest first.</p>
        </header>
        {#if logs.list === null}
          <p class="card state">Couldn't reach GitHub just now. <button class="link-btn" onclick={loadLogs}>Try again</button></p>
        {:else if logs.list?.length === 0}
          <p class="card state">No changelogs yet. The first one arrives with the next update.</p>
        {:else}
          <!-- A release a row, as its page's head: its name, its first line, then version, Latest and tally. -->
          <ol class="card logs" aria-busy={logs.list === undefined}>
            {#each logs.list ?? [0, 1, 2] as l, i (typeof l === "number" ? l : l.name)}
              <li>
                {#if typeof l === "number"}
                  <div class="entry"><span class="what"><span class="bar w40"></span><span class="bar w80"></span><span class="bar w60"></span></span></div>
                {:else}
                  <button class="entry" onclick={() => show(i)}>
                    <span class="what">
                      {#if l.html === undefined}<span class="bar w40"></span><span class="bar w80"></span><span class="bar w60"></span>
                      {:else}
                        <span class="ttl">{l.title ?? `Lowkey ${l.version}`}</span>
                        {#if l.summary}<span class="sum">{l.summary}</span>{/if}
                        <span class="meta">
                          {#if l.title}<span class="v">Lowkey {l.version}</span>{/if}
                          {#if i === 0}{@render latest()}{/if}
                          {#if l.tally}<span class="dot" aria-hidden="true"></span><span>{l.tally}</span>{/if}
                        </span>
                      {/if}
                    </span>
                    <svg class="go" viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
                  </button>
                {/if}
              </li>
            {/each}
          </ol>
        {/if}
      {/if}
    {:else if page === "privacy" || page === "terms"}
      {@const { title, lede, doc } = legal[page]}
      <header class="head">
        <div class="titled">
          <h1 class="t-page">{title}</h1>
          <a class="raised-n raw" href="/{page}.md" target="_blank" rel="noopener" title="Open as plain text">Raw</a>
        </div>
        <p class="lede">{lede}</p>
      </header>
      <!-- One document card: sections split by hairlines, readable measure, the date at the foot. -->
      <article class="card doc">
        {#each doc as [name, blocks] (name)}
          <section>
            <h2>{name}</h2>
            {#each blocks as b, i (i)}
              {#if typeof b === "string"}<p>{@html inline(b)}</p>{:else}<ul>{#each b as li (li)}<li>{@html inline(li)}</li>{/each}</ul>{/if}
            {/each}
          </section>
        {/each}
        <p class="updated">Last updated {UPDATED}</p>
      </article>
    {:else}
      <!-- Download and About in one: as the app's Settings › About, the mark without its tile, name, one line, the pillars and the copyright, centred; then groups. -->
      <header class="about">
        <svg class="logo" viewBox="112 176 800 672" aria-hidden="true">
          <defs>
            <linearGradient id="lk-sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sun-a" /><stop offset="1" class="sun-b" /></linearGradient>
            <mask id="lk-cut"><rect x="-200" y="-200" width="1424" height="1424" fill="#fff" /><g fill="#000"><rect y="486" width="1024" height="8" /><rect y="522" width="1024" height="12" /><rect y="558" width="1024" height="16" /></g></mask>
            <clipPath id="lk-up"><rect width="1024" height="586" /></clipPath>
          </defs>
          <g transform="translate(512 512) scale(1.25) translate(-512 -497)">
            <circle cx="512" cy="470" r="230" fill="url(#lk-sun)" mask="url(#lk-cut)" clip-path="url(#lk-up)" />
            <rect x="200" y="596" width="624" height="18" rx="9" class="bar" />
            <g class="refl">
              <rect x="330" y="644" width="364" height="14" rx="7" opacity=".6" /><rect x="380" y="682" width="264" height="12" rx="6" opacity=".42" />
              <rect x="430" y="716" width="164" height="10" rx="5" opacity=".28" /><rect x="470" y="746" width="84" height="8" rx="4" opacity=".16" />
            </g>
          </g>
        </svg>
        <h1 class="name"><span class="wordmark">low<span>key</span></span></h1>
        <p class="desc">Spotify, quieter.</p>
        <ul class="pillars"><li>Native</li><li>Light</li><li>Free</li></ul>
      </header>

      <!-- One quiet column under the button: what you need, what it can't do yet, the why, the links. -->
      <div class="dl">
        {@render get()}
        <section class="group">
          <h2 class="t-section">You'll need</h2>
          <dl class="card">
            <dt>Spotify Premium</dt><dd>Your own account</dd>
            <dt>A Soloist API key</dt><dd>Entered in Settings</dd>
            <dt>A Mac with Apple Silicon</dt><dd>Windows is coming</dd>
          </dl>
          <p class="small">Lowkey downloads Soloist from Spotify's servers on first run; it is never bundled.</p>
        </section>
        <section class="group">
          <h2 class="t-section">Install</h2>
          <ol class="card install">
            <li><span class="n">1</span><p>Open the <b>.dmg</b> and drag Lowkey to Applications.</p></li>
            <li><span class="n">2</span><p>Lowkey isn't notarized by Apple, so the first launch is blocked. Open <b>System Settings › Privacy &amp; Security</b>, scroll down and click <b>Open Anyway</b> next to Lowkey. You do this once.</p></li>
            <li><span class="n">3</span><p>Sign in with a short code at spotify.com/pair and add your Soloist key. From then on Lowkey updates itself.</p></li>
          </ol>
        </section>
        <section class="group">
          <h2 class="t-section">Not yet possible</h2>
          <dl class="card">
            <dt>Starting a list at a track</dt><dd>Clicking a track plays only that track</dd>
            <dt>Offline downloads</dt><dd>Not supported</dd>
            <dt>Intel Macs</dt><dd>Soloist runs on Apple Silicon only</dd>
            <dt>Mac App Store</dt><dd>Vibrancy uses a private macOS API</dd>
          </dl>
        </section>
        <section class="group">
          <h2 class="t-section">Liner notes</h2>
          <div class="prose">
            <p>I've been a Spotify Premium user for about three years. I built Lowkey because I wanted everyday Spotify to feel calmer, faster and more native.</p>
            <p>Lowkey is a new face for Spotify, not a new Spotify. Your account, your library and Spotify's own playback stay exactly as they are. Lowkey only changes the window you look at. It doesn't compete with Spotify or try to replace it.</p>
            <p>It is free for everyone and always will be. No subscription, no paid features, no ads.</p>
            <p>It is also built to harm Spotify as little as possible. That's why it requires your own Spotify Premium and never works around Spotify's subscription. Playback runs through Soloist, Spotify's official player, so every stream counts as usual. Lowkey never touches the audio itself: it can't download, record or save music, and it never will.</p>
          </div>
        </section>
        <footer class="links">
          <nav aria-label="Links"><a href="https://github.com/whynoctlx/lowkey-build">GitHub</a><a href={RELEASES}>All releases</a></nav>
          <p>© 2026 <a class="who" href={GITHUB}>whynoctlx</a>. Unofficial app, not affiliated with Spotify.</p>
          <p><a class="who" href="?privacy">Privacy Policy</a> · <a class="who" href="?tos">Terms of Use</a></p>
        </footer>
      </div>
    {/if}
  </article>
{/if}

<style>
  /* Site pages sit in a centred column under the centred hero, not pinned to the left of a wide window. */
  .view { padding: var(--sp-6) var(--gutter) var(--sp-7); max-width: 920px; margin-inline: auto; }
  .head .lede a { color: var(--fg-2); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 2px; }
  .head .lede a:hover { color: var(--accent); }

  /* Home's hero, as the app's item hero: icon left, the words beside it, a wash of the playing colour from the top. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: clamp(var(--sp-5), 4cqi, 56px);
    padding: clamp(40px, 6cqi, 80px) var(--gutter) var(--sp-5);
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: calc(-1 * var(--top-h)) 0 0;
    z-index: -1;
    background: linear-gradient(color-mix(in srgb, var(--now) var(--hero-wash), transparent), transparent);
    transition: background var(--m-7) var(--ease);
    pointer-events: none;
  }
  /* The icon as a cover: the macOS squircle-ish tile, throwing a soft shadow of the accent. */
  .icon {
    flex: none; display: grid; place-items: center;
    width: clamp(140px, 19cqi, 232px); aspect-ratio: 1; border-radius: 23%;
    background: linear-gradient(#ffffff, #eceefa);
    box-shadow: 0 0 0 0.5px color-mix(in srgb, var(--fg) 10%, transparent), 0 24px 48px -16px color-mix(in srgb, var(--accent) 45%, transparent);
  }
  :global(html.dark) .icon { background: linear-gradient(#262842, #121322); }
  .icon svg { width: 70%; height: auto; }
  .icon .sun-a { stop-color: #5e6ad2; }
  .icon .sun-b { stop-color: #2b2f5c; }
  .icon .bar, .icon .refl { fill: #5e6ad2; }
  :global(html.dark) .icon .sun-a { stop-color: #e9e9ee; }
  :global(html.dark) .icon .sun-b { stop-color: #8d93c9; }
  :global(html.dark) .icon .bar, :global(html.dark) .icon .refl { fill: #b9bde6; }
  .hero .info { flex: 0 1 620px; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; }
  .hero h1 { margin: 0; font-size: clamp(40px, 6.4cqi, 84px); font-weight: 700; line-height: 0.98; letter-spacing: -0.04em; text-wrap: balance; }
  h1 span { color: var(--fg-3); }
  .ver {
    display: inline-flex; align-items: center; gap: var(--sp-2); margin: 0 0 var(--sp-4); padding: 4px 8px 4px 12px; border: 0; border-radius: 999px;
    background: var(--sunk); box-shadow: inset 0 0 0 0.5px var(--sunk-edge); color: var(--fg-2); font: inherit; font-size: var(--sub-fs);
    transition: color var(--m-5) var(--ease);
  }
  .ver b { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }
  .ver svg { width: 13px; height: 13px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .ver:hover { color: var(--fg); transition-duration: var(--m-1); }
  .lead { max-width: 40ch; margin: var(--sp-4) 0 0; color: var(--fg-2); font-size: clamp(16px, 1.6cqi, 19px); line-height: 1.45; text-wrap: pretty; }
  .small { margin: var(--sp-3) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  /* The actions as one row: the download, the count beside it; other platforms under them. */
  .hero .get { align-items: flex-start; margin-top: var(--sp-5); }
  /* Kept clean: the button says only what it does, the count is a quiet word beside it, other platforms live on Download. */
  /* Everywhere the same clean pair: the button saying only what it does, the count a quiet word beside it; other
     platforms show only on Download, centred under them. */
  /* The button alone, the download count its second line; other platforms only on Download, centred under it. */
  .get { display: flex; flex-direction: column; align-items: center; gap: var(--sp-3); }
  .get .other { display: none; }
  .dl .get .other { display: flex; justify-content: center; margin: 0; }
  .get .main { min-height: 52px; gap: var(--sp-3); padding: var(--sp-2) var(--sp-2) var(--sp-2) var(--sp-5); }
  .get .main:not(:has(.tally)) { padding-right: var(--sp-6); }
  .get .main.raised-n { color: var(--fg); }
  .tally {
    display: inline-flex; align-items: center; gap: 5px; height: 36px; margin-left: var(--sp-2); padding: 0 var(--sp-3) 0 10px; border-radius: 18px;
    background: color-mix(in srgb, currentColor 16%, transparent); box-shadow: inset 0 0 0 0.5px color-mix(in srgb, currentColor 22%, transparent);
    font-size: var(--sub-fs); font-weight: 700; font-variant-numeric: tabular-nums;
  }
  .tally svg { width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .get .win .tally { border-radius: var(--r-1); }
  .hero .note { flex: 0 0 100%; max-width: none; text-align: center; }
  .note {
    max-width: 60ch;
    margin: clamp(32px, 4.5cqi, 56px) 0 0;
    color: var(--fg-3);
    font-size: var(--sub-fs);
    text-wrap: balance;
  }
  .link-btn { padding: 0; border: 0; background: none; color: var(--accent); font: inherit; cursor: default; }
  .link-btn:hover { text-decoration: underline; text-underline-offset: 2px; }
  .note svg { width: 13px; height: 13px; margin-right: var(--sp-1); vertical-align: -2px; fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

  :global(html:not([data-os="win"])) .get[data-for="win"], :global(html[data-os="win"]) .get[data-for="mac"] { display: none !important; }
  .get .main { display: inline-flex; align-items: center; gap: var(--sp-3); text-align: left; text-decoration: none; }
  .get .words { display: flex; flex-direction: column; gap: 2px; }
  .get .main b { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.15; }
  .get .main small { font-size: var(--meta-fs); font-weight: 500; line-height: 1.2; opacity: 0.78; }
  .get .main .logo { width: 22px; height: 22px; }
  .get .main:active { transform: translateY(1px); }
  .get .main:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
  .get .mac { border-radius: 28px; }
  .get .mac .logo { margin-top: -3px; }
  .get .win { border-radius: var(--r-1); }
  .get .win .logo { width: 19px; height: 19px; }
  .get .logo { flex: none; fill: currentColor; }

  .other { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--sp-2); margin: calc(-1 * var(--sp-1)) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .other .plat { display: inline-flex; align-items: center; gap: 6px; color: var(--fg-2); font-weight: 500; text-decoration: none; transition: color var(--m-5) var(--ease); }
  .other a.plat:hover { color: var(--accent); transition-duration: var(--m-1); }
  .other .logo { width: 13px; height: 13px; fill: currentColor; }
  .other em { margin-left: 2px; padding: 1px 7px; border-radius: 999px; background: var(--sunk); color: var(--fg-3); font-size: var(--meta-fs); font-style: normal; font-weight: 500; }
  .get .main.soon { margin: 0; opacity: 0.6; pointer-events: none; }
  /* On a page the buttons sit centred under the page's head, flat: no panel of their own. */
  .view .get { margin: 0 0 var(--sp-7); }
  .dl { max-width: 620px; margin: 0 auto; }
  .dl .prose { padding: 0; }
  .dl .prose p:first-child { color: var(--fg-2); }
  .links { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); margin-top: var(--sp-7); padding-top: var(--sp-5); border-top: 0.5px solid var(--border); text-align: center; }
  .links nav { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-5); }
  .links a { color: var(--fg); font-size: var(--fs); font-weight: 500; text-decoration: none; transition: color var(--m-5) var(--ease); }
  .links a:hover { color: var(--accent); transition-duration: var(--m-1); }
  .links p { margin: 0; color: var(--fg-3); font-size: var(--sub-fs); }

  /* The app's Settings card (+page.svelte :global(.card)): a hairline of see-through --fg on the page's glass, with only a
     breath of fill, so it sits in the glass rather than on it. */
  .card { margin: 0; padding: 0; border: 1px solid var(--border); border-radius: var(--r-3); list-style: none; background: color-mix(in srgb, var(--fg) 2.5%, transparent); }

  /* Features: Settings-style groups of icon rows, a privacy panel, three steps. */
  .same { display: flex; align-items: flex-start; gap: var(--sp-3); margin: 0 0 var(--sp-7); padding: var(--sp-4); border-radius: var(--r-3); background: color-mix(in srgb, var(--accent) 9%, transparent); box-shadow: inset 0 0 0 0.5px color-mix(in srgb, var(--accent) 30%, transparent); }
  .same p { margin: 0; color: var(--fg-2); font-size: var(--name-fs); line-height: 1.55; text-wrap: pretty; }
  .same strong { color: var(--fg); font-weight: 600; }

  .tile { flex: none; display: grid; place-items: center; width: 32px; height: 32px; border-radius: var(--r-2); background: var(--sunk); box-shadow: var(--sunk-edge); color: var(--accent); }
  .tile svg, .facts svg, .try svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
  .tile.big { width: 44px; height: 44px; border-radius: var(--r-3); }
  .tile.big svg { width: 24px; height: 24px; }

  .gnote { margin: 2px 0 var(--sp-3); color: var(--fg-3); font-size: var(--fs); line-height: 1.5; }
  .feats li { display: flex; gap: var(--sp-4); padding: var(--sp-4); }
  .feats li + li { border-top: 0.5px solid var(--border); }
  .body { flex: 1; min-width: 0; }
  .fname { margin: 0; font-size: var(--name-fs); font-weight: 600; line-height: 1.3; }
  .ftext { max-width: 64ch; margin: var(--sp-1) 0 0; color: var(--fg-2); font-size: var(--fs); line-height: 1.55; text-wrap: pretty; }
  .spec { max-width: 280px; margin: var(--sp-3) 0 0; padding: var(--sp-2) var(--sp-3); border-radius: var(--r-2); background: var(--sunk); box-shadow: var(--sunk-edge); color: var(--fg); font-size: var(--fs); font-weight: 500; }
  .try { display: flex; align-items: center; gap: 6px; margin: var(--sp-2) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .try svg { width: 13px; height: 13px; color: var(--accent); }

  .privacy { margin-top: var(--sp-7) !important; }
  .privacy .card { padding: var(--sp-5); }
  .phead { display: flex; align-items: center; gap: var(--sp-4); }
  .phead .gnote { margin: var(--sp-1) 0 0; color: var(--fg-2); font-size: var(--name-fs); }
  .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-5) var(--sp-6); margin: var(--sp-5) 0 0; padding: var(--sp-5) 0 0; border-top: 0.5px solid var(--border); list-style: none; }
  .titled { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); }
  .raw { flex: none; padding: 4px 12px; border-radius: 999px; font-size: var(--sub-fs); font-weight: 600; text-decoration: none; }
  .facts li { display: flex; gap: var(--sp-3); }
  .facts li:last-child:nth-child(odd) { grid-column: 1 / -1; }
  .facts svg { flex: none; width: 16px; height: 16px; margin-top: 1px; color: var(--accent); stroke-width: 2.2; }

  .switch { margin-top: var(--sp-7) !important; }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-5); margin: var(--sp-4) 0 var(--sp-5); padding: 0; list-style: none; }
  .steps li { display: flex; gap: var(--sp-3); }
  .n { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--sunk); box-shadow: var(--sunk-edge); color: var(--fg); font-size: var(--sub-fs); font-weight: 600; font-variant-numeric: tabular-nums; }
  .switch .get { margin: var(--sp-4) 0 0; }

  /* Side by side: a sticky row of the three apps, then one hairline table per group on the same four columns. */
  .apps, .cmp tr { display: grid; grid-template-columns: minmax(0, 1.05fr) repeat(3, minmax(0, 1fr)); }
  /* The apps' row floats on glass as the toolbar's capsules do, rounded, so the rows scroll under it frosted. */
  .apps {
    position: sticky; top: var(--sp-2); z-index: 1; margin: 0 0 var(--sp-5); padding: var(--sp-3) 0; border-radius: var(--r-3);
    /* Denser than the sheet and blurred harder, so the rows passing under it never read through. */
    background: color-mix(in srgb, var(--glass-ground) 92%, transparent); -webkit-backdrop-filter: blur(32px) saturate(1.6); backdrop-filter: blur(32px) saturate(1.6);
    box-shadow: var(--raised-n-edge), var(--shadow);
  }
  .apps > div { padding: 0 var(--sp-4); }
  .apps p { margin: 0; }
  .aname { font-size: var(--name-fs); font-weight: 700; }
  .afocus { margin-top: 2px !important; color: var(--fg-3); font-size: var(--sub-fs); line-height: 1.35; }
  .apps .us .aname { color: var(--accent); }

  .cmp table { width: 100%; border-collapse: separate; border-spacing: 0; overflow: hidden; font-size: var(--fs); }
  .cmp caption { margin: 0 0 var(--sp-2); text-align: left; }
  .cmp tbody tr:not(:first-child) > * { border-top: 0.5px solid var(--border); }
  .cmp th, .cmp td { padding: var(--sp-3) var(--sp-4); text-align: left; line-height: 1.45; }
  .cmp th { color: var(--fg-2); font-weight: 500; }
  .cmp td { color: var(--fg-3); }
  .cmp td.us { position: relative; background: color-mix(in srgb, var(--accent) 8%, transparent); color: var(--fg); font-weight: 500; }
  .cmp td.us svg { width: 13px; height: 13px; margin-right: 6px; vertical-align: -1px; fill: none; stroke: var(--accent); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
  .cmp td.dash { color: color-mix(in srgb, var(--fg-3) 60%, transparent); }
  .switch .gnote { margin-bottom: var(--sp-4); }

  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }

  /* About, after the app's Settings › About. */
  .about { display: flex; flex-direction: column; align-items: center; gap: var(--sp-1); padding: var(--sp-5) 0 var(--sp-6); text-align: center; }
  .about .logo { width: 108px; height: auto; aspect-ratio: 800 / 672; margin-bottom: var(--sp-3); }
  .logo .sun-a { stop-color: #5e6ad2; }
  .logo .sun-b { stop-color: #2b2f5c; }
  .logo .bar { fill: #5e6ad2; }
  .logo .refl { fill: #5e6ad2; }
  :global(html.dark) .logo .sun-a { stop-color: #e9e9ee; }
  :global(html.dark) .logo .sun-b { stop-color: #8d93c9; }
  :global(html.dark) .logo .refl { fill: #b9bde6; }
  .about p { margin: 0; }
  .about .desc { color: var(--fg-2); font-size: var(--name-fs); }
  /* As the app's About: the name in one colour, spaced capitals; the three promises in a quiet line under the tagline. */
  .about .name { margin: 0 0 var(--sp-1); color: var(--fg); font-size: var(--name-fs); font-weight: 600; line-height: 1; }
  .about .name .wordmark { letter-spacing: 0.2em; text-transform: uppercase; margin-right: -0.2em; }
  .about .name :global(.wordmark > span) { color: inherit; }
  .pillars { display: flex; flex-wrap: wrap; justify-content: center; margin: 0; padding: 0; list-style: none; color: var(--fg-3); font-size: var(--meta-fs); }
  .pillars li + li::before { content: "·"; margin: 0 var(--sp-2); }
  .install { margin: 0; padding: 0 var(--sp-4); list-style: none; }
  .install li { display: flex; gap: var(--sp-3); padding: var(--sp-3) 0; }
  .install li + li { border-top: 0.5px solid var(--border); }
  .install .n { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: color-mix(in srgb, var(--accent) 14%, transparent); color: var(--accent); font-size: var(--meta-fs); font-weight: 600; }
  .install p { margin: 0; color: var(--fg-2); line-height: 1.5; }
  .install b { color: var(--fg); font-weight: 600; }
  .links p a.who { color: inherit; font-size: inherit; font-weight: inherit; text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 2px; }

  .group + .group { margin-top: var(--sp-6); }
  .group .t-section { margin: 0 0 var(--sp-2); }
  .prose { padding: var(--sp-4) var(--sp-5); }
  .prose p { max-width: 68ch; margin: 0 0 var(--sp-3); color: var(--fg-2); font-size: var(--name-fs); line-height: 1.65; }
  .prose p:first-child { color: var(--fg); }
  .prose p:last-child { margin-bottom: 0; }
  .doc { padding: var(--sp-2) var(--sp-6); }
  .doc section { margin: 0; padding: var(--sp-5) 0; border-bottom: 0.5px solid var(--border); }
  .doc h2 { margin: 0 0 var(--sp-2); color: var(--fg); font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
  .doc :is(p, ul) { max-width: 68ch; margin: 0 0 var(--sp-3); color: var(--fg-2); font-size: var(--name-fs); line-height: 1.65; }
  .doc :is(p, ul):last-child { margin-bottom: 0; }
  .doc :global(a) { color: var(--accent); font-weight: 500; text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 3px; text-decoration-color: color-mix(in srgb, var(--accent) 45%, transparent); }
  .doc :global(a:hover) { text-decoration-color: currentColor; }
  .doc ul { padding-left: 1.2em; }
  .doc li + li { margin-top: var(--sp-1); }
  .doc li::marker { color: var(--fg-3); }
  /* Changelogs: the list one card of release rows (date | title over its first line | chevron), a release a .doc
     card; the rendered Markdown is unscoped (:global). Placeholders are soft bars that breathe while GitHub answers. */
  .logs li + li { border-top: 0.5px solid var(--border); }
  .entry { display: grid; grid-template-columns: minmax(0, 1fr) 16px; align-items: center; gap: var(--sp-1) var(--sp-5); width: 100%; box-sizing: border-box; padding: var(--sp-5); border: 0; background: none; color: inherit; font: inherit; text-align: left; }
  .logs li:first-child .entry { border-radius: var(--r-3) var(--r-3) 0 0; }
  .logs li:last-child .entry { border-radius: 0 0 var(--r-3) var(--r-3); }
  .logs li:only-child .entry { border-radius: var(--r-3); }
  button.entry { transition: background var(--m-3) var(--ease); }
  button.entry:hover { background: var(--hover); transition-duration: var(--m-1); }
  button.entry:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: -2px; }
  .entry .ttl { font-size: 17px; }
  .entry .sum { color: var(--fg-2); }
  .entry .meta { margin: var(--sp-1) 0 0; font-size: var(--sub-fs); }
  .what { display: grid; gap: var(--sp-1); min-width: 0; }
  .ttl { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; color: var(--fg); font-size: 15px; font-weight: 600; letter-spacing: -0.01em; }
  .sum { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden; color: var(--fg); font-size: var(--name-fs); line-height: 1.5; }
  .step .sum { -webkit-line-clamp: 1; line-clamp: 1; color: var(--fg-2); font-size: var(--sub-fs); }
  .step.older .sum { text-align: right; }
  .go { align-self: center; width: 16px; height: 16px; fill: none; stroke: var(--fg-3); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; opacity: 0; transform: translateX(-4px); transition: opacity var(--m-3) var(--ease), transform var(--m-3) var(--ease); }
  .entry:is(:hover, :focus-visible) .go { opacity: 1; transform: none; stroke: var(--fg-2); }
  .latest { flex: none; padding: 2px var(--sp-2); border-radius: 999px; background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); font-size: var(--micro-fs); font-weight: 600; letter-spacing: 0.02em; line-height: 1.4; }
  .bar { display: block; width: 100%; max-width: 32ch; height: 0.7em; margin: 0.35em 0; border-radius: var(--r-1); background: var(--active); animation: breathe 1.4s var(--ease) infinite alternate; }
  .bar.w40 { width: 40%; } .bar.w60 { width: 60%; } .bar.w80 { width: 80%; }
  .doc .bar { margin: var(--sp-3) 0; }
  @keyframes breathe { to { opacity: 0.45; } }
  @media (prefers-reduced-motion: reduce) { .bar { animation: none; } .go { transition: none; } }

  .back { display: inline-flex; align-items: center; gap: var(--sp-1); margin: 0 0 var(--sp-4) calc(-1 * var(--sp-1)); padding: var(--sp-1) var(--sp-2) var(--sp-1) var(--sp-1); border: 0; border-radius: var(--r-2); background: none; color: var(--fg-2); font: inherit; font-size: var(--sub-fs); transition: background var(--m-3) var(--ease), color var(--m-3) var(--ease); }
  .back:hover { background: var(--hover); color: var(--fg); transition-duration: var(--m-1); }
  .back svg { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-2); margin: var(--sp-3) 0 0; color: var(--fg-3); font-size: var(--name-fs); font-variant-numeric: tabular-nums; }
  .meta:empty { display: none; }
  .meta .v { color: var(--fg-2); font-weight: 600; }
  .meta .dot { width: 3px; height: 3px; border-radius: 50%; background: currentColor; }
  .meta .dot:first-child { display: none; }
  .state { margin: 0; padding: var(--sp-5); color: var(--fg-2); font-size: var(--name-fs); }
  .doc .state { padding-inline: 0; }

  .steps { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-3); margin-top: var(--sp-5); }
  .step { display: grid; gap: var(--sp-1); padding: var(--sp-4) var(--sp-5); color: inherit; font: inherit; text-align: left; transition: background var(--m-3) var(--ease), border-color var(--m-3) var(--ease); }
  .step.older { grid-column: 2; text-align: right; }
  .step:hover { background: var(--hover); border-color: var(--border-strong); transition-duration: var(--m-1); }
  .step .dir { color: var(--fg-3); font-size: var(--meta-fs); font-weight: 500; }
  .step .ttl { display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  @container (max-width: 560px) {
    .entry { padding: var(--sp-4); }
    .steps { grid-template-columns: 1fr; }
    .step.older { grid-column: 1; }
  }

  .md { padding-block: var(--sp-5); }
  .md :global(:is(h2, h3, h4)) { margin: var(--sp-6) 0 var(--sp-2); color: var(--fg); font-size: 15px; font-weight: 650; letter-spacing: -0.01em; }
  .md :global(:is(h3, h4)) { color: var(--fg-2); font-size: var(--sub-fs); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  .md :global(:first-child) { margin-top: 0; }
  .md :global(:is(p, ul)) { max-width: 68ch; margin: 0 0 var(--sp-3); color: var(--fg-2); font-size: var(--name-fs); line-height: 1.65; }
  .md :global(:is(p, ul):last-child) { margin-bottom: 0; }
  .md :global(ul) { padding-left: 1.2em; }
  .md :global(li + li) { margin-top: var(--sp-1); }
  .md :global(li::marker) { color: var(--accent); }
  .md :global(strong) { color: var(--fg); font-weight: 600; }
  .md :global(code) { padding: 0.1em 0.35em; border-radius: var(--r-1); background: var(--active); color: var(--fg); font-size: 0.9em; }
  .md :global(a) { color: var(--fg); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 2px; transition: text-decoration-color var(--m-3) var(--ease); }
  .md :global(a:hover) { text-decoration-color: var(--accent); }
  .doc .updated { margin: 0; padding: var(--sp-4) 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .btn { flex: none; display: inline-flex; align-items: center; height: var(--ctl-h); padding: 0 var(--sp-3); border-radius: var(--r-2); color: var(--fg); font-size: var(--fs); font-weight: 500; }
  .btn:active { transform: translateY(1px) scale(0.97); }

  dl.card { display: grid; grid-template-columns: auto 1fr; padding: 0 var(--sp-4); }
  dt, dd { margin: 0; padding: var(--sp-3) 0; font-size: var(--fs); }
  dt:not(:first-of-type), dt:not(:first-of-type) + dd { border-top: 0.5px solid var(--border); }
  dt { font-weight: 500; }
  dd { padding-left: var(--sp-4); color: var(--fg-3); text-align: right; }

  @container (max-width: 480px) {
    .doc { padding-inline: var(--sp-4); }
    .get, .hero .get { align-items: stretch; }
    .get .main { align-self: stretch; }
    .get .main { justify-content: center; padding-inline: var(--sp-4); }
    .get .main b { font-size: 15px; }
    .note { text-align: left; }
  }

  @media (prefers-reduced-motion: reduce) { .hero::before { transition: none; } }
  /* Narrow: stacked and centred, the icon over the words. */
  @container (max-width: 760px) {
    .hero { flex-direction: column; text-align: center; }
    .hero .info { flex: none; align-items: center; }
    .hero .get { align-items: center; }
  }

  @container (max-width: 640px) {
    .facts, .steps { grid-template-columns: 1fr; }
    /* Narrow: the sticky row goes; each aspect heads its row and every value names its app. */
    .apps { display: none; }
    .cmp tr { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .cmp th { grid-column: 1 / -1; padding-bottom: 0; color: var(--fg); }
    .cmp tbody tr:not(:first-child) > td { border-top: 0; }
    .cmp td { padding-top: var(--sp-2); }
    .cmp td::before { content: attr(data-app); display: block; margin-bottom: 2px; color: var(--fg-3); font-size: var(--meta-fs); font-weight: 600; }
    .feats li { gap: var(--sp-3); }
  }
</style>
