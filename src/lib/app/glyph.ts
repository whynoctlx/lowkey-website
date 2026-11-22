/** A Home shelf's glyph (24×24 stroke path) from its title, English or Slovak as Spotify sends it; a note when
 *  nothing matches. The first rule that matches wins, so "Your top mixes" is a mix, not a chart. */
const NOTE = "M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z";
const RULES: [RegExp, string][] = [
  // Shortcuts: the arrow on a file's alias.
  [/shortcut|skratk/i, "M5 19v-4a6 6 0 0 1 6-6h8M15 5l4 4-4 4"],
  // Made for you: a sparkle.
  [/made for|zostavené pre|pre teba|for you/i, "M12 3.5l1.8 5.2 5.2 1.8-5.2 1.8L12 17.5l-1.8-5.2-5.2-1.8 5.2-1.8zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"],
  // Mixes: stacked layers.
  [/mix/i, "M12 4 3 8.5l9 4.5 9-4.5zM3 13l9 4.5 9-4.5"],
  // Jump back in: an arrow turning back.
  [/jump back|znova|again/i, "M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5M3.5 3.5v5h5"],
  // Recently played: a clock.
  [/recent|nedávn|histór/i, "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M12 7v5l3 2"],
  [/podcast|epizód|episode|show/i, "M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3"],
  // Popular radio: a radio set (stations keep the waves).
  [/popular radio|populárne rádi/i, "M3 9h18v11H3zM7 9l10-5M6.5 14.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M14 13h4M14 16h4"],
  [/radio|rádi|station|stanic/i, "M6 6a8.5 8.5 0 0 0 0 12M18 6a8.5 8.5 0 0 1 0 12M9 9a4 4 0 0 0 0 6M15 9a4 4 0 0 1 0 6M11 12a1 1 0 1 0 2 0 1 1 0 1 0-2 0"],
  // "For fans of", "More like": a link.
  [/fans|fanúš|more like|podobn|viac ako/i, "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  [/artist|interpret|umel/i, "M8 8a4 4 0 1 0 8 0 4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0"],
  // New releases: a burst.
  [/\bnew\b|nov[éáý]|release|vydan/i, "M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"],
  // Popular, top, charts: a rising line.
  [/popul|trend|\btop\b|hit|chart|rebríč/i, "M3 17l6-6 4 4 8-8M15 7h6v6"],
  [/album/i, "M3 12a9 9 0 1 0 18 0 9 9 0 1 0-18 0M10 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0"],
];
export const glyph = (title: string) => RULES.find(([re]) => re.test(title))?.[1] ?? NOTE;
