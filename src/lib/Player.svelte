<script lang="ts">
  import { get, mmss } from "./data";
  import { cover } from "./cover";
  import { p, liked, step, track } from "./state.svelte";
  import { marquee } from "./actions";
  import PlayIcon from "./PlayIcon.svelte";
  import SaveIcon from "./SaveIcon.svelte";

  let { open }: { open: (id: string) => void } = $props();

  const t = $derived(track());
  const album = $derived(get(t.albumId));
  const on = $derived(liked.has(t.id));

  // Time runs only while playing: no timer at rest (as the app: idle costs nothing).
  $effect(() => {
    if (!p.playing) return;
    const id = setInterval(() => {
      if ((p.pos += 0.25) < t.dur) return;
      if (p.repeat === "track") p.pos = 0;
      else step(1);
    }, 250);
    return () => clearInterval(id);
  });
</script>

<footer class="bar" aria-label="Player">
  <div class="now">
    <button class="art" aria-label={`Open ${album.name}`} onclick={() => open(album.id)}><img src={cover(album)} alt="" /></button>
    <div class="meta">
      <div class="title-row">
        <span class="title marquee" use:marquee={p.playing}><span>{t.name}</span></span>
        {#if t.explicit}<span class="explicit">E</span>{/if}
        <button class="like" class:on aria-label={on ? "Saved" : "Save to Liked songs"} onclick={() => (on ? liked.delete(t.id) : liked.add(t.id))}><SaveIcon {on} /></button>
      </div>
      <button class="artist link" onclick={() => open(t.artists[0].toLowerCase().replace(/\W+/g, "-"))}>{t.artists[0]}</button>
      <div class="album">
        <svg class="disc" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle class="fill" cx="12" cy="12" r="2" /></svg>
        <button class="link" onclick={() => open(album.id)}>{album.name}</button><span class="year">{" · "}{album.year}</span>
      </div>
    </div>
  </div>

  <div class="center">
    <div class="transport">
      <button class="icon toggle" class:on={p.shuffle} aria-pressed={p.shuffle} aria-label="Shuffle" onclick={() => (p.shuffle = !p.shuffle)}>
        <svg viewBox="0 0 24 24"><path d="M16 3h5v5" /><path d="M4 20 21 3" /><path d="M21 16v5h-5" /><path d="m15 15 6 6" /><path d="M4 4l5 5" /></svg>
      </button>
      <button class="icon skip" aria-label="Previous" onclick={() => step(-1)}>
        <svg viewBox="0 0 24 24"><path class="fill" d="M19 19 9 12l10-7z" /><path d="M5.5 18.5v-13" /></svg>
      </button>
      <button class="play" aria-label={p.playing ? "Pause" : "Play"} onclick={() => (p.playing = !p.playing)}><PlayIcon playing={p.playing} /></button>
      <button class="icon skip" aria-label="Next" onclick={() => step(1)}>
        <svg viewBox="0 0 24 24"><path class="fill" d="m5 5 10 7-10 7z" /><path d="M18.5 5.5v13" /></svg>
      </button>
      <button class="icon toggle" class:on={p.repeat !== "off"} aria-label="Repeat" onclick={() => (p.repeat = p.repeat === "off" ? "all" : p.repeat === "all" ? "track" : "off")}>
        <svg viewBox="0 0 24 24"><path d="m17 2 4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" /><path d="m7 22-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" /></svg>
        {#if p.repeat === "track"}<span class="badge">1</span>{/if}
      </button>
    </div>
    <div class="progress">
      <span class="time pos">{mmss(p.pos)}</span>
      <label class="slider" style:--f={p.pos / t.dur}>
        <span class="track"><span class="fill"></span></span>
        <input type="range" min="0" max={t.dur} step="1" bind:value={p.pos} aria-label="Position" />
      </label>
      <span class="time">{mmss(t.dur)}</span>
    </div>
  </div>

  <div class="volume">
    <button class="icon" aria-label={p.volume ? "Mute" : "Unmute"} onclick={() => (p.volume = p.volume ? 0 : 0.7)}>
      <svg viewBox="0 0 24 24"><path class="fill" d="M11 5 6 9H3v6h3l5 4z" />{#if p.volume}<path d="M15.5 8.5a5 5 0 0 1 0 7" />{/if}{#if p.volume > 0.5}<path d="M19 5a10 10 0 0 1 0 14" />{/if}</svg>
    </button>
    <label class="slider vol" style:--f={p.volume}>
      <span class="track"><span class="fill"></span></span>
      <input type="range" min="0" max="1" step="0.01" bind:value={p.volume} aria-label="Volume" />
    </label>
  </div>
</footer>

<style>
  .bar { height: 100%; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) minmax(200px, 460px) minmax(0, 1fr); align-items: center; gap: var(--sp-5); padding: 0 var(--gutter) 0 var(--sp-3); }
  button { display: grid; place-items: center; padding: 0; border: 0; background: none; color: var(--fg-2); font: inherit; cursor: default; border-radius: var(--r-2); }
  .link { display: inline; color: inherit; }
  svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  svg .fill { fill: currentColor; stroke: none; }

  .now { display: flex; align-items: center; gap: var(--sp-3); min-width: 0; }
  .art { flex: none; width: var(--player-cover); height: var(--player-cover); transition: transform var(--m-3) var(--ease); }
  .art:active { transform: scale(0.96); }
  .art img { width: 100%; height: 100%; border-radius: var(--r-2); outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent); outline-offset: -0.5px; }
  .meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; align-items: flex-start; }
  .title-row { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; max-width: 100%; }
  .title { flex: 0 1 auto; font-size: var(--name-fs); font-weight: 600; color: var(--fg); line-height: 1.3; }
  .artist { font-size: var(--sub-fs); color: var(--fg-2); line-height: 1.3; }
  .album { display: flex; align-items: center; gap: var(--sp-1); min-width: 0; font-size: var(--small-fs); color: var(--fg-3); white-space: nowrap; }
  .album .disc { flex: none; width: 1.1em; height: 1.1em; stroke-width: 2; }
  .year { font-variant-numeric: tabular-nums; }

  .center { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .transport { display: flex; align-items: center; justify-content: center; gap: var(--sp-2); }
  .icon { position: relative; width: calc(var(--ctl-h) + var(--sp-1)); height: var(--ctl-h); }
  .skip { color: var(--fg); }
  .skip svg { width: 17px; height: 17px; }
  .toggle svg { width: 15px; height: 15px; }
  .toggle.on { color: var(--accent); }
  .badge { position: absolute; top: 2px; right: 3px; font-size: var(--micro-fs); font-weight: 700; line-height: 1; transform: scale(0.75); }
  .play { width: calc(var(--ctl-h) + var(--sp-1)); height: calc(var(--ctl-h) + var(--sp-1)); color: var(--fg); }
  .play :global(svg) { width: 80%; height: 80%; }
  .play, .icon { transition: transform var(--m-3) var(--ease), color var(--m-2) var(--ease); }
  :is(.play, .icon):hover { transform: scale(1.1); color: var(--fg); transition-duration: var(--m-1); }
  .toggle.on:hover { color: var(--accent); }
  :is(.play, .icon):active { transform: scale(0.9); }

  .progress { display: flex; align-items: center; gap: var(--sp-2); }
  .time { flex: none; min-width: 4.5ch; font-size: var(--small-fs); color: var(--fg-3); font-variant-numeric: tabular-nums; }
  .time.pos { text-align: right; color: var(--fg-2); }

  /* The app's slider in small: a thin line that thickens when touched; what plays is lit in the cover's colour. */
  .slider { --c: var(--fg-2); position: relative; flex: 1; min-width: 0; height: 20px; display: grid; align-items: center; }
  .progress .slider { --c: var(--now); }
  .vol { flex: none; width: 104px; }
  .vol:hover { --c: var(--fg); }
  .track { position: relative; height: 5px; border-radius: 2.5px; background: var(--border-strong); overflow: hidden; transform: scaleY(0.6); transition: transform var(--m-5) var(--ease); }
  .fill { position: absolute; inset: 0; background: var(--c); transform-origin: left; transform: scaleX(var(--f)); transition: transform var(--m-3) linear, background var(--m-2) var(--ease); }
  .slider:hover .track, .slider:has(:focus-visible) .track { transform: none; transition-duration: var(--m-1); }
  .slider input { position: absolute; inset: -6px 0; width: 100%; margin: 0; opacity: 0; cursor: default; }

  .volume { display: flex; align-items: center; justify-content: flex-end; gap: var(--sp-1); }

  @container (max-width: 760px) {
    .bar { grid-template-columns: minmax(0, 1fr) auto; padding-right: var(--sp-4); }
    .volume, .progress, .toggle { display: none; }
    .album { display: none; }
  }
</style>
