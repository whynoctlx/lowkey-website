---
name: Lowkey
description: Spotify, quieter. A record-sleeve site for a native, lightweight Spotify desktop player.
colors:
  board: "#e4e6e4"
  ink: "#181b1f"
  ink-2: "#3f454c"
  ink-3: "#575d64"
  rule: "rgb(24 27 31 / 0.14)"
  rule-strong: "rgb(24 27 31 / 0.35)"
  tint-deep: "#36506d"
  sea-deep: "#34383d"
  on-sea: "#d0d6dc"
  demo-main: "#fbfbfa"
  demo-fg: "#1d1f22"
  demo-fg-2: "#5a5f66"
  demo-accent: "#3f638d"
typography:
  display:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "clamp(3.4rem, 8.4vw, 6rem)"
    fontWeight: 300
    lineHeight: 0.98
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "clamp(2.2rem, 4.6vw, 3.6rem)"
    fontWeight: 300
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  pull:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "clamp(2rem, 5.2vw, 4.4rem)"
    fontWeight: 300
    lineHeight: 1.04
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "clamp(19px, 1.7vw, 23px)"
    fontWeight: 400
    letterSpacing: "-0.01em"
  lead:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "clamp(17px, 1.35vw, 19px)"
    fontWeight: 400
    lineHeight: 1.55
  body:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    letterSpacing: "0.18em"
  button:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.14em"
  mark:
    fontFamily: "Jost Variable, Jost, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    letterSpacing: "0.42em"
  demo-ui:
    fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI Variable Text, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    lineHeight: 1.35
rounded:
  none: "0"
  cover: "4px"
  control: "6px"
  window: "12px"
spacing:
  gutter: "clamp(16px, 3.2vw, 48px)"
  section: "clamp(96px, 12vw, 168px)"
  block: "48px"
  row: "26px"
  cell: "15px"
  button-gap: "12px"
components:
  button-solid:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.board}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 26px"
    height: "50px"
  button-solid-hover:
    backgroundColor: "{colors.tint-deep}"
    textColor: "{colors.board}"
  button-line:
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.none}"
    padding: "0 26px"
    height: "50px"
  button-solid-sm:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.board}"
    rounded: "{rounded.none}"
    padding: "0 18px"
    height: "36px"
  nav-link:
    textColor: "{colors.ink-2}"
    typography: "{typography.label}"
  nav-link-hover:
    textColor: "{colors.ink}"
  legal-footer:
    backgroundColor: "{colors.sea-deep}"
    textColor: "{colors.on-sea}"
    padding: "40px 48px 56px"
  demo-window:
    backgroundColor: "{colors.demo-main}"
    textColor: "{colors.demo-fg}"
    typography: "{typography.demo-ui}"
    rounded: "{rounded.window}"
---

# Design System: Lowkey

## Overview

**Creative North Star: "The Quiet Sleeve"**

The site is a record sleeve in the ECM tradition: a vast, muted photographic field, tiny precise label type, and silence as the luxury. The "photograph" is not a raster but a live WebGL sea horizon in mist, re-tinted by whichever cover is playing in the demo and stirred by a pale sun that follows the cursor. Everything else is the back of the sleeve: cool matte board, graphite ink, hairline rules, and widely tracked small caps.

Density is low and the page is long. One light display face carries the voice; colour is almost absent, so the single live tint, taken from the cover that plays, reads as an event. The one place the system speaks another language is the live app window, which is deliberately native (system font, rounded window, macOS lights, vibrancy) because it is a specimen of the product, not part of the sleeve.

**Key Characteristics:**
- Cool matte-board grey ground with graphite ink; never cream, never pure black or white.
- One hue-bound tint (`--h`) that follows the playing cover across sky, accents, selection and focus.
- Jost set light (300) for display, tracked uppercase small caps for every label.
- Square corners, 1px hairline rules, no cards, no UI glow on the sleeve.
- A live, generated sea-and-mist horizon as the only imagery, opening and closing the page.

## Colors

A near-achromatic graphite-on-board palette with one muted, live tint.

### Primary
- **Cover Tint, Deep** (tint-deep): The only accent. Hover fill of the solid button, hover colour of track numbers, the Lowkey column header and its 7% wash in the comparison table, the pull quote, focus ring and text selection (28% mix). Its hue is `--h`, set at runtime from the album playing in the demo; the frontmatter value is the default hue (212). Dark mode lifts it to a pale tint (see sidecar).

### Neutral
- **Matte Board** (board): Page ground for the whole sleeve and the solid button's text. Matches the browser theme-color.
- **Graphite Ink** (ink): Headlines, active text, solid button fill, the strong top rule of spec lists and the table header underline.
- **Graphite 2** (ink-2): Lead paragraphs, body copy, navigation links, captions.
- **Graphite 3** (ink-3): Quietest legible text: track numbers, table rows for the non-Lowkey columns, spec list values, fine print.
- **Hairline** (rule): Every row divider in tracklist, table and spec lists.
- **Hairline Strong** (rule-strong): Underline colour for inline text links.
- **Graphite Sea** (sea-deep): The footer ground and the colour the closing sky fades into. Hue-bound at 8% saturation, so it reads as graphite, not as a blue.
- **Sea Foam** (on-sea): Text on the graphite sea.

### Demo window (scoped)
- **Window, Text, Text 2, Accent** (demo-main, demo-fg, demo-fg-2, demo-accent): Private tokens of the live app window, defined on the window itself. Accent is hue-bound like the tint but more saturated (38%), as a real app accent would be. Never use these outside the window.

### Named Rules
**The One Tint Rule.** The only chromatic colour on the sleeve is the hue taken from the cover that plays. No second accent, no fixed brand colour.

**The Graphite Ground Rule.** Surfaces are board or graphite sea. Hue-bound neutrals stay at or below 8% saturation so they never read as tinted panels.

## Typography

**Display Font:** Jost Variable (with Jost, system-ui)
**Body Font:** Jost Variable
**Demo Font:** the platform system UI font, inside the app window only

**Character:** One geometric sans in two registers: very light and tightly tracked at large sizes, widely tracked uppercase at tiny sizes. The contrast between the two is the sleeve's whole typographic voice.

### Hierarchy
- **Display** (300, clamp(3.4rem, 8.4vw, 6rem), 0.98): The title line, used twice: hero and close.
- **Headline** (300, clamp(2.2rem, 4.6vw, 3.6rem), 1.05): Section titles, balanced wrap.
- **Pull** (300, clamp(2rem, 5.2vw, 4.4rem), 1.04): One pull quote in the liner notes, in the tint.
- **Title** (400, clamp(19px, 1.7vw, 23px)): Tracklist item titles.
- **Lead** (400, clamp(17px, 1.35vw, 19px), 1.55): Hero and closing paragraph, max 62ch (44ch in the close).
- **Body** (400, 16px, 1.55): Default; liner notes run 17px/1.7 in two columns, fine print 14px/1.6.
- **Label** (500, 12px, 0.18em, uppercase): Table headers, spec-list headings; nav links are the same at 450/0.16em; the catalogue line 450/11px/0.2em.
- **Button** (500, 13px, 0.14em, uppercase): Download buttons (12px in the small header button).
- **Mark** (500, 13px, 0.42em, uppercase): The LOWKEY wordmark, 0.32em on narrow screens.

### Named Rules
**The Two Registers Rule.** Type is either large and light (300, negative tracking) or small and tracked (11-13px, 0.14em and wider, uppercase). Mid-weight mid-size text is reserved for reading copy.

**The Native Specimen Rule.** The app window uses the system font and its own scale (13px UI, bold 700-800 headings). Jost never enters the window, and system type never leaves it.

## Layout

A single long column on a shared gutter (clamp(16px, 3.2vw, 48px)). The hero is full-bleed: the sky is sticky behind the label row, title block and demo, and the title block fills the viewport minus the label row and the first ~16svh of the window. Back-of-sleeve sections sit in a 1200px centred measure with section tops at clamp(96px, 12vw, 168px) and inner blocks at 48-56px below the heading.

Structures are typographic, not boxed: the tracklist is a three-column grid (64px number, 5fr title, 7fr text) on hairlines; liner notes are CSS columns (2 at 300px min, 56px gap, 900px max); requirements are two equal columns (64px gap) of definition lists; the comparison is a full-width table scrolling horizontally under 760px.

Responsive: at 860px the nav hides, the tracklist collapses to number plus stacked title/text, and requirements go to one column. At 560px download buttons stack full-width. The demo window reflows by container query at 700px (sidebar and progress bar drop).

**The Hairline Grid Rule.** Rows are separated by 1px rules, never by boxes or backgrounds. A list's top edge is a hairline (or a full-ink rule for spec lists and table headers).

## Elevation & Depth

The sleeve is flat. Depth comes from the photograph: the sticky WebGL sky sits behind the hero, the board slides over it with a 160px board-coloured fade, and the closing section re-renders the live sky in fill mode, faded in from the board (top 22%) and out into graphite sea (bottom 18%).

The only shadow belongs to the live app window, which is lifted out of the sea like a real desktop window. Shadow values live in the sidecar.

**The Flat Sleeve Rule.** No shadow, glow or blur on sleeve UI. Depth on the sleeve is the sky and its fades; lift is the app window's alone.

## Shapes

Square everywhere on the sleeve: buttons, table, lists, footer (0). Borders are 1px hairlines or 1px inset outlines. The demo window has its own native form language: 12px window corners, 6px control and row radii, 4px covers, round play buttons and traffic lights.

Covers are drawn, not photographed: five CSS gradient compositions (a horizon, a pale disc, a vertical shore, a diagonal split, a rising glow) in two hues per album, echoing the sky.

## Components

### Buttons
Quiet, rectangular, tracked caps.
- **Shape:** square (0), 50px tall, 26px side padding, 10px icon gap; 36px/18px in the header.
- **Solid:** ink fill, board text. Hover shifts the fill to the cover tint (0.25s).
- **Line:** transparent with a 1px inset outline at 55% ink; hover sharpens it to full ink and adds a 6% ink wash.
- **Icon:** 17px stroked download arrow (1.8 stroke, round caps), only on the primary macOS button.
- **Pairing:** always macOS solid then Windows line, 12px gap, wrapping, stacking under 560px.

### Navigation
The label row: 72px tall, wordmark left, four section links right (12px tracked caps, ink-2 to ink on hover), small solid Download at the far right. Links hide under 860px; wordmark and Download stay.

### Tracklist
Numbered feature list in the form of a sleeve's track listing: two-digit tabular numbers in ink-3, title, description on a hairline row (26px vertical). Hover indents the row 12px with a long ease-out (0.5s, cubic-bezier(0.16, 1, 0.3, 1)) and turns the number to the tint.

### Comparison table
Full-width, hairline rows, tracked-caps header over a full-ink rule. Row labels and other columns in ink-3; the Lowkey column in ink on a 7% tint wash, header in the tint. Wrapped in a focusable horizontal scroller.

### Spec lists
Definition lists in two columns: term left, value right-aligned in ink-3, hairline rows, full-ink top rule, under a tracked-caps heading.

### Inline links
Underlined at 1px with 4px offset in rule-strong; hover takes the text colour.

### Legal footer
Graphite sea ground, sea-foam text at 12px/1.65, 96ch measure, the name in tracked caps.

### Sky (signature)
The sleeve's photograph: a WebGL horizon at 30% height, sea streaks below, a mist band above, a cursor-led pale sun, and film grain. Two hues blend toward the playing cover's (h, h2) at a slow 3.5% per frame. The upper sky stays near-grey in both modes (h2 at 8% light, 12% dark). Renders at half resolution, pauses offscreen, freezes time under reduced motion, and falls back to an equivalent CSS gradient. Sticky in the hero; `fill` inside a section.

### Live app window (signature)
A working miniature of the product, in its own native skin: title bar with traffic lights, vibrancy sidebar (40px blur over the sky), home grid, album pages, player bar. Resizable from either edge (symmetric drag, arrow keys in 40px steps); tiles hold their columns while dragging and glide into place 160ms after you stop (620ms ease-out).

### Glide
Shared long-text behaviour: text that overflows never ends in an ellipsis; it fades at the edge (18px mask) and travels back and forth on hover (or always, for the now-playing title). Reduced motion wraps it instead.

## Do's and Don'ts

### Do:
- **Do** let the playing cover's hue drive every accent through `--h`; set colour once, never per component.
- **Do** separate content with 1px hairlines in rule; use full ink only for a list's top rule or a table header underline.
- **Do** set display and headline text in Jost 300 with negative tracking, and every label in 11-13px tracked uppercase.
- **Do** keep every sleeve edge square (0).
- **Do** fade any new full-bleed sky section in from board and out into graphite sea.
- **Do** honour reduced motion: freeze the sky, drop the scroll recede, wrap glide text.

### Don't:
- **Don't** introduce a second accent colour or a fixed brand blue; the tint is borrowed, not owned.
- **Don't** use cream or warm paper for the ground; the board is cool grey.
- **Don't** put cards, panels, rounded corners, shadows or UI glow on the sleeve. The sky's sun and the app window's native radii and shadow are the world's own materials, not licences for sleeve UI.
- **Don't** truncate text with an ellipsis anywhere; use glide.
- **Don't** bring system type or the window's tokens onto the sleeve, or Jost into the window.
- **Don't** add raster imagery; covers are CSS gradients and the photograph is the live sky.
