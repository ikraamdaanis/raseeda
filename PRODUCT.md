# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Freelancers and solo operators who need to bill a client now. They open raseeda in a browser, fill in their details and line items, and leave with a PDF. They do not want to sign up for an accounting suite or hand client and bank details to a third-party server. Many invoice repeat clients, so reusable templates matter.

## Product Purpose

raseeda is a free invoice generator that runs entirely in the browser. It lets someone create a professional, customisable invoice and export it to PDF in one click, with no account, no server holding their data and no tracking. Success is a user going from opening the app to a correct, good-looking PDF quickly, and trusting that their data never left their device.

## Positioning

Truly local-first. There are no accounts and no server-side data; all invoice data lives in the browser's IndexedDB. The only analytics are anonymous first-party counts (event name, country, browser family, OS, device type), with no identifiers or cookies. A hosted invoicing tool cannot truthfully make that claim.

## Operating Context

- Users edit one invoice at a time on a canvas, with settings alongside, then export to PDF (A4) or print.
- Documents and reusable templates are saved locally. Import/export of all data (invoices, templates, images) is the backup story, since there is no cloud copy.
- Invoices are sent to clients as PDFs, so the rendered invoice is what the end client judges.
- Users work on both desktop and phones.

## Capabilities and Constraints

- Seller and client details, line items, tax, fees, discounts, terms, and payment details (bank name, account number, IBAN, BIC/SWIFT, sort code, notes).
- Customisable look: ten invoice fonts, font weight, three sizes, and logo upload. The invoice font library is a user-facing feature, separate from the app's own typography.
- Any currency, with custom symbols.
- Save/load documents and templates in IndexedDB; full data import/export.
- PDF export via @react-pdf/renderer; print is a first-class target (A4).
- No backend for data; deployed as static assets on Cloudflare Workers. The only request the app makes is the anonymous usage beacon to its own origin.
- Every page sends a Content-Security-Policy that refuses requests to any other origin. The homepage names it as a check visitors can make, so it must stay.
- No service worker: an open tab keeps working without a connection, but a fresh visit needs one. Do not claim offline support.
- The editor has no accent-colour control today (the theme's accent is fixed at its default); do not advertise one.
- Must work for international users: any currency, multiple scripts and fonts, varied name and address formats.
- Mobile editing is a real scenario, not a desktop-only afterthought.

## Brand Commitments

- Name: raseeda (lowercase), served at billsend.io.
- Voice: plain and direct, with no sign-up or marketing pressure ("There is nothing to sign up for", "Files are written to your machine, not someone else's").
- Privacy claims on the site (no third-party analytics, no third-party requests, no cookies, anonymous usage counts only) are binding and must stay true.

## Evidence on Hand

- The working app and its README feature list.
- No customer testimonials, usage numbers, press, or case studies exist. Future work must not fabricate them.

## Product Principles

1. The invoice is the product. App chrome stays out of its way, and PDF/print output must be faithful to what is on screen.
2. Local-first is a promise, not a feature. Never add accounts, servers holding user data, tracking of individuals or third-party requests, and keep privacy copy honest.
3. Fast to a correct invoice. Defaults should be good enough that a first-time user can finish without configuration.
4. Customisation serves the freelancer's identity, not complexity. Power is available but never required.
5. Works for everyone's invoice: any currency, any language, any device.

## Accessibility & Inclusion

Target WCAG AA for the app chrome. Support international content (currencies, scripts, name and address formats) and usable touch/mobile editing.
