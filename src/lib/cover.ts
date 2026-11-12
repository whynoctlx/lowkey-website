import type { Item } from "./data";

// Drawn covers for the sample items: an SVG per item, as a data URI so it behaves like the app's cover <img>.
const c = (h: number, s: number, l: number) => `hsl(${h} ${s}% ${l}%)`;

function draw({ hue: h, hue2: k, art, name }: Item): string {
  const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c(h, 62, 52)}"/><stop offset="1" stop-color="${c(k, 55, 28)}"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>`;
  switch (art) {
    case 0: // sun on the horizon
      return `${bg}<circle cx="50" cy="58" r="22" fill="${c(k, 90, 84)}"/><rect y="58" width="100" height="42" fill="${c(h, 45, 22)}"/>` +
        [64, 72, 82].map((y, i) => `<rect x="${14 + i * 6}" y="${y}" width="${72 - i * 12}" height="2.4" rx="1.2" fill="${c(k, 80, 80)}" opacity="${0.55 - i * 0.15}"/>`).join("");
    case 1: // rings
      return `${bg}` + [40, 31, 22, 13].map((r, i) => `<circle cx="64" cy="40" r="${r}" fill="none" stroke="${c(k, 85, 78)}" stroke-width="2.2" opacity="${0.35 + i * 0.18}"/>`).join("") +
        `<circle cx="64" cy="40" r="5" fill="${c(k, 90, 86)}"/>`;
    case 2: // bands
      return `${bg}<g transform="rotate(-30 50 50)">` + [0, 1, 2, 3, 4].map((i) => `<rect x="-30" y="${8 + i * 20}" width="160" height="9" fill="${c(i % 2 ? h : k, 80, 70 - i * 5)}" opacity="${0.4 + i * 0.12}"/>`).join("") + "</g>";
    case 3: // dots
      return `${bg}` + Array.from({ length: 25 }, (_, i) => `<circle cx="${18 + (i % 5) * 16}" cy="${18 + Math.floor(i / 5) * 16}" r="${2 + ((i * 7) % 5)}" fill="${c(k, 85, 82)}" opacity="${0.35 + ((i * 3) % 7) / 10}"/>`).join("");
    case 4: // arches
      return `${bg}` + [0, 1, 2].map((i) => `<path d="M${14 + i * 26} 100V${62 - i * 8}a12 12 0 0 1 24 0V100z" fill="${c(k, 70, 70 - i * 8)}" opacity="${0.5 + i * 0.2}"/>`).join("");
    case 5: // an artist: a figure in soft light
      return `<defs><radialGradient id="g" cx="0.35" cy="0.3" r="0.9"><stop offset="0" stop-color="${c(k, 70, 70)}"/><stop offset="1" stop-color="${c(h, 55, 24)}"/></radialGradient></defs><rect width="100" height="100" fill="url(#g)"/>` +
        `<circle cx="52" cy="42" r="15" fill="${c(h, 40, 18)}" opacity="0.85"/><path d="M20 100c2-22 16-32 32-32s30 10 32 32z" fill="${c(h, 40, 18)}" opacity="0.85"/>`;
    case 6: // waves
      return `${bg}` + [0, 1, 2, 3].map((i) => `<path d="M0 ${48 + i * 12}q25 -14 50 0t50 0V100H0z" fill="${c(k, 75, 75 - i * 10)}" opacity="${0.3 + i * 0.15}"/>`).join("");
    default: // a mix: a big disc and its name
      return `<rect width="100" height="100" fill="${c(h, 58, 46)}"/><circle cx="74" cy="30" r="34" fill="${c(k, 70, 64)}"/><rect y="74" width="100" height="26" fill="${c(h, 50, 20)}" opacity="0.55"/>` +
        `<text x="8" y="92" font-family="-apple-system,system-ui,sans-serif" font-weight="700" font-size="13" fill="#fff">${name}</text>`;
  }
}

const memo = new Map<string, string>();
export const cover = (i: Item) =>
  memo.get(i.id) ?? (memo.set(i.id, `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${draw(i)}</svg>`)}`), memo.get(i.id)!);
