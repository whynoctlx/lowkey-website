<script lang="ts">
  import { get, mmss, type Track } from "./data";
  import { cover } from "./cover";
  import { p, liked, playFrom, track } from "./state.svelte";
  import PlayIcon from "./PlayIcon.svelte";
  import SaveIcon from "./SaveIcon.svelte";

  let { tracks, from, album = false, open }: { tracks: Track[]; from: string; album?: boolean; open: (id: string) => void } = $props();

  const play = (i: number) => playFrom(from, tracks, i);
  const toggleLike = (id: string) => (liked.has(id) ? liked.delete(id) : liked.add(id));
</script>

<!-- As the app's track list: no column heads or rules; number, cover, name over "artists · album", the time. A click anywhere plays. -->
<ol class="list" class:album>
  {#each tracks as t, i (t.id)}
    {@const now = p.from === from && track()?.id === t.id}
    {@const on = liked.has(t.id)}
    <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
    <li class="track hl" class:now onclick={() => play(i)}>
      <span class="num">
        {#if now}<span class="eq swap-out" class:held={!p.playing} aria-hidden="true"><i></i><i></i><i></i></span>
        {:else}<span class="idx swap-out">{i + 1}</span>{/if}
        <button class="row-play swap-in row-glyph" aria-label={now && p.playing ? "Pause" : `Play ${t.name}`} onclick={(e) => (e.stopPropagation(), play(i))}>
          <PlayIcon playing={now && p.playing} />
        </button>
      </span>
      {#if !album}<span class="pic"><img src={cover(get(t.albumId))} alt="" /></span>{/if}
      <span class="text">
        <span class="name">
          <span class="title">{t.name}</span>
          {#if t.explicit}<span class="explicit" title="Explicit">E</span>{/if}
          <button class="like" class:on aria-label={on ? "Saved" : "Save to Liked songs"} onclick={(e) => (e.stopPropagation(), toggleLike(t.id))}><SaveIcon {on} /></button>
        </span>
        <span class="sub">
          <button class="link" onclick={(e) => (e.stopPropagation(), open(t.artists[0].toLowerCase().replace(/\W+/g, "-")))}>{t.artists[0]}</button>
          {#if !album}<span class="dot">·</span><button class="link" onclick={(e) => (e.stopPropagation(), open(t.albumId))}>{t.album}</button>{/if}
        </span>
      </span>
      <span class="dur">{mmss(t.dur)}</span>
    </li>
  {/each}
</ol>

<style>
  .list { margin: 0; padding: 0 calc(var(--gutter) - var(--sp-2)); list-style: none; display: flex; flex-direction: column; }
  .track { position: relative; display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto; align-items: center; gap: var(--sp-3); height: var(--track-h); padding: 0 var(--sp-3) 0 var(--sp-2); border-radius: var(--r-2); }
  .album .track { grid-template-columns: auto minmax(0, 1fr) auto; }
  .num { position: relative; width: 32px; height: var(--thumb); display: grid; place-items: center; color: var(--fg-3); font-size: var(--small-fs); font-variant-numeric: tabular-nums; }
  .row-play { position: absolute; inset: 0; margin: auto; }
  .pic { position: relative; width: var(--thumb); height: var(--thumb); border-radius: var(--r-2); overflow: hidden; background: var(--active); }
  .pic img { width: 100%; height: 100%; display: block; }
  .text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .name { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; font-size: var(--name-fs); font-weight: 500; }
  .title { min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
  /* As in the app: a row shows its save button only pointed at, unless saved. */
  .track:not(:hover, :focus-within) .like:not(.on) { opacity: 0; }
  .sub { display: flex; min-width: 0; color: var(--fg-2); font-size: var(--sub-fs); white-space: nowrap; overflow: hidden; }
  .sub .link { overflow: hidden; text-overflow: ellipsis; }
  .dot { margin: 0 var(--sp-2); color: var(--fg-3); }
  .dur { color: var(--fg-3); font-size: var(--sub-fs); font-variant-numeric: tabular-nums; }
  button.row-play, button.link { cursor: default; }
</style>
