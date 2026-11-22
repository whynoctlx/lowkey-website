// Text is Markdown-lite (md.ts `inline`): [links](https://…) and the like.
// The Privacy policy and Terms of use, shared by the site's pages and their raw text versions (/privacy.md, /terms.md).
/** The Privacy policy and Terms of use: [section, blocks]; a block is a paragraph, or a list when it's an array.
    Each fact lives in one document only: data and cookies in the policy, rules, risk and Spotify in the terms. */
export type Doc = [string, (string | string[])[]][];
export const UPDATED = "22 November 2026";
export const privacyPolicy: Doc = [
  ["Who is responsible", [
    "Lowkey and this website are made and run by whynoctlx, an independent developer. For any question or request about this policy or your data, contact us through our [GitHub repository](https://github.com/whynoctlx/lowkey-build).",
  ]],
  ["The Lowkey app", [
    "The app collects nothing about you. It has no account of ours, no server of ours, no analytics, no telemetry, no crash reporting and no ads.",
    "It connects to two services only:",
    [
      "Spotify, to sign you in, show your library and play music. Spotify handles that data under its own privacy policy.",
      "GitHub, to check for and download updates. The check sends nothing about you or your listening.",
    ],
    "Lowkey never handles music itself. The audio is streamed and played by Soloist, Spotify's official player, which Lowkey downloads from Spotify and only tells what to play. Lowkey never receives, decrypts, records or stores any song or podcast; the only things it keeps on disk are your settings, a cache of names and cover art, and the sign-in below.",
    "Your Spotify session and Soloist key are stored only on your computer, encrypted (ChaCha20-Poly1305) with a key tied to that machine. Your settings stay on your computer as well. Uninstalling Lowkey and deleting its app data removes all of it.",
  ]],
  ["This website", [
    "The site runs no analytics, advertising or tracking. The app window on it is a demo on made-up data: it never signs in to Spotify and plays no music.",
    [
      "Download count. When you start a download we add one to a single running total. Nothing else is stored with it: no IP address, no browser details, nothing that identifies you.",
      "One cookie, lk_dl. It is set when you start a download, holds only the value 1 and expires after a year. It exists so each browser is counted once, and is never used to recognise or follow you.",
      "Preferences. Your theme, accent and motion choices are kept in your browser's local storage so they persist between visits. They are never sent to us.",
    ],
  ]],
  ["Service providers", [
    "Like any website, the services that deliver this one may see your IP address and keep ordinary server logs under their own policies: our hosting provider, our database provider (which holds only the download total), GitHub (which serves the installers) and the hosts of the cover images shown in the demo.",
  ]],
  ["Your choices and rights", [
    "Because we hold no personal data about you, there is nothing for us to access, correct or delete. You can remove the cookie and stored preferences at any time by clearing this site's data in your browser. If you are in the EU or UK, you also have the right to complain to your data protection authority.",
  ]],
  ["Changes to this policy", [
    "When this policy changes, the new version is published on this page with a new date.",
  ]],
];
export const terms: Doc = [
  ["Agreement", [
    "These terms apply to the Lowkey app and this website. By downloading or using either, you agree to them. If you don't, please don't use them.",
  ]],
  ["Using Lowkey", [
    "Lowkey is free to download and use for personal, non-commercial purposes. To use it you need your own Spotify Premium account and your own Soloist API key. You agree not to:",
    [
      "use Lowkey to get around Spotify's subscription, or to copy, download, record, convert, “rip” or redistribute music, podcasts or any other content from Spotify;",
      "modify Lowkey, or build on it, to do any of the above, or help anyone else do so;",
      "sell, rent or repackage Lowkey, or distribute modified copies presented as Lowkey;",
      "use Lowkey in a way that breaks the law or harms Spotify's service or other people.",
    ],
  ]],
  ["Streaming only", [
    "Lowkey is a remote control for Spotify's own playback. Music is streamed and played only by Soloist, Spotify's official player, with your Premium account, so every play is a normal Spotify stream that counts for the artist.",
    "Lowkey has no download, recording, export or offline feature, does not access or decrypt audio, and does not work without Premium. We will never add any of these, and we do not accept contributions or requests that would.",
  ]],
  ["Spotify", [
    "Lowkey is an unofficial, independent project, not affiliated with, endorsed by or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.",
    "Your agreement with Spotify still applies when you use Lowkey. Lowkey signs in with Spotify's desktop client ID and relies on undocumented Spotify endpoints, which may change, stop working or be restricted at any time and may not comply with Spotify's terms. You use Lowkey at your own risk, including any risk to your Spotify account.",
  ]],
  ["Updates", [
    "Lowkey installs signed updates from GitHub. Features may change, be added or be removed at any time, and we may stop developing Lowkey without notice.",
  ]],
  ["No warranty", [
    "Lowkey and this website are provided “as is” and “as available”, without warranty of any kind, express or implied, including merchantability, fitness for a particular purpose and non-infringement.",
  ]],
  ["Limitation of liability", [
    "To the fullest extent the law allows, whynoctlx is not liable for any indirect, incidental or consequential damage, or any loss of data, account access or profit, arising from your use of Lowkey or this website. Nothing in these terms limits liability that cannot be limited by law.",
  ]],
  ["Changes to these terms", [
    "We may update these terms. The current version is always published on this page with its date, and continuing to use Lowkey after a change means you accept it.",
  ]],
];

export const legal = {
  privacy: { title: "Privacy policy", lede: "Lowkey collects no personal data. This policy explains what the app and this website handle, and who else is involved.", doc: privacyPolicy },
  terms: { title: "Terms of use", lede: "The terms for using the Lowkey app and this website.", doc: terms },
};

/** A document as plain Markdown-style text: the raw version, no page around it. */
export function raw(kind: keyof typeof legal): string {
  const { title, lede, doc } = legal[kind];
  const out = [`# Lowkey ${title}`, "", lede, ""];
  for (const [name, blocks] of doc) {
    out.push(`## ${name}`, "");
    for (const b of blocks) out.push(typeof b === "string" ? b : b.map((li) => `- ${li}`).join("\n"), "");
  }
  out.push(`Last updated ${UPDATED}`, "");
  return out.join("\n");
}
