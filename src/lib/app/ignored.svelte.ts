import { remember } from "./settings";
import type { Ignored } from "./ignored";

/** The ignored artists (Settings › Ignored, an artist's page): read from localStorage for the first frame, kept
 *  there (the demo has no Rust side). */
const read = (raw: string | null): Ignored => {
  try {
    const v = JSON.parse(raw ?? "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
let stored: string | null = null;
try {
  stored = localStorage.getItem("ignored");
} catch {}
let pick = true;
try {
  pick = localStorage.getItem("ignored-pick") !== "off";
} catch {}
/** `pick`: a song of theirs picked itself (clicked) still plays (Settings › Ignored, a setting in `KEEP`). */
export const ignored = $state<{ by: Ignored; pick: boolean }>({ by: read(stored), pick });

export function setIgnoredPick(on: boolean) {
  ignored.pick = on;
  remember("ignored-pick", on ? "on" : "off");
}

/** Ignores an artist (`any`: also the songs they only appear on), or with null lets them play again. */
export function setIgnored(uri: string, v: Ignored[string] | null) {
  const { [uri]: _, ...rest } = ignored.by;
  ignored.by = v ? { ...ignored.by, [uri]: v } : rest;
  const raw = JSON.stringify(ignored.by);
  remember("ignored", raw);
}
