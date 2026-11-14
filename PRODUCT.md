# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Spotify Premium listeners on macOS (Apple Silicon) or Windows who use Spotify every day on the desktop and want it to feel calmer, faster and more native. They land on the website to decide whether to download Lowkey.

## Product Purpose

Lowkey is a lightweight, native desktop player for Spotify: "Spotify, quieter." Account, library and Spotify's own playback stay as they are; Lowkey only changes the window you look at. The website's job is to make a visitor say "wow" and download it.

## Positioning

A new face for Spotify, not a new Spotify. Native (system font, native title bar, macOS vibrancy, Windows 11 Mica), light (Rust + Tauri 2, not Electron, nothing running while idle), just your music (no promos), nothing cut off (long titles glide instead of "…"), no waiting (pages preload on hover), every card visible (no "Show all"), smooth resizing (tiles glide into place once you stop), yours to tune (theme, accent, contrast, density, UI scale, motion, glass). Free, non-commercial, forever.

## Capabilities and Constraints

- Requires Spotify Premium and the user's own Soloist API key (entered in Settings). Soloist, Spotify's official player, is downloaded from Spotify's servers on first run, never bundled; every stream counts as usual.
- macOS on Apple Silicon, Windows x64 (10/11). Linux builds exist but are unsupported.
- Limitations (from Soloist/Spotify): clicking a track plays only that track, no offline downloads, no playlist editing, no Intel Macs, not on the Mac App Store.
- Downloads: https://github.com/whynoctlx/lowkey-build/releases/latest
- Stack: existing SvelteKit 5 + adapter-static site, prerendered.

## Brand Commitments

- Name: Lowkey (renamed from Quietify). Tagline: "Spotify, quieter."
- Copy is English. Voice: first-person maker, calm, honest, specific; respectful of Spotify, never adversarial.
- Must carry the disclaimer: unofficial, not affiliated with Spotify AB; uses Spotify's desktop client ID and undocumented endpoints that may change; use at your own risk.

## Evidence on Hand

- App source at ~/Projects/Lowkey (README is the product truth). Icon asset: ~/Projects/Lowkey/src-tauri/icons.
- No real screenshots, testimonials, user counts or benchmarks. Do not invent any. Demo music (artists, albums, playlists) must be made up and labelled as such.

## Product Principles

1. Show, don't claim: the app's qualities are demonstrated live on the page.
2. Calm over loud: quiet confidence, the opposite of a promo-filled app.
3. Honest about requirements and limitations.
4. Free and non-commercial, built to harm Spotify as little as possible.
