<script lang="ts" generics="T">
  /** Several on/off choices of one kind (AGENTS.md › Controls): the Select's --ctl well summing up what is checked
   *  ("4 of 12 on") and a .menu of checkable rows under it. A pick toggles its row and the menu stays open; it closes on a
   *  press outside, Esc (focus back on the trigger) or the trigger again (`popover="manual"` + `dismiss`). Arrows,
   *  Home/End move between the rows. */
  import { dismiss } from "./menu";

  let {
    id,
    checked,
    options,
    summary,
    toggle,
    label,
  }: {
    id?: string;
    /** The values checked now. */
    checked: T[];
    options: { value: T; name: string }[];
    /** The trigger's text, e.g. "4 of 12 on". */
    summary: string;
    toggle: (v: T) => void;
    /** Accessible name when no <label for={id}> names it. */
    label?: string;
  } = $props();

  const uid = $props.id();
  let btn: HTMLButtonElement;
  let menu: HTMLElement;
  let open = $state(false);

  const rows = () => [...menu.querySelectorAll<HTMLElement>("button")];
  function key(e: KeyboardEvent) {
    const all = rows();
    const i = all.indexOf(document.activeElement as HTMLElement);
    const to = { ArrowDown: i + 1, ArrowUp: i - 1, Home: 0, End: all.length - 1 }[e.key];
    if (to === undefined) return;
    e.preventDefault();
    all[(to + all.length) % all.length]?.focus();
  }
  function toggled(e: ToggleEvent) {
    open = e.newState === "open";
    if (open) rows()[0]?.focus();
  }
</script>

<button
  {id} bind:this={btn} class="pick" type="button" aria-label={label} aria-haspopup="menu" aria-expanded={open}
  aria-controls="{uid}-list" style:anchor-name="--{uid}" onclick={() => menu.togglePopover()}
  onkeydown={(e) => e.key === "ArrowDown" && !open && (e.preventDefault(), menu.showPopover())}
>
  <span class="value">{summary}</span>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" /></svg>
</button>
<div
  id="{uid}-list" class="menu" popover="manual" role="menu" tabindex="-1" aria-label={label} use:dismiss={() => btn}
  bind:this={menu} ontoggle={toggled} onkeydown={key} style:position-anchor="--{uid}"
>
  {#each options as o (o.value)}
    {@const on = checked.includes(o.value)}
    <button type="button" class="hl" role="menuitemcheckbox" aria-checked={on} onclick={() => toggle(o.value)}>
      <span class="name">{o.name}</span>
      <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
    </button>
  {/each}
</div>

<style>
  /* The trigger: the Select's well (Select.svelte), the summary in --fg 500, an up/down glyph in --fg-3. */
  .pick {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--sp-3);
    min-width: 120px;
    height: var(--ctl-h);
    padding: 0 var(--sp-2) 0 var(--sp-3);
    box-sizing: border-box;
    border: none;
    border-radius: var(--r-2);
    background: var(--ctl);
    color: var(--fg);
    font: inherit;
    font-weight: 500;
    white-space: nowrap;
    transition: background var(--m-5) var(--ease);
  }
  .pick:hover, .pick[aria-expanded="true"] { background: var(--ctl-hover); transition-duration: var(--m-1); }
  .pick:active { background: var(--press); }
  .pick:focus { outline: none; }
  .pick:focus-visible { outline: 2px solid color-mix(in srgb, var(--accent) 60%, transparent); outline-offset: 1px; }
  .value { font-variant-numeric: tabular-nums; }
  .pick svg { flex: none; width: 14px; height: 14px; color: var(--fg-3); fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: color var(--m-3) var(--ease); }
  .pick:hover svg, .pick[aria-expanded="true"] svg { color: var(--fg-2); }

  /* Under the trigger, right edges flush (above it when there is no room), at least as wide, scrolling past its height. */
  .menu {
    top: calc(anchor(bottom) + var(--sp-1));
    right: calc(anchor(right) - var(--sp-1));
    position-try-fallbacks: flip-block;
    min-width: calc(anchor-size(width) + 2 * var(--sp-1));
    max-width: calc(var(--ask-w) * 0.9);
    max-height: min(calc(var(--ctl-h) * 12), 60vh);
    box-sizing: border-box;
    overflow-y: auto;
    transform-origin: top right;
  }
  .menu button { height: var(--ctl-h); gap: var(--sp-2); padding: 0 var(--sp-2) 0 var(--sp-3); }
  .menu button:hover, .menu button:focus-visible { background: var(--hover); color: var(--fg); outline: none; }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .check { flex: none; width: 14px; height: 14px; fill: none; stroke: var(--accent); stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; visibility: hidden; }
  [aria-checked="true"] .check { visibility: visible; }
</style>
