/** The cover's lead colour as [hue 0–360, saturation 0–1], or null for a grey cover (the accent then stands in).
 *  RGBA pixels in; each pixel weighs by its colourfulness, so a small bright area beats a large dull one. */
export function tint(px: Uint8ClampedArray): [number, number] | null {
  let x = 0, y = 0, sat = 0, w = 0;
  for (let i = 0; i < px.length; i += 4) {
    const [r, g, b] = [px[i] / 255, px[i + 1] / 255, px[i + 2] / 255];
    const max = Math.max(r, g, b), min = Math.min(r, g, b), c = max - min;
    if (c < 0.08 || max < 0.12) continue;
    const h = c === 0 ? 0 : max === r ? ((g - b) / c) % 6 : max === g ? (b - r) / c + 2 : (r - g) / c + 4;
    const a = (h * Math.PI) / 3;
    const k = c * c;
    // Hue averages on the circle, so red at 359° and 1° doesn't come out cyan.
    x += Math.cos(a) * k;
    y += Math.sin(a) * k;
    sat += (c / (1 - Math.abs(max + min - 1) || 1)) * k;
    w += k;
  }
  if (w < (px.length / 4) * 0.004) return null;
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  return [Math.round(hue), Math.min(1, sat / w)];
}

/** Draws the cover small and reads its tint: null for a grey cover, undefined when it can't load or read (CORS). */
export function coverTint(url: string): Promise<[number, number] | null | undefined> {
  return new Promise((done) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = c.height = 24;
        const ctx = c.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(img, 0, 0, 24, 24);
        done(tint(ctx.getImageData(0, 0, 24, 24).data));
      } catch {
        done(undefined);
      }
    };
    img.onerror = () => done(undefined);
    img.src = url;
  });
}
