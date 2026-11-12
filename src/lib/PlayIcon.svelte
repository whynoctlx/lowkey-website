<script lang="ts">
  let { playing }: { /** Shows pause (what plays), else play. */ playing: boolean } = $props();
</script>

<!-- The app's one play/pause glyph (.pp in +page.svelte): a soft-cornered triangle and two rounded bars, both drawn;
     the one shown turns in while the other turns out, so the state swaps in place. Size comes from the parent. -->
<svg class="pp" class:on={playing} viewBox="0 0 24 24" aria-hidden="true">
  <path class="g-play" d="M6.5 5.9v12.2a1.1 1.1 0 0 0 1.68.93l9.6-6.1a1.1 1.1 0 0 0 0-1.86l-9.6-6.1A1.1 1.1 0 0 0 6.5 5.9z" />
  <g class="g-pause"><rect x="6.5" y="5" width="3.8" height="14" rx="1.3" /><rect x="13.7" y="5" width="3.8" height="14" rx="1.3" /></g>
</svg>
