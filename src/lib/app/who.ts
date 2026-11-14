const LEAD = /^(?:s interpret(?:om|mi)|with|featuring)\s+/i;
const MORE = /\s+(?:a ďalší|a ďalšie|and more)\.?$/i;

/** Who plays on a playlist, from its Spotify description: "vxcelm, Enmity, HOLY PRIEST a ďalší" → "vxcelm, Enmity,
 *  HOLY PRIEST"; "S interpretom Dollar Prync, Rytmus" → "Dollar Prync, Rytmus". At most three names. Editorial prose
 *  ("Skratka k skrytým pokladom…") is not a list of names and gives "". */
export function who(desc = ""): string {
  const listed = LEAD.test(desc) || MORE.test(desc);
  const parts = desc.replace(LEAD, "").replace(MORE, "").split(/,\s*/);
  // "A, B a C": the last name is joined by "a"/"and".
  parts.push(...parts.pop()!.split(/\s+(?:a|and)\s+(?=\S)/));
  const names = parts.map((p) => p.trim()).filter(Boolean);
  // A name is short; a clause of prose is not.
  const ok = names.length && names.every((n) => n.length <= 40 && n.split(/\s+/).length <= 4);
  return ok && (listed || names.length > 1) ? names.slice(0, 3).join(", ") : "";
}
