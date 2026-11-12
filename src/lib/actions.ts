// Small versions of the app's motion.svelte.ts actions, enough for the preview.

/** A line too long for its box glides to its end and back while `on` (.marquee in app-tokens.css). */
export function marquee(node: HTMLElement, on: boolean) {
  const fit = () => {
    const inner = node.firstElementChild as HTMLElement | null;
    const d = inner ? inner.scrollWidth - node.clientWidth : 0;
    node.style.setProperty("--mq", `${-Math.max(0, d)}px`);
    node.style.setProperty("--mq-n", String(Math.max(4, d / 13)));
    node.classList.toggle("mq-on", on && d > 1);
  };
  fit();
  // A new line (the next track) or a new width measures again.
  const ro = new ResizeObserver(fit);
  ro.observe(node);
  if (node.firstElementChild) ro.observe(node.firstElementChild);
  const mo = new MutationObserver(fit);
  mo.observe(node, { characterData: true, childList: true, subtree: true });
  return { update: (v: boolean) => ((on = v), fit()), destroy: () => (ro.disconnect(), mo.disconnect()) };
}

/** The .seg's accent bar under the chosen option: placed without motion first, then it glides. */
export function underline(node: HTMLElement, i: number) {
  const place = () => {
    const b = node.querySelectorAll("button")[i] as HTMLElement | undefined;
    if (!b) return;
    node.style.setProperty("--x", `${b.offsetLeft}px`);
    node.style.setProperty("--w", String(b.offsetWidth / 100));
  };
  place();
  requestAnimationFrame(() => (node.dataset.ready = ""));
  const ro = new ResizeObserver(place);
  ro.observe(node);
  return { update: (v: number) => ((i = v), place()), destroy: () => ro.disconnect() };
}
