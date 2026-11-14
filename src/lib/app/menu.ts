/** A hand-dismissed menu (`popover="manual"` + `use:dismiss`), as a native one (AGENTS.md › Interaction › Menus): while
 *  it is open the window under it is inert (`html.menu-open`), a press outside only closes it (what was under the
 *  pointer gets neither the press nor its click), Esc closes it and gives focus back to `keep`, and so does the window
 *  losing focus. A press on `keep` (the button that opens it) is left to that button. WebKit's own light dismiss
 *  swallows nothing, so a press meant to close the menu also landed on the page. */
export function dismiss(menu: HTMLElement, keep?: () => HTMLElement | null | undefined) {
  const close = () => menu.matches(":popover-open") && menu.hidePopover();
  const swallow = (c: Event) => (c.preventDefault(), c.stopPropagation());
  function outside(e: PointerEvent) {
    const t = e.target as Node;
    if (menu.contains(t) || keep?.()?.contains(t)) return;
    swallow(e);
    close();
    addEventListener("click", swallow, { capture: true, once: true });
    addEventListener("pointerup", () => setTimeout(() => removeEventListener("click", swallow, true)), { capture: true, once: true });
  }
  function esc(e: KeyboardEvent) {
    if (e.key !== "Escape") return;
    swallow(e);
    close();
    keep?.()?.focus();
  }
  function listen(on: boolean) {
    document.documentElement.classList.toggle("menu-open", on);
    const f = (on ? addEventListener : removeEventListener).bind(window);
    f("pointerdown", outside as EventListener, true);
    f("contextmenu", outside as EventListener, true);
    f("keydown", esc as EventListener, true);
    f("blur", close);
  }
  const toggled = (e: Event) => listen((e as ToggleEvent).newState === "open");
  menu.addEventListener("toggle", toggled);
  return { update: (k: typeof keep) => void (keep = k), destroy: () => (menu.removeEventListener("toggle", toggled), listen(false)) };
}
