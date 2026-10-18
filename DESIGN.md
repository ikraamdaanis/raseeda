---
version: alpha
name: raseeda
description: >-
  Design system for raseeda, a free, local-first invoice generator that runs
  entirely in the browser. The editor is a compact, document-grade tool:
  neutral grayscale chrome, a single blue-violet brand accent, white paper on a
  grey desk, and tight geometry that reads like a precise instrument. The
  marketing homepage is a security-printed document in the same blue.
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
  ring: oklch(0.603 0.218 257.42)
  paper: oklch(1 0 0)
  paperForeground: oklch(0.21 0.006 285.885)
  paperMuted: oklch(0.967 0.001 286.375)
  paperMutedForeground: oklch(0.5 0.016 286)
  paperBorder: oklch(0.871 0.006 286.286)
  desk: oklch(0.92 0.004 286.32)
  brand50: oklch(0.957 0.02 277)
  brand100: oklch(0.925 0.036 273.72)
  brand200: oklch(0.839 0.079 271.26)
  brand300: oklch(0.762 0.121 268.88)
  brand400: oklch(0.677 0.17 263.89)
  brand500: oklch(0.603 0.218 257.42)
  brand600: oklch(0.505 0.183 257.47)
  brand700: oklch(0.419 0.152 257.57)
  brand800: oklch(0.322 0.117 257.5)
  brand900: oklch(0.235 0.085 257.39)
  brand950: oklch(0.18 0.064 257.25)
  tint: oklch(0.972 0.01 185)
  tintDeep: oklch(0.945 0.016 185)
  guilloche: oklch(0.85 0.035 190)
  perforation: oklch(0.78 0.02 210)
  ink: oklch(0.25 0.07 257)
  inkMuted: oklch(0.42 0.045 257)
  numbering: oklch(0.52 0.19 27)
  pdfMuted: "#6b7280"
  pdfMutedZinc: "#71717a"
  themeColor: "#005fca"
typography:
  display:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: 4.25rem
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: -0.025em
    fontVariation: '"wdth" 125'
  headline:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: 3rem
    fontWeight: 600
    lineHeight: 1.02
    letterSpacing: -0.025em
    fontVariation: '"wdth" 125'
  formLabel:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: 0.6875rem
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.14em
    fontVariation: '"wdth" 125'
  plateLabel:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1
    letterSpacing: 0.1em
    fontVariation: '"wdth" 125'
  numbering:
    fontFamily: '"Archivo Variable", sans-serif'
    fontSize: 3rem
    fontWeight: 700
    lineHeight: 1
    fontFeature: '"tnum"'
    fontVariation: '"wdth" 62'
  wordmark:
    fontFamily: '"Bricolage Grotesque Variable", sans-serif'
    fontSize: 20px
    fontWeight: 600
    letterSpacing: -0.025em
  body:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  lead:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.55
  title:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
  caption:
    fontFamily: '"Geist Variable", sans-serif'
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.4
rounded:
  none: 0px
  surface: 3px
  control: 4px
  sm: 4px
  md: 6px
  lg: 0.5rem
  xl: 12px
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
  zoomControl:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.control}"
    padding: 2px
  tableRowSelected:
    backgroundColor: "{colors.brand600}"
    textColor: "{colors.primaryForeground}"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.cardForeground}"
    rounded: "{rounded.surface}"
  dialog:
    backgroundColor: "{colors.popover}"
    textColor: "{colors.popoverForeground}"
    rounded: "{rounded.sm}"
  badge:
    backgroundColor: "{colors.brand50}"
    textColor: "{colors.brand700}"
    rounded: "{rounded.surface}"
  engravedPlateSm:
    backgroundColor: "{colors.brand700}"
    textColor: oklch(1 0 0)
    typography: "{typography.plateLabel}"
    rounded: "{rounded.control}"
    height: 36px
    padding: 0 16px
  engravedPlate:
    backgroundColor: "{colors.brand700}"
    textColor: oklch(1 0 0)
    typography: "{typography.plateLabel}"
    rounded: "{rounded.control}"
    height: 48px
    padding: 0 24px
  engravedPlateLg:
    backgroundColor: "{colors.brand700}"
    textColor: oklch(1 0 0)
    typography: "{typography.plateLabel}"
    rounded: "{rounded.control}"
    height: 56px
    padding: 0 32px
  engravedPlateHover:
    backgroundColor: "{colors.brand800}"
  securityDocument:
    backgroundColor: oklch(1 0 0 / 0.4)
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
  specimenSlip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: 20px 28px
  billToField:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    height: 44px
  typefaceSegmentActive:
    backgroundColor: "{colors.ink}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.surface}"
    height: 32px
  requestCounter:
    backgroundColor: transparent
    textColor: "{colors.numbering}"
    typography: "{typography.numbering}"
    padding: 16px 28px
  privacyBand:
    backgroundColor: "{colors.brand800}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.none}"
    padding: 96px 24px
  serialMarker:
    textColor: "{colors.numbering}"
    typography: "{typography.numbering}"
    width: 24px
  tourNoteStrip:
    backgroundColor: "{colors.tint}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: 16px 24px 16px 44px
  counterfoilSlip:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
  logoMark:
    backgroundColor: "{colors.ink}"
    textColor: oklch(1 0 0)
    rounded: "{rounded.surface}"
    size: 48px
  skipLink:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
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
achromatic, the brand accent is a single blue-violet ramp, radii are small, and
controls are compact. The paper itself never changes with the app theme,
because it is a preview of the PDF that gets downloaded.

The marketing homepage is the one place the system changes world. It is a
security-printed document, presenting raseeda's privacy the way a banknote
presents its anti-forgery features: a pale mint safety-paper tint under a fine
guilloche underprint, intaglio ink in raseeda blue, engraved wide capitals in
Archivo, numbering-machine red kept for serials and live counters, and
perforations and microprint as its dividers. Invoices are white paper slips
lying on that tint, and the privacy proof (the browser's own count of requests
to other websites) is printed on a slip's counterfoil. Its motion is one
authored moment on load: the headline rises, the slip lands, and the corner
rosette engraves itself.

**Key Characteristics:**

- Neutral chrome; colour is reserved for the brand accent and for status.
- One accent: the blue-violet `brand` ramp carries every emphasis.
- White paper on a grey desk: the invoice page previews the PDF exactly.
- Tight geometry: 3px surfaces, 4px controls, 32px default control height.
- Security-print homepage: tinted ground, generated guilloche, engraved Archivo capitals, red serials, perforated dividers, one engraved plate CTA.
- The editor has its own neutral chrome (plain greys, a near-black or near-white primary) and a light/dark switch; the rest of the site is light.

## Colors

Colours are defined in OKLCH and split into a semantic layer (roles), a paper
layer (the invoice sheet), a brand ramp (raw scale), and a security-print
layer that only the homepage uses. App chrome references roles; the invoice
page references paper tokens; emphasis references the ramp.

### Primary

- **Signal Blue** (`brand-600`): the solid accent. Primary buttons, selected
  table rows, the wordmark, the coloured second line of the homepage headline
  ("Keep everything else."), the homepage focus outline, and the focused
  border of the specimen's Bill to line. White text on it passes WCAG AA; this
  is why solid fills sit on 600, not 500. Hover deepens to `brand-700`.
- **Focus Blue** (`brand-500`): the app focus ring (`--ring`), the invoice
  field focus border, and table focus outlines. Never used as a solid fill under
  white text (3.85:1 fails AA). At 60% it is the line colour of the privacy
  band's medallion rosette.
- **Intaglio Blue** (`brand-700`): the homepage's engraved Create invoice
  plate, and inline text links on the homepage, underlined in `brand-300` that
  deepens to `brand-700` on hover. Also badge text.
- **Band Blue** (`brand-800`): the full-bleed privacy band's flood and the
  plate's hover. On the band, body text is `brand-100`, headings and links are
  white, link underlines are `brand-300`, and the check perforations are
  `brand-400` at 50%.
- **Brand Wash** (`brand-50`): the hover and focus fill for editable invoice
  fields and badge fills. Pairs with `brand-200` borders and `brand-700`
  text. At 60% it is the focus wash of the homepage Bill to line.
  `brand-100` is the homepage text selection colour, with `brand-950` selected
  text.
- The full ramp runs `brand-50` through `brand-950`; `brand-400` is the dark
  mode ring.

`--brand-top`, `--brand-bottom`, their `-hover` variants, and `--brand-gradient`
are still declared in `globals.css`, but nothing in the app references them.
They are not part of the working palette; do not treat the gradient as a
signature.

### Secondary

- **Numbering Red** (`numbering`): the homepage's numbering-machine ink, about
  6:1 on white. It prints only serials (the specimen's No. 0043, the
  counterfoil's No. 0001), the live counter of requests to other websites, and
  the tour's serial markers. Homepage only.

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

Paper (the invoice sheet; see the Paper Rule):

- **Paper** (`paper`, white): the A4 page surface.
- **Ink** (`paper-foreground`, a cool near-black): all invoice text.
- **Paper Wash** (`paper-muted`): empty logo slot and quiet fills on the page.
- **Pencil** (`paper-muted-foreground`, about 6:1 on paper): placeholders,
  field labels, and inactive toggles on the page.
- **Paper Edge** (`paper-border`): the hairline around the sheet.
- **Desk** (`desk`): the cool grey backdrop the sheet lies on in the editor.

Security print (homepage only, declared in `globals.css` as `--color-*`):

- **Safety Tint** (`tint`): the page ground, the header and phone bar (at 90%
  and 95% with backdrop blur), the corner rosettes' backing, the tour invoice's
  table header row, and the phone tour-note strips.
- **Deep Tint** (`tint-deep`): hover fill of the typeface switch's segments.
- **Guilloche** (`guilloche`): every guilloche line on the tint: the border
  bands, corner rosettes, and the hero's large rosette. The underprint tiles use
  the same colour at 55% (page) and 35% (slips).
- **Perforation** (`perforation`): every 2px dashed perforation on the tint
  and on slips.
- **Intaglio Ink** (`ink`): headlines, slip text, question summaries, the
  active typeface segment, the logo mark. At 35% it is the microprint; at
  10% to 20% it outlines the hero document, the header rule, and the phone bar;
  at 15% it borders the slips and the rules inside the example invoices; at 40%
  it is the Bill to line.
- **Ink Muted** (`ink-muted`): leads, body copy, form labels, nav and footer
  text, and the document foot's facts.
- White is the slips' paper and the text colour on the plate and the band.

The underprint is an SVG data URI, which cannot read CSS variables, so its
stroke colours are literal OKLCH strings in the route: the `guilloche` value at
55% and 35%, and `oklch(0.42 0.152 257.57 / 0.5)` (`brand-700` at 50%) on the
privacy band. Change them together with the tokens.

PDF palette: react-pdf cannot read CSS variables, so the renderer uses literal
hex. `#6b7280` (`pdfMuted`) is the muted label grey in the details, terms, and
text sections; `#71717a` (`pdfMutedZinc`) is the label grey in payment details.
These are intentional PDF palette entries, not drift.

Browser chrome: the `theme-color` meta is `#005fca`, the hex of `brand-600`.

### Status

- **Destructive** (`oklch(0.577 0.245 27.325)`): delete and danger, always as a
  tint (10 to 20% fill with destructive text), never a loud solid.
- **Success** (`oklch(0.627 0.155 149.21)`): positive status.
- **Warning** (`oklch(0.745 0.153 74.2)`): cautionary status; on the homepage,
  the alert icon on the blocked-storage note (the text itself stays
  `ink-muted`).

### Named Rules

**The One Voice Rule.** The blue-violet `brand` ramp is the only accent. Never
introduce a second hue for emphasis; status colours are for status only. The
homepage's numbering red is a printing ink, not an accent, and lives under the
Numbering Red Rule. In the editor chrome the primary action is neutral
(`primary`: near-black in light, near-white in dark), and blue appears only as
`ring`, on focus rings and switches.

**The 600 Fill Rule.** Solid brand fills under white text are `brand-600` or
darker. `brand-500` is for rings and borders.

**The Paper Rule.** The invoice page is white paper with dark ink in every app
theme, because it previews the printed PDF. Anything drawn on the page uses
`paper-*` tokens (or the brand wash for edit affordances), never chrome roles
or raw Tailwind greys or blues.

**The Numbering Red Rule.** `numbering` prints serials and live counts and
nothing else: never a link, a heading, an error, or emphasis. It is always set
in the numbering face.

**The Security Ink Rule.** The homepage takes its colour from the
security-print tokens, white paper, and the brand ramp; it uses no raw Tailwind
greys, and the editor never uses the security-print tokens.

**The Dark Mode Honesty Rule.** Only the editor has a dark mode. The `/create`
route sets `data-editor-theme` (and `.dark` when dark) on `<html>` before first
paint and clears it on the way out, and the `html[data-editor-theme]` blocks in
`globals.css` redefine the chrome roles for it (light: panels `#fcfcfc`, desk
`#f6f6f6`; dark: panels `#161616`, desk `#121212`). The page (`[data-paper]`)
takes the light roles back in both themes, and `dark:` utilities skip it. The
homepage and privacy page stay light; do not claim dark mode for them.

## Typography

**Display Font:** Archivo Variable at 125% width (with sans-serif), homepage only
**Numbering Font:** Archivo Variable at 62% width, tabular, homepage only
**Body Font:** Geist Variable (with the system UI stack)
**Wordmark Font:** Bricolage Grotesque Variable

**Character:** the editor speaks in one even, neutral sans so the invoice's own
font can lead; the homepage engraves its headings, labels, and plates in
wide grotesque capitals, prints its figures in a condensed numbering-machine
cut of the same face, and keeps every sentence meant to be read in Geist.

Geist is set on `<body>` and is what every piece of app chrome renders in.
Inter Variable is wired as `--font-sans` / `--font-heading` on `<html>`, but
no element opts into it, so it does not render in the UI; it remains available
in the invoice font library. Homepage text that sits inside a styled example
slip (the request counterfoil, the tour note strips, the logo mark, the
typeface fallback line) sets `font-geist` and normal tracking explicitly to
escape the slip's invoice font.

Archivo is imported by the homepage route alone (`@fontsource-variable/archivo/wdth.css`,
with the latin `wdth` file preloaded in the route head) and exposed as
`--font-engraved`. Width is set with `font-stretch` (125% engraved, 62%
numbering), which the variable `wdth` axis serves.

### Hierarchy

- **Display** (Archivo 125%, Semibold, 40px, 60px from `sm`, 68px from `xl`;
  0.98 line height, -0.025em tracking, balanced, `ink`): the homepage h1 only,
  set as two masked lines, the second in `brand-600`.
- **Headline** (Archivo 125%, Semibold, -0.025em, balanced): homepage section
  and closing h2s (36px, 48px from `sm`, 1.02 leading); tour note titles
  (20px, 24px from `sm`, tight leading); privacy check titles (18px, 20px from
  `sm`, white on the band).
- **Plate Label** (Archivo 125%, Semibold, uppercase): the Create invoice
  plate; 12px at 0.1em (`sm`), 14px at 0.1em (`md`), 16px at 0.08em (`lg`).
- **Form Label** (Archivo 125%, Semibold, 11px, leading 1, 0.14em, uppercase,
  `ink-muted`): printed field labels on slips (No., Bill to, For, Amount,
  Typeface, To, Kept by), the counter's term in `ink`, and the two question
  group headings.
- **Numbering** (Archivo 62%, Bold, tabular, `numbering`): serials at 24px,
  the request counter at 48px, tour markers at 24px. The document foot's facts
  line uses the same face at 14px Semibold, 0.06em, uppercase, in `ink-muted`,
  the one place it is not red.
- **Microprint** (Archivo 125%, Semibold, 5px, 0.2em, uppercase, `ink` at 35%):
  a repeated sentence printed as a rule. Decorative and hidden from assistive
  tech; it never carries information.
- **Lead** (Geist 400, 18px, capped at 42ch to 56ch, `ink-muted`; `brand-100`
  on the band): the paragraph under a homepage headline.
- **Title** (Geist 500, 16px): the document name in the editor toolbar and
  question summaries on the homepage.
- **Body** (Geist 400, 14px in chrome; 16px for homepage check descriptions,
  tour notes, and answers, capped at 52ch to 68ch): chrome text and homepage
  copy.
- **Label** (Geist 500, 14px; 12px in `xs` controls): buttons, menu triggers,
  table headers; homepage nav links.

Weights map to a fixed scale: Regular 400, Medium 500, Semibold 600, Bold 700.
UI labels and buttons are Medium. Text sizes come from the Tailwind scale; avoid
arbitrary `text-[Nrem]` values in feature code (the homepage's display size,
form label, and microprint sizes are the recorded exceptions). Numbers use
tabular figures. Homepage copy uses typographic (curly) apostrophes.

Separately, raseeda ships an invoice font library (`consts/invoice-fonts.ts`)
that is a user-facing product feature, not app chrome. Users pick from ten
sans-serif, serif, and monospace faces at three sizes for the rendered invoice;
the canvas applies the chosen family and tracking to the paper. The homepage
specimen slip borrows three of these faces through `getInvoiceFontDefinition`,
so it shows real output, and the tour invoice is set in Lora. Keep this library
independent from the app's own type tokens.

### Named Rules

**The Engraved Recipe Rule.** Every homepage Archivo element is built from the
route's shared recipes (`ENGRAVED`, `NUMBERING`, `FORM_LABEL`, `HEADLINE`) and
adds only size, leading, and colour.

**The Reading Is Geist Rule.** Archivo sets headings, labels, plates, numerals,
and microprint. Every sentence a visitor reads (leads, check descriptions,
notes, answers, captions) stays in Geist.

**The Archivo Stays Home Rule.** Archivo is imported and preloaded only by the
homepage route and appears only there. The editor and dialogs never use it.

## Layout

- **Spacing** follows the Tailwind 4px scale (`1` = 4px). Dense chrome favours
  `1` to `3` (4 to 12px); section rhythm uses `4` to `8` (16 to 32px).
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
  canvas pill controls, inspector rows, the homepage header plate, typeface
  segments, and homepage nav, footer, and check links (40px at rest) reach 44px.
  Fine pointers keep the compact sizes.
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
  `rounded-t-2xl`) above the tab bar with a tap-to-close backdrop, and the
  canvas pill is hidden. The light/dark switch is also in the project menu.
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
- **Homepage.** Content sits in a `max-w-6xl` (72rem) column. Order: header,
  hero document, privacy band, tour (`#features`), questions, closing
  counterfoil, footer. Sections breathe at 80px vertical padding (96px from
  `sm`) and are divided by the world's own devices rather than hairlines: the
  privacy band's flood, a microprint rule above the questions, and microprint
  under the header and over the footer.
- **Hero document.** A bordered document fills the column (16px outer gutter
  on phones, 24px from `sm`), framed by 24px guilloche bands top and bottom,
  side bands and corner rosettes from `sm`, and a 34rem rosette bleeding off
  its lower-right corner from `lg`. The headline spans the full width; under
  it, from `lg`, the copy and the specimen slip split 6fr / 5fr. A dashed
  perforation separates the body from the document foot's facts line.
- **Two-column sections.** From `lg`, privacy splits 5fr / 7fr (heading, lead,
  and medallion, then the checks, with the backup note spanning both below);
  the tour sets its invoice beside its notes at 1.05fr / 0.95fr; questions
  split 0.85fr / 1.15fr with the help link under the heading; the closing
  counterfoil splits a 14rem stub from the body from `md`. Everything stacks
  below `lg`.
- **Phones.** Below `md` the section links fold into a native disclosure menu,
  the header plate is hidden, and a fixed bottom bar carries a full-width plate
  in the thumb zone (safe-area padded); the footer pads 96px at the bottom to
  clear it.
- **No layout shift on hydration.** JavaScript-only content renders a
  same-height plain-text stand-in before hydration (the typeface row reserves
  44px with a plain sentence; the counter shows blank wheels until the browser
  has counted), and late-resolving content gets a reserved slot (the 40px line
  under the hero actions from `lg`), so nothing moves when it arrives.
- **Print is a first-class target.** `@page` is A4 with 16mm margins;
  `.invoice-page` forces page breaks, `.avoid-break` prevents mid-block splits,
  `.no-print` hides chrome, and print colour-adjust is forced `exact`.

### Named Rules

**The Perforation Rule.** On the homepage, rows and regions divide with a 2px
dashed perforation (`perforation` on the tint and slips, `brand-400` at 50% on
the band) or a microprint rule. Solid hairlines are reserved for outlining an
object (the document, a slip, a bar) and for the rows inside an example
invoice.

## Elevation & Depth

Depth is minimal and cool-neutral, never heavy. Flat in-flow surfaces separate
with a hairline border; shadows are reserved for things that genuinely float.

### Shadow Vocabulary

- **Menu** (`--shadow-menu`: `0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px
  rgb(0 0 0 / 0.1)`): menus, popovers, dropdowns, selects, context menus, the
  logo popover, the floating zoom control, the homepage phone section menu,
  and the homepage skip link. The standard floating chrome shadow.
- **Floating** (`--shadow-floating`: `0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px
  10px -6px rgb(0 0 0 / 0.1)`): the three homepage paper slips (the specimen
  invoice, the tour invoice, the closing counterfoil). None is tilted.
- **Paper lift** (Tailwind `shadow-md`): the A4 sheet resting on the desk.
  Removed in print.
- **Dialog ring**: dialogs float on a 1px `foreground/10` ring over a 50% black
  scrim rather than a drop shadow.
- Pressed feedback on buttons is a 1px downward nudge (`active:translate-y-px`),
  not a shadow change.

### Named Rules

**The Float-Only Shadow Rule.** A shadow means "this is above the page". In-flow
cards, rows, and panels get a hairline, not a shadow.

**The Slip Rule.** On the homepage, lifted surfaces are white paper slips lying
on the tint: white, `ink` at 15% hairline, `rounded-surface`,
`shadow-floating`, upright. The hero document, the tour notes, and the privacy
band are printed on the ground and sit flat.

## Shapes

Geometry is intentionally tight, which is what gives the tool its exacting feel.
The two everyday radii are named tokens, not arbitrary values:

- **Surface** (`rounded-surface`, 3px): the dominant radius for cards, panels,
  inputs, invoice fields, chips, icon tiles, menus, menu items, previews, the
  homepage slips, the specimen's amount box, the tour notes list, and the logo
  mark.
- **Control** (`rounded-control`, 4px): buttons, the zoom control, the homepage
  Create invoice plate, the typeface switch's frame, the skip link, and the
  focus area of homepage text links.
- **Dialog** (`rounded-sm`, 4px).
- **Square** (`rounded-none`): the homepage's printed objects, the hero
  document and the full-bleed privacy band.
- The derived scale (`rounded-md` and up, from `--radius: 0.5rem`) exists for
  larger surfaces that need softer corners but is rarely needed.

Keep new components on the `surface` / `control` tokens unless there is a reason
to reach for the softer derived scale. Nothing in the app is a pill or a circle.

The homepage's recurring silhouettes are printed ones: the interlaced
guilloche ribbon, hypotrochoid rosettes, the 2px dashed perforation, the
plate's inset hairline frame, and the cheque's transit mark (a drawn SVG
bracket-and-bar) leading each fact on the document foot.

## Components

Primitives are shadcn/ui (new-york) over Base UI, themed with CVA. Import
directly from `components/ui/*` (no barrel exports). Icons are Tabler
(`@tabler/icons-react`), 16px by default inside buttons. Lists keep native
`<ul>` / `<ol>` semantics without an explicit `role="list"` (project lint
rule); note that Safari VoiceOver may not announce `list-style: none` lists as
lists.

### Buttons

- **Shape:** gently squared (`rounded-control`, 4px), Medium 14px label,
  `transition-all`, 1px active nudge.
- **Primary (`default`):** `brand-600` fill, `primary-foreground` text, hover
  `brand-700`. The primary CTA in the app.
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
the page and in the inspector, and written in the invoice's date format. Rows are 13px, labels `muted-foreground`, fields `muted` fills.

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
- **Homepage skip link:** the first focusable element, "Skip to content", a
  white `rounded-control` tab with `shadow-menu` fixed 12px from the top-left,
  held 64px above the viewport and slid into place on focus (transform
  transition), so it keeps its padding. Targets `<main id="main">`.
- **Homepage header:** sticky, 64px, `tint` at 90% with backdrop blur, closed
  by a microprint rule over an `ink` 10% hairline. A `brand-600` Bricolage
  wordmark on the left; from `md`, centred 14px Medium links (Privacy,
  Features, Questions) in `ink-muted`, hover `ink`, with 12px by 10px hit
  areas, and the small plate on the right, shown only while neither the hero
  nor the closing plate is on screen (fades and lifts 4px in over 200ms, out
  over 100ms, inert while hidden). Below `md` the links fold into a native
  `<details>` menu: a 44px menu-icon summary opening a white
  `rounded-surface` panel (`ink` 15% border, `shadow-menu`) of the same three
  links, closed on navigation.
- **Phone plate bar:** below `md`, a fixed bottom bar on `tint` at 95% with
  backdrop blur and an `ink` 15% top hairline holds a full-width `md` plate.
  It follows the same visibility rule as the header plate, rising 16px in
  over 200ms.
- **Homepage footer:** a `<footer>` landmark outside `<main>`, opened by a
  microprint rule under an `ink` 10% hairline: the `brand-600` wordmark, then
  "Report an issue", "Source on GitHub", and the copyright in 14px
  `ink-muted`, hover `ink`. Links are at least 40px tall (44px on coarse
  pointers), open in a new tab, and say so with an sr-only "(opens in a new
  tab)".
- **Homepage focus:** links, plates, segments, and summaries draw a 2px
  `brand-600` outline offset 2px (4px on the plate), white on the privacy
  band, not the app's 1px ring. Homepage colour transitions name only
  `color`, `background-color`, and `text-decoration-color`, never
  `transition-colors`, so the focus outline never fades in.
- **Editor entry points:** `/create` accepts two optional search params.
  `font` (any invoice font id) styles a fresh, untouched blank invoice and is
  then cleared; `open=invoices` opens the Open Invoice dialog.

### Menus, Popovers, Dialogs

Menus, popovers, dropdowns, selects, and context menus: `popover` surface,
`rounded-surface`, 1px `foreground/10` ring, `shadow-menu`, items
`rounded-surface` with `accent` focus fill. Dialogs: `popover` surface,
`rounded-sm`, `foreground/10` ring over a black/50 scrim, max width 384px from
`sm`, and a footer row on `muted/50` with a top hairline, buttons right-aligned.

### Tables

`components/tables/*`: dense rows; selected rows fill `brand-600` with
`primary-foreground` text; keyboard focus draws a 2px inset `brand-500`
outline. Row groups separate with `gap-px`, not `divide-y`.

### Badges / Callouts

`brand-50` fill, `brand-200` border, `brand-700` text, `rounded-surface`; the
standard highlight chip in the app.

### Engraved Plate (signature)

The homepage's one primary action, a single component (`CreateInvoiceLink`),
always labelled "Create invoice". A rectangular `brand-700` plate
(`rounded-control`) with white wide-caps Archivo label and a right arrow, and
a 1px white-at-30% hairline frame inset 3px (2px corners) like the border of an
engraved panel. Hover floods to `brand-800` and nudges the arrow 2px right
(300ms ease-out). Three sizes: `sm` (36px, 44px on coarse pointers; header),
`md` (48px; hero and the phone bar), `lg` (56px; closing, dropping to the `md`
metrics full-width below `sm`, with a 14px `ink-muted` line beneath that names
the picked typeface when it isn't the default). Focus is a 2px `brand-600`
outline offset 4px. Every instance carries the typeface picked on the specimen
to the editor as `?font=<id>` (omitted for the default, Geist). It is the only
filled CTA, and only one is visible at a time: the hero and closing instances
carry ids that the header and phone bar watch. Beside the hero plate, "Check
the privacy yourself" is a `brand-700` underlined text link. Under the row a
40px line (reserved from `lg`) holds the saved-invoice state: empty for
first-time visitors, a 14px `ink-muted` link ("You have N invoices saved in
this browser. Open your invoices", to `/create?open=invoices`) for returning
ones, or, if the browser blocks storage, an `ink-muted` note with a `warning`
alert icon that says how to fix it.

### Guilloche (signature)

All line work is computed on the device from a few parameters
(`utils/guilloche.ts`, rendered by `components/home/guilloche.tsx`), never a
downloaded image, so server and browser render identical paths.

- **Band:** a seamless 160 by 24 tile of six phase-shifted sine strands whose
  amplitude swells and narrows, tiled as an SVG pattern; vertical bands rotate
  the same tile so all four edges read as one ribbon.
- **Rosette:** three hypotrochoids (outer 132/120, inner 48/45) rotated 7.5
  degrees apart, 0.6 non-scaling stroke in `currentColor`. A 24px rosette on a
  `tint` backing covers each corner crossing.
- **Underprint:** a 120 by 36 tile of three strands at 0.5 stroke, laid as a CSS
  background on the page, the slips, and the band.
- **Microprint:** see Typography; used as a rule, 24 repeats of one sentence.

### Specimen Invoice (signature)

The hero's right side: a white slip (`figure`, Slip Rule) on the slip
underprint, set in whichever library typeface the visitor picks. A Bold
engraved "INVOICE" and a red No. 0043 serial; a Bill to field the visitor can
type on (44px, transparent, a dashed `ink` 40% bottom rule, `ink-muted`
placeholder "Type a client's name", focus turns the rule `brand-600` over a
`brand-50` 60% wash); For and Amount fields, the amount boxed in an `ink` 30%
`rounded-surface` frame; and the typeface switch: a Form Label, then a white
`rounded-control` frame (`ink` 20% border, 2px padding) of three `aria-pressed`
segments (Geist, Lora, JetBrains Mono, each in its own face), the active one
`ink` with white text, the others `ink-muted` with `tint-deep` hover. Before
hydration the switch is replaced by a plain sentence in the same 44px.

The slip ends in a perforated counterfoil: a `dl` behind a 2px dashed
`perforation` rule, "Requests to other websites" as a Form Label in `ink`
against the live count in 48px Numbering, padded to three wheels ("000"), with
a 12px `ink-muted` Geist caption giving the background-request count. Until the
browser has counted, the wheels are blank dashes in `ink` at 25%. The counts
stream from the browser's own performance timeline.

### Document Foot

The hero document's last line, under a dashed perforation: four true facts ("0
accounts", "0 analytics scripts", "0 requests to other websites", "Free") in
the numbering face, each led by a transit mark, like the code line along a
cheque's foot.

### Privacy Band (signature)

A full-bleed `brand-800` flood on its own underprint, white text. Left: the
engraved h2, a `brand-100` lead, and, from `lg`, a 288px medallion rosette in
`brand-500` at 60%. Right: an ordered list of four checks ("Look at the red
counter", "Search for a sign-up", "Ask your browser", "Read the code"), each
row opened by a 2px dashed `brand-400` 50% perforation (the last row closed by
one too), an engraved title, `brand-100` 16px text, and, where there is one, a
white underlined disclosure or link (`brand-300` underline, white focus
outline). A "Keep a copy." note in `brand-100` with a white Semibold lead-in
spans both columns below.

### Tour Invoice (signature)

The features section shows the product instead of listing it. Left: a white
slip set in Lora (a London freelancer billing a Berlin GmbH in euros, with the
client's VAT ID, VAT shown as "Reverse charge", a percentage discount listed
before tax as the editor orders them, IBAN and BIC, the 48px `ink` logo mark),
with a wide left margin where red Numbering serial markers (24px, hidden from
assistive tech) sit beside the regions they explain: 1 logo and type, 2
currency (the line items), 3 tax, fees and discounts (the totals), 4 payment
details. Inside the invoice, rows use solid `ink` 15% hairlines and the table
header is `tint`.

From `lg`, the notes sit to the right as a flat counterfoil: a white-at-60%
`rounded-surface` list with an `ink` 15% border, rows split by dashed
perforations, each a matching red marker, an engraved title, and `ink-muted`
16px text. Below `lg` that list is hidden and each note follows its region as a
strip torn across the sheet: `tint` ground bleeding to the slip's edges between
two dashed perforations, Geist 14px with a Semibold `ink` title over
`ink-muted` text, so the numbers stay beside their notes and the invoice text
stays the invoice's.

### Questions Accordion

Native `<details>` beside an engraved heading, so they work without
JavaScript. Seven questions sit in two groups, "Making invoices" (four) and
"Your data" (three), each under a Form Label heading. Rows are opened by 2px
dashed perforations and each group is closed by one. Each summary is a Medium
16px `ink` question at least 56px tall with an `ink` plus icon that rotates 45
degrees (200ms) when open; the answer is `ink-muted` 16px text capped at 60ch.
Under the heading, an `ink-muted` line says help is a GitHub issue that needs a
free account, then a `brand-700` underlined "Ask a question on GitHub" link
with an up-right arrow.

### Closing Counterfoil (signature)

The close is a cheque book's stub: a white slip on the slip underprint, split by
a dashed perforation (vertical from `md`, horizontal below) into a 14rem stub
(red No. 0001; To "Your next client"; Kept by "You, on this device", each a
Form Label over 14px `ink` text) and a body holding the engraved h2 and the
`lg` plate where the cheque would be signed.

### Homepage Motion

One authored moment, on load, in plain CSS (`globals.css`, easing
`cubic-bezier(0.16, 1, 0.3, 1)`), so it plays on first paint without waiting
for JavaScript:

- the two headline lines rise from behind a mask (`.hero-rise`, 1s, at 0.1s
  and 0.2s);
- the specimen slip rises in (`.hero-card`, 60px, at 0.3s);
- the lead and the plate row fade up (`.hero-fade-up`, 24px, at 0.4s and 0.5s);
- from `lg`, the large rosette engraves itself, each strand drawn along its own
  length (`.guilloche-draw`, 2.4s, strands 0.25s apart from 0.2s), then stays.

Nothing animates on scroll except the header and phone-bar plates appearing and
stepping aside. Hovers are colour and small transforms only. Under reduced
motion every travelling entrance becomes a 0.4s fade, inline delays drop to
zero, and the rosette is simply there.

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
- **Do** stay on `rounded-surface` / `rounded-control` and the 32px control
  height for chrome.
- **Do** reach for `shadow-menu` for floating chrome rather than picking raw
  shadow utilities per component.
- **Do** tint destructive actions; reserve solid saturated fills for the brand.
- **Do** mirror any new PDF colour as a literal hex in the renderer and record
  it in the PDF palette here.
- **Do** use the one `CreateInvoiceLink` engraved plate for every homepage
  primary action, with the same label everywhere and one on screen at a time.
- **Do** build homepage Archivo text from the shared `ENGRAVED`, `NUMBERING`,
  `FORM_LABEL`, and `HEADLINE` recipes, and keep reading text in Geist.
- **Do** divide homepage rows and regions with 2px dashed perforations or
  microprint rules.
- **Do** generate any new guilloche from `utils/guilloche.ts` parameters and
  colour it with `currentColor` set from the `guilloche` token.
- **Do** keep homepage motion in plain CSS that plays without JavaScript and
  degrades to fades under reduced motion.
- **Do** give JavaScript-only homepage content a same-height plain stand-in
  until hydration, and prefer native elements (`<details>`) that need none.
- **Do** prove privacy claims with something the visitor can see or check
  (the live counter, plain checks) rather than decorative ticks.
- **Do** list homepage colour transitions by property (`color`,
  `background-color`, `text-decoration-color`) so focus outlines never fade.

### Don't:

- **Don't** use `space-y-*`, `space-x-*`, `divide-x`, or `divide-y` (breaks
  with conditional and fragment children; owner-controlled `gap` is the rule).
- **Don't** put white text on `brand-500`; it fails AA.
- **Don't** let the invoice page follow the app theme or use chrome roles,
  raw `zinc-*`/`blue-*`, or responsive classes.
- **Don't** hard-code hex or raw `neutral-*` greys in app chrome or on the
  homepage; hex belongs to the PDF renderer.
- **Don't** introduce a second accent hue; numbering red prints serials and
  live counts only.
- **Don't** use Archivo or the security-print tokens outside the homepage.
- **Don't** let microprint carry information; it is a rule, hidden from
  assistive tech.
- **Don't** use `transition-colors` on focusable homepage elements; it animates
  `outline-color`.
- **Don't** reach for heavy or black shadows; prefer a hairline border, and
  keep any shadow soft and neutral.
