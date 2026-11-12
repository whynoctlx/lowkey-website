<script lang="ts">
  import type { Item } from "./data";
  import { kindName } from "./data";
  import { cover } from "./cover";
  import { p, playItem } from "./state.svelte";
  import { marquee } from "./actions";
  import PlayIcon from "./PlayIcon.svelte";

  let { item, open }: { item: Item; open: (id: string) => void } = $props();

  const now = $derived(p.from === item.id);
  const desc = $derived(item.kind === "artist" ? kindName.artist : item.kind === "album" ? item.by : item.desc);
  let peek = $state(false);
</script>

<!-- As the app's Tile.svelte: the whole tile opens the item, the cover's disc plays it; long lines glide while pointed at. -->
<li class="tile hl bare" class:now onpointerenter={() => (peek = true)} onpointerleave={() => (peek = false)} onfocusin={() => (peek = true)} onfocusout={() => (peek = false)}>
  <span class="cover veil" class:round={item.kind === "artist"}>
    <img src={cover(item)} alt="" />
    {#if now}<span class="eq swap-out" class:held={!p.playing} aria-hidden="true"><i></i><i></i><i></i></span>{/if}
    <button class="cover-play swap-in" aria-label={now && p.playing ? "Pause" : `Play ${item.name}`} onclick={() => playItem(item.id)}>
      <PlayIcon playing={now && p.playing} />
    </button>
  </span>
  <button class="open" onclick={() => open(item.id)}>
    <span class="name"><span class="marquee peek" use:marquee={peek}><span>{item.name}</span></span></span>
    {#if desc}<span class="desc"><span class="marquee peek" use:marquee={peek}><span>{desc}</span></span></span>{/if}
  </button>
</li>

<style>
  .tile { position: relative; display: grid; align-content: start; gap: var(--sp-3) var(--sp-2); min-width: 0; padding: var(--sp-2); border-radius: var(--r-3); }
  .cover { --disc: 36px; display: grid; place-items: center; width: 100%; aspect-ratio: 1; border-radius: var(--r-2); background: var(--active); }
  .cover.round { --disc-at: 14%; border-radius: 50%; }
  .cover img { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: inherit; object-fit: cover; }
  .open { display: flex; flex-direction: column; gap: 2px; min-width: 0; padding: 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; }
  .open::after { content: ""; position: absolute; inset: 0; border-radius: inherit; }
  .open:focus-visible { outline: none; }
  .tile:has(.open:focus-visible) { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 1px; }
  .name { color: var(--fg); font-size: var(--fs); font-weight: 500; line-height: 1.3; min-width: 0; }
  .now .name { color: var(--now); }
  .desc { color: var(--fg-3); font-size: var(--meta-fs); line-height: 1.4; min-width: 0; }
</style>
