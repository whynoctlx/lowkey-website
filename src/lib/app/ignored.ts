/** An ignored artist: `any` also catches the songs they only appear on, otherwise only their own (listed first). */
export type Ignored = Record<string, { name: string; image?: string | null; any: boolean }>;

/** A song's artists (uris, its own artist first) hold one the user ignores. */
export const isIgnored = (artists: (string | undefined)[], ig: Ignored) =>
  artists.some((u, i) => !!u && !!ig[u] && (i === 0 || ig[u].any));
