<!-- Settings, the demo's cut: Appearance only (color scheme and accent), as a sheet over the window like the app's.
     Both stick across visits (localStorage) and app.html applies them before the first paint. -->
<script lang="ts" module>
  export type Theme = "system" | "light" | "dark";

  // html.dark carries the dark tokens; System follows the OS, live.
  const scheme = typeof matchMedia === "undefined" ? undefined : matchMedia("(prefers-color-scheme: dark)");
  function applyTheme(t: Theme) {
    document.documentElement.classList.toggle("dark", t === "system" ? !!scheme?.matches : t === "dark");
  }
  scheme?.addEventListener("change", () => {
    let t: string | null = null;
    try { t = localStorage.getItem("theme"); } catch {}
    if (t !== "light" && t !== "dark") applyTheme("system");
  });
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { L } from "./i18n";
  import { enter, exit } from "./motion.svelte";

  let { close }: { close: () => void } = $props();

  const THEMES: { id: Theme; name: string }[] = [
    { id: "system", name: L.settings.themes.system },
    { id: "light", name: L.settings.themes.light },
    { id: "dark", name: L.settings.themes.dark },
  ];
  // The app's swatches; null is the built-in violet.
  const ACCENTS: { name: string; color: string | null; swatch: string }[] = [
    { name: L.settings.accents.violet, color: null, swatch: "#9b5de5" },
    { name: L.settings.accents.indigo, color: "#5e6ad2", swatch: "#5e6ad2" },
    { name: L.settings.accents.blue, color: "#2f7cf6", swatch: "#2f7cf6" },
    { name: L.settings.accents.teal, color: "#0fa3a3", swatch: "#0fa3a3" },
    { name: L.settings.accents.green, color: "#2fa84f", swatch: "#2fa84f" },
    { name: L.settings.accents.amber, color: "#e0a100", swatch: "#e0a100" },
    { name: L.settings.accents.orange, color: "#f2711c", swatch: "#f2711c" },
    { name: L.settings.accents.red, color: "#e5484d", swatch: "#e5484d" },
    { name: L.settings.accents.pink, color: "#e0427f", swatch: "#e0427f" },
    { name: L.settings.accents.graphite, color: "#6e6e78", swatch: "#6e6e78" },
  ];

  const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
  const save = (k: string, v: string | null) => { try { v ? localStorage.setItem(k, v) : localStorage.removeItem(k); } catch {} };

  let theme = $state<Theme>((["light", "dark"] as const).find((t) => t === read("theme")) ?? "system");
  let accent = $state<string | null>(ACCENTS.find((a) => a.color === read("accent"))?.color ?? null);
  const accentName = $derived(ACCENTS.find((a) => a.color === accent)!.name);

  function setTheme(t: Theme) {
    theme = t;
    save("theme", t === "system" ? null : t);
    applyTheme(t);
  }
  // Accent: any accent is the light-mode colour (dark mirrors it in CSS); the text on it turns dark where white reads worse.
  function setAccent(c: string | null) {
    accent = c;
    save("accent", c);
    const st = document.documentElement.style;
    if (!c) return st.removeProperty("--accent-base"), st.removeProperty("--on-accent-l");
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(c.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    st.setProperty("--accent-base", c);
    st.setProperty("--on-accent-l", 1.05 / (l + 0.05) >= (l + 0.05) / 0.0597 ? "#fff" : "#18181b");
  }

  let sheet = $state<HTMLElement>();
  onMount(() => sheet?.focus());
</script>


{#snippet mini(mode: string)}
  <span class="mini {mode}" aria-hidden="true">
    <span class="m-side">
      <span class="m-strip"><span class="m-lights"><i></i><i></i><i></i></span><i class="m-dot m-end"></i></span>
      <span class="m-libbar"><i class="m-search"></i><i class="m-dot"></i></span>
      <i class="m-label"></i>
      {#each { length: 3 } as _}
        <span class="m-row m-quick"><i class="m-art"></i><span class="m-text"><i></i></span></span>
      {/each}
      <i class="m-label"></i>
      {#each { length: 5 } as _}
        <span class="m-row"><i class="m-art"></i><span class="m-text"><i></i><i></i></span></span>
      {/each}
    </span>
    <span class="m-top">
      <i class="m-dot"></i><i class="m-dot"></i>
      <span class="m-crumb"><i class="m-home"></i><i class="m-word"></i></span>
      <span class="m-find"><i class="m-kbd"></i></span>
      <i class="m-dot"></i>
    </span>
    <span class="m-body">
      <span class="m-head">
        <span class="m-hello"><i class="m-title"></i><i class="m-date"></i></span>
        <span class="m-seg"><i></i></span>
      </span>
      {#each { length: 2 } as _}
        <i class="m-sec"></i>
        <span class="m-tiles">
          {#each { length: 6 } as _}<span class="m-tile"><i class="m-art"></i><i class="m-cap"></i></span>{/each}
        </span>
      {/each}
    </span>
    <span class="m-player">
      <span class="m-row"><i class="m-art"></i><span class="m-text"><i></i><i></i></span></span>
      <span class="m-ctl"><span class="m-tx"><i class="m-dot"></i><b></b><i class="m-dot"></i></span><i class="m-prog"></i></span>
      <i class="m-vol"></i>
    </span>
  </span>
{/snippet}

<!-- The dim behind, then the sheet: Esc or a click outside closes it. -->
<div class="scrim" aria-hidden="true" onclick={close} in:enter out:exit></div>
<div
  class="sheet" role="dialog" aria-modal="true" aria-label={L.app.settings} tabindex="-1" bind:this={sheet}
  onkeydown={(e) => e.key === "Escape" && (e.stopPropagation(), close())}
  in:enter={{ y: 8 }} out:exit={{ y: 8, f: 0.6 }}
>
  <header class="bar">
    <span class="path-nav"><span>{L.app.settings}</span><span class="slash" aria-hidden="true">/</span><strong>{L.settings.pages.look}</strong></span>
    <button class="icon ic" aria-label={L.settings.closeLabel} title={L.common.closeEsc} onclick={close}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
    </button>
  </header>
  <div class="body">
    <p class="demo">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></svg>
      <span>This is a demo: only Appearance is here, and it differs from the real app. Lowkey itself has General, Appearance, Layout, Advanced and About, with your account, playback quality and more.</span>
    </p>
    <div class="group" role="group" aria-labelledby="theme-label">
      <h3 class="t-group" id="theme-label">{L.settings.theme}</h3>
      <div class="themes" role="radiogroup" aria-labelledby="theme-label">
        {#each THEMES as t}
          <button class="theme" role="radio" aria-checked={theme === t.id} onclick={() => setTheme(t.id)}>
            <span class="shot">
              {@render mini(t.id === "dark" ? "dark" : "light")}
              {#if t.id === "system"}{@render mini("dark half")}{/if}
            </span>
            <span class="theme-name">{t.name}</span>
          </button>
        {/each}
      </div>
    </div>
    <div class="group card">
      <div class="row">
        <div class="label" id="accent-label"><span class="title">{L.settings.accent} <span class="dim">{accentName}</span></span></div>
        <div class="swatches" role="radiogroup" aria-labelledby="accent-label">
          {#each ACCENTS as a}
            <button class="swatch" role="radio" aria-checked={accent === a.color} aria-label={a.name} title={a.name} style:--c={a.swatch} onclick={() => setAccent(a.color)}></button>
          {/each}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Over the window only (it is the window's child), not the whole page: the app's sheet, sized to its one page. */
  .scrim { position: absolute; inset: 0; z-index: 20; background: var(--scrim); }
  .sheet {
    position: absolute; z-index: 21; inset: calc(var(--top-h) + var(--sp-4)) var(--sp-4) auto; max-width: 600px; max-height: calc(100% - var(--top-h) - 2 * var(--sp-4));
    margin: 0 auto; display: flex; flex-direction: column; border-radius: var(--r-3);
    /* Glass, as the app's .sheet.glass: denser than the capsules, no border, only its shadow. */
    background: var(--glass-sheet); color: var(--fg); box-shadow: var(--shadow); overflow: hidden; container-type: inline-size;
    -webkit-backdrop-filter: var(--glass-blur); backdrop-filter: var(--glass-blur);
  }
  .sheet:focus { outline: none; }
  .bar { flex: none; display: flex; align-items: center; justify-content: space-between; gap: var(--sp-3); height: calc(var(--ctl-h) + 2 * var(--sp-3)); padding: 0 var(--sp-3) 0 var(--gutter); }
  .path-nav { display: flex; align-items: center; gap: var(--sp-2); min-width: 0; color: var(--fg-2); white-space: nowrap; }
  .path-nav strong { font-weight: 600; color: var(--fg); }
  .slash { color: var(--fg-3); }
  .icon { flex: none; display: grid; place-items: center; padding: 0; border: none; background: none; width: var(--ctl-h); height: var(--ctl-h); border-radius: var(--r-2); color: var(--fg-3); }
  svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.75; stroke-linecap: round; stroke-linejoin: round; }
  .demo { display: flex; gap: 10px; margin: 0 0 var(--sp-4); padding: 11px 14px; border-radius: var(--r-2); background: color-mix(in srgb, var(--accent) 10%, transparent); color: var(--fg); font-size: var(--sub-fs); line-height: 1.45; text-wrap: pretty; }
  .demo svg { flex: none; width: 16px; height: 16px; margin-top: 1px; fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; }
  .body { overflow-y: auto; padding: var(--sp-2) var(--gutter) var(--gutter); }
  .group + .group { margin-top: var(--sp-5); }
  .group > .t-group { margin: 0 0 var(--sp-2); }
  .card { padding: 0 var(--sp-4); border: 1px solid var(--border); border-radius: var(--r-3); }
  .row { display: flex; align-items: center; gap: var(--sp-3); min-height: var(--set-row); padding: var(--sp-3) 0; }
  .label { flex: 1; min-width: 0; }
  .title { font-weight: 500; color: var(--fg); }
  .dim { margin-left: var(--sp-1); color: var(--fg-3); font-weight: 400; }


  /* Theme cards: a miniature of the app in each theme (fixed light/dark colours, since they show the other theme too);
     System is split, light on the left and dark on the right. The chosen card gets an accent ring. */
  .themes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-3); }
  .theme { display: flex; flex-direction: column; gap: var(--sp-2); padding: var(--sp-2) var(--sp-2) var(--sp-1); border: none; border-radius: var(--r-3); background: none; box-shadow: inset 0 0 0 1px var(--border); color: var(--fg-3); transition: box-shadow var(--m-2) var(--ease), color var(--m-2) var(--ease); }
  .theme:hover { color: var(--fg-2); box-shadow: inset 0 0 0 1px var(--border-strong); }
  .theme[aria-checked="true"] { color: var(--fg); box-shadow: inset 0 0 0 2px var(--accent); }
  .theme:focus { outline: none; }
  .theme:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 2px; }
  .theme-name { font-size: var(--meta-fs); font-weight: 500; text-align: center; }
  .shot { position: relative; display: block; aspect-ratio: 16 / 10; border-radius: var(--r-2); overflow: hidden; container-type: inline-size; }
  .mini {
    --m-bg: #f4f4f5; --m-panel: #fff; --m-line: #e4e4e7; --m-edge: #e4e4e7; --m-fg: #111113; --m-well: #ececee;
    position: absolute; inset: 0; display: grid;
    grid-template-columns: 24cqw minmax(0, 1fr); grid-template-rows: 7cqw minmax(0, 1fr) 9cqw;
    background: var(--m-bg);
  }
  .mini.dark { --m-bg: #0b0b0c; --m-panel: #141416; --m-line: #2c2c31; --m-edge: #232327; --m-fg: #ededef; --m-well: #1d1d20; }
  .mini.half { clip-path: inset(0 0 0 50%); }
  .mini i, .mini b { display: block; flex: none; }
  .m-dot { width: 1.6cqw; height: 1.6cqw; border-radius: 50%; background: var(--m-line); }

  .m-side { grid-row: 1 / -1; display: flex; flex-direction: column; gap: 1.3cqw; padding: 0 1.6cqw 0 2cqw; overflow: hidden; }
  .m-strip { flex: none; display: flex; align-items: center; height: 7cqw; }
  .m-end { margin-left: auto; }
  .m-lights { display: flex; gap: 0.8cqw; }
  .m-lights i { width: 1.4cqw; height: 1.4cqw; border-radius: 50%; background: #ff5f57; }
  .m-lights i:nth-child(2) { background: #febc2e; }
  .m-lights i:nth-child(3) { background: #28c840; }
  .m-libbar { display: flex; align-items: center; gap: 1cqw; margin-bottom: 0.4cqw; }
  .m-search { flex: 1; height: 3cqw; border-radius: 0.8cqw; background: var(--m-well); }
  .m-label { width: 40%; height: 0.8cqw; margin-top: 0.6cqw; border-radius: 1cqw; background: var(--m-line); opacity: 0.8; }
  .m-row { display: flex; align-items: center; gap: 1.3cqw; min-width: 0; }
  .m-row .m-art { width: 3.8cqw; height: 3.8cqw; }
  .mini .m-quick .m-art { background: color-mix(in srgb, var(--accent) 22%, var(--m-bg)); }
  .m-text { flex: 1; display: flex; flex-direction: column; gap: 0.7cqw; min-width: 0; }
  .m-text i { height: 0.8cqw; width: 80%; border-radius: 1cqw; background: var(--m-line); }
  .m-text i + i { width: 50%; opacity: 0.7; }
  .m-quick .m-text i { width: 60%; }

  .m-top { display: flex; align-items: center; gap: 1cqw; padding: 0 2cqw 0 1cqw; }
  .m-crumb { display: flex; align-items: center; gap: 0.8cqw; margin-left: 0.8cqw; }
  .m-home { width: 1.8cqw; height: 1.8cqw; border-radius: 0.4cqw; background: var(--m-fg); opacity: 0.8; }
  .m-word { width: 6cqw; height: 1cqw; border-radius: 1cqw; background: var(--m-fg); opacity: 0.8; }
  .m-find { display: flex; align-items: center; justify-content: flex-end; width: 20cqw; height: 3.4cqw; margin-left: auto; padding: 0 0.8cqw; box-sizing: border-box; border-radius: 0.8cqw; box-shadow: inset 0 0 0 0.15cqw var(--m-line); }
  .m-kbd { width: 3cqw; height: 0.8cqw; border-radius: 1cqw; background: var(--m-line); }

  .m-body { display: flex; flex-direction: column; margin: 0 0.8cqw 0 0; padding: 3cqw 3cqw 0; border-radius: 1.6cqw; background: var(--m-panel); box-shadow: 0 0 0 0.5px var(--m-edge); overflow: hidden; }
  .m-head { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 2.6cqw; }
  .m-hello { display: flex; flex-direction: column; gap: 1cqw; }
  .m-title { width: 20cqw; height: 2cqw; border-radius: 1cqw; background: var(--m-fg); opacity: 0.9; }
  .m-date { width: 11cqw; height: 0.9cqw; border-radius: 1cqw; background: var(--m-line); }
  .m-seg { display: flex; align-items: flex-end; justify-content: flex-end; width: 12cqw; height: 3cqw; }
  .m-seg i { width: 45%; height: 0.4cqw; border-radius: 0.2cqw; background: var(--accent); }
  .m-sec { width: 14cqw; height: 1.2cqw; margin-bottom: 1.4cqw; border-radius: 1cqw; background: var(--m-fg); opacity: 0.75; }
  .m-tiles { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 1.4cqw; margin-bottom: 2.4cqw; }
  .m-tile .m-art { aspect-ratio: 1; border-radius: 0.8cqw; }
  .m-cap { height: 0.8cqw; width: 70%; margin-top: 0.8cqw; border-radius: 1cqw; background: var(--m-line); }

  .m-art { border-radius: 0.6cqw; background: hsl(var(--h, 250) 30% 62%); }
  .dark .m-art { background: hsl(var(--h, 250) 28% 38%); }
  .m-row:nth-child(4n) .m-art, .m-tile:nth-child(7n + 1) .m-art { --h: 20; }
  .m-row:nth-child(4n + 1) .m-art, .m-tile:nth-child(5n + 2) .m-art { --h: 190; }
  .m-row:nth-child(4n + 2) .m-art, .m-tile:nth-child(5n + 3) .m-art { --h: 330; }
  .m-row:nth-child(4n + 3) .m-art, .m-tile:nth-child(5n + 4) .m-art { --h: 140; }

  .m-player { grid-column: 2; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 2cqw; padding: 0 2cqw 0 1cqw; }
  .m-player .m-art { width: 5.2cqw; height: 5.2cqw; }
  .m-ctl { display: flex; flex-direction: column; align-items: center; gap: 0.9cqw; }
  .m-tx { display: flex; align-items: center; gap: 1.6cqw; }
  .m-tx b { width: 3cqw; height: 3cqw; border-radius: 50%; background: var(--m-fg); }
  .m-prog { position: relative; width: 22cqw; height: 0.6cqw; border-radius: 1cqw; background: var(--m-line); overflow: hidden; }
  .m-prog::before { content: ""; position: absolute; inset: 0 60% 0 0; background: var(--accent); }
  .m-vol { justify-self: end; width: 8cqw; height: 0.6cqw; border-radius: 1cqw; background: var(--m-line); }

  .swatches { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--sp-3); }
  .swatch {
    position: relative; width: 20px; height: 20px; padding: 0; border: none; border-radius: 50%; background: var(--c);
    box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.15); transition: transform var(--m-2) var(--ease), box-shadow var(--m-2) var(--ease);
  }
  .swatch:hover { transform: scale(1.1); }
  .swatch[aria-checked="true"] { box-shadow: inset 0 0 0 0.5px rgb(0 0 0 / 0.15), 0 0 0 2px var(--panel), 0 0 0 3.5px var(--c); }
  @media (prefers-reduced-motion: reduce) { .swatch:hover { transform: none; } }
  @container (max-width: 480px) {
    .body { padding-inline: var(--sp-4); }
    .row { flex-wrap: wrap; }
    .label { flex-basis: 100%; }
    .swatches { justify-content: flex-start; }
  }
</style>
