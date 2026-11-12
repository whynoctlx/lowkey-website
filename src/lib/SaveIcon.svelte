<script lang="ts">
  let { on }: { /** In Liked songs: the filled accent disc with a check; else a ring with a plus. */ on: boolean } = $props();
</script>

<!-- The app's one save glyph (.like in +page.svelte), as PlayIcon: both states drawn, the disc and check grow in over the
     ring and plus (transform and opacity only), so the state swaps in place. Size comes from the parent. -->
<svg class="sv" class:on viewBox="0 0 24 24" aria-hidden="true">
  <circle class="g-ring" cx="12" cy="12" r="9" />
  <path class="g-plus" d="M12 8.25v7.5M8.25 12h7.5" />
  <circle class="g-disc" cx="12" cy="12" r="9.75" />
  <path class="g-tick" d="M8.4 12.3l2.5 2.5 4.8-5.1" />
</svg>
