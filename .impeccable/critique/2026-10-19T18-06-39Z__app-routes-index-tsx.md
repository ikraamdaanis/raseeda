---
target: landing page
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
target_identity: "file:/Users/ikraam/development/billsend/app/routes/index.tsx"
target_fingerprint: "sha256:bbaef5c5d71301c759f1f5b5b88426e273a00bed7b50e7fd855f80b1dcd768fc"
target_path: /Users/ikraam/development/billsend/app/routes/index.tsx
timestamp: 2026-10-19T18-06-39Z
slug: app-routes-index-tsx
---
Method: dual-agent (A: design review sub-agent, B: detector + overlay sub-agent)

## Design Health Score: 30/40 (Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | Storage-blocked note excellent; demos play only on screen |
| 2 | Match real world | 3 | Step title "Send the PDF" implies raseeda sends; comparison heading says "invoice generators" but includes accounting software |
| 3 | User control | 3 | Pause control only in the footer, far from motion that starts on load |
| 4 | Consistency | 3 | OG card fixed this run; nav omits Privacy while footer Privacy goes to /privacy; hero "open source" opens in same tab unlike other GitHub links |
| 5 | Error prevention | 3 | Data-loss caveat buried in a closed FAQ; step 3 promises saving without it |
| 6 | Recognition | 3 | Demos show real UI |
| 7 | Flexibility | 3 | Footer "Your saved invoices"; header CTA hidden on phones |
| 8 | Minimalist | 3 | ~12.9 phone screens; repeated SectionHeading template; long developer section |
| 9 | Error recovery | 3 | Storage note gives steps |
| 10 | Help | 3 | Grouped FAQ |

## Specificity
Content authored (real editor hero, code proofs, honest comparison, specific FAQ); frame generic SaaS (sky+clouds, pastel tiles, repeated heading-left/description-right block, dark aurora panel, glow closing band with generic line).
Detector: 3 advisory design-system-font-size at 11px (index.tsx:994 phone comparison headers, real; editor-preview.tsx:268 and feature-demos.tsx:359, preview false positives). Earlier 13px findings cleared by DESIGN.md control role. Overlay (injected inline, CSP intact): 17 desktop / 15 mobile; real: code-tile line numbers zinc-400 at 2.4-2.6:1; rest design-intent or preview false positives.

## Priority issues
- [P1] No CTA between hero and closing band: header not sticky, header CTA hidden on phones, ~11 phone screens without a button. Fix: sticky compact header with Create invoice pill after the hero (phones too), or inline CTAs after How it works and Features. /impeccable layout
- [P2] Data-loss caveat buried in a closed FAQ; step 3 "Keep a copy" promises saving only. Fix: one line in step 3 about clearing data and File > Export Data. /impeccable clarify
- [P2] Nav and order undersell privacy and features: Privacy not in nav, Features 5th after code and table, terminal ~1.5 empty phone screens. Fix: nav How it works / Privacy / Features / Compare / Questions; Features above Compare; terminal starts on a filled frame on phones. /impeccable layout
- [P3] Accessibility details: wordmark aria-label "Homepage" fails label-in-name (use "raseeda home"); comparison X icons zinc-400 2.62:1 fail 1.4.11 (use zinc-500); code-tile line numbers 2.4:1; 11px phone comparison headers; second pause control near the hero. /impeccable audit, /impeccable polish
- Resolved this run: P1 stale billsend OG card and alt text (new og-image.jpg, SITE_OG_IMAGE_ALT updated).

## Persona red flags
Jordan: hero "open source" link leaves the page in same tab; "Send the PDF" implies sending; Privacy greets with TypeScript.
Riley: totals demo $2,515 vs currency demo $2,475; logo demo shows no logo or sizes; "generators keep data on device: X" broad claim without "typical tool" qualifier.
Casey: no CTA for ~11 screens; phone hero shows the invoice-list sidebar, not the page; Download demo shows a mouse pointer on touch.
Freelancer now: hero CTA immediate, but nothing says what the editor starts with; "no watermark" only in the table.

## Minor
Stale closing-section comment (index.tsx ~1366) and unused CLOSING_RENDER / PDF_RENDERS.totals / payment; footer column h2s; Features description describes audience not features; md+ code tiles 40% empty at 4:3; "Open the editor" hover brand-600 3.3:1 on sky; desktop body 14px with 2px title step; descriptions in narrow far-right column.

## Questions
- Why does the phone hero lead with the invoice list instead of the invoice?
- Why does "don't take our word for it" live in one section instead of linking comparison cells to their proof?
- Would a half-length page with the developer story on /privacy convert better?
