<script lang="ts">
  import { tune } from "./state.svelte";
  import { underline } from "./actions";

  const themes = ["system", "light", "dark"] as const;
  const densities = ["compact", "regular", "spacious"] as const;
  // No Spotify green (the app's design rule 2).
  const accents = [["cover", "From cover"], ["#9b5de5", "Violet"], ["#3b82f6", "Blue"], ["#e2554f", "Coral"], ["#e08a1e", "Amber"], ["#d0479b", "Pink"], ["#52525b", "Graphite"]];
  const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
</script>

<!-- The app's Settings › Appearance in small: a .t-group title over a .card of rows, controls on the right. -->
<div class="tune">
  <h3 class="t-group">Interface</h3>
  <div class="card">
    <div class="set">
      <span>Color scheme</span>
      <div class="seg" role="radiogroup" aria-label="Color scheme" use:underline={themes.indexOf(tune.theme)}>
        {#each themes as t (t)}<button role="radio" aria-checked={tune.theme === t} onclick={() => (tune.theme = t)}>{cap(t)}</button>{/each}
      </div>
    </div>
    <div class="set">
      <span>Accent</span>
      <div class="swatches" role="radiogroup" aria-label="Accent">
        {#each accents as [v, name] (v)}
          <button role="radio" aria-checked={tune.accent === v} aria-label={name} title={name} class:cover={v === "cover"} style:--c={v} onclick={() => (tune.accent = v)}></button>
        {/each}
      </div>
    </div>
    <div class="set">
      <span>Density</span>
      <div class="seg" role="radiogroup" aria-label="Density" use:underline={densities.indexOf(tune.density)}>
        {#each densities as d (d)}<button role="radio" aria-checked={tune.density === d} onclick={() => (tune.density = d)}>{cap(d)}</button>{/each}
      </div>
    </div>
    <div class="set">
      <span>Contrast</span>
      <div class="range"><input type="range" min="0" max="60" step="5" bind:value={tune.contrast} aria-label="Contrast" /><span class="badge">{tune.contrast}%</span></div>
    </div>
    <div class="set">
      <span>Animations</span>
      <div class="range"><input type="range" min="0" max="400" step="10" bind:value={tune.motion} aria-label="Animation speed" /><span class="badge">{tune.motion ? `${tune.motion} ms` : "Off"}</span></div>
    </div>
  </div>
</div>

<style>
  .tune { display: flex; flex-direction: column; gap: var(--sp-2); font-size: var(--fs); user-select: none; -webkit-user-select: none; text-align: left; }
  .card { background: var(--panel); }
  .set { display: flex; align-items: center; justify-content: space-between; gap: var(--sp-4); min-height: var(--set-row); }
  .set + .set { border-top: 1px solid var(--border); }
  .set > span { font-weight: 500; }
  .swatches { display: flex; gap: var(--sp-2); }
  .swatches button { width: 20px; height: 20px; padding: 0; border: 0; border-radius: 50%; background: var(--c); box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.2); transition: transform var(--m-3) var(--ease), box-shadow var(--m-3) var(--ease); }
  .swatches button.cover { background: conic-gradient(from 200deg, #e2554f, #e08a1e, #3b82f6, #9b5de5, #d0479b, #e2554f); }
  .swatches button:hover { transform: scale(1.12); }
  .swatches [aria-checked="true"] { box-shadow: 0 0 0 2px var(--panel), 0 0 0 3.5px var(--fg); }
  .range { display: flex; align-items: center; gap: var(--sp-3); }
  .range input { width: 140px; accent-color: var(--accent); }
  .badge { min-width: 6ch; padding: 2px var(--sp-2); border-radius: var(--r-1); background: var(--hover); color: var(--fg-2); font-size: var(--small-fs); font-weight: 500; text-align: center; font-variant-numeric: tabular-nums; }
  @container (max-width: 420px) { .range input { width: 96px; } .swatches { gap: 6px; } }
</style>
