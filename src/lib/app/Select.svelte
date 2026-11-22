<script lang="ts" generics="T">
  /** The app's one select (AGENTS.md › Controls): a --ctl well showing the chosen name, and a .menu popover anchored
   *  under its right edge with every option, the chosen one checked. Focus stays on the trigger (combobox with
   *  aria-activedescendant); arrows and Home/End move, Enter/Space pick, Esc and Tab close, typing jumps to a name.
   *  With `search` (a long list, e.g. fonts) the menu drops below the trigger instead, a search field on top (focus
   *  goes there) over at most ten rows that scroll. */
  import { L } from "./i18n";
  let {
    id,
    value,
    options,
    onchange,
    label,
    search = false,
  }: {
    id?: string;
    value: T;
    /** `detail`: a quiet second fact beside the name in the menu (e.g. a bitrate); the trigger shows the name only. */
    options: { value: T; name: string; detail?: string }[];
    onchange: (v: T) => void;
    /** Accessible name when no <label for={id}> names it. */
    label?: string;
    search?: boolean;
  } = $props();

  const uid = $props.id();
  let btn: HTMLButtonElement;
  let menu: HTMLElement;
  let field = $state<HTMLInputElement>();
  let open = $state(false);
  let q = $state("");
  /** The rows in the menu: every option, or while searching those whose name holds the words. */
  const list = $derived.by(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.name.toLowerCase().includes(t)) : options;
  });
  /** The row under the pointer or the arrows. */
  let active = $state(0);
  const at = $derived(list.findIndex((o) => o.value === value));
  const chosen = $derived(options.find((o) => o.value === value) ?? options[0]);

  function choose(i: number) {
    menu.hidePopover();
    btn.focus();
    if (list[i] && list[i].value !== value) onchange(list[i].value);
  }
  function key(e: KeyboardEvent) {
    const n = list.length;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) (e.preventDefault(), menu.showPopover());
      return;
    }
    const to = { ArrowDown: active + 1, ArrowUp: active - 1, ...(!search && { Home: 0, End: n - 1 }) }[e.key];
    if (to !== undefined) (e.preventDefault(), n && reveal((to + n) % n));
    // In the field a space is a letter.
    else if (e.key === "Enter" || (e.key === " " && !search)) (e.preventDefault(), choose(active));
    // Closes the menu only, not the sheet it sits in.
    else if (e.key === "Escape") (e.preventDefault(), e.stopPropagation(), menu.hidePopover(), btn.focus());
    else if (e.key === "Tab") (search && e.preventDefault(), menu.hidePopover(), search && btn.focus());
    else if (!search && e.key.length === 1 && !e.metaKey && !e.ctrlKey) seek(e);
  }
  function reveal(i: number) {
    active = i;
    menu.querySelector(`#${CSS.escape(`${uid}-${i}`)}`)?.scrollIntoView({ block: "nearest" });
  }
  // Typing jumps to the first option whose name starts with what was typed in the last second, like a native pop-up.
  let typed = "";
  let typedAt = 0;
  function seek(e: KeyboardEvent) {
    typed = (e.timeStamp - typedAt < 1000 ? typed : "") + e.key.toLowerCase();
    typedAt = e.timeStamp;
    const i = list.findIndex((o) => o.name.toLowerCase().startsWith(typed));
    if (i >= 0) reveal(i);
  }
  function toggled(e: ToggleEvent) {
    open = e.newState === "open";
    if (!open) return void (q = "");
    active = Math.max(0, at);
    menu.querySelector<HTMLElement>(`[aria-selected="true"]`)?.scrollIntoView({ block: search ? "center" : "nearest" });
    field?.focus();
  }
  function typing() {
    active = 0;
    menu.querySelector(".rows")?.scrollTo({ top: 0 });
  }
</script>

<button
  {id} bind:this={btn} class="pick" type="button" role="combobox" aria-label={label} aria-haspopup="listbox" aria-expanded={open}
  aria-controls="{uid}-rows" aria-activedescendant={open && !search ? `${uid}-${active}` : undefined}
  popovertarget="{uid}-list" style:anchor-name="--{uid}" onkeydown={key}
>
  <span class="value">{chosen?.name}</span>
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4" /></svg>
</button>
<div id="{uid}-list" class="menu" class:below={search} popover bind:this={menu} ontoggle={toggled} style:position-anchor="--{uid}" style:--at={Math.max(0, at)}>
  {#if search}
    <label class="find">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.5-4.5" /></svg>
      <input
        bind:this={field} bind:value={q} type="search" placeholder={L.common.search} aria-label={label ?? L.common.search} spellcheck="false" autocomplete="off"
        role="combobox" aria-expanded="true" aria-controls="{uid}-rows" aria-activedescendant={list.length ? `${uid}-${active}` : undefined}
        oninput={typing} onkeydown={key}
      />
    </label>
  {/if}
  <div id="{uid}-rows" class="rows" role="listbox" aria-label={label}>
    {#each list as o, i}
      <button
        id="{uid}-{i}" type="button" role="option" tabindex="-1" aria-selected={i === at} class:on={i === active}
        onpointermove={() => (active = i)} onclick={() => choose(i)}
      >
        <span class="name">{o.name}</span>
        {#if o.detail}<span class="detail">{o.detail}</span>{/if}
        <svg class="check" viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      </button>
    {:else}
      <p class="none">{L.settings.nothing}</p>
    {/each}
  </div>
</div>

<style>
  /* The trigger: a --ctl well, the name in --fg 500, an up/down glyph in --fg-3 (it opens a list,
     not a page). Hover and open deepen the well; pressed is --press. */
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

  /* Opens like a native pop-up menu: the chosen row lands exactly over the trigger (rows are --ctl-h, the trigger's
     height, --sp-0 apart, so row `--at` sits --at rows and gaps below the menu's inset), right edges flush, so the check takes the glyph's
     place and the menu grows to the left; it never goes above the window's top and scrolls past its height. */
  .menu {
    top: max(var(--sp-2), calc(anchor(top) - var(--sp-1) - var(--at) * (var(--ctl-h) + var(--sp-0))));
    right: calc(anchor(right) - var(--sp-1));
    min-width: calc(anchor-size(width) + 2 * var(--sp-1));
    max-height: calc(100vh - 2 * var(--sp-2));
    box-sizing: border-box;
    overflow-y: auto;
    transform-origin: right calc(var(--sp-1) + var(--at) * (var(--ctl-h) + var(--sp-0)) + 0.5 * var(--ctl-h));
  }
  /* With `search`: below the trigger, right edges flush (above it when there's no room), a fixed width so filtering
     doesn't resize it; the field, a hairline, then at most ten rows that scroll. */
  .menu.below {
    top: calc(anchor(bottom) + var(--sp-1));
    right: anchor(right);
    width: max(anchor-size(width), var(--pick-w));
    max-height: none;
    overflow: hidden;
    position-try-fallbacks: flip-block;
    transform-origin: top right;
  }
  .below .rows { max-height: calc(10 * var(--ctl-h) + 9 * var(--sp-0)); overflow-y: auto; }
  .find { display: flex; align-items: center; gap: var(--sp-2); height: var(--ctl-h); padding: 0 var(--sp-2); margin-bottom: var(--sp-1); border-bottom: 1px solid var(--border); color: var(--fg-3); }
  .find svg { flex: none; width: 14px; height: 14px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; }
  .find input { flex: 1; min-width: 0; height: 100%; padding: 0; border: none; background: none; color: var(--fg); font: inherit; outline: none; }
  .find input::placeholder { color: var(--fg-3); }
  .find input::-webkit-search-cancel-button { display: none; }
  .none { margin: 0; padding: 0 var(--sp-2); line-height: var(--ctl-h); color: var(--fg-3); }
  .menu button { height: var(--ctl-h); gap: var(--sp-2); padding: 0 var(--sp-2) 0 var(--sp-3); font-variant-numeric: tabular-nums; }
  .menu button.on { background: var(--hover); color: var(--fg); }
  .name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .detail { flex: none; margin-left: var(--sp-4); color: var(--fg-3); font-size: var(--meta-fs); font-weight: 400; }
  .check { flex: none; width: 14px; height: 14px; fill: none; stroke: var(--accent); stroke-width: 2.25; stroke-linecap: round; stroke-linejoin: round; visibility: hidden; }
  [aria-selected="true"] .check { visibility: visible; }
</style>
