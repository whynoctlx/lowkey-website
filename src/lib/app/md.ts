/** Markdown to HTML for the changelogs: # headings, - lists, paragraphs, **bold**, *italic*, `code`, [links](https://…).
 *  The text is escaped first, so the file can't inject markup; links only to http(s).
 *  shortcut: no nested lists, tables, images or code blocks; switch to `marked` if the changelogs need them. */
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export const inline = (s: string) =>
  esc(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

export function md(src: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
    para = [];
    list = [];
  };
  for (const line of src.split(/\r?\n/)) {
    const h = line.match(/^(#{1,3})\s+(.*)/);
    const li = line.match(/^\s*[-*+]\s+(.*)/);
    if (h) (flush(), out.push(`<h${h[1].length + 1}>${inline(h[2])}</h${h[1].length + 1}>`));
    else if (li) (para.length && flush(), list.push(li[1]));
    else if (!line.trim()) flush();
    else if (list.length && /^\s/.test(line)) list[list.length - 1] += " " + line.trim();
    else (list.length && flush(), para.push(line.trim()));
  }
  flush();
  return out.join("");
}

/** A changelog's own title (its first # line, if the file starts with one), the rest of the text, a plain one-line
 *  summary (its first paragraph or list item, Markdown taken off) and how many items each ## section lists. */
export function parts(src: string): { title: string | null; body: string; summary: string; sections: { name: string; n: number }[] } {
  const h = src.match(/^\s*#\s+(.+)\r?\n?/);
  const body = h ? src.slice(h[0].length) : src;
  const lines = body.split(/\r?\n/).map((l) => l.trim());
  const plain = (s: string) => s.replace(/^[-*+]\s+/, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/[*_`]/g, "");
  const sections: { name: string; n: number }[] = [];
  for (const l of lines) {
    const s = l.match(/^##\s+(.+)/);
    if (s) sections.push({ name: plain(s[1]), n: 0 });
    else if (/^[-*+]\s/.test(l) && sections.length) sections[sections.length - 1].n++;
  }
  return { title: h ? plain(h[1].trim()) : null, body, summary: plain(lines.find((l) => l && !l.startsWith("#")) ?? ""), sections };
}
