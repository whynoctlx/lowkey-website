// The demo's library: real albums by real artists (pop, drum and bass, rap), each cut to its six most played tracks.
// Covers, artist photos and lengths come from Deezer's public API (catalog.json, made by a one-off script); the
// mixes and playlists are made up from them, in Spotify's style. Nothing plays.
import catalog from "./catalog.json";

export type Track = { name: string; dur: number; explicit: boolean; album: Album };
export type Album = {
  id: string;
  kind: "Album" | "Playlist";
  name: string;
  by: string;
  /** Who else the album is by (a joint album), named after `by`. */
  with?: string[];
  /** A single: on Release Radar, not in the listener's library. */
  single?: boolean;
  year?: number;
  /** Album art and the artist's photo (Deezer's CDN); playlists a mosaic (h, h2, art draw a fallback). */
  cover?: string;
  artistImage?: string;
  genre?: string;
  /** A playlist's line under its name (who is on it); an album's is `by`. */
  desc?: string;
  h: number;
  h2: number;
  art: number;
  tracks: Track[];
};

const MOSAIC = import.meta.glob<string>("./mixes/*.jpg", { eager: true, query: "?url", import: "default" });
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const GENRE: Record<string, string> = { pop: "Pop", dnb: "Drum and bass", rap: "Hip-hop", rock: "Rock" };

export const albums: Album[] = catalog.map((c) => {
  const a: Album = { id: (c as { id?: string }).id ?? slug(c.by), kind: "Album", name: c.name, by: c.by, with: (c as { with?: string[] }).with, single: (c as { single?: boolean }).single, year: c.year, cover: c.cover, artistImage: c.artistImage, genre: GENRE[c.genre], h: 0, h2: 0, art: 0, tracks: [] };
  a.tracks = c.tracks.map((t) => ({ ...t, album: a }));
  return a;
});

const byId = new Map(albums.map((a) => [a.id, a]));
const pick = (...refs: string[]) => refs.map((r) => { const [id, i] = r.split(":"); return byId.get(id)!.tracks[+i]; });
const list = (id: string, name: string, h: number, h2: number, art: number, tracks: Track[], by = "You", desc?: string): Album =>
  // Spotify's 2×2 mosaic, of the first four artists' photos (mixes/*.jpg, composed once by a script).
  ({ id, kind: "Playlist", name, by, h, h2, art, tracks, desc, cover: MOSAIC[`./mixes/${id}.jpg`] });
/** A mix made for the listener: its line names who is on it. */
const mix = (id: string, name: string, h: number, h2: number, art: number, refs: string[]) => {
  const tracks = pick(...refs);
  const who = [...new Set(tracks.map((t) => t.album.by))];
  return list(id, name, h, h2, art, tracks, "Spotify", `${who.slice(0, 3).join(", ")}${who.length > 3 ? " and more" : ""}`);
};

export const playlists: Album[] = [
  list("late-night", "Late Night Drive", 248, 318, 0, pick("redzed-junkie:2", "corpse-hot-demon:0", "scarlxrd:2", "pil-c:1", "chase-status:3", "redzed-noise:0")),
  list("gym", "Gym", 10, 30, 2, pick("unaverage-gang:2", "scarlxrd:0", "chase-status:0", "bring-me-the-horizon:2", "pendulum:3", "redzed:1", "corpse-code-mistake:0")),
  list("sunday", "Sunday Slow", 36, 52, 1, pick("pil-c:2", "bring-me-the-horizon:4", "redzed:3", "luca-brassi10x:3", "post-malone:5", "separ:2")),
  list("summer", "Summer '25", 330, 40, 4, pick("chase-status:1", "pil-c:0", "redzed-junkie:0", "corpse-egirls:0", "rudimental:0", "dua-lipa:0")),
  list("heavy", "Heavy Rotation", 0, 340, 2, pick("bring-me-the-horizon:0", "scarlxrd:1", "unaverage-gang:0", "corpse-code-mistake:0", "bring-me-the-horizon:3", "scarlxrd:3", "unaverage-gang:4")),
  list("night-shift", "Night Shift", 270, 250, 3, pick("redzed-noise:1", "pil-c:3", "scarlxrd:4", "corpse-egirls:0", "unaverage-gang:1", "chase-status:4", "redzed-junkie:4")),
];

export const mixes: Album[] = [
  mix("daily-1", "Daily Mix 1", 330, 290, 1, ["taylor-swift:2", "redzed:1", "187-strassenbande:1", "chappell-roan:3", "billie-eilish:2", "ariana-grande:5"]),
  mix("daily-2", "Daily Mix 2", 160, 200, 4, ["sub-focus:0", "netsky:1", "wilkinson:3", "rudimental:0", "camo-krooked:0", "dimension:0"]),
  mix("daily-3", "Daily Mix 3", 20, 50, 2, ["kendrick-lamar:3", "drake:3", "j-cole:3", "travis-scott:1", "dave:2", "central-cee:1"]),
  mix("daily-4", "Daily Mix 4", 250, 210, 0, ["redzed-junkie:4", "post-malone:2", "doja-cat:5", "dua-lipa:2", "gzuz:1", "bonez-mc:1"]),
  mix("discover", "Discover Weekly", 250, 300, 2, ["dave:1", "dimension:2", "chappell-roan:0", "camo-krooked:1", "redzed-noise:5", "redzed:3", "wilkinson:0"]),
  mix("release-radar", "Release Radar", 160, 40, 1, ["sawsane:0", "billie-eilish:3", "ariana-grande:3", "redzed:4", "chappell-roan:5", "187-strassenbande:0", "dimension:5"]),
  mix("pop-mix", "Pop Mix", 320, 350, 0, ["dua-lipa:1", "ariana-grande:0", "taylor-swift:0", "chappell-roan:0", "taylor-swift:1", "billie-eilish:0"]),
  mix("dnb-mix", "Drum & Bass Mix", 190, 140, 3, ["pendulum:0", "chase-status:2", "sub-focus:2", "netsky:0", "wilkinson:2", "camo-krooked:3"]),
  mix("rap-mix", "Hip Hop Mix", 40, 10, 4, ["kendrick-lamar:0", "travis-scott:0", "redzed-noise:0", "drake:1", "doja-cat:0", "central-cee:0"]),
  mix("top-2025", "Your Top Songs 2025", 300, 200, 4, ["chappell-roan:5", "billie-eilish:2", "redzed:1", "kendrick-lamar:3", "sub-focus:0", "redzed-junkie:2", "redzed-noise:0"]),
  mix("time-capsule", "Time Capsule", 35, 15, 1, ["eminem:0", "pendulum:1", "bonez-mc:1", "chase-status:0", "drake:1", "netsky:1"]),
  mix("repeat-rewind", "Repeat Rewind", 270, 310, 3, ["187-strassenbande:1", "taylor-swift:2", "j-cole:3", "rudimental:1", "post-malone:5"]),
  // A Slovak rap mix: the author's nod to home.
  mix("daily-5", "Daily Mix 5", 0, 20, 2, ["pil-c:0", "luca-brassi10x:2", "separ:1", "central-cee:2", "pil-c:3", "luca-brassi10x:4"]),
];

for (const p of [...playlists, ...mixes]) byId.set(p.id, p);
export const get = (id: string) => byId.get(id)!;
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
