---
target: landing page
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/ikraam/development/billsend/app/routes/index.tsx"
target_fingerprint: "sha256:650c97ca327e54a6f07e52d278fb2135825d78b392b48ebb88fa56564d124c6a"
target_path: /Users/ikraam/development/billsend/app/routes/index.tsx
timestamp: 2026-10-19T18-28-08Z
slug: app-routes-index-tsx
---
Method: dual-agent (A: design review sub-agent, B: detector + overlay sub-agent)

## Design Health Score: 28/40 (Good)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | System status | 3 | Header state change good; storage-blocked note renders below the hero visual, off-screen |
| 2 | Match real world | 3 | Privacy tiles lead with connect-src and Table<...> for a non-technical audience |
| 3 | User control | 3 | Pause only in the footer, ~7,400px / ~10,800px below the first motion |
| 4 | Consistency | 3 | "Open the editor" / "Create invoice" / "Create an invoice" for one destination; nav omits Open source |
| 5 | Error prevention | 3 | Strong warnings; blocked-storage warning not on the CTA path |
| 6 | Recognition | 3 | 8-item flat "Also in the editor" list |
| 7 | Flexibility | 2 | Returning users get the first-timer page; page already counts invoices |
| 8 | Minimalist | 3 | Privacy promise ~6 times; heading + tile grid repeats three times |
| 9 | Error recovery | 2 | Storage-blocked state placed where phone users miss it before tapping Create invoice |
| 10 | Help | 3 | FAQ answers real freelancer questions |

## Specificity
Content authored (real editor, linked code proofs verified against source, honest comparison, FAQ catches); frame generic SaaS (sky + clouds, centred display, ink pills, pastel tile grid x3, FAQ, glow dot-grid closing). Clouds sit oddly beside a no-cloud promise.
Detector: 2 advisory 11px findings in aria-hidden previews (false positives). Overlay 16 desktop / 13 phone: all documented design intent or preview false positives; 0 real. JS checks all pass: label-in-name, contrast (crosses 4.5-4.83, line numbers 4.5-4.83), focus on all 38/33 stops, sticky header, anchor clearance (h2 96px / 72px below header), pause control.

## Priority issues
- [P1] Phone hero shows the invoice list, not the invoice (Pixel 7: ~45% sidebar, paper cut at Quantity). Fix: below sm offset the ScaledFrame past the sidebar or show the phone editor. /impeccable adapt
- [P1] Developer proof before buyer proof: Privacy is section 2 and all code, lines cut mid-word at 1440; Open source repeats the argument 4 sections later. Fix: plain outcome as each tile's main visual, code secondary, lines that fit; consider merging Open source into Privacy. /impeccable layout, /impeccable clarify
- [P2] Storage-blocked note renders after the hero visual (index.tsx:727-729). Fix: render under #hero-actions. /impeccable layout
- [P2] Returning users get no shortcut though countInvoices() already runs. Fix: when count > 0, header link becomes "Your invoices" to /create?open=invoices. /impeccable onboard
- [P2] Pause control buried in the footer. Fix: small pause icon-button in the header or hero corner on the same useHomeMotion state. /impeccable animate
- Resolved since last run: no CTA after hero (sticky header pill), data-loss caveat, nav/order, comparison qualifier, wordmark label-in-name, cross and line-number contrast, 11px headers, footer heading outline, OG image.

## Persona red flags
Jordan: three CTA labels; first hero link goes to GitHub; second section is code.
Riley: all samples US English while copy says A4 (Letter?); no non-Latin or non-US sample; "one more command" for Cloudflare never shown.
Casey: ~13 screens; sticky pill and menu in top corners; hero crop shows no invoice; Download tile ~75% empty in one frame.
Freelancer now: CTA immediate; saved invoices and Letter/A4 unanswered up front; no header shortcut to saved invoices.

## Minor
Sticky pill and closing pill share the last viewport; split section heading floats description ~350px from title five times; OG/editor show the r mark, site header doesn't; focus ring 3.32:1 on sky, 3.54:1 on dark panel; no Open source nav link; "Some" text mixed with tick/cross icons.

## Questions
- Should a no-cloud product's signature image be a sky full of clouds?
- Could one live demo (browser refusing a request) replace three code tiles?
- Should a returning freelancer see the marketing page at all?
