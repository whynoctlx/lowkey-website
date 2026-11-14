<!-- The website's own pages, drawn as pages of the app: its .view, .t-page head, .t-section labels, hairline cards
     and raised buttons. "hero" sits above Home's feed; the rest open from the sidebar's Lowkey section. -->
<script lang="ts" module>
  export const RELEASES = "https://github.com/whynoctlx/lowkey-build/releases";
  /** The installer files of the newest release, by their ending (Tauri's names: Lowkey_<version>_<arch>…). */
  const FILES: Record<string, RegExp> = { mac: /_aarch64\.dmg$/, win: /_x64-setup\.exe$/ };
  /** The download links: ?download=mac|win on the site itself, so no GitHub address shows; App and the buttons act on it. */
  export const DOWNLOAD = (os: string) => `?download=${os}`;

  /** Download the newest installer for `os`, asked of GitHub in the visitor's browser, so a new release needs no
   *  change here. If GitHub can't answer (offline, its 60-an-hour limit per visitor), the releases page instead. */
  export async function getLatest(os: string) {
    let url = RELEASES;
    try {
      const res = await fetch("https://api.github.com/repos/whynoctlx/lowkey-build/releases/latest");
      const release: { assets: { name: string; browser_download_url: string }[] } = await res.json();
      url = release.assets.find((a) => FILES[os]?.test(a.name))?.browser_download_url ?? RELEASES;
    } catch {}
    location.href = url;
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
  /** The Privacy policy and Terms of use pages: section title, paragraphs. */
  const privacyPolicy: [string, string[]][] = [
    ["Who we are", ["Lowkey is a free, non-commercial app made by whynoctlx. It is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Questions about this policy go to our Discord or GitHub, linked on the Download page."]],
    ["The app", [
      "Lowkey has no analytics, no telemetry, no crash reporter and no ads. Nothing about how you use it is recorded or sent to us. There is no Lowkey account and no Lowkey server.",
      "The app talks to Spotify directly, to sign you in, show your library and play music, and to GitHub, to check for updates. What Spotify does with that data is covered by Spotify's own privacy policy.",
      "Your Spotify session and Soloist key are stored only on your computer, encrypted (ChaCha20-Poly1305) with a key tied to that machine. Your settings stay on your computer too. Uninstalling Lowkey and deleting its app data removes them.",
    ]],
    ["This website", [
      "This website sets no cookies and runs no analytics or trackers. The window on it is a demo on made-up data: it never signs in to Spotify and plays no music.",
      "Your theme, accent and motion choices are saved in your browser's local storage so they stay the same on your next visit. They never leave your browser.",
      "When you press Download, your browser asks GitHub for the newest release and downloads it from GitHub. Cover images come from the servers they are hosted on. Those services, and the host serving this site, may see your IP address and keep ordinary server logs, as any website does.",
    ]],
    ["Changes", ["If this policy changes, the new version will be on this page with a new date."]],
  ];
  const terms: [string, string[]][] = [
    ["Using Lowkey", [
      "Lowkey is free to download and use for personal, non-commercial purposes. You need your own Spotify Premium account and your own Soloist API key. Using Lowkey doesn't change your agreement with Spotify: you are still bound by Spotify's terms.",
      "Don't use Lowkey to get around Spotify's subscription, copy or redistribute music, or sell or repackage the app.",
    ]],
    ["Not affiliated with Spotify", [
      "Lowkey is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.",
      "Lowkey signs in with Spotify's desktop client ID and reads some undocumented Spotify endpoints. These may change, stop working or be restricted at any time and may not comply with Spotify's terms. Use Lowkey at your own risk, including any risk to your Spotify account.",
    ]],
    ["No warranty", [
      "Lowkey and this website are provided “as is”, without warranty of any kind, express or implied, including fitness for a particular purpose. Features may change or stop working at any time.",
      "To the extent the law allows, whynoctlx is not liable for any damage or loss arising from using Lowkey or this website.",
    ]],
    ["Updates and changes", ["Lowkey updates itself with signed releases from GitHub. These terms may change; the current version is always on this page with its date, and using Lowkey after a change means you accept it."]],
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
          <span><b>Coming soon for {me.name}</b><small>{me.detail}</small></span>
        </p>
      {:else}
        <a class={["raised", "main", me.os]} href={DOWNLOAD(me.os)} onclick={(e) => (e.preventDefault(), getLatest(me.os))}>
          <svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={me.logo} /></svg>
          <span><b>Download for {me.name}</b><small>{me.detail}</small></span>
        </a>
      {/if}
      <p class="also">
        Free, forever<span aria-hidden="true">·</span>
        {#if other.soon}
          <span class="later"><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={other.logo} /></svg>{other.name} coming soon</span>
        {:else}
          {me.soon ? "Available now for" : "Also for"}
          <a href={DOWNLOAD(other.os)} onclick={(e) => (e.preventDefault(), getLatest(other.os))}><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={other.logo} /></svg>{other.name}</a>
        {/if}
      </p>
      <!-- The community, right under the download: in Discord's own blurple so it reads at a glance. -->
      <a class="discord" href={DISCORD} target="_blank" rel="noopener"><svg class="logo" viewBox="0 0 24 24" aria-hidden="true"><path d={DISCORD_LOGO} /></svg>Join us on Discord</a>
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
    {:else if page === "privacy"}
      <header class="head">
        <h1 class="t-page">Privacy policy</h1>
        <p class="lede">Short, because there is little to say: Lowkey collects nothing about you. Last updated 14 November 2026.</p>
      </header>
      {#each privacyPolicy as [title, paras] (title)}
        <section class="group">
          <h2 class="t-section">{title}</h2>
          <div class="card prose">{#each paras as p (p)}<p>{p}</p>{/each}</div>
        </section>
      {/each}
    {:else if page === "terms"}
      <header class="head">
        <h1 class="t-page">Terms of use</h1>
        <p class="lede">The rules for using Lowkey and this website. Last updated 14 November 2026.</p>
      </header>
      {#each terms as [title, paras] (title)}
        <section class="group">
          <h2 class="t-section">{title}</h2>
          <div class="card prose">{#each paras as p (p)}<p>{p}</p>{/each}</div>
        </section>
      {/each}
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
        <ul class="pillars"><li>Native</li><li>Light</li><li>Free</li></ul>
        <p class="fine">© 2026 <a href={GITHUB}>whynoctlx</a>. Unofficial app, not affiliated with Spotify.</p>
      </header>

      {@render get()}
      <div class="two">
        <section>
          <h2 class="t-section">You'll need</h2>
          <dl class="card">
            <dt>Spotify Premium</dt><dd>Your own account</dd>
            <dt>A Soloist API key</dt><dd>Entered in Settings</dd>
            <dt>macOS</dt><dd>On Apple Silicon</dd>
            <dt>Windows</dt><dd>Coming soon: x64, Windows 10 or 11</dd>
          </dl>
          <p class="small">Lowkey downloads Soloist from Spotify's servers on first run. It is never bundled. Linux builds exist but are unsupported.</p>
        </section>
        <section>
          <h2 class="t-section">Not yet possible</h2>
          <dl class="card">
            <dt>Starting a list at a track</dt><dd>Clicking a track plays only that track</dd>
            <dt>Offline downloads</dt><dd>Not supported</dd>
            <dt>Intel Macs</dt><dd>Soloist runs on Apple Silicon only</dd>
            <dt>Mac App Store</dt><dd>Vibrancy uses a private macOS API</dd>
          </dl>
          <p class="small">These come from Soloist or Spotify, not from Lowkey.</p>
        </section>
      </div>

      <section class="group">
        <h2 class="t-section">Liner notes</h2>
        <div class="card prose">
          <p>I've been a Spotify Premium user for about three years. I built Lowkey because I wanted everyday Spotify to feel calmer, faster and more native.</p>
          <p>Lowkey is a new face for Spotify, not a new Spotify. Your account, your library and Spotify's own playback stay exactly as they are. Lowkey only changes the window you look at. It doesn't compete with Spotify or try to replace it.</p>
          <p>It is free for everyone and always will be. No subscription, no paid features, no ads.</p>
          <p>It is also built to harm Spotify as little as possible. That's why it requires your own Spotify Premium and never works around Spotify's subscription. Playback runs through Soloist, Spotify's official player, so every stream counts as usual.</p>
        </div>
      </section>

      <section class="group">
        <h2 class="t-section">Links</h2>
        <div class="card rows">
          <div class="row">
            <div><p class="name">GitHub</p><p class="hint">Made by whynoctlx. Free and non-commercial, forever.</p></div>
            <a class="raised-n btn" href={GITHUB}>Open</a>
          </div>
          <div class="row">
            <div><p class="name">Discord</p><p class="hint">Talk to us, ask for help, suggest what comes next</p></div>
            <a class="raised-n btn" href={DISCORD}>Open</a>
          </div>
          <div class="row">
            <div><p class="name">All releases</p><p class="hint">Every version, with its changes</p></div>
            <a class="raised-n btn" href={RELEASES}>Open</a>
          </div>
        </div>
      </section>
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
  .get .main span { display: flex; flex-direction: column; gap: 2px; }
  .get .main b { font-size: 17px; font-weight: 600; letter-spacing: -0.01em; line-height: 1.15; }
  .get .main small { font-size: var(--meta-fs); font-weight: 500; line-height: 1.2; opacity: 0.78; }
  .get .main .logo { width: 24px; height: 24px; }
  .get .mac { border-radius: 28px; }
  .get .mac .logo { margin-top: -3px; }
  .get .win { border-radius: var(--r-1); }
  .get .win .logo { width: 20px; height: 20px; }
  .get .logo { flex: none; fill: currentColor; }
  .also { display: flex; flex-wrap: wrap; align-items: center; gap: var(--sp-1) var(--sp-2); margin: 0; color: var(--fg-2); font-size: var(--sub-fs); }
  .also a { display: inline-flex; align-items: center; gap: 6px; color: var(--fg); font-weight: 600; text-decoration: none; transition: color var(--m-5) var(--ease); }
  .also a:hover { color: var(--accent); transition-duration: var(--m-1); }
  .also .logo { width: 13px; height: 13px; }
  .discord { display: inline-flex; align-items: center; gap: var(--sp-2); height: 36px; padding: 0 var(--sp-4); border-radius: 18px; background: color-mix(in srgb, #5865f2 14%, transparent); color: var(--fg); font-size: var(--sub-fs); font-weight: 600; text-decoration: none; transition: background var(--m-5) var(--ease); }
  .discord:hover { background: color-mix(in srgb, #5865f2 24%, transparent); transition-duration: var(--m-1); }
  .discord .logo { width: 18px; height: 18px; fill: #5865f2; }
  :global(html.dark) .discord .logo { fill: #8891f7; }
  .also .later { display: inline-flex; align-items: center; gap: 6px; }
  .get .main.soon { margin: 0; opacity: 0.6; pointer-events: none; }
  /* On a page the buttons sit centred in their own panel, lit faintly by the playing cover like the hero. */
  .view .get {
    align-items: center; margin: 0 0 var(--sp-6); padding: var(--sp-7) var(--sp-5);
    border: 0.5px solid var(--border-strong); border-radius: var(--r-3);
    background: radial-gradient(70% 90% at 50% 0%, color-mix(in srgb, var(--now) 12%, transparent), transparent 75%), color-mix(in srgb, var(--panel) 60%, transparent);
    transition: background var(--m-7) var(--ease);
  }

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
  .pillars { display: flex; flex-wrap: wrap; justify-content: center; margin: var(--sp-3) 0 0; padding: 0; list-style: none; color: var(--fg); font-size: var(--fs); font-weight: 500; }
  .pillars li + li::before { content: "·"; margin: 0 var(--sp-2); color: var(--fg-3); }
  .about .fine { margin-top: var(--sp-4); color: var(--fg-3); font-size: var(--sub-fs); }
  .about .fine a { color: var(--accent); }
  .about .fine a:hover { text-decoration: underline; text-underline-offset: 2px; }

  .group + .group { margin-top: var(--sp-6); }
  .two + .group { margin-top: var(--sp-7); }
  .group .t-section { margin: 0 0 var(--sp-2); }
  .prose { padding: var(--sp-4) var(--sp-5); }
  .prose p { max-width: 68ch; margin: 0 0 var(--sp-3); color: var(--fg-2); font-size: var(--name-fs); line-height: 1.65; }
  .prose p:first-child { color: var(--fg); }
  .prose p:last-child { margin-bottom: 0; }
  .rows .row { display: flex; align-items: center; gap: var(--sp-4); padding: var(--sp-3) var(--sp-4); }
  .rows .row + .row { border-top: 0.5px solid var(--border); }
  .rows .row > div { flex: 1; min-width: 0; }
  .rows p { margin: 0; }
  .rows .name { font-size: var(--name-fs); font-weight: 500; }
  .rows .hint { margin-top: 2px; color: var(--fg-3); font-size: var(--sub-fs); }
  .btn { flex: none; display: inline-flex; align-items: center; height: var(--ctl-h); padding: 0 var(--sp-3); border-radius: var(--r-2); color: var(--fg); font-size: var(--fs); font-weight: 500; }
  .btn:active { transform: translateY(1px) scale(0.97); }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-5); }
  .two .t-section { margin: 0 0 var(--sp-2); }
  .two section { margin: 0; }
  dl.card { display: grid; grid-template-columns: auto 1fr; padding: 0 var(--sp-4); }
  dt, dd { margin: 0; padding: var(--sp-3) 0; font-size: var(--fs); }
  dt:not(:first-of-type), dt:not(:first-of-type) + dd { border-top: 0.5px solid var(--border); }
  dt { font-weight: 500; }
  dd { padding-left: var(--sp-4); color: var(--fg-3); text-align: right; }

  @container (max-width: 480px) {
    .hero .get { align-self: stretch; }
    .get .main { align-self: stretch; justify-content: center; }
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
    .two { grid-template-columns: 1fr; }
  }
</style>
