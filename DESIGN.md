---
version: alpha
name: raseeda
description: >-
  Design system for raseeda, a free, local-first invoice generator that runs
  entirely in the browser. The editor is a compact, document-grade tool:
  neutral grayscale chrome, a single deep-teal brand accent, white paper on a
  grey desk, and tight geometry that reads like a precise instrument. The
  marketing homepage is a light, airy page on a warm canvas: a pale sky over
  the real editor, pastel washes behind short loops of it at work, and ink
  pills for actions.
colors:
  background: oklch(1 0 0)
  foreground: oklch(0.145 0 0)
  card: oklch(1 0 0)
  cardForeground: oklch(0.145 0 0)
  popover: oklch(1 0 0)
  popoverForeground: oklch(0.145 0 0)
  primary: oklch(0.205 0 0)
  primaryForeground: oklch(0.985 0 0)
  secondary: oklch(0.97 0 0)
  secondaryForeground: oklch(0.205 0 0)
  muted: oklch(0.97 0 0)
  mutedForeground: oklch(0.556 0 0)
  accent: oklch(0.97 0 0)
  accentForeground: oklch(0.205 0 0)
  destructive: oklch(0.577 0.245 27.325)
  success: oklch(0.627 0.155 149.21)
  successForeground: oklch(0.985 0 0)
  warning: oklch(0.745 0.153 74.2)
  warningForeground: oklch(0.205 0 0)
  border: oklch(0.922 0 0)
  input: oklch(0.922 0 0)
  ring: oklch(0.6 0.095 185)
  paper: oklch(1 0 0)
  paperForeground: oklch(0.21 0.006 285.885)
  paperMuted: oklch(0.967 0.001 286.375)
  paperMutedForeground: oklch(0.5 0.016 286)
  paperBorder: oklch(0.871 0.006 286.286)
  desk: oklch(0.92 0.004 286.32)
  brand50: oklch(0.975 0.015 185)
  brand100: oklch(0.945 0.03 185)
  brand200: oklch(0.885 0.055 185)
  brand300: oklch(0.8 0.08 185)
  brand400: oklch(0.71 0.095 185)
  brand500: oklch(0.6 0.095 185)
  brand600: oklch(0.505 0.085 185)
  brand700: oklch(0.42 0.07 185)
  brand800: oklch(0.335 0.056 185)
  brand900: oklch(0.255 0.043 185)
  brand950: oklch(0.19 0.033 185)
  canvas: oklch(0.99 0.003 85)
  ink: "#262823"
  copyGrey: oklch(0.442 0.017 285.786)
  sky: oklch(0.82 0.075 205)
  glow: oklch(0.97 0.03 205)
  tileWash: oklch(0.975 0.014 205)
  nightPanel: oklch(0.141 0.005 285.823)
  terminalScreen: "#0c0e10"
  auroraViolet: oklch(0.52 0.17 295)
  auroraIndigo: oklch(0.5 0.16 270)
  auroraMagenta: oklch(0.55 0.17 330)
  pdfMuted: "#6b7280"
  pdfMutedZinc: "#71717a"
  themeColor: "#11746b"
typography:
  title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  body:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  control:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.5
  caption:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
  homeDisplay:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: clamp(2rem, 0.75rem + 6vw, 3.75rem)
    fontWeight: 500
    lineHeight: clamp(2.25rem, 1.25rem + 5vw, 3.75rem)
    letterSpacing: -0.035em
  homeHeadline:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: clamp(1.75rem, 1.2rem + 2.5vw, 2.25rem)
    fontWeight: 500
    lineHeight: clamp(2.125rem, 1.6rem + 2.5vw, 2.5rem)
    letterSpacing: -0.035em
  homeTitle:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: 1.125rem
    fontWeight: 500
    lineHeight: 1.75rem
  homeLead:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.75rem
  homeBody:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: 1rem
    fontWeight: 400
    lineHeight: 1.625rem
  homeCaption:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: 0.875rem
    fontWeight: 400
    lineHeight: 1.25rem
  wordmark:
    fontFamily: '"Schibsted Grotesk Variable", sans-serif'
    fontSize: 18px
    fontWeight: 600
    letterSpacing: -0.0175em
  code:
    fontFamily: '"Geist Mono Variable", monospace'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 24px
rounded:
  none: 0px
  surface: 3px
  control: 4px
  sm: 4px
  md: 6px
  lg: 0.5rem
  xl: 12px
  2xl: 0.9rem
  hero: 2rem
  full: 9999px
spacing:
  px: 1px
  0.5: 2px
  1: 4px
  1.5: 6px
  2: 8px
  2.5: 10px
  3: 12px
  4: 16px
  6: 24px
  8: 32px
  12: 48px
  16: 64px
  20: 80px
  coarseTarget: 44px
components:
  button:
    backgroundColor: "{colors.brand600}"
    textColor: "{colors.primaryForeground}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    height: 32px
    padding: 0 10px
  buttonHover:
    backgroundColor: "{colors.brand700}"
  buttonOutline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    height: 32px
  buttonGhost:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
  buttonDestructive:
    backgroundColor: oklch(0.577 0.245 27.325 / 0.1)
    textColor: "{colors.destructive}"
    rounded: "{rounded.control}"
  input:
    backgroundColor: transparent
    textColor: "{colors.foreground}"
    rounded: "{rounded.surface}"
    height: 32px
  invoiceField:
    backgroundColor: transparent
    textColor: "{colors.paperForeground}"
    rounded: "{rounded.surface}"
  invoiceFieldFocus:
    backgroundColor: "{colors.brand50}"
    textColor: "{colors.paperForeground}"
    padding: 4px 8px
  invoicePage:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paperForeground}"
    padding: 40pt
    width: 210mm
    height: 297mm
  menuItem:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popoverForeground}"
    typography: "{typography.control}"
    rounded: "{rounded.surface}"
  zoomControl:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: 2px
  tableRowSelected:
    backgroundColor: "{colors.brand100}"
    textColor: "{colors.foreground}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.cardForeground}"
    rounded: "{rounded.surface}"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popoverForeground}"
    rounded: "{rounded.md}"
    width: 500px
  brandTile:
    backgroundColor: "{colors.brand50}"
    textColor: "{colors.brand600}"
    rounded: "{rounded.surface}"
    size: 48px
  inkPill:
    backgroundColor: "{colors.ink}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.full}"
    padding: 10px 16px
  softPill:
    backgroundColor: oklch(1 0 0 / 0.6)
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 10px 16px
  demoTile:
    backgroundColor: "{colors.tileWash}"
    rounded: "{rounded.2xl}"
    padding: 24px
  nightPanel:
    backgroundColor: "{colors.nightPanel}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.2xl}"
    padding: 56px
  skipLink:
    backgroundColor: oklch(1 0 0)
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: 8px 16px
---

# Design System: raseeda

## Overview

**Creative North Star: "The Precise Paper Desk"**

raseeda is a local-first invoice generator: no accounts, no tracking of
individuals, all invoice data in the browser's IndexedDB. The interface should
feel like a precise, trustworthy document tool, closer to a spreadsheet or a
design canvas than to a consumer landing page. The invoice being edited is the
loudest thing on screen: a sheet of white A4 paper lying on a grey desk,
surrounded by quiet chrome.

The visual language is deliberately quiet around that sheet. Chrome is
achromatic, the brand accent is a single deep-teal ramp, radii are small, and
controls are compact. The paper itself never changes with the app theme,
because it is a preview of the PDF that gets downloaded.

The marketing homepage is light and airy: a warm off-white canvas, warm
near-black ink, a pale teal-blue sky with drifting clouds over the real editor,
and pale pastel washes behind short loops of the editor at work. It shows the
product rather than describing it. Ink carries the actions, teal marks the
brand's own column and ticks, and one dark violet panel, the open source
terminal, is the named exception.

**Key Characteristics:**

- Neutral chrome; colour is reserved for the brand accent and for status.
- One accent: the deep-teal `brand` ramp carries every emphasis (one named exception on the homepage).
- White paper on a grey desk: the invoice page previews the PDF exactly.
- Tight geometry in the editor: 3px surfaces, 4px controls, 32px default control height, 13px control text.
- The editor has its own neutral chrome (plain greys, a near-black or near-white primary) and a light/dark switch; the rest of the site is light.
- The homepage is rounder and softer: pills, 12 to 32px corners, rings instead of borders, the real editor in every picture.

## Colors

Colours are defined in OKLCH and split into a semantic layer (roles), a paper
layer (the invoice sheet), a brand ramp (raw scale), and a homepage layer.
App chrome references roles; the invoice page references paper tokens;
emphasis references the ramp.

### Primary

The brand is one deep teal at hue 185. In sRGB, teal holds about half the
chroma blue can at the same lightness, so the ramp reads calm rather than
loud; it keeps the lightness steps of the blue it replaced, so the fill and
ring rules below did not change. Contrast, measured against white, the light
editor (`#fcfcfc`) and the dark editor (`#161616`):

| Step | Hex | White on it | On `#fcfcfc` | On `#161616` |
| --- | --- | --- | --- | --- |
| `brand-400` | `#51b5a9` | 2.46 | 2.40 | 7.35 |
| `brand-500` | `#289288` | 3.78 | 3.68 | 4.79 |
| `brand-600` | `#11746b` | 5.62 | 5.48 | 3.22 |
| `brand-700` | `#0c5952` | 8.18 | 7.98 | 2.21 |

- **Brand Teal** (`brand-600`): the solid accent. Primary buttons in the
  editor (light and dark), a selected row's name, the homepage focus outline,
  text-link and header-link hovers, the ticks in the feature list and
  comparison table, and the step numbers. White text on it passes WCAG AA,
  which is why solid fills sit on 600, not 500. Hover deepens to `brand-700`.
  On the dark editor a 600 fill still clears 3:1 against the panel.
- **Focus Teal** (`brand-500`): the focus ring (`--ring`) in the app and in
  both editor themes, checked switches (`bg-ring`), the invoice field focus
  border, table focus outlines, the undo flash, and the highlighted line's
  edge in the homepage code tiles. It clears 3:1 on the light and dark editor
  alike. Never a fill under white text (3.78:1 fails AA).
- **Deep Teal** (`brand-700` and `brand-800`): hover and pressed fills, the
  info banner's text (`brand-800`); on the homepage, footer link hovers,
  raseeda's comparison header and strings in the code tiles (`brand-700`).
- **Brand Wash** (`brand-50`): the hover and focus fill for editable invoice
  fields, the info banner, the 404 and error icon tile, the homepage step
  numbers, raseeda's column in the comparison table and the highlighted code
  line. Pairs with `brand-200` borders and `brand-600` to `brand-700` text.
  `brand-100` is the selected list row and the homepage text selection colour.
- **Dark Teal Text** (`brand-400`): brand text and icons on dark surfaces,
  and the ring outside the editor in dark mode.

### Homepage

- **Canvas** (`canvas`): the warm off-white ground of the homepage and the
  privacy page.
- **Ink** (`ink`, `#262823`): headings, links, the wordmark and the Create
  invoice pill (hover `ink` at 85%). The hero lead is `ink` at 75%.
- **Copy Grey** (`copyGrey`, Tailwind `zinc-600`): body copy. The homepage's
  neutrals are the zinc scale: `zinc-500` for footer and question-group
  labels, code-tile paths, line numbers and crosses, `zinc-400` for
  external-link arrows, and `zinc-950` at 5% (tiles) or 10% (white cards, the table, menus)
  for rings and row hairlines.
- **Sky** (`sky`, hue 205): the hero ground, paling and turning a touch
  greener towards a white haze at the horizon (`bg-sky`, tunable through
  `--sky-hue`, `--sky-chroma`, `--sky-lightness`). **Glow** (`glow`) is the
  same hue gone pale for the closing panel, with a deeper dome of it rising
  from the foot.
- **Tile hues** (`TILE_HUES` in `components/home/feature-demos.tsx`, OKLCH hue
  angles): sky 205, lavender 295, sage 145, butter 92, blush 35. A tile is a
  `tileWash` of its first hue (`oklch(0.975 0.014 h)`) with two soft blobs
  (`oklch(0.94 0.035 h1)` and `oklch(0.95 0.03 h2)`). Each card takes its own
  pair, so neighbours never match. They mark content, never actions or links.
- **Night Panel** (`nightPanel`, `zinc-950`) with **Aurora Violet**,
  **Aurora Indigo** and **Aurora Magenta** lights and the **Terminal Screen**
  (`terminalScreen` at 95%): the Run your own copy panel only (see the
  Terminal Exception Rule). Inside the terminal, output keeps Bun's and Vite's
  own colours (`emerald`, `cyan`, `pink` prompt, `zinc` dims).
- The `lavender`, `sage`, `butter` and `blush` `-tint` / `-ink` tokens still
  defined in `globals.css` are no longer referenced; tiles use the hue angles.

### Neutral

App chrome (semantic roles, from `:root`):

| Role | Value | Use |
| --- | --- | --- |
| `background` / `foreground` | white / near-black | Chrome surfaces and default text |
| `card` / `popover` | white | Raised surfaces, menus, dialogs |
| `primary` | near-black | Neutral solid emphasis (non-brand), link text |
| `secondary` / `muted` / `accent` | `oklch(0.97 0 0)` | Subtle fills, hover states, dialog footers |
| `muted-foreground` | `oklch(0.556 0 0)` | Secondary and caption text in chrome |
| `border` / `input` | `oklch(0.922 0 0)` | Hairlines and field outlines |

The editor redefines these roles with plain greys (see the Dark Mode Honesty
Rule): light `#fcfcfc` panels, `#1c1c1c` text, `#646464` muted text; dark
`#161616` panels, `#f5f5f5` text, `#a8a8a8` muted text. The homepage's
pictures of the editor (`[data-editor-chrome]`) take the light set.

Paper (the invoice sheet; see the Paper Rule):

- **Paper** (`paper`, white): the A4 page surface.
- **Ink** (`paper-foreground`, a cool near-black): all invoice text.
- **Paper Wash** (`paper-muted`): empty logo slot and quiet fills on the page.
- **Pencil** (`paper-muted-foreground`, about 6:1 on paper): placeholders,
  field labels, and inactive toggles on the page.
- **Paper Edge** (`paper-border`): the hairline around the sheet.
- **Desk** (`desk`): the cool grey backdrop the sheet lies on in the editor.

PDF palette: react-pdf cannot read CSS variables, so the renderer uses literal
hex. `#6b7280` (`pdfMuted`) is the muted label grey in the details, terms, and
text sections; `#71717a` (`pdfMutedZinc`) is the label grey in payment details.
These are intentional PDF palette entries, not drift. The brand teal never
appears on a PDF: the invoice belongs to its sender, not to raseeda.

Browser chrome: the `theme-color` meta and the manifest's `theme_color` are
`#11746b`, the hex of `brand-600`; while the editor is open the meta follows
its top bar (`#fcfcfc` or `#161616`, `utils/editor-theme.ts`). The favicon and
app icons are a `#1e877d` to `#11746b` gradient (`brand-600` at the foot).

### Status

- **Destructive** (`oklch(0.577 0.245 27.325)`): delete and danger, always as a
  tint (10 to 20% fill with destructive text), never a loud solid.
- **Success** (`oklch(0.627 0.155 149.21)`): positive status.
- **Warning** (`oklch(0.745 0.153 74.2)`): cautionary status in the editor.
- **Info** is the brand: the editor banner's info tone is `brand-50` with
  `brand-500` icons and `brand-800` text.

### Named Rules

**The One Voice Rule.** The teal `brand` ramp is the only accent. Never
introduce a second hue for emphasis; status colours are for status only, the
homepage's tile hues mark content only, and the night panel is the one
recorded exception.

**The Terminal Exception Rule.** The Run your own copy panel is a dark
`zinc-950` surface lit by violet, indigo and magenta lights, with a violet band
running round its terminal. It is deliberate and approved, and it stays inside
that one panel: violet appears nowhere else on the site except as the keyword
colour in the code tiles.

**The Ink Action Rule.** Homepage actions are ink, not teal: the primary
action is a solid `ink` pill and secondary actions are frosted white pills.
Teal on the homepage marks and hovers; it never fills a button there.

**The 600 Fill Rule.** Solid brand fills under white text are `brand-600` or
darker. `brand-500` is for rings, switches and borders.

**The Paper Rule.** The invoice page is white paper with dark ink in every app
theme, because it previews the printed PDF. Anything drawn on the page uses
`paper-*` tokens (or the brand wash for edit affordances), never chrome roles
or raw Tailwind greys or blues.

**The Token Rule.** Brand colour comes from the `brand-*` ramp, never raw
Tailwind `blue-*`, `teal-*` or hex, so the next change of hue stays a change to
`globals.css` and the icons.

**The Dark Mode Honesty Rule.** Only the editor has a dark mode. The `/create`
route sets `data-editor-theme` (and `.dark` when dark) on `<html>` before first
paint and clears it on the way out, and the `html[data-editor-theme]` blocks in
`globals.css` redefine the chrome roles for it (light: panels `#fcfcfc`, desk
`#f6f6f6`; dark: panels `#161616`, desk `#121212`). The page (`[data-paper]`)
takes the light roles back in both themes, and `dark:` utilities skip it. The
homepage and privacy page stay light; do not claim dark mode for them.

## Typography

**Editor Font:** Geist Variable (with the system UI stack)
**Homepage Font:** Schibsted Grotesk Variable (with sans-serif), `--font-home`
**Mono Font:** Geist Mono Variable, for the homepage code tiles and terminal

**Character:** the editor speaks in one even, neutral sans so the invoice's own
font can lead. The marketing pages set headlines in Medium with tight negative
tracking (-0.035em), balanced, and keep everything else Regular in grey.

Geist is set on `<body>` and is what every piece of app chrome renders in.
Inter Variable is wired as `--font-sans` on `<html>`, but no element opts into
it, so it does not render in the UI; it remains available in the invoice font
library. The homepage wrapper sets `font-home`; the privacy page sets
`font-geist`; every picture of the editor on the homepage (`EditorWindow` and
the demo scenes) sets `font-geist` so it matches the product.

### Hierarchy

Editor (app values):

- **Title** (`title`, Medium 16px): the document name in the top bar, dialog
  titles.
- **Label** (`label`, Medium 14px; 12px in `xs` controls): buttons, menu
  triggers, table headers.
- **Body** (`body`, Regular 14px): chrome text.
- **Control** (`control`, 13px, Regular, Medium for row names, Semibold for
  inspector section headers): menu and context-menu items, the command
  palette, inspector rows and fields, the invoices panel, invoice and template
  list rows, the open dialogs' lists, the download popover, and the status
  banner from `sm`. It is the app value of the `body` role in
  `lib/type-scale.ts` (13/20), written `text-[13px]`.
- **Caption** (`caption`, Regular 12px): `xs` buttons and meta.

Homepage (roles from `lib/type-scale.ts`, set at marketing values by
`.home-type`):

- **Display** (`homeDisplay`, the `display` role): the hero h1 and the closing
  h2, two lines, both `ink`, growing fluidly from 32px to 60px.
- **Headline** (`homeHeadline`, the `title` role): section h2s, capped at 35ch,
  growing from 28px on phones to 36px by 672px so they stay a clear step below
  the hero's headline.
- **Title** (`homeTitle`, the `subtitle` role, 16px from `sm`): step, card and
  proof h3s. Its compact step (16/24) sets the question summaries.
- **Lead** (`homeLead`, `ink` at 75%, 48ch): the hero paragraph only.
- **Body** (`homeBody`, the `body` role; 14/24 from `sm`): all reading copy,
  `copyGrey`, balanced, capped at 40ch to 64ch. Its compact step (16/24, 14
  from `sm`, Medium) sets single-line controls: nav links, pill labels, the
  feature list.
- **Caption** (`homeCaption`, the `caption` role): the step numbers (Semibold,
  tabular) and comparison row labels.
- **Code** (`code`): file lines in the code tiles at 12/24; the terminal at
  13/24.
- **Wordmark** (`wordmark`): the name in the page's own face and `ink`, a touch
  looser than tight tracking, in a 44px tap box.

Weights map to a fixed scale: Regular 400, Medium 500, Semibold 600, Bold 700.
UI labels and buttons are Medium. Text sizes come from the Tailwind scale or a
type role; avoid other arbitrary `text-[N]` values in feature code (13px is a
recorded step). Numbers use tabular figures. Homepage copy uses typographic
(curly) apostrophes.

Separately, raseeda ships an invoice font library (`consts/invoice-fonts.ts`)
that is a user-facing product feature, not app chrome. Users pick from ten
sans-serif, serif, and monospace faces at three sizes for the rendered invoice;
the canvas applies the chosen family and tracking to the paper. The homepage's
font demo scrolls the library's real faces. Keep this library independent from
the app's own type tokens.

### Named Rules

**The Role Rule.** Homepage and privacy-page text takes its size and leading
from a `lib/type-scale.ts` role through `typeClass()`; `.home-type` re-sets the
role variables at marketing values. Pick a role, never a hand-written size.

**The 13px Control Rule.** Dense editor controls are 13px; buttons stay 14px
Medium and meta drops to 12px. The homepage's pictures of the editor mirror
13px so they read as the product.

## Layout

- **Spacing** follows the Tailwind 4px scale (`1` = 4px). Dense chrome favours
  `1` to `3` (4 to 12px); section rhythm uses `4` to `8` (16 to 32px) in the
  editor and `12` to `20` (48 to 80px) on the homepage.
- **Dividers use gaps, never borders-between.** Hairline separations are built
  with `gap-px` on a `bg-border` parent, with each child carrying its own
  background, or with a `border-t` owned by each item. This is a hard project
  rule: no `space-y-*`, `space-x-*`, `divide-x`, or `divide-y`. Stack with
  `flex flex-col gap-N`, rows with `flex items-center gap-N`, matrices with
  `grid gap-N`.
- **Controls are compact.** Default control height is 32px (`h-8`); a size ramp
  runs `xs` (24px), `sm` (28px), `default` (32px), `lg` (36px), plus square icon
  variants at matching sizes.
- **Touch gets 44px.** Coarse pointers enlarge the targets that matter through
  `pointer-coarse:` variants: the editor's top bar buttons, download button,
  canvas pill controls and inspector rows reach 44px. On the homepage, footer
  links and the phone menu button are 44px, and the pills and header link
  carry an invisible 48px hit area on coarse pointers. Fine pointers keep the
  compact sizes.
- **Editor frame.** A 48px top bar sits above three columns: the invoices panel
  (256px), the desk, and the inspector (288px). Both panels slide shut to
  nothing. The desk centres the page with 12px padding on phones and 32px from
  `md` up, plus 80px bottom padding so the canvas pill never covers the page
  foot.
- **Phones (below 768px).** As in Canva and tldraw, the top bar keeps only the
  project menu, the name with its status dot, and Download. A 56px tab bar
  along the bottom (`background`, top `border`) holds Invoices, Style,
  Preview/Edit and a zoom tab (Zoom in at Fit, Fit page when zoomed, Done
  after a tapped field zoomed in). The panels open as bottom sheets (70dvh,
  `rounded-t-2xl`, `shadow-floating`) above the tab bar with a tap-to-close
  backdrop, and the canvas pill is hidden. The light/dark switch is also in
  the project menu.
- **The page is viewport-independent.** The A4 sheet is fixed at 210mm by at
  least 297mm with 40pt padding, and nothing inside it uses responsive
  breakpoints, so what you see on screen matches the PDF. Small screens scale
  the whole sheet with zoom; they never reflow it.
- **Zoom.** Presets run 50% to 200%, plus Fit. Below 768px the editor opens at
  Fit so the whole invoice is visible; wider screens open at 100%. The editor
  owns zoom gestures: the browser's pinch and double-tap zoom are off on
  /create (`touch-action: pan-x pan-y` on `<html>`, Safari's `gesture*`
  events cancelled), so they never scale the top bar or tab bar. Pinching the
  desk zooms the page (25% to 300%) around the fingers, a trackpad pinch
  (Ctrl/⌘ wheel) does the same on a laptop, and double-tapping bare paper or
  desk flips between Fit and 100% (animated). While a gesture runs, only a
  GPU transform on the page's wrapper changes (`hooks/use-canvas-gestures.ts`);
  the real zoom is committed in one render when it ends, so pinching keeps up
  with the display's refresh rate. On a phone, tapping a field on the fitted
  page zooms to 100% with the field high on the screen, clear of the
  keyboard. The viewport sets `maximum-scale=1` so iOS never zooms into a
  focused field, and `interactive-widget=resizes-content` so Android's
  keyboard shrinks the editor instead of covering it.
- **Homepage column.** Content sits in a `max-w-6xl` (72rem) column with 24px
  gutters (32px from `lg`), shared with the privacy page
  (`components/home/site-chrome.tsx`). Order: header, hero, How it works,
  privacy, features, comparison, open source, questions, closing panel,
  footer. Sections pad 64px vertically (80px from `sm`) and are separated by
  that air alone, never by rules.
- **Section headings.** A heading (35ch) over its description (48ch), 24px
  apart; from `lg` they split into a row, the description at the right, both
  aligned at the foot. The comparison centres them.
- **Hero.** The sky pulls up under the 64px header, runs edge to edge below
  `lg` and is inset 12px with 32px corners from `lg`. Copy sits left on phones,
  in line with the editor crop below it, and centred from `sm`. The editor
  window rises from the sky's foot and is cut by it: from `lg` the whole
  1440px window scales into the column; below it a fixed-zoom crop (0.55,
  0.65 from `sm`, 0.75 from `md`) runs off the right edge.
- **Grids.** Steps and privacy proofs run three across from `md`, features two
  across; all use 24px column and 48px row gaps, with each card's text 24px
  under its tile. Questions split one third (heading) to two thirds (groups)
  from `lg`. The footer runs two link columns, three from `sm`. Everything
  stacks below its breakpoint.
- **Phones and tablets.** Below `lg` the section links fold into a native
  disclosure menu;
  below `sm` the header's Open the editor link is hidden, since the hero's
  button sits right under it. Once the hero's buttons scroll away, the sticky
  header's Create invoice pill shows at every width.
- **Works before hydration.** Menus and questions are native `<details>`, and
  the hero entrance and cloud phases are inline scripts that run while the
  HTML parses, so nothing waits for JavaScript or shifts when it arrives.
- **Storage refused.** When the browser blocks storage, a note with an
  `amber-600` warning icon sits right under the hero's buttons, in `ink` at
  80%, saying what still works and how to fix it, before anyone starts.
- **Print is a first-class target.** `@page` is A4 with 16mm margins;
  `.invoice-page` forces page breaks, `.avoid-break` prevents mid-block splits,
  `.no-print` hides chrome, and print colour-adjust is forced `exact`.

## Elevation & Depth

Depth is minimal and cool-neutral, never heavy. In the editor, flat in-flow
surfaces separate with a hairline border and shadows are reserved for things
that genuinely float. On the homepage, white cards and tiles are outlined with
a faint ring, and shadows lift only what sits on a tile or on the sky.

### Shadow Vocabulary

- **Menu** (`--shadow-menu`: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px
  rgb(0 0 0 / 0.1)`): menus, popovers, dropdowns, selects, context menus,
  dialogs, the canvas pill and the floating zoom control. The standard
  floating chrome shadow.
- **Floating** (`--shadow-floating`: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px
  10px -6px rgb(0 0 0 / 0.1)`): the editor's side panels when they open as
  bottom sheets on phones.
- **Paper lift** (Tailwind `shadow-md`): the A4 sheet resting on the desk, and
  the PDF page in the homepage's editor window. Removed in print.
- **Ring**: dialogs, menus and the canvas pill also carry a 1px
  `foreground/10` ring; dialogs sit over a 50% black scrim.
- **Bezel** (`0 24px 64px -16px rgb(16 60 90 / 0.25)`): the frosted frame of
  the hero's editor window, a blue-tinted shadow cast on the sky.
- **Lifted** (`0 8px 24px -8px rgb(16 40 60 / 0.18)`, with a `zinc-950/5`
  ring): white panels and paper inside demo tiles and the code tiles' file.
- **Pill** (`inset 0 1px 0 rgb(255 255 255 / 0.12), 0 1px 2px rgb(0 0 0 /
  0.16)`): the ink pill's top highlight and contact shadow.
- Pressed feedback on buttons is a scale to 97% (`active:scale-[0.97]`, skipped
  for menu triggers), not a shadow change.

### Named Rules

**The Float-Only Shadow Rule.** A shadow means "this is above the page". In-flow
cards, rows, and panels get a hairline, not a shadow.

**The Ring Rule.** On the homepage, containers are outlined with a 1px ring,
never a border plus shadow: `zinc-950` at 5% around tiles, at 10% around white
cards, the comparison table, question groups and menus; `white` at 5% around
the night panel.

## Shapes

Editor geometry is intentionally tight, which is what gives the tool its
exacting feel. The two everyday radii are named tokens, not arbitrary values:

- **Surface** (`rounded-surface`, 3px): the dominant radius for cards, panels,
  inputs, invoice fields, chips, icon tiles, menus, menu items, previews, and
  the 404 and error icon tile.
- **Control** (`rounded-control`, 4px): buttons and the zoom control.
- **Dialog** (`rounded-md`, 6px), also the inspector's filled fields.
- The derived scale (`rounded-lg` and up, from `--radius: 0.5rem`) is for the
  few softer surfaces: the canvas pill (`rounded-xl`, 12px) and the phone
  sheets (`rounded-t-2xl`).

Keep new editor components on the `surface` / `control` tokens unless there is
a reason to reach for the softer derived scale. Nothing in the editor is a
pill.

The homepage is rounder by design:

- **Pill** (`rounded-full`): the ink and soft pills, nav links, the skip link,
  the step-number discs and the menu button.
- **12px** (`rounded-xl`): white cards (Also in the editor), question groups,
  the phone menu panel, the terminal and the code tiles' file corner.
- **About 14px** (`rounded-2xl`, 0.9rem): demo tiles, code tiles, the
  comparison table and the night panel.
- **32px** (`rounded-[2rem]`): the hero sky and the closing panel from `lg`.
- **Bezel**: 16px (20px from `sm`) outer corners on the editor window's frame,
  the inner window inset by the frame's padding; only the top corners round,
  since the sky cuts the foot. Pictures that run off a tile's edge round only
  the corner that shows.

## Components

Primitives are shadcn/ui (new-york) over Base UI, themed with CVA. Import
directly from `components/ui/*` (no barrel exports). Icons are Tabler
(`@tabler/icons-react`), 16px by default inside buttons. Lists keep native
`<ul>` / `<ol>` semantics without an explicit `role="list"` (project lint
rule); note that Safari VoiceOver may not announce `list-style: none` lists as
lists.

### Buttons

- **Shape:** gently squared (`rounded-control`, 4px), Medium 14px label;
  colour, border, shadow, opacity and scale transition over 150ms ease-out,
  with the 97% press.
- **Primary (`default`):** `brand-600` fill, white text, hover `brand-700`. The
  primary CTA in the app.
- **Hover / Focus:** `focus-visible:ring-1 ring-ring` (brand-500); disabled is
  50% opacity.
- **Outline:** `border` hairline on `background`, hover `muted`.
- **Secondary:** `secondary` fill, hover mixes 5% foreground.
- **Ghost:** transparent, hover `muted`. Used in the zoom control and toolbars.
- **Destructive:** tinted `destructive/10` fill with `destructive` text (never a
  loud solid red), hover `/20`.
- **Link:** `primary` text, underline on hover.

### Inputs / Fields

- **Style:** 32px height, `rounded-surface`, `border-input` hairline,
  transparent fill, `muted-foreground` placeholder.
- **Focus:** border shifts to `ring` (brand-500).
- **Error / Disabled:** `aria-invalid` swaps the border to destructive; disabled
  dims to 50%.

### Invoice Fields (signature)

Text and textarea fields drawn on the paper. At rest they are invisible: no
border, no fill, `paper-foreground` ink, `paper-muted-foreground` placeholders.
Hover lays a `brand-50` wash; focus keeps the wash, adds a `brand-500` border,
and opens 4px by 8px of padding so the edit affordance reads as a highlighted
patch of paper. No raw Tailwind blue.

### Invoice Page and Desk (signature)

The A4 sheet (`paper`, `paper-border` hairline, `shadow-md`, 40pt padding) is
centred on the `desk` backdrop and scaled as a whole by the zoom level. It takes
the user's chosen invoice font and tracking.

Editing controls on the page stay out of sight until reached for: "Add item" is
a quiet row under the table on hover or focus, remove buttons and the pricing
type toggles appear on row hover, and the empty logo box is a faint dashed
square whose label shows on hover. On touch they are always shown. Preview
hides all of them, every placeholder, and every empty row the PDF would skip.

### Canvas Pill (signature)

A floating toolbar centred 12px above the bottom of the desk, like Framer's:
`popover` surface, `rounded-xl`, `shadow-menu`, a hairline ring. An Edit/Preview
segmented control, zoom minus/percentage/plus (the percentage opens a zoom
menu), the light/dark switch, and the quick actions (⌘K) button.

### Inspector (signature)

The right panel holds every whole-invoice setting, in collapsible sections:
Style (font tiles, weight and size segmented controls), Details (currency,
issue date, payment terms, date format), and Sections (switches for each
optional part of the invoice). Dates are always picked from a calendar, on
the page and in the inspector, and written in the invoice's date format. Rows
are 13px, labels `muted-foreground`, fields `muted` fills (`rounded-md`).

### Navigation

- **Editor top bar:** 48px, `background` with a bottom `border` hairline, in
  three parts. Left: the logo opens the project menu (the file commands, quick
  actions, back to the homepage), then the invoices panel toggle. Centre: the
  document name (a heading button that renames it; a new invoice is named
  from its number and client until then). Every edit saves itself, so there's
  no save state shown while saving works. Right: the inspector toggle,
  Preview, and Download, which opens a popover with the file name, total and
  last-saved time. Phones add undo and redo ghost icon buttons beside
  Download while editing.
- **Editor status banner:** under the top bar, only when something needs
  saying: a failed save (`destructive` 8% fill, `role="alert"` once per run of
  failures, Retry and Download backup), the invoice open in another tab
  (`muted`, Edit here), deleted elsewhere, storage unavailable or a reload
  needed (`warning` 12%), and once in Safari a dismissible backup suggestion
  (`muted`, Download backup, a close button). 16px text on phones, 13px from
  `sm`, `xs` buttons; on a phone the actions drop below the words, and the
  icon lines up with the first line.
- **Editor entry points:** `/create` accepts two optional search params.
  `font` (any invoice font id) styles a fresh, untouched blank invoice and is
  then cleared; `open=invoices` opens the Open Invoice dialog.
- **Homepage skip link:** the first focusable element, "Skip to content", a
  white pill with a `zinc-950/10` ring and `shadow-lg`, fixed 12px from the
  top-left, held its own height plus 40px above the viewport (clear of its
  shadow) and slid into place on focus.
  Targets `<main id="main">`.
- **Homepage header:** 64px, sticky, over the hero's sky (20px top padding from
  `lg`). The `ink` wordmark on the left (named "raseeda home" to assistive
  tech); from `lg`, centred section links (How it works, Privacy, Features,
  Compare, Questions) as `zinc-600` pills, hover `ink`; on the right, from
  `sm`, a 36px pause icon button (`zinc-600`, hover `ink/5` fill) and an "Open
  the editor" `ink` text link with an arrow, hover `brand-800`. As soon as the hero's headline reaches the bar it takes `canvas`
  at 90% with a 12px backdrop blur and a 1px `zinc-950/8` bottom shadow, and
  rises by its `lg` padding so the bar sits flush, all easing together over
  300ms; no text ever passes under a clear bar. When the hero's buttons pass
  under it, the link becomes the Create invoice ink pill (fade and 95% zoom in
  over 200ms). Anchored sections stop 72px down so the header never covers
  their heading. Below `lg` the links fold into a native `<details>` menu: a
  44px menu-icon summary opening a 224px white `rounded-xl` panel
  (`zinc-950/10` ring, `shadow-lg`) of `rounded-lg` rows that fill `zinc-100`
  on hover, ending with the pause row; it closes on navigation, Escape or a tap outside.
- **Homepage footer:** a `<footer>` landmark outside `<main>`, shared with the
  privacy page: three link columns (Make invoices, Learn more, Open source)
  under `zinc-500` labels (plain text naming each list, not headings), `ink` links that hover to `brand-700` (44px tall,
  36px from `sm`); external links open in a new tab, show a `zinc-400`
  up-right arrow and say "(opens in a new tab)" to screen readers. A
  `zinc-950/10` top hairline closes it with the wordmark, "by" its maker, and
  a `zinc-500` licence line.
- **Homepage focus:** every link, pill and summary draws a 2px `brand-600`
  outline offset 2px (`FOCUS_RING`), not the app's 1px ring.

### Menus, Popovers, Dialogs

Menus, popovers, dropdowns, selects, and context menus: `popover` surface,
`rounded-surface`, 1px `foreground/10` ring, `shadow-menu`, 13px items
`rounded-surface` with `accent` focus fill. Dialogs: `popover` surface,
`rounded-md`, `foreground/10` ring and `shadow-menu` over a black/50 scrim,
500px wide (16px margins on phones), easing in on `--ease-out-strong` over
200ms. An optional 40px round icon disc leads the header in a tinted tone.
The footer either stacks full-width 40px buttons on phones and right-aligns
32px ones from `sm`, or is a bar under a top hairline with the buttons
right-aligned.

### Tables

`components/tables/*`: dense 13px rows; selected rows fill `brand-100`
(`brand-500` at 20% in dark) with the name in `brand-600` (`brand-400` in
dark); keyboard focus draws a 2px inset `brand-500` outline. Row groups
separate with `gap-px`, not `divide-y`.

### Brand Icon Tile

`brand-50` fill, `brand-200` border, `brand-600` icon, `rounded-surface`,
48px: the mark at the head of the 404 and error pages.

### Ink Pill (signature)

The homepage's one primary action, a single component (`CreateInvoiceLink`),
always labelled "Create invoice": a solid `ink` pill with white Medium text
(16px, 14px from `sm`), 10px by 16px of padding (8px vertical from `sm`), the
Pill shadow, and a hover to `ink` at 85% over 200ms ease-in-out. It appears in
the hero and the closing panel. It preloads the editor on hover or touch, not
on sight.

### Soft Pill

The secondary action beside the ink pill on a coloured panel ("See how it
works", "View the source"): the same pill in frosted white (`white/60`,
`white/80` ring, small backdrop blur) with `ink` text, hover `white/85`, so it
never outweighs the ink one. Text links elsewhere are Medium `ink` with an
icon, hovering to `brand-600`.

### Editor in a Bezel (signature)

The hero shows the real editor layout (`EditorWindow`, both panels open, the
canvas pill on the desk) with a real PDF render of an invoice on its page,
drawn at 1440px and scaled into a frosted frame (`white/45`, `white/70` ring,
8px padding, Bezel shadow). Phones, too narrow for both panels and the page,
see only the desk: the window framed on the page and its margins and scaled
to fit (6px padding), so the whole invoice, logo to payment details, is what
they see. Homepage pictures of the editor are
built from the editor's own pieces under `data-editor-chrome`, never drawn
from memory; non-editor pictures are real PDF renders.

### Demo Tile (signature)

Each step and feature card leads with a tile (`DemoTile`) that plays a short
loop of the editor doing that job: a `tileWash` of its first hue with two soft
blobs of its pair drifting across it, `rounded-2xl`, a `zinc-950/5` ring, and
16px padding (24px from `sm`) unless the scene bleeds to the edges. Scenes use
the editor's own fields, switches, inspector rows and popovers on Lifted
white panels, in Geist at the editor's sizes, and narrower phone layouts keep
their text readable. Steps are 4:3, features 16:10 from `sm`. Under each tile
sit a Title and Body; step titles lead with a 28px `brand-50` disc holding a
`brand-600` Semibold number.

### Code Tile (signature)

Each privacy promise is a still tile like the demo tiles holding two Lifted
white cards. First, what it means for your data: a `rounded-xl` card of three
rows (label left, status right in Medium `ink` after a `brand-600` filled
check, or a ban icon for what is refused), split by `zinc-950/5` hairlines.
Below it, the lines of code that keep it: a white file (`rounded-tl-xl`) that
runs off the tile's right and bottom edges, its lines fading out over the
last 48px so a long one reads as continuing. Its header is the file path in 12px
Geist Mono `zinc-500` linking to those lines on GitHub; the lines are 12/24
`zinc-800` with `zinc-500` tabular line numbers, strings in `brand-700`,
keywords in `violet-600`, and the line that does the work on `brand-50` with a
2px `brand-500` left edge. Every tile is as tall as its contents; the three
sit in a row from `lg` and stack below it, so the outcome rows never squeeze.

### Comparison Table

A real `<table>` laid out as one grid per row: a white `rounded-2xl` card with
a `zinc-950/10` ring, at most 896px wide. raseeda's column alone carries
colour: a `brand-50` band with a `brand-700` header and filled `brand-600`
check discs. Other columns answer in greys (an `ink` tick, a `zinc-500` cross,
or "Some" / "Rarely" in `zinc-600` wherever exceptions exist, so no cross
overclaims), so the shapes read without colour. Rows split with
their own `border-t` (`zinc-950` at 10% under the header, 5% after); phones
use short 12px headers, hyphenated if a column is still too narrow.

### Questions

Native `<details>` in two groups ("Making invoices", "Your data"), each under
a `zinc-500` Body label and drawn as a white `rounded-xl` list with
`zinc-950/10` gap-px hairlines and ring. Each summary is a Medium question at
the compact Title step with a `zinc-500` plus that turns 45 degrees when open;
answers are Body text capped at 64ch. Beside them, the heading, a line
pointing to GitHub issues and an "Ask on GitHub" text link.

### Night Panel (signature)

Run your own copy (`components/home/run-your-own-copy.tsx`), the close of the
open source section: a `zinc-950` `rounded-2xl` panel (24px padding, 40px from
`sm`, 56px from `lg`) that splits 5fr / 7fr from `lg`. Three soft lights
(violet 295, indigo 270, magenta 330) wander behind a dot grid masked to the
lower right. Left: a white 24px Medium heading, `zinc-400` copy and a "Read
the code" pill in `white/10` with a `white/15` ring and GitHub's mark. Right:
a terminal framed by a 1px band of violet-to-pink light that runs round its
edge over `white/8`; a 40px title bar with three `white/10` dots and
`~/raseeda`, and a 400px screen (240px on phones) in 13/24 Geist Mono `zinc-200` that replays a
real clone, `bun install` and `bun run dev`, typed at a human rhythm, then
clears and starts over. This is the Terminal Exception; nothing else on the
site is dark.

### Closing Panel

The last word before the footer mirrors the hero: a `bg-glow` panel (edge to
edge, inset 12px with 32px corners from `lg`) with a dome of the sky's hue
rising from its foot under a masked white dot grid, a Display h2 in two lines,
and the ink pill beside a "View the source" soft pill.

### Homepage Motion

Easing is `--ease-out-strong` (`cubic-bezier(0.23, 1, 0.32, 1)`) for arrivals
and `--ease-in-out-strong` (`cubic-bezier(0.77, 0, 0.175, 1)`) for movement
inside the demos. Only transforms, opacity and filter animate.

- **Hero entrance**, only when the homepage loads as a page: the two headline
  lines, the lead and the pill row come into focus from an 8px blur over
  900ms, 80ms apart; the editor window fades in over 1000ms at 320ms. Under
  reduced motion they only fade.
- **Clouds**: eight gradient clouds cross the sky left to right, linear, each
  at its own pace (89s to 211s, nearer ones faster), from a random point per
  visit. Reduced motion pauses them.
- **Demo tiles** loop per scene (`--loop`) and play only while a third of the
  tile is on screen; reduced motion shows each scene's finished state.
- **Closing glow** breathes 4s each way (easeInOutSine), scale and opacity
  only; still under reduced motion.
- **Night panel**: the lights wander on 13s, 17s and 11s loops, the edge band
  turns every 8s, and the session types; all only while the panel is on
  screen. Under reduced motion the terminal rests on the running dev server.
- **Pause control**: one choice, offered as the header's icon button from
  `sm`, a row in the phones' menu, and "Pause animations" in the footer's
  bottom bar; each appears once the page has hydrated. It stops every loop
  above (`data-home-motion="paused"` on `<html>`, remembered in
  localStorage): demos, lights, edge band and glow rest on their finished
  state, the clouds hold, the terminal keeps its place. It is hidden under
  reduced motion, which already stills the page. New looping motion must stop
  under it too.
- Hovers change colour over 200ms ease-in-out. Nothing is scroll-linked.

## Do's and Don'ts

### Do:

- **Do** reference semantic roles (`bg-background`, `text-muted-foreground`,
  `border-border`) in app chrome so retheming stays possible.
- **Do** use `paper-*` tokens for everything drawn on the invoice page, and
  `brand-50` plus `brand-500` for its edit affordances.
- **Do** put solid brand fills on `brand-600` (hover `brand-700`) and keep
  `brand-500` for focus rings and borders.
- **Do** keep the A4 page free of responsive breakpoints; scale it with zoom.
- **Do** give coarse pointers 44px targets with `pointer-coarse:` variants.
- **Do** separate stacked and adjacent surfaces with `flex` or `grid` plus
  `gap-*` (use `gap-px` on a coloured parent for hairlines).
- **Do** stay on `rounded-surface` / `rounded-control`, the 32px control
  height and 13px control text for editor chrome.
- **Do** reach for `shadow-menu` for floating chrome rather than picking raw
  shadow utilities per component.
- **Do** tint destructive actions; reserve solid saturated fills for the brand.
- **Do** mirror any new PDF colour as a literal hex in the renderer and record
  it in the PDF palette here.
- **Do** use the one `CreateInvoiceLink` ink pill for the homepage's primary
  action, with a soft pill beside it for the secondary one.
- **Do** size homepage text with a type role through `typeClass()`.
- **Do** show the product on the homepage with the editor's own pieces under
  `data-editor-chrome`, in Geist at the editor's sizes, or with real PDF
  renders.
- **Do** give each homepage tile its own pair of `TILE_HUES` so neighbours
  never match.
- **Do** run looping homepage motion only while it is on screen, in CSS on
  transforms and opacity, and hold it still or at its end state under reduced
  motion.
- **Do** prove privacy claims with something the visitor can check (the real
  lines of code, links to them) rather than decorative ticks.

### Don't:

- **Don't** use `space-y-*`, `space-x-*`, `divide-x`, or `divide-y` (breaks
  with conditional and fragment children; owner-controlled `gap` is the rule).
- **Don't** put white text on `brand-500` or lighter; it fails AA.
- **Don't** put brand teal on the PDF.
- **Don't** let the invoice page follow the app theme or use chrome roles,
  raw `zinc-*`/`blue-*`/`teal-*`, or responsive classes.
- **Don't** hard-code hex or raw greys in editor chrome; hex belongs to the PDF
  renderer and the editor theme blocks in `globals.css`.
- **Don't** introduce a second accent hue, or bring back the coral accent the
  rename brief proposed; the night panel's violet is the one recorded
  exception and stays inside that panel.
- **Don't** fill a homepage button with teal, or use a tile hue for an action
  or a link.
- **Don't** reach for heavy or black shadows; prefer a hairline border or ring,
  and keep any shadow soft and neutral.
