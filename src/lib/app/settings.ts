/** The app's `remember` (src/lib/settings.ts) without the mirror to Rust: the demo keeps conveniences in localStorage only. */
export function remember(k: string, v: string | null) {
  try {
    if (v == null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {}
}
