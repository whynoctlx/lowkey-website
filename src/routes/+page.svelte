<script lang="ts">
  import App from "#lib/app/App.svelte";
  import { RELEASES } from "#lib/app/Site.svelte";
</script>

<svelte:head>
  <title>Lowkey · Spotify, quieter.</title>
</svelte:head>

<!-- The site is the app: one live Lowkey window on a desktop, its own pages in the sidebar's Lowkey section. -->
<App />
<noscript>
  <h1>Lowkey · Spotify, quieter.</h1>
  <p>A native, lightweight desktop player for your Spotify Premium. Free, forever. macOS on Apple Silicon. Windows coming soon.</p>
  <p><a href={RELEASES}>Download Lowkey</a></p>
</noscript>

<!-- Under the window, straight on the desktop: the one thing everyone must read. Who made it lives on the About page. -->
<footer class="foot">
  <p>Lowkey is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.</p>
</footer>

<style>
  noscript { display: block; padding: 48px 24px; }

  /* The page is the desktop: exactly the viewport, the window filling it above a one-line footer. */
  :global(body) { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; }
  :global(body > div) { display: contents; }

  /* Straight on the wallpaper, centred under the window: large enough to read at a glance. */
  .foot {
    position: relative;
    flex: none;
    width: calc(100% - 2 * var(--desk));
    margin: 0 auto;
    padding: 16px 4px 20px;
    text-align: center;
    font-size: 13px;
    line-height: 1.5;
    color: var(--fg-3);
    text-wrap: balance;
  }
  .foot p { margin: 0; }
</style>
