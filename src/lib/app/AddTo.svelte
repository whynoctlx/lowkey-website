<script lang="ts">
  /** The save menu (AGENTS.md › Interaction): one .menu for the whole app, opened by a saved song's button (the player,
   *  every track row) and anchored to it. Where the song is kept: Liked songs on top (a press takes it out or puts it
   *  back), a hairline, then the playlists songs can be added to, a filter once there are many. Each place holding the
   *  song shows the accent check; a press puts the song in or takes it out. */
  import { L } from "./i18n";
  import { dismiss } from "./menu";
  import type { LibItem } from "./Library.svelte";

  let {
    playlists,
    has,
    set,
    liked,
    setLiked,
  }: {
    playlists: LibItem[];
    /** Does this playlist hold the song; undefined: not known (not loaded this run). */
    has: (playlist: string, track: string) => boolean | undefined;
    /** Puts the song in the playlist (`on`) or takes it out. */
    set: (playlist: LibItem, track: string, on: boolean) => void;
    liked: (track: string) => boolean;
    setLiked: (track: string, on: boolean) => void;
  } = $props();

  let menu: HTMLDivElement;
  let track = $state("");
  let query = $state("");
  let at: HTMLElement | null = null;

  /** Opens the menu for `uri` at `el` (the button that was pressed); pressed again, it closes. */
  export function open(uri: string, el: HTMLElement) {
    if (menu.matches(":popover-open")) {
      menu.hidePopover();
      if (el === at) return;
    }
    at?.style.removeProperty("anchor-name");
    (at = el).style.setProperty("anchor-name", "--add-to");
    track = uri;
    query = "";
    menu.showPopover();
    menu.querySelector<HTMLElement>("input, button")?.focus();
  }

  const shown = $derived.by(() => {
    const q = query.trim().toLocaleLowerCase(L.locale);
    return q ? playlists.filter((p) => p.name.toLocaleLowerCase(L.locale).includes(q)) : playlists;
  });
  const isLiked = $derived(!!track && liked(track));

  // Arrows move between the rows (and the filter), as in Select.
  function key(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const all = [...menu.querySelectorAll<HTMLElement>("input, button:not(:disabled)")];
    const i = all.indexOf(document.activeElement as HTMLElement);
    all[(i + (e.key === "ArrowDown" ? 1 : -1) + all.length) % all.length]?.focus();
    e.preventDefault();
  }
  const pick = (go: () => void) => (menu.hidePopover(), go());
</script>

{#snippet check()}<svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="menu" popover="manual" use:dismiss={() => at} bind:this={menu} role="menu" tabindex="-1" aria-label={L.common.saveTo} onkeydown={key}>
  <!-- Liked songs is an action, named for what it does (as a menu command), not a row with a check. -->
  <button class="hl act" class:on={isLiked} role="menuitem" onclick={() => pick(() => setLiked(track, !isLiked))}>
    <span class="pic liked"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg></span>
    <span class="text"><span class="name">{isLiked ? L.common.unlike : L.common.like}</span><span class="line">{L.library.likedSongs}</span></span>
  </button>
  {#if playlists.length}
    <hr />
    {#if playlists.length > 8}
      <label class="find">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
        <input type="search" placeholder={L.common.findPlaylist} aria-label={L.common.findPlaylist} bind:value={query} />
      </label>
    {:else}
      <p class="t-label head">{L.common.addTo}</p>
    {/if}
    <div class="rows">
      {#each shown as p (p.uri)}
        {@const inside = has(p.uri, track) === true}
        <button class="hl" role="menuitemcheckbox" aria-checked={inside} title={inside ? L.common.removeFrom(p.name) : undefined} onclick={() => pick(() => set(p, track, !inside))}>
          <span class="pic">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
            {#if p.image}<img src={p.image} alt="" width="40" height="40" loading="lazy" />{/if}
          </span>
          <span class="text"><span class="name">{p.name}</span>{#if p.count != null}<span class="line">{L.common.songs(p.count)}</span>{/if}</span>
          {#if inside}{@render check()}{/if}
        </button>
      {:else}
        <p class="none">{L.common.notFound}</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* The global .menu under the button (above it when there's no room below, as at the player), its first cover in line
     with the button. Rows follow the library's hierarchy a step smaller (AGENTS.md "Hierarchy"): a cover 0.8 of
     --lib-art, the name --fs 500 --fg over its line --meta-fs --fg-3, the accent check where the song is. */
  .menu {
    position-anchor: --add-to;
    top: calc(anchor(bottom) + var(--sp-1));
    left: calc(anchor(left) - var(--sp-2));
    position-try-fallbacks: flip-block, flip-inline, flip-block flip-inline;
    width: calc(var(--tile-min) * 1.65);
    max-height: min(calc(var(--lib-row) * 8), 75vh);
    box-sizing: border-box;
    flex-direction: column;
  }
  .menu:popover-open { display: flex; }
  .menu button { flex: none; height: auto; gap: var(--sp-2); padding: var(--sp-1) var(--sp-2); color: var(--fg); }
  .rows { flex: 1; min-height: 0; overflow-y: auto; }
  hr { flex: none; height: 0.5px; margin: var(--sp-1) calc(var(--sp-1) * -1); border: 0; background: var(--border); }
  .head { flex: none; padding: var(--sp-2) var(--sp-2) var(--sp-1); }
  .find { flex: none; display: flex; align-items: center; gap: var(--sp-2); height: var(--ctl-h); margin: var(--sp-1) 0; padding: 0 var(--sp-2); border-radius: var(--r-2); background: var(--ctl); color: var(--fg-3); transition: background var(--m-2) var(--ease); }
  .find:focus-within { background: var(--ctl-hover); }
  .find svg { flex: none; width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  .find input { flex: 1; min-width: 0; height: 100%; padding: 0; border: none; background: none; color: var(--fg); font: inherit; font-size: var(--fs); outline: none; }
  .find input::placeholder { color: var(--fg-3); }
  .find input::-webkit-search-cancel-button { display: none; }
  /* A cover as in the library, or its placeholder (a note on a faint ground) under it until it loads. */
  .pic { position: relative; flex: none; display: grid; place-items: center; width: calc(var(--lib-art) * 0.8); height: calc(var(--lib-art) * 0.8); overflow: hidden; border-radius: var(--r-1); background: color-mix(in srgb, var(--fg) 5%, transparent); color: color-mix(in srgb, var(--fg) 30%, transparent); outline: 0.5px solid color-mix(in srgb, var(--fg) 10%, transparent); outline-offset: -0.5px; }
  .pic svg { width: 36%; height: 36%; fill: none; stroke: currentColor; stroke-width: 2; }
  .pic img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  /* Liked songs' cover as in the library: the accent heart on an accent tint (outlined while the song isn't in it). */
  .pic.liked { background: color-mix(in srgb, var(--accent) 18%, transparent); color: var(--accent); outline: none; }
  .pic.liked svg { width: 42%; height: 42%; stroke-width: 2; stroke-linejoin: round; }
  .act.on .pic.liked svg { fill: currentColor; }
  .text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: var(--sp-0); }
  .name, .line { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; line-height: 1.3; }
  .name { font-size: var(--fs); font-weight: 500; color: var(--fg); }
  .line { font-size: var(--meta-fs); font-weight: 400; color: var(--fg-3); font-variant-numeric: tabular-nums; }
  .check { flex: none; width: 14px; height: 14px; fill: none; stroke: var(--accent); stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; }
  .none { margin: 0; padding: var(--sp-2); color: var(--fg-3); font-size: var(--meta-fs); }
</style>
