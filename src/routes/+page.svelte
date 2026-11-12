<script lang="ts">
  import Preview from "#lib/Preview.svelte";
  import Tune from "#lib/Tune.svelte";
  import { get } from "#lib/data.ts";
  import { track, tune } from "#lib/state.svelte.ts";

  const RELEASES = "https://github.com/whynoctlx/lowkey-build/releases/latest";

  // The page follows the preview like the app's window: the playing cover tints the accent (From cover), and the
  // settings in "Yours to tune" are the app's tokens on <html>.
  // First: the stored scheme, so the effects below start from it (app.html already painted it).
  $effect(() => {
    try { tune.theme = (localStorage.getItem("theme") as typeof tune.theme) || "system"; } catch {}
  });
  let dark = $state(false);
  $effect(() => {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const set = () => (dark = tune.theme === "dark" || (tune.theme === "system" && mq.matches));
    set();
    mq.addEventListener("change", set);
    return () => mq.removeEventListener("change", set);
  });
  let first = true;
  $effect(() => {
    const r = document.documentElement;
    if (!first && r.classList.contains("dark") !== dark) {
      // A flip lands in one frame (the app's html.flipping).
      r.classList.add("flipping");
      requestAnimationFrame(() => requestAnimationFrame(() => r.classList.remove("flipping")));
    }
    r.classList.toggle("dark", dark);
    r.style.colorScheme = dark ? "dark" : "light";
    if (!first) try { localStorage.setItem("theme", tune.theme); } catch {}
    first = false;
  });
  $effect(() => {
    const r = document.documentElement, cover = tune.accent === "cover";
    r.classList.toggle("by-cover", cover);
    r.classList.toggle("tinted", cover);
    r.style.setProperty("--now-h", String(get(track().albumId).hue));
    if (cover) r.style.removeProperty("--accent-base");
    else r.style.setProperty("--accent-base", tune.accent);
    r.style.setProperty("--motion", `${tune.motion}ms`);
    r.style.setProperty("--contrast", `${tune.contrast}%`);
  });

  let scrolled = $state(false);

  const features = [
    ["Native, not a website in a window", "System font, native title bar, macOS vibrancy and Windows 11 Mica, platform scrollbars. Everything is clickable, just like in Spotify.", "M4 5h16v12H4zM9 21h6M12 17v4"],
    ["Light", "Rust and Tauri instead of Electron. It opens instantly from local cache and uses nothing while paused or hidden.", "M13 2 4 14h7l-1 8 9-12h-7z"],
    ["Just your music", "Library, search, playlists, albums, artists and a home page without promos.", "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z"],
    ["Nothing cut off", "Where Spotify trims long titles with “…”, Quietify glides the text so you can read all of it.", "M4 12h16M14 6l6 6-6 6"],
    ["No waiting", "Quietify loads a playlist, album or artist the moment you point at it, so it's already there when you click.", "M12 7v5l3 2M21 12a9 9 0 1 1-9-9"],
    ["Every card visible", "No “Show all” on card rows. Home, search and artist pages show every album, playlist and artist, rearranged to fit the window.", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z"],
    ["Smooth resizing", "Spotify stutters while you resize. Quietify waits until you stop, then glides every tile into place in one smooth move.", "M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"],
    ["Yours to tune", "Theme, accent colour, contrast, density, UI scale, motion and glass.", "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M16 4v4M10 10v4M18 16v4"],
  ];

  const compare: [string, string, string, string][] = [
    ["Focus", "Complete music ecosystem", "Native feel and user experience", "Lightweight playback"],
    ["Everything clickable", "Yes", "Yes", "Some elements aren't"],
    ["Adapts to window size", "Partly", "Fully", "Not at all"],
    ["Resizing", "Stutters", "Smooth, tiles glide into place", "No rearranging"],
    ["Card rows", "One row + “Show all”", "All cards, as many per row as fit", "—"],
    ["Long text", "Cut off with “…”", "Glides so all of it is readable", "—"],
    ["Appearance settings", "None", "Theme, accent, contrast, density, scale, motion, glass", "None"],
    ["Home page", "Yes, with promos", "Yes, music only", "No"],
    ["Cold start", "Slow", "Fast", "Fastest"],
    ["Opening a page", "Loads after you click", "Preloaded on hover", "—"],
    ["Resource use", "High", "Low, nothing while idle", "Low"],
    ["Account", "Free or Premium", "Premium", "Free or Premium"],
    ["Price", "Free with ads, or subscription", "Free, forever", "Free, open source"],
    ["Built with", "Electron", "Rust, Tauri 2, SvelteKit 5", "Rust, Tauri + terminal UI"],
  ];
</script>

<svelte:window onscroll={() => (scrolled = scrollY > 8)} />

<svelte:head>
  <title>Quietify · Spotify, quieter.</title>
</svelte:head>

<header class="nav" class:scrolled>
  <div class="wrap nav-in">
    <a class="logo" href="#top" aria-label="Quietify"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5a6 6 0 0 1 12 0Z" /><rect x="3" y="16.5" width="18" height="1.5" rx=".75" /></svg>Quietify</a>
    <nav class="links" aria-label="Sections">
      <a href="#preview">Preview</a>
      <a href="#features">Features</a>
      <a href="#compare">Compare</a>
      <a href="#requirements">Requirements</a>
    </nav>
    <a class="btn primary" href="#download">Download</a>
  </div>
</header>

<main id="top">
  <section class="hero">
    <div class="wrap">
      <p class="eyebrow"><span class="dot"></span>Free forever · macOS &amp; Windows · For Spotify Premium</p>
      <h1>Spotify,<br /><span class="quiet">quieter.</span></h1>
      <p class="lead">A lightweight, native desktop player for your Spotify. Your account, your library and Spotify's own playback stay exactly as they are. Quietify only changes the window you look at.</p>
      <div class="cta">
        <a class="big raised" href={RELEASES}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19h14" /></svg>Download for macOS
        </a>
        <a class="big raised-n" href={RELEASES}>Download for Windows</a>
      </div>
      <p class="fine">Apple Silicon · Windows x64 · Not affiliated with Spotify</p>
    </div>

    <div class="wrap wide" id="preview">
      <Preview />
      <p class="hint"><span class="live"><i></i>Live preview</span> Play something, search, open an artist, save a song. The whole page takes the colour of what plays.</p>
    </div>
  </section>

  <section class="tune-sec">
    <div class="wrap split">
      <div>
        <p class="kicker">Appearance</p>
        <h2>Yours to tune.</h2>
        <p class="lead">Light or dark, an accent of your own or the colour of the cover that plays, more contrast, denser lists, slower or no motion. Try it: everything here changes the preview above, and this page with it.</p>
      </div>
      <Tune />
    </div>
  </section>

  <section id="features">
    <div class="wrap">
      <p class="kicker">Why Quietify</p>
      <h2>Calmer, faster,<br />more native.</h2>
      <ul class="features">
        {#each features as [t, d, icon] (t)}
          <li>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d={icon} /></svg>
            <h3>{t}</h3>
            <p>{d}</p>
          </li>
        {/each}
      </ul>
    </div>
  </section>

  <section class="pillars" aria-label="Three promises">
    <div class="wrap">
      <p><b>Native.</b> Built for macOS and Windows, not a web page in a box.</p>
      <p><b>Light.</b> Rust and Tauri. Nothing runs while it waits.</p>
      <p><b>Free.</b> No subscription, no paid features, no ads. Ever.</p>
    </div>
  </section>

  <section id="compare">
    <div class="wrap">
      <p class="kicker">Side by side</p>
      <h2>A new face for Spotify,<br />not a new Spotify.</h2>
      <p class="lead narrow">Quietify doesn't compete with Spotify or try to replace it. Here's how it stands next to the official app and <a class="ul" href="https://github.com/LargeModGames/spotatui">Spotatui</a>, a great project with a different goal.</p>
      <div class="table" role="region" aria-label="Comparison" tabindex="-1">
        <table>
          <thead><tr><th></th><th>Spotify</th><th class="us">Quietify</th><th>Spotatui</th></tr></thead>
          <tbody>
            {#each compare as [k, a, b, c] (k)}<tr><th scope="row">{k}</th><td>{a}</td><td class="us">{b}</td><td>{c}</td></tr>{/each}
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="free">
    <div class="wrap">
      <h2>Free, non-commercial,<br /><span class="quiet">forever.</span></h2>
      <p class="lead narrow">Quietify is built to harm Spotify as little as possible. That's why it requires your own Spotify Premium and never works around Spotify's subscription. Playback runs through Soloist, Spotify's official player, so every stream counts as usual.</p>
    </div>
  </section>

  <section id="requirements">
    <div class="wrap two">
      <div class="box">
        <h3 class="t-group">Requirements</h3>
        <ul class="card list">
          <li><b>Spotify Premium</b><span>Your own account</span></li>
          <li><b>A Soloist API key</b><span>Entered in Settings</span></li>
          <li><b>macOS</b><span>Apple Silicon</span></li>
          <li><b>Windows</b><span>x64, Windows 10 or 11</span></li>
        </ul>
        <p class="note">Quietify downloads Soloist from Spotify's servers on first run. It is never bundled.</p>
      </div>
      <div class="box">
        <h3 class="t-group">Limitations</h3>
        <ul class="card list">
          <li><b>Starting a playlist at a track</b><span>Soloist plays only that track</span></li>
          <li><b>Offline downloads</b><span>Not supported</span></li>
          <li><b>Playlist editing</b><span>Blocked by Spotify's Web API</span></li>
          <li><b>Intel Macs</b><span>Soloist runs on Apple Silicon only</span></li>
        </ul>
        <p class="note">These come from Soloist or Spotify, not from Quietify.</p>
      </div>
    </div>
  </section>

  <section id="download" class="download">
    <div class="wrap">
      <svg class="mark" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14.5a6 6 0 0 1 12 0Z" /><rect x="3" y="16.5" width="18" height="1.5" rx=".75" /></svg>
      <h2>Spotify, quieter.</h2>
      <p class="lead">Updates arrive on their own, signed, every week.</p>
      <div class="cta center">
        <a class="big raised" href={RELEASES}>Download for macOS</a>
        <a class="big raised-n" href={RELEASES}>Download for Windows</a>
      </div>
    </div>
  </section>
</main>

<footer class="foot">
  <div class="wrap">
    <p>Quietify is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Spotify is a trademark of Spotify AB. It signs in with Spotify's desktop client ID and reads some undocumented Spotify endpoints, which may change, stop working or be restricted at any time. Use at your own risk.</p>
    <p>Artists, albums and playlists in the preview are made up.</p>
  </div>
</footer>

<style>
  .wrap { max-width: var(--wrap); margin: 0 auto; padding: 0 var(--sp-5); }
  .wrap.wide { max-width: 1320px; }
  section { padding: clamp(80px, 12vw, 152px) 0 0; }

  /* Nav: the app's toolbar register: the mark and name, quiet links, one primary. Solid ground, a hairline once scrolled. */
  .nav { position: sticky; top: 0; z-index: 10; background: var(--bg); transition: box-shadow var(--m-5) var(--ease), background var(--m-7) var(--ease); }
  .nav.scrolled { box-shadow: 0 0.5px 0 var(--border-strong); }
  .nav-in { display: flex; align-items: center; gap: var(--sp-5); height: 60px; }
  .logo { display: flex; align-items: center; gap: var(--sp-2); font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
  .logo svg { width: 1.3em; height: 1.3em; fill: currentColor; }
  .links { display: flex; gap: var(--sp-5); margin-left: auto; font-size: 14px; font-weight: 500; }
  .links a { color: var(--fg-2); transition: color var(--m-2) var(--ease); }
  .links a:hover { color: var(--fg); }
  .nav .btn { height: 32px; padding: 0 var(--sp-4); font-size: 14px; }

  /* Hero: the cover's faint wash over the ground, as the app tints its glass. */
  .hero { padding-top: clamp(56px, 9vw, 112px); text-align: center; background: linear-gradient(color-mix(in srgb, var(--now) 9%, var(--bg)), var(--bg) 62%); transition: background var(--m-7) var(--ease); }
  .eyebrow { display: inline-flex; align-items: center; gap: var(--sp-2); margin: 0 0 var(--sp-5); padding: 6px var(--sp-3); border-radius: 999px; box-shadow: inset 0 0 0 1px var(--border-strong); color: var(--fg-2); font-size: 13px; font-weight: 500; background: var(--panel); }
  .eyebrow .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--now); transition: background var(--m-7) var(--ease); }
  h1 { margin: 0; font-size: var(--d-1); font-weight: 700; line-height: 0.98; letter-spacing: -0.045em; }
  h2 { margin: 0; font-size: var(--d-2); font-weight: 700; line-height: 1.05; letter-spacing: -0.035em; text-wrap: balance; }
  .quiet { color: var(--fg-3); }
  .lead { max-width: 60ch; margin: var(--sp-5) auto 0; color: var(--fg-2); font-size: var(--lead); line-height: 1.55; text-wrap: pretty; }
  .hero .lead { max-width: 54ch; }
  .narrow { margin-left: 0; }
  .kicker { margin: 0 0 var(--sp-3); color: var(--now); font-size: 14px; font-weight: 600; transition: color var(--m-7) var(--ease); }
  .cta { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-3); margin-top: var(--sp-6); }
  /* The download buttons are the app's raised hero buttons, pill-shaped. */
  .big { display: inline-flex; align-items: center; gap: var(--sp-2); height: 48px; padding: 0 var(--sp-5); border-radius: 999px; font-size: 15px; font-weight: 600; }
  .big svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
  .big.raised-n { color: var(--fg); }
  .fine { margin: var(--sp-4) 0 0; color: var(--fg-3); font-size: 13px; }
  #preview { margin-top: clamp(56px, 8vw, 96px); }
  .hint { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: var(--sp-2) var(--sp-3); margin: var(--sp-5) auto 0; max-width: 64ch; color: var(--fg-3); font-size: 14px; }
  .live { display: inline-flex; align-items: center; gap: 6px; color: var(--fg); font-weight: 600; }
  .live i { width: 7px; height: 7px; border-radius: 50%; background: var(--now); animation: live 2s var(--ease) infinite; }
  @keyframes live { 50% { opacity: 0.35; } }
  @media (prefers-reduced-motion: reduce) { .live i { animation: none; } }

  .split { display: grid; grid-template-columns: 1fr minmax(0, 520px); gap: var(--sp-7); align-items: center; container-type: inline-size; }
  .split .lead { margin-left: 0; }

  /* Features: a hairline grid, one quiet glyph in the accent, title over text. */
  .features { display: grid; grid-template-columns: repeat(4, 1fr); margin: var(--sp-7) 0 0; padding: 0; list-style: none; border-top: 1px solid var(--border); }
  .features li { padding: var(--sp-6) var(--sp-5) var(--sp-6) 0; border-bottom: 1px solid var(--border); }
  .features li:not(:nth-child(4n + 1)) { padding-left: var(--sp-5); border-left: 1px solid var(--border); }
  .features svg { width: 22px; height: 22px; fill: none; stroke: var(--accent); stroke-width: 1.6; stroke-linecap: round; stroke-linejoin: round; transition: stroke var(--m-7) var(--ease); }
  .features h3 { margin: var(--sp-4) 0 var(--sp-2); font-size: 17px; font-weight: 600; letter-spacing: -0.01em; }
  .features p { margin: 0; color: var(--fg-2); font-size: 15px; line-height: 1.55; }

  .pillars .wrap { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-6); }
  .pillars p { margin: 0; color: var(--fg-3); font-size: clamp(20px, 2.2vw, 26px); font-weight: 500; line-height: 1.35; letter-spacing: -0.015em; text-wrap: balance; }
  .pillars b { color: var(--fg); font-weight: 700; }

  /* Comparison: Quietify's column carries the accent tint, the rest stays grey. */
  .table { margin-top: var(--sp-6); overflow-x: auto; border-radius: var(--r-3); box-shadow: inset 0 0 0 1px var(--border); background: var(--panel); }
  table { width: 100%; min-width: 720px; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 14px var(--sp-4); text-align: left; vertical-align: top; }
  tbody tr + tr > * { border-top: 1px solid var(--border); }
  thead th { color: var(--fg); font-weight: 600; font-size: 15px; border-bottom: 1px solid var(--border); }
  tbody th { color: var(--fg-3); font-weight: 500; width: 22%; }
  td { color: var(--fg-2); }
  .us { background: color-mix(in srgb, var(--accent) 7%, transparent); color: var(--fg); font-weight: 500; transition: background var(--m-7) var(--ease); }
  thead .us { color: var(--accent); }
  .ul { color: var(--fg); text-decoration: underline; text-decoration-color: var(--border-strong); text-underline-offset: 3px; }
  .ul:hover { text-decoration-color: currentColor; }

  .free { text-align: left; }

  .two { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-6); }
  .box { display: flex; flex-direction: column; gap: var(--sp-3); }
  .box .t-group { font-size: 15px; }
  .list { margin: 0; list-style: none; background: var(--panel); }
  .list li { display: flex; justify-content: space-between; gap: var(--sp-4); padding: var(--sp-4) 0; font-size: 15px; }
  .list li + li { border-top: 1px solid var(--border); }
  .list b { font-weight: 500; }
  .list span { color: var(--fg-3); text-align: right; }
  .note { margin: 0; color: var(--fg-3); font-size: 14px; }

  .download { text-align: center; padding-bottom: clamp(80px, 12vw, 152px); }
  .mark { width: 56px; height: 56px; margin-bottom: var(--sp-4); fill: var(--fg); }
  .center { justify-content: center; }

  .foot { padding: var(--sp-6) 0 var(--sp-7); border-top: 1px solid var(--border); color: var(--fg-3); font-size: 13px; }
  .foot p { max-width: 90ch; margin: 0 0 var(--sp-2); }

  @media (max-width: 960px) {
    .features { grid-template-columns: 1fr 1fr; }
    .features li:not(:nth-child(4n + 1)) { padding-left: 0; border-left: 0; }
    .features li:nth-child(even) { padding-left: var(--sp-5); border-left: 1px solid var(--border); }
    .split, .two, .pillars .wrap { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .wrap { padding: 0 var(--sp-4); }
    .links { display: none; }
    .nav .btn { margin-left: auto; }
    .features { grid-template-columns: 1fr; }
    .features li:nth-child(even) { padding-left: 0; border-left: 0; }
    .big { width: 100%; justify-content: center; }
  }
</style>
