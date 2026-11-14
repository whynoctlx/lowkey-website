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
  export const GITHUB = "https://github.com/whynoctlx";
  export const DISCORD = "https://discord.gg/ErKZHrrRXp";
  export const DISCORD_LOGO = "M20.32 4.37a19.8 19.8 0 0 0-4.89-1.52.07.07 0 0 0-.08.04c-.21.38-.44.87-.61 1.25a18.27 18.27 0 0 0-5.49 0 12.64 12.64 0 0 0-.62-1.25.08.08 0 0 0-.08-.04 19.74 19.74 0 0 0-4.88 1.52.07.07 0 0 0-.03.03C.53 9.05-.32 13.58.1 18.06a.08.08 0 0 0 .03.06 19.9 19.9 0 0 0 5.99 3.03.08.08 0 0 0 .08-.03c.46-.63.87-1.3 1.23-1.99a.08.08 0 0 0-.04-.11 13.1 13.1 0 0 1-1.87-.89.08.08 0 0 1-.01-.13l.37-.29a.07.07 0 0 1 .08-.01c3.93 1.79 8.18 1.79 12.06 0a.07.07 0 0 1 .08.01l.37.29a.08.08 0 0 1-.01.13c-.6.35-1.22.65-1.87.89a.08.08 0 0 0-.04.11c.36.7.77 1.36 1.22 1.99a.08.08 0 0 0 .09.03 19.84 19.84 0 0 0 6-3.03.08.08 0 0 0 .03-.06c.5-5.18-.84-9.67-3.55-13.66a.06.06 0 0 0-.03-.03zM8.02 15.33c-1.18 0-2.16-1.08-2.16-2.42 0-1.33.96-2.42 2.16-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.96 2.42-2.16 2.42zm7.97 0c-1.18 0-2.15-1.08-2.15-2.42 0-1.33.95-2.42 2.15-2.42 1.21 0 2.18 1.1 2.16 2.42 0 1.33-.95 2.42-2.16 2.42z";
  export type SitePage = "hero" | "features" | "compare" | "download" | "privacy" | "terms";
  /** The sidebar's Lowkey section: uri, name, icon path(s). */
  export const SITE: { uri: string; name: string; icon: string }[] = [
    { uri: "lowkey:features", name: "Features", icon: "M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" },
    { uri: "lowkey:compare", name: "Side by side", icon: "M4 5h16M4 12h16M4 19h16M10 5v14" },
    { uri: "lowkey:download", name: "Download", icon: "M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" },
  ];
  /** The sidebar's Legal section, under Lowkey: same shape as SITE. */
  export const LEGAL: { uri: string; name: string; icon: string }[] = [
    { uri: "lowkey:privacy", name: "Privacy policy", icon: "M12 3.5 5 6v5.5c0 4.2 3 7.8 7 9 4-1.2 7-4.8 7-9V6z" },
    { uri: "lowkey:terms", name: "Terms of use", icon: "M7 3.5h7l4 4v13H7zM14 3.5v4h4M10 12h5M10 16h5" },
  ];
</script>

<script lang="ts">
  import Marquee from "./Marquee.svelte";

  let { page }: { page: SitePage } = $props();
  const tour = () => dispatchEvent(new Event("lowkey:tour"));

  $effect(loadCount);

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
      ],
    },
    {
      title: "Calm, and yours",
      note: "Your music first. Everything else is there when you want it.",
      items: [
        { icon: "M9 18V6l11-2v12M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z", name: "Just your music", text: "Library, search, playlists, albums, artists and a home page without promos." },
        { icon: "M4 6h12M4 11h12M4 16h7M17 14v6M14 17h6", name: "Songs into your playlists", text: "Add a song to your own or collaborative playlists, or take it out, from the save menu next to its name.", try: "Open Liked songs and press the check next to a song." },
        { icon: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4", name: "Yours to tune", text: "Theme, accent colour, contrast, density, UI scale, motion and glass.", try: "Open Settings with the gear, top right." },
      ],
    },
  ];
  /** Privacy, from the app's source: it talks to Spotify, checks GitHub for updates, and keeps its secrets encrypted on disk. */
  const privacy: [string, string][] = [
    ["No analytics, no tracking", "Lowkey has no telemetry, no crash reporter and no ads. Nothing about how you use it is recorded or sent."],
    ["No Lowkey account, no Lowkey server", "There is nothing of ours to sign up for. The app talks to Spotify directly, the same way Spotify's own app does."],
    ["Your sign-in stays on this computer", "Your Spotify session and Soloist key are stored encrypted (ChaCha20-Poly1305) with a key tied to this machine, so they're useless in a backup or on another computer."],
    ["One other request: updates", "Lowkey checks GitHub for a newer release. It downloads a small file and sends nothing about you or your music."],
  ];
  /** The Privacy policy and Terms of use: [section, blocks]; a block is a paragraph, or a list when it's an array.
      Each fact lives in one document only: data and cookies in the policy, rules, risk and Spotify in the terms. */
  type Doc = [string, (string | string[])[]][];
  const UPDATED = "14 November 2026";
  const privacyPolicy: Doc = [
    ["Who is responsible", [
      "Lowkey and this website are made and run by whynoctlx, an independent developer. For any question or request about this policy or your data, contact us on Discord or through our GitHub repository; both are linked on the Download page.",
    ]],
    ["The Lowkey app", [
      "The app collects nothing about you. It has no account of ours, no server of ours, no analytics, no telemetry, no crash reporting and no ads.",
      "It connects to two services only:",
      [
        "Spotify, to sign you in, show your library and play music. Spotify handles that data under its own privacy policy.",
        "GitHub, to check for and download updates. The check sends nothing about you or your listening.",
      ],
      "Your Spotify session and Soloist key are stored only on your computer, encrypted (ChaCha20-Poly1305) with a key tied to that machine. Your settings stay on your computer as well. Uninstalling Lowkey and deleting its app data removes all of it.",
    ]],
    ["This website", [
      "The site runs no analytics, advertising or tracking. The app window on it is a demo on made-up data: it never signs in to Spotify and plays no music.",
      [
        "Download count. When you start a download we add one to a single running total. Nothing else is stored with it: no IP address, no browser details, nothing that identifies you.",
        "One cookie, lk_dl. It is set when you start a download, holds only the value 1 and expires after a year. It exists so each browser is counted once, and is never used to recognise or follow you.",
        "Preferences. Your theme, accent and motion choices are kept in your browser's local storage so they persist between visits. They are never sent to us.",
      ],
    ]],
    ["Service providers", [
      "Like any website, the services that deliver this one may see your IP address and keep ordinary server logs under their own policies: our hosting provider, our database provider (which holds only the download total), GitHub (which serves the installers) and the hosts of the cover images shown in the demo.",
    ]],
    ["Your choices and rights", [
      "Because we hold no personal data about you, there is nothing for us to access, correct or delete. You can remove the cookie and stored preferences at any time by clearing this site's data in your browser. If you are in the EU or UK, you also have the right to complain to your data protection authority.",
    ]],
    ["Changes to this policy", [
      "When this policy changes, the new version is published on this page with a new date.",
    ]],
  ];
  const terms: Doc = [
    ["Agreement", [
      "These terms apply to the Lowkey app and this website. By downloading or using either, you agree to them. If you don't, please don't use them.",
    ]],
    ["Using Lowkey", [
      "Lowkey is free to download and use for personal, non-commercial purposes. To use it you need your own Spotify Premium account and your own Soloist API key. You agree not to:",
      [
        "use Lowkey to get around Spotify's subscription, or to copy, record or redistribute music;",
        "sell, rent or repackage Lowkey, or distribute modified copies presented as Lowkey;",
        "use Lowkey in a way that breaks the law or harms Spotify's service or other people.",
      ],
    ]],
    ["Spotify", [
      "Lowkey is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.",
      "Your agreement with Spotify still applies when you use Lowkey. Lowkey signs in with Spotify's desktop client ID and relies on undocumented Spotify endpoints, which may change, stop working or be restricted at any time and may not comply with Spotify's terms. You use Lowkey at your own risk, including any risk to your Spotify account.",
    ]],
    ["Updates", [
      "Lowkey installs signed updates from GitHub. Features may change, be added or be removed at any time, and we may stop developing Lowkey without notice.",
    ]],
    ["No warranty", [
      "Lowkey and this website are provided “as is” and “as available”, without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement.",
    ]],
    ["Limitation of liability", [
      "To the fullest extent the law allows, whynoctlx is not liable for any indirect, incidental or consequential damage, or any loss of data, account access or profit, arising from your use of Lowkey or this website. Nothing in these terms limits liability that cannot be limited by law.",
    ]],
    ["Changes to these terms", [
      "We may update these terms. The current version is always published on this page with its date, and continuing to use Lowkey after a change means you accept it.",
    ]],
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
        { k: "App size", v: ["Over 430 MB", "8.4 MB", "23.4 MB"], win: true },
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
        { k: "Long text", v: ["Cut off with “…”", "Glides so all of it is readable", "—"], win: true },
        { k: "Window", v: ["Its own title bar", "Native title bar, macOS vibrancy, Windows 11 Mica", "Terminal, or a desktop app without the native feel"], win: true },
      ],
    },
    {
      title: "Look and content",
      rows: [
        { k: "Appearance settings", v: ["None", "Theme, accent, contrast, density, scale, motion, glass", "None"], win: true },
        { k: "Home page", v: ["Yes, with promos", "Yes, music only", "No"], win: true },
      ],
    },
    {
      title: "Privacy",
      rows: [
        { k: "Tracking and ads", v: ["Listening data collected, ads on Free", "None", "None"] },
        { k: "Your sign-in", v: ["—", "Encrypted on this computer, out of the interface’s reach", "—"] },
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
        <p class={["raised", "main", "soon", me.os]}>
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={me.logo} /></svg>
          <span class="words"><b>Coming soon for {me.name}</b><small>{me.detail}</small></span>
        </p>
      {:else}
        <a class={["raised", "main", me.os]} href={DOWNLOAD(me.os)} onclick={(e) => (e.preventDefault(), getLatest(me.os))}>
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={me.logo} /></svg>
          <span class="words"><b>Download for {me.name}</b><small>Free · {me.detail}</small></span>
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
      <!-- Two pills in one row: the count in the app's own sunk surface, the community in Discord's blurple. -->
      <div class="pills">
        {#if count.total !== null}<p class="count" aria-live="polite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14" /></svg><b>{count.total === undefined ? "–" : count.shown.toLocaleString("en")}</b> {count.total === 1 ? "download" : "downloads"}</p>{/if}
        <a class="discord" href={DISCORD} target="_blank" rel="noopener"><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={DISCORD_LOGO} /></svg>Join us on Discord</a>
      </div>
    </div>
  {/each}
{/snippet}

{#if page === "hero"}
  <!-- Centred over the feed, lit faintly by the cover that plays (--now), so the hero changes colour with the music. -->
  <section class="hero" aria-label="Lowkey">
    <h1>Spotify, <span>quieter.</span></h1>
    <p class="lead">A native, lightweight desktop player for your Spotify Premium.</p>
    {@render get()}
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
    {:else if page === "privacy" || page === "terms"}
      {@const [title, lede, doc] = page === "privacy"
        ? ["Privacy policy", "Lowkey collects no personal data. This policy explains what the app and this website handle, and who else is involved.", privacyPolicy]
        : ["Terms of use", "The terms for using the Lowkey app and this website.", terms]}
      <header class="head">
        <h1 class="t-page">{title}</h1>
        <p class="lede">{lede}</p>
      </header>
      <!-- One document card: sections split by hairlines, readable measure, the date at the foot. -->
      <article class="card doc">
        {#each doc as [name, blocks] (name)}
          <section>
            <h2>{name}</h2>
            {#each blocks as b, i (i)}
              {#if typeof b === "string"}<p>{b}</p>{:else}<ul>{#each b as li (li)}<li>{li}</li>{/each}</ul>{/if}
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
        <h1 class="t-section wordmark">low<span>key</span></h1>
        <p class="desc">Spotify, quieter.</p>
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
            <p>It is also built to harm Spotify as little as possible. That's why it requires your own Spotify Premium and never works around Spotify's subscription. Playback runs through Soloist, Spotify's official player, so every stream counts as usual.</p>
          </div>
        </section>
        <footer class="links">
          <nav aria-label="Links"><a href={GITHUB}>GitHub</a><a href={DISCORD}>Discord</a><a href={RELEASES}>All releases</a></nav>
          <p>© 2026 whynoctlx · Unofficial app, not affiliated with Spotify</p>
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

  /* Home's hero: centred, the headline large, the feed below it as in the app. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: clamp(48px, 7cqi, 88px) var(--gutter) var(--sp-5);
    text-align: center;
  }
  .hero::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: radial-gradient(60% 70% at 50% 0%, color-mix(in srgb, var(--now) 16%, transparent), transparent 70%);
    transition: background var(--m-7) var(--ease);
    pointer-events: none;
  }
  .hero h1 { margin: 0; font-size: clamp(40px, 8.4cqi, 92px); font-weight: 700; line-height: 0.98; letter-spacing: -0.04em; text-wrap: balance; }
  h1 span { color: var(--fg-3); }
  .lead { max-width: 40ch; margin: var(--sp-5) 0 0; color: var(--fg-2); font-size: clamp(16px, 1.7cqi, 20px); line-height: 1.45; text-wrap: balance; }
  .small { margin: var(--sp-3) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .hero .get { align-items: center; margin-top: var(--sp-6); }
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
  .get { display: flex; flex-direction: column; align-items: flex-start; gap: var(--sp-4); margin-top: var(--sp-5); }
  .get .main { display: inline-flex; align-items: center; gap: var(--sp-3); min-height: 56px; padding: var(--sp-2) var(--sp-7) var(--sp-2) var(--sp-5); text-align: left; text-decoration: none; }
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

  .pills { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-2); }
  .count { display: inline-flex; align-items: center; gap: var(--sp-2); height: 36px; margin: 0; padding: 0 var(--sp-4); border-radius: 18px; background: var(--sunk); box-shadow: inset 0 0 0 0.5px var(--sunk-edge); color: var(--fg-2); font-size: var(--sub-fs); font-weight: 500; }
  .count b { color: var(--fg); font-weight: 700; font-variant-numeric: tabular-nums; }
  .count svg { width: 16px; height: 16px; fill: none; stroke: var(--accent); stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; }
  .other { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: var(--sp-2); margin: calc(-1 * var(--sp-1)) 0 0; color: var(--fg-3); font-size: var(--sub-fs); }
  .other .plat { display: inline-flex; align-items: center; gap: 6px; color: var(--fg-2); font-weight: 500; text-decoration: none; transition: color var(--m-5) var(--ease); }
  .other a.plat:hover { color: var(--accent); transition-duration: var(--m-1); }
  .other .logo { width: 13px; height: 13px; fill: currentColor; }
  .other em { margin-left: 2px; padding: 1px 7px; border-radius: 999px; background: var(--sunk); color: var(--fg-3); font-size: var(--meta-fs); font-style: normal; font-weight: 500; }
  .discord { display: inline-flex; align-items: center; gap: var(--sp-2); height: 36px; padding: 0 var(--sp-4); border-radius: 18px; background: color-mix(in srgb, #5865f2 14%, transparent); color: var(--fg); font-size: var(--sub-fs); font-weight: 600; text-decoration: none; transition: background var(--m-5) var(--ease); }
  .discord:hover { background: color-mix(in srgb, #5865f2 24%, transparent); transition-duration: var(--m-1); }
  .discord .logo { width: 18px; height: 18px; fill: #5865f2; }
  :global(html.dark) .discord .logo { fill: #8891f7; }
  .get .main.soon { margin: 0; opacity: 0.6; pointer-events: none; }
  /* On a page the buttons sit centred under the page's head, flat: no panel of their own. */
  .view .get { align-items: center; margin: 0 0 var(--sp-7); }
  .dl { max-width: 620px; margin: 0 auto; }
  .dl .prose { padding: 0; }
  .dl .prose p:first-child { color: var(--fg-2); }
  .links { display: flex; flex-direction: column; align-items: center; gap: var(--sp-2); margin-top: var(--sp-7); padding-top: var(--sp-5); border-top: 0.5px solid var(--border); text-align: center; }
  .links nav { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-5); }
  .links a { color: var(--fg); font-size: var(--fs); font-weight: 500; text-decoration: none; transition: color var(--m-5) var(--ease); }
  .links a:hover { color: var(--accent); transition-duration: var(--m-1); }
  .links p { margin: 0; color: var(--fg-3); font-size: var(--sub-fs); }

  .card { margin: 0; padding: 0; border: 0.5px solid var(--border-strong); border-radius: var(--r-3); list-style: none; background: color-mix(in srgb, var(--panel) 60%, transparent); }

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
  .privacy .card { padding: var(--sp-5); background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 8%, var(--panel)), color-mix(in srgb, var(--panel) 60%, transparent) 70%); }
  .phead { display: flex; align-items: center; gap: var(--sp-4); }
  .phead .gnote { margin: var(--sp-1) 0 0; color: var(--fg-2); font-size: var(--name-fs); }
  .facts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--sp-5) var(--sp-6); margin: var(--sp-5) 0 0; padding: var(--sp-5) 0 0; border-top: 0.5px solid var(--border); list-style: none; }
  .facts li { display: flex; gap: var(--sp-3); }
  .facts svg { flex: none; width: 16px; height: 16px; margin-top: 1px; color: var(--accent); stroke-width: 2.2; }

  .switch { margin-top: var(--sp-7) !important; }
  .steps { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-5); margin: var(--sp-4) 0 var(--sp-5); padding: 0; list-style: none; }
  .steps li { display: flex; gap: var(--sp-3); }
  .n { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--sunk); box-shadow: var(--sunk-edge); color: var(--fg); font-size: var(--sub-fs); font-weight: 600; font-variant-numeric: tabular-nums; }
  .switch .get { margin: var(--sp-4) 0 0; }

  /* Side by side: a sticky row of the three apps, then one hairline table per group on the same four columns. */
  .apps, .cmp tr { display: grid; grid-template-columns: minmax(0, 1.05fr) repeat(3, minmax(0, 1fr)); }
  .apps { position: sticky; top: 0; z-index: 1; margin: 0 0 var(--sp-5); padding: var(--sp-3) 0; background: var(--panel); box-shadow: 0 0.5px 0 var(--border); }
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
  .doc ul { padding-left: 1.2em; }
  .doc li + li { margin-top: var(--sp-1); }
  .doc li::marker { color: var(--fg-3); }
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
    .hero .get { align-self: stretch; }
    .get .main { align-self: stretch; }
    .get .main { justify-content: center; padding-inline: var(--sp-4); }
    .get .main b { font-size: 15px; }
    .note { text-align: left; }
  }

  @media (prefers-reduced-motion: reduce) { .hero::before { transition: none; } }

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
