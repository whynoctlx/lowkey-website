<script lang="ts">
  import type { Snippet } from "svelte";
  import { marquee } from "./motion.svelte";

  let {
    on,
    peek = false,
    title,
    inner = "",
    children,
  }: {
    /** Glides while true: what plays (the player, the playing library row), or a card pointed at (`peek`). */
    on: boolean;
    /** Started by the pointer (a card): no first hold, a third slower to read, and hover runs it instead of holding it. */
    peek?: boolean;
    title?: string;
    /** Class of the moving line (e.g. `links` for a row of names). */
    inner?: string;
    children: Snippet;
  } = $props();
</script>

<!-- A line too long for its box (AGENTS.md ".marquee"): at rest it ends in "…", on it glides to its end and back.
     The look lives in +page.svelte (.marquee), the motion in motion.svelte.ts (`marquee`); use only this. -->
<span class="marquee" class:peek {title} use:marquee={on}><span class={inner}>{@render children()}</span></span>
