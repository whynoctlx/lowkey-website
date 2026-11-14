// The demo's data in the app's own shapes (Library, Home, Playlist, Search), from music.ts. Every cover is drawn here as
// an SVG, like the sleeves Cover.svelte drew.
import { albums, mixes, playlists, type Album, type Track as DemoTrack } from "../music";
import type { Lib, LibItem, Row } from "./Library.svelte";
import type { Track, Info } from "./Playlist.svelte";
import type { HomeFeed } from "./Home.svelte";
import type { Results } from "./Search.svelte";

const svg = (body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${body}</svg>`)}`;
const hsl = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

/** A sleeve: a horizon, a pale disc, a shore (the five drawings Cover.svelte had). */
function art(h: number, h2: number, kind: number) {
  const lin = (id: string, stops: [number, string][], y2 = 1, x2 = 0) =>
    `<linearGradient id="${id}" x2="${x2}" y2="${y2}">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
  switch (kind) {
    case 0:
      return svg(`<defs>${lin("a", [[0, hsl(h, 22, 82)], [1, hsl(h, 20, 70)]])}${lin("b", [[0, hsl(h2, 22, 46)], [1, hsl(h2, 26, 30)]])}</defs><rect width="100" height="56" fill="url(#a)"/><rect y="56" width="100" height="44" fill="url(#b)"/>`);
    case 1:
      return svg(`<defs>${lin("a", [[0, hsl(h, 20, 72)], [1, hsl(h, 26, 42)]])}<radialGradient id="d" cx=".62" cy=".38" r=".42"><stop offset=".26" stop-color="${hsl(h2, 45, 88)}"/><stop offset=".43" stop-color="${hsl(h2, 30, 75)}" stop-opacity=".5"/><stop offset="1" stop-color="${hsl(h2, 30, 75)}" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="url(#a)"/><rect width="100" height="100" fill="url(#d)"/>`);
    case 2:
      return svg(`<defs>${lin("a", [[0, hsl(h, 24, 30)], [1, hsl(h, 30, 16)]], 1, 0.18)}</defs><rect width="100" height="100" fill="url(#a)"/><rect x="58" width="3" height="100" fill="${hsl(h2, 30, 30)}" fill-opacity=".55"/>`);
    case 3:
      return svg(`<rect width="100" height="100" fill="${hsl(h, 16, 88)}"/><path d="M0 62 100 32V100H0Z" fill="${hsl(h2, 18, 52)}"/>`);
    default:
      return svg(`<defs>${lin("a", [[0, hsl(h, 24, 64)], [1, hsl(h, 22, 48)]])}<radialGradient id="g" cx=".3" cy="1.1" r=".8"><stop offset="0" stop-color="${hsl(h2, 40, 40)}"/><stop offset="1" stop-color="${hsl(h2, 40, 40)}" stop-opacity="0"/></radialGradient></defs><rect width="100" height="100" fill="url(#a)"/><rect width="100" height="100" fill="url(#g)"/>`);
  }
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const uriOf = (a: Album) => (a.kind === "Album" ? `spotify:album:${a.id}` : `spotify:playlist:${a.id}`);
export const artistUri = (name: string) => `spotify:artist:${slug(name)}`;
const allBy = (a: Album) => [a.by, ...(a.with ?? [])];
const cover = new Map<Album, string>();
const coverOf = (a: Album) => a.cover ?? cover.get(a) ?? (cover.set(a, art(a.h, a.h2, a.art)), cover.get(a)!);
const trackUri = (t: DemoTrack) => `spotify:track:${t.album.id}-${t.album.tracks.indexOf(t)}`;

/** Every track by its uri, in the app's Track shape. */
export const tracks = new Map<string, Track>();
for (const a of albums)
  a.tracks.forEach((t, i) =>
    tracks.set(trackUri(t), {
      uri: trackUri(t), name: t.name, artists: allBy(a).map((n) => ({ name: n, uri: artistUri(n) })), album: a.name, album_uri: uriOf(a),
      image: coverOf(a), duration_ms: t.dur * 1000, explicit: t.explicit, number: i + 1, disc: 1, year: a.year,
    }),
  );
const listOf = (a: Album, added = Date.now()) =>
  a.tracks.map((t, i) => ({ ...tracks.get(trackUri(t))!, ...(a.kind === "Playlist" ? { added_at: added - (i + 1) * 86400e3 * 3, added_by: "You" } : {}) }));

const names = [...new Set(albums.map((a) => a.by))];
const artistOf = (n: string) => albums.find((x) => x.by === n)!;
const artistArt = new Map(names.map((n) => [n, artistOf(n).artistImage]));

const item = (a: Album): LibItem => ({ uri: uriOf(a), name: a.name, image: coverOf(a), sub: a.desc ?? allBy(a).join(", "), count: a.tracks.length, editable: a.by === "You" });
const artistItem = (n: string): LibItem => ({ uri: artistUri(n), name: n, image: artistArt.get(n) });

const likedTracks = [...tracks.values()].filter((_, i) => i % 3 === 0).map((t, i) => ({ ...t, added_at: Date.now() - i * 86400e3 * 2 }));
export const LIKED = "spotify:user:demo:collection";

export const lib: Lib = {
  liked: { uri: LIKED, count: likedTracks.length, uris: likedTracks.map((t) => t.uri) },
  playlists: [...playlists, ...mixes.slice(0, 9)].map(item),
  albums: albums.filter((a) => !a.single).map(item),
  artists: names.filter((n) => albums.some((a) => a.by === n && !a.single)).map(artistItem),
};

type Card = LibItem & { kind: "playlists" | "albums" | "artists" };
const card = (a: Album): Card => ({ ...item(a), kind: a.kind === "Album" ? "albums" : "playlists" });
const al = (id: string) => albums.find((a) => a.id === id)!;
const mx = (id: string) => mixes.find((a) => a.id === id)!;
const artistCards = (ns: string[]) => [...new Set(ns)].map((n) => ({ ...artistItem(n), kind: "artists" as const }));
// Curated keeps the listener's own shelves (made for you, recently, your…); the rest shows in the full feed only.
const of = (genre: string) => names.filter((n) => artistOf(n).genre === genre);
export const feed: HomeFeed = {
  greeting: null,
  sections: [
    { title: null, shortcuts: true, items: [mx("daily-1"), mx("discover"), playlists[0], al("gzuz"), mx("dnb-mix"), mx("release-radar"), al("kendrick-lamar"), playlists[1]].map(card) },
    { title: "Made for you", shortcuts: false, items: ["daily-5", "discover", "release-radar", "daily-1", "daily-2", "daily-3", "daily-4"].map((id) => card(mx(id))) },
    { title: "Recently played", shortcuts: false, items: [al("luca-brassi10x"), playlists[0], al("pil-c"), al("separ"), al("187-strassenbande"), al("redzed"), al("sub-focus"), mx("daily-3"), al("redzed-junkie"), playlists[3], al("redzed-noise"), al("pendulum")].map(card) },
    { title: "Your top mixes", shortcuts: false, items: ["pop-mix", "dnb-mix", "rap-mix", "daily-1", "daily-2"].map((id) => card(mx(id))) },
    { title: "Your top albums", shortcuts: false, items: ["pil-c", "bonez-mc", "billie-eilish", "redzed-junkie", "chappell-roan", "sub-focus", "kendrick-lamar", "dua-lipa", "travis-scott", "netsky"].map((id) => card(al(id))) },
    { title: "Jump back in", shortcuts: false, items: ["eminem", "pendulum", "bonez-mc", "drake", "chase-status", "j-cole", "rudimental"].map((id) => card(al(id))) },
    { title: "Popular pop albums", shortcuts: false, items: albums.filter((a) => a.genre === "Pop").map(card) },
    { title: "Drum and bass", shortcuts: false, items: albums.filter((a) => a.genre === "Drum and bass").map(card) },
    { title: "Hip-hop right now", shortcuts: false, items: albums.filter((a) => a.genre === "Hip-hop").map(card) },
    { title: "More like Sub Focus", shortcuts: false, items: artistCards(of("Drum and bass").filter((n) => n !== "Sub Focus")) },
    { title: "Throwbacks", shortcuts: false, items: ["time-capsule", "repeat-rewind", "top-2025"].map((id) => card(mx(id))) },
    { title: "Popular artists", shortcuts: false, items: artistCards(["Taylor Swift", "Kendrick Lamar", "Billie Eilish", "Drake", "Redzed", "Redzed", "Travis Scott", "Dua Lipa"]) },
    { title: "Your favourite artists", shortcuts: false, items: artistCards(["Gzuz", "Bonez MC", "187 Strassenbande", "Chappell Roan", "Sub Focus", "Billie Eilish", "Kendrick Lamar", "Dua Lipa"]) },
  ],
};

/** The sidebar's Recently played at the start: a nod to home, Slovak rap (the author is Slovak). */
export const played: Track[] = ["separ-0", "luca-brassi10x-1", "luca-brassi10x-0"].map((id, i) => ({ ...tracks.get(`spotify:track:${id}`)!, added_at: Date.now() - (i + 1) * 3600e3 }));

/** What opening an item loads (the app's `library_tracks`). */
export function itemData(uri: string): { tracks: Track[]; info: Info } {
  if (uri === LIKED) return { tracks: likedTracks, info: {} };
  const a = [...albums, ...playlists, ...mixes].find((x) => uriOf(x) === uri);
  if (a) return a.kind === "Album"
    ? { tracks: listOf(a), info: { album_type: a.single ? "SINGLE" : "album", date: { year: a.year } } }
    : { tracks: listOf(a), info: { description: a.desc ?? "Made up for the demo." } };
  const n = names.find((x) => artistUri(x) === uri);
  if (!n) return { tracks: [], info: {} };
  const own = albums.filter((x) => allBy(x).includes(n));
  const row = (x: Album): Row => ({ ...item(x), kind: "albums", line: `Album · ${x.year}` });
  return {
    tracks: own.flatMap((x) => listOf(x)).slice(0, 10),
    info: {
      image: artistArt.get(n), bio: null, genres: [artistOf(n).genre!],
      sections: [
        { key: "albums", title: "Albums", rows: own.map(row) },
        { key: "related", title: "Fans also like", rows: of(artistOf(n).genre!).filter((x) => x !== n).slice(0, 6).map((x) => ({ ...artistItem(x), kind: "artists", line: "Artist" })) },
      ],
    },
  };
}

/** The tracks a play of `uri` runs through: an item's list, or the album a single track is on. */
export function queueOf(uri: string): Track[] {
  if (uri.startsWith("spotify:track:")) {
    const t = tracks.get(uri)!;
    return itemData(t.album_uri!).tracks;
  }
  return itemData(uri).tracks;
}

export function search(q: string): Results {
  const m = (s: string) => s.toLowerCase().includes(q.toLowerCase());
  return {
    tracks: [...tracks.values()].filter((t) => m(t.name) || m(t.artists[0].name)).slice(0, 8),
    artists: names.filter(m).map(artistItem),
    albums: albums.filter((a) => m(a.name) || m(a.by)).map(item),
    playlists: [...playlists, ...mixes].filter((p) => m(p.name)).map(item),
  };
}
