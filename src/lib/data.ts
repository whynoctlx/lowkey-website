// Sample library for the live preview. Every artist, album and playlist here is made up; covers are drawn (cover.ts).

export type Kind = "playlist" | "album" | "artist";
export type Track = { id: string; name: string; artists: string[]; album: string; albumId: string; dur: number; explicit?: boolean };
export type Item = {
  id: string;
  kind: Kind;
  name: string;
  /** Who made it: an album's artist, a playlist's owner. */
  by: string;
  /** Cover hue (0–360) and a second hue, plus the drawing to use. */
  hue: number;
  hue2: number;
  art: number;
  year?: number;
  desc?: string;
  tracks: Track[];
};

const albums: [string, string, string, number, number, number, number, [string, number, boolean?][]][] = [
  ["paper-moons", "Paper Moons", "Mira Vale", 2025, 22, 340, 0, [
    ["Paper Moons", 214], ["Saltlight", 187], ["The Long Way Home (Through the Valley of Quiet Things)", 262], ["Velvet Hours", 201], ["Kite String", 176], ["Afterglow, Again", 243],
  ]],
  ["low-tide-radio", "Low Tide Radio", "Halcyon Tide", 2024, 205, 175, 1, [
    ["Low Tide Radio", 231], ["Harbour Lights", 198], ["Undertow", 252, true], ["Glass Bottle Letters", 189], ["Static at Sea", 215], ["Driftwood", 168],
  ]],
  ["signal-noise", "Signal / Noise", "Northern Static", 2026, 280, 330, 2, [
    ["Signal", 196], ["Neon Cathedral", 238, true], ["Frequency Drift", 207], ["Overpass", 182], ["Wireless Hearts", 224], ["Noise", 271],
  ]],
  ["small-hours", "Small Hours", "Juno Park", 2023, 42, 12, 3, [
    ["3 A.M. Kitchen", 193], ["Small Hours", 228], ["Lemon Tree Avenue", 174], ["Polaroid Summer", 206], ["Slow Dancer", 245], ["Goodnight, Brooklyn", 199],
  ]],
  ["glasshouse", "Glasshouse", "Saltwater Hymns", 2025, 162, 95, 4, [
    ["Glasshouse", 219], ["Fern", 184], ["Rain on Copper", 236], ["Greenroom", 191], ["Moss & Marble", 208], ["Evergreen", 257],
  ]],
  ["ember-ash", "Ember & Ash", "Okoro", 2024, 8, 30, 2, [
    ["Ember", 202], ["Copper Sun", 226, true], ["Ash & Honey", 190], ["Wildfire Waltz", 244], ["Smoke Signals", 213], ["Ash", 178],
  ]],
  ["blue-hour", "Blue Hour", "Mira Vale", 2022, 232, 280, 1, [
    ["Blue Hour", 221], ["Porcelain", 195], ["Night Swim", 233], ["Lanterns", 187],
  ]],
  ["arcade-dreams", "Arcade Dreams", "Northern Static", 2023, 300, 190, 3, [
    ["Insert Coin", 164], ["Arcade Dreams", 212], ["High Score", 199], ["Pixel Rain", 230],
  ]],
];

const all: Item[] = albums.map(([id, name, by, year, hue, hue2, art, ts]) => ({
  id, kind: "album", name, by, year, hue, hue2, art,
  tracks: ts.map(([n, dur, explicit], i) => ({ id: `${id}-${i}`, name: n, artists: [by], album: name, albumId: id, dur, explicit })),
}));
const songs = all.flatMap((a) => a.tracks);
const pick = (...ids: string[]) => ids.map((id) => songs.find((t) => t.id === id)!);

const artist = (name: string, hue: number, hue2: number): Item => ({
  id: name.toLowerCase().replace(/\W+/g, "-"), kind: "artist", name, by: "", hue, hue2, art: 5,
  tracks: songs.filter((t) => t.artists[0] === name).sort((a, b) => (a.id.length * 7 + a.dur) % 5 - (b.id.length * 7 + b.dur) % 5).slice(0, 6),
});

const playlist = (id: string, name: string, desc: string, hue: number, hue2: number, art: number, tracks: Track[]): Item =>
  ({ id, kind: "playlist", name, by: "You", desc, hue, hue2, art, tracks });

all.push(
  artist("Mira Vale", 18, 330),
  artist("Halcyon Tide", 200, 170),
  artist("Northern Static", 300, 250),
  artist("Juno Park", 40, 10),
  artist("Saltwater Hymns", 160, 120),
  artist("Okoro", 12, 35),
  playlist("late-night-drive", "Late Night Drive", "Mira Vale, Northern Static and Halcyon Tide", 250, 320, 6,
    pick("signal-noise-1", "paper-moons-2", "low-tide-radio-0", "blue-hour-2", "arcade-dreams-1", "ember-ash-3", "low-tide-radio-4")),
  playlist("deep-focus", "Deep Focus", "Saltwater Hymns, Halcyon Tide and Juno Park", 180, 210, 4,
    pick("glasshouse-2", "low-tide-radio-5", "glasshouse-5", "small-hours-4", "glasshouse-1", "blue-hour-1")),
  playlist("sunday-slow", "Sunday Slow", "Juno Park, Mira Vale and Okoro", 35, 55, 0,
    pick("small-hours-0", "paper-moons-3", "ember-ash-2", "small-hours-5", "paper-moons-5")),
  playlist("weekly-finds", "Weekly Finds", "Okoro, Northern Static and Saltwater Hymns", 345, 20, 7,
    pick("ember-ash-1", "signal-noise-4", "glasshouse-3", "arcade-dreams-3", "paper-moons-4", "low-tide-radio-2", "small-hours-2")),
  playlist("mix-1", "Mix 1", "Mira Vale, Juno Park and Okoro", 15, 45, 7,
    pick("paper-moons-0", "small-hours-1", "ember-ash-0", "blue-hour-0", "small-hours-3")),
  playlist("mix-2", "Mix 2", "Northern Static, Halcyon Tide and Saltwater Hymns", 285, 200, 7,
    pick("signal-noise-0", "low-tide-radio-1", "glasshouse-0", "arcade-dreams-0", "signal-noise-2")),
  playlist("on-repeat", "On Repeat", "Songs you can't stop playing", 330, 280, 6,
    pick("paper-moons-2", "signal-noise-1", "ember-ash-1", "glasshouse-2", "small-hours-4")),
);

export const items = all;
export const byId = new Map(all.map((i) => [i.id, i]));
export const get = (id: string) => byId.get(id)!;

/** Home, curated: only shelves about the listener, each item once (as the app's Home). */
export const home: { title: string; ids: string[] }[] = [
  { title: "Made for you", ids: ["mix-1", "mix-2", "weekly-finds", "on-repeat"] },
  { title: "Your top artists", ids: ["mira-vale", "northern-static", "juno-park", "halcyon-tide", "saltwater-hymns", "okoro"] },
  { title: "Albums you love", ids: ["paper-moons", "signal-noise", "low-tide-radio", "small-hours", "glasshouse", "ember-ash", "blue-hour", "arcade-dreams"] },
];

/** The sidebar: playlists first, then albums and artists. */
export const library = ["late-night-drive", "deep-focus", "sunday-slow", "on-repeat", "paper-moons", "signal-noise", "low-tide-radio", "glasshouse", "mira-vale", "northern-static", "okoro"];

export const kindName = { playlist: "Playlist", album: "Album", artist: "Artist" } as const;
export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
