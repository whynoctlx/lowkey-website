<script lang="ts">
  import "../app.css";
  let { children } = $props();

  // Like a desktop app: no browser context menu or dragged images. The app's own menus still open (they preventDefault
  // themselves), and text fields keep their native menu for paste and spelling.
  const block = (e: Event) => {
    if (!(e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]"))) e.preventDefault();
  };
</script>

<svelte:document oncontextmenu={block} ondragstart={block} />

{@render children()}
