---
target: landing page
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 0
target_identity: "file:/Users/ikraam/development/billsend/app/routes/index.tsx"
target_fingerprint: "sha256:50ee6f2b45cd42126357547a0b6c3a0ce5840fe718fd11cef2e806de337e9507"
target_path: /Users/ikraam/development/billsend/app/routes/index.tsx
timestamp: 2026-10-19T19-17-41Z
slug: app-routes-index-tsx
---
Method: dual-agent (A: design review sub-agent, B: detector + overlay sub-agent)

## Design Health Score: 30/40 (Good)
A scored 29/40 before three tablet/phone defects it found were fixed in this run (H4 2 -> 3).
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | Header state clear; terminal starts as an empty box |
| 2 | Match real world | 3 | "Export Data in the File menu" references editor UI not yet seen |
| 3 | User control | 3 | Pause in header, phone menu and footer; phone pause inside menu |
| 4 | Consistency | 3 | Fixed: tablet nav wrap, privacy tile collision, flat phone headings. Left: "Open the editor" vs "Create invoice" |
| 5 | Error prevention | 3 | Storage note under hero buttons; FAQ covers private windows |
| 6 | Recognition | 3 | Visible nav, sticky Create invoice pill |
| 7 | Flexibility | 3 | Sticky CTA everywhere; returning visitors land on latest invoice |
| 8 | Minimalist | 3 | ~11,100px on phones; data-loss caveat in step 3 and FAQ |
| 9 | Error recovery | 3 | Storage note says what and how |
| 10 | Help | 3 | Grouped FAQ |

## Specificity
Content specific (real editor + PDF hero, outcome cards over verified code lines, honest comparison); skeleton is the standard SaaS sequence. Reads as a confident proof-led page, not a template.
Detector: 2 advisory 11px findings in aria-hidden previews (false positives). Overlay 18 desktop / 16 phone: all documented design intent or preview false positives; 0 real. JS: 0 a11y failures across 3 widths, focus on every stop, 0 transparent-header overlaps in 150 scroll steps, early scroll preserved, pause controls and storage note correct. Tightest contrast: nav over drifting clouds 4.57:1.

## Priority issues
- Fixed this run: [P1] tablet nav wrapped at 768 (nav now from lg, menu below); [P1] privacy outcome rows collided at 768-900 (tiles stack below lg); [P2] phone h2 matched h1 (title now clamps 28-36px); skip-link shadow peeking.
- [P2] Step 3 ends on data loss at the conversion moment (index.tsx ~983). Option: keep backup mention, leave deletion caveat to the FAQ. Conflicts with the previous run's request, so owner's call. /impeccable clarify
- [P3] Absolute comparison cells (Open source X for accounting software) despite "typical tool" note. Use "Some"/"Varies". /impeccable clarify
- [P3] Terminal and Payment demo start on empty frames; start on a filled frame. /impeccable animate
- [P3] "No watermark" is only in the comparison table; consider a hero/FAQ mention. /impeccable clarify

## Persona red flags
Jordan: code before benefits (outcome cards help); pause glyph unlabelled visually; "File menu" before seeing the editor.
Riley: logo demo shows no logo; absolute X cells; header at 90% lets content show faintly on phones.
Casey: ~12 screens; looping demos; pause inside the phone menu.
Freelancer now: one-tap path; watermark worry only answered in the table.

## Minor
Empty first frames (terminal, payment demo); SectionHeading description flush right with dead gap at lg; tiny tablet demo text (~7px); header lacks the r mark the OG image shows; "See how it works" echoes the nav.

## Questions
- Could an editable hero invoice replace How it works?
- Should the open source panel move after the FAQ?
- Should "no watermark" be a top-line promise?
