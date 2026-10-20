---
target: landing page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/ikraam/development/billsend/app/routes/index.tsx"
target_fingerprint: "sha256:bc929f54f76d41804f39010fa9ff7c88008e7b35086e423757dedea14e1f7204"
target_path: /Users/ikraam/development/billsend/app/routes/index.tsx
timestamp: 2026-10-19T16-45-19Z
slug: app-routes-index-tsx
---
Method: dual-agent (A: design review sub-agent, B: detector sub-agent)

## Design Health Score: 28/40 (Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Storage-blocked note is honest; hero H1 blurred ~0.9s during hero-focus |
| 2 | Match system / real world | 2 | H1 "Send the invoice." for a product that doesn't send invoices; privacy proof is code |
| 3 | User control and freedom | 3 | ~13 mobile screens, no sticky/bottom CTA between hero and closing band |
| 4 | Consistency and standards | 3 | Three labels for one action; violet aurora/code breaks one-accent rule |
| 5 | Error prevention | 3 | FAQ warns about clearing data; clone URL 404s until repo rename |
| 6 | Recognition over recall | 3 | Labelled demos, short nav |
| 7 | Flexibility and efficiency | 2 | Returning visitors get no shortcut to saved invoices though the page already queries the DB |
| 8 | Aesthetic and minimalist | 3 | Calm, but ten identical tile cards; terminal is the loudest thing |
| 9 | Error recovery | 3 | Storage-blocked note explains and recovers |
| 10 | Help and documentation | 3 | Grouped, honest FAQ |

## Design specificity
Content authored for raseeda (real editor hero, real source lines, honest comparison, specific FAQ); visual shell is category-template SaaS (sky+clouds hero, pastel gradient tiles, 2x2 grid, dark aurora terminal, glow CTA band). Nothing in the visual language says paper or invoice beyond the screenshots.
Detector: 14 advisory design-system-font-size findings (text-[13px] in editor-preview.tsx, feature-demos.tsx; 0.8125rem in run-your-own-copy.tsx:352). Mostly false positives: 13px is the real editor's control size; DESIGN.md ramp lacks a 13px step. Overlay blocked by CSP (expected). No a11y failures, no page overflow at 375px; code tiles in Open source clip on mobile (intentional bleed).

## Priority issues
- [P1] H1 contradicts the product: "Send the invoice." vs FAQ "Does raseeda send the invoice? No." and comparison X. "Keep everything else" needs decoding. Fix: true, concrete H1 + plain subline; drop the GitHub-mark-as-O letter swap. /impeccable clarify
- [P1] Privacy promise has no plain-language moment for non-developers; first plain statement is a table row, then code. Fix: 2-3 plain sentences / short band before code tiles, code as proof beneath. /impeccable clarify, /impeccable layout
- [P2] Visual peak (dark violet aurora terminal) goes to self-hosters and introduces a second accent; dead 400px slab on mobile. Fix: demote to light, compact teal panel or one-line clone. /impeccable quieter
- [P2] Perpetual motion with no pause control (WCAG 2.2.2); demos often caught mid-fade. Fix: pause toggle, hold completed frames longer. /impeccable animate
- [P3] Shell is template-generic; teal barely registers; CTA labels inconsistent; DESIGN.md stale (describes Archivo/guilloche/counterfoil direction that no longer exists). /impeccable bolder, /impeccable document

## Persona red flags
Jordan: H1 implies sending; code tiles meaningless; "other invoice generators" headline but one column is accounting software.
Riley: clone URL 404s pre-rename; "Some" cells unsourced; real bank names in sample data.
Casey: ~13 screens; header CTA hidden below sm; next CTA only at the end; comparison labels wrap 3-4 lines.
Freelancer billing now: returning user sees the stranger's pitch; no "continue INV-0043".

## Minor
14px body under 40-48px headings; cool zinc greys on warm canvas; footer column titles as h2; demo text ~6-8px at 1024; transition-colors on focusable pills animates outline-color; mobile footer "Source on GitHub" ↗ strands on wrap.

## Questions
- If the comparison is the most persuasive thing, why isn't it the hero's argument?
- Should a returning visitor with saved invoices see the marketing page at all?
- What would the page look like with no terminal, aurora or pastel tiles: just paper, numbers and the promise?
