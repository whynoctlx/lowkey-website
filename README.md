# Lowkey website

The website for [Lowkey](https://github.com/whynoctlx/lowkey-build), a native, lightweight desktop player for Spotify Premium.

## The app window is a copy

The window on the page is a copy of the Lowkey app's window: its sidebar, pages, player, settings and tour, ported from the app's Svelte UI. It runs only on made-up demo data (`src/lib/app/demo.ts`, `src/lib/catalog.json`).

- It never signs in to Spotify and never contacts Spotify.
- It plays no audio: the player only moves its progress bar.
- A pasted Spotify link opens a demo copy of the album, not the real one.

When the app's UI changes, the copy here is updated by hand to match.

## Develop

```sh
bun install
bun run dev
bun run check
```

The download counter (`src/routes/api/downloads`) needs `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in `.env`. Without them that request fails; the rest of the site works.

Lowkey is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB.
