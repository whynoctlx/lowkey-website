const KINDS = "playlist|album|artist|track";
const URI = new RegExp(`^spotify:(${KINDS}):([A-Za-z0-9]{22})$`);
const URL_ = new RegExp(`^(?:https?://)?open\\.spotify\\.com/(?:intl-[a-z-]+/)?(${KINDS})/([A-Za-z0-9]{22})(?:[/?#].*)?$`, "i");

const SHORT = /^(?:https?:\/\/)?(spotify(?:\.app)?\.link\/[A-Za-z0-9]+)(?:[?#].*)?$/i;

/** A spotify.link short link as an https URL (resolved by Rust), else null. */
export function shortLink(text: string): string | null {
  const m = text.trim().match(SHORT);
  return m ? `https://${m[1]}` : null;
}

/** The `spotify:<kind>:<id>` uri of a pasted Spotify link or uri (playlist, album, artist, track), else null. */
export function spotifyUri(text: string): string | null {
  const m = text.trim().match(URI) ?? text.trim().match(URL_);
  return m ? `spotify:${m[1].toLowerCase()}:${m[2]}` : null;
}
