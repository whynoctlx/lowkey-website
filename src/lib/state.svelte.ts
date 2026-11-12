import { SvelteSet } from "svelte/reactivity";
import { get, type Track } from "./data";

/** The preview's player: a pretend playback that only counts time while playing. */
export const p = $state({
  queue: get("late-night-drive").tracks as Track[],
  i: 0,
  /** The item the queue came from (lights its tile and row). */
  from: "late-night-drive",
  playing: false,
  pos: 48,
  shuffle: false,
  repeat: "off" as "off" | "all" | "track",
  volume: 0.7,
  recent: ["late-night-drive", "paper-moons", "mira-vale", "deep-focus"] as string[],
});
export const liked = new SvelteSet<string>(["signal-noise-1", "paper-moons-2", "glasshouse-2", "small-hours-4", "ember-ash-1"]);

export const track = () => p.queue[p.i];

export function playFrom(from: string, queue: Track[], i = 0) {
  if (p.from === from && p.queue[i]?.id === track()?.id) return void (p.playing = !p.playing);
  Object.assign(p, { from, queue, i, pos: 0, playing: true });
  p.recent = [from, ...p.recent.filter((r) => r !== from)].slice(0, 8);
}
/** A tile's play: plays the item, or pauses/resumes it when it already plays. */
export const playItem = (id: string) => (p.from === id ? (p.playing = !p.playing) : playFrom(id, get(id).tracks));

export function step(d: 1 | -1) {
  if (d < 0 && p.pos > 3) return void (p.pos = 0);
  const n = p.shuffle && d > 0 ? Math.floor(Math.random() * p.queue.length) : p.i + d;
  if (n >= p.queue.length && p.repeat === "off") return void Object.assign(p, { playing: false, pos: 0 });
  Object.assign(p, { i: (n + p.queue.length) % p.queue.length, pos: 0 });
}

/** The site's own settings (the app's Settings › Appearance, in small). */
export const tune = $state({
  theme: "system" as "system" | "light" | "dark",
  /** "cover" follows the playing cover's colour, as the app's From cover. */
  accent: "cover",
  density: "regular" as "compact" | "regular" | "spacious",
  motion: 200,
  contrast: 0,
});
