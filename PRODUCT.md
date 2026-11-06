# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Freelancers and solo operators who need to bill a client now. They open raseeda in a browser, fill in their details and line items, and leave with a PDF. They do not want to sign up for an accounting suite or hand client and bank details to a third-party server. Many invoice repeat clients, so reusable templates matter.

## Product Purpose

raseeda is a free invoice generator that runs entirely in the browser. It lets someone create a professional, customisable invoice and export it to PDF in one click, with no account, no server holding their data and no tracking. Success is a user going from opening the app to a correct, good-looking PDF quickly, and trusting that their data never left their device.

## Positioning

Truly local-first. There are no accounts and no server-side data; all invoice data lives in the browser's IndexedDB. The only analytics are anonymous first-party counts (event name, country, browser family, OS, device type, language, the kind of site a visit came from, and bucketed invoice details such as the currency code, never names or amounts), with no identifiers or cookies. A hosted invoicing tool cannot truthfully make that claim.

## Scope

raseeda's job ends when the PDF is saved. A feature belongs if it makes the document better or the next one faster to make. Anything about what happens after it's sent (chasing, tracking, reporting, collecting payment) is out.

### In scope

- Invoices, and four close cousins made the same way: quotes, proforma invoices, receipts and credit notes. Each is a one-off document with its own title, dates and closing rows, and turning a quote into an invoice is a duplicate with the type changed. Only invoices exist today.
- Everything the printed document needs to say, including how to pay: bank details, other ways to pay such as PayPal, Venmo, Zelle, UPI or Wise, a payment QR code built on the device, or a payment link the user types in. Bank details (under labels the user can rename) and other ways to pay exist today; the QR code and payment link don't yet.
- A printed invoice that works in any language and region: renameable labels, a language preset that sets every label at once, any script, local date and number formats, and A4 or Letter paper. Renameable labels, local number formats and A4 or Letter exist today; the language preset doesn't.
- Styling the document: fonts, size, weight, colours, a logo, a signature (uploaded or drawn), section switches and renamed labels.
- Printing straight from the editor as well as downloading the PDF. Only the download exists today.
- The fields a valid invoice needs, such as a supply date, per-line tax and a tax note. What goes on the invoice is the user's responsibility.
- Reuse: templates, duplicating, and suggesting clients from past invoices while the client block is filled in.
- The library as a working set for finding, reopening, duplicating and fixing past documents. Its search, sort, grouping and filters exist to find one.
- Backup and restore through an export file, which is also how invoices move to another device.
- Scripts and AI assistants making, opening and exporting documents through `window.raseeda` in the open tab, within the same scope as the editor.
- Site pages that open the editor ready for a job, like the template gallery or a template for a trade or document type.

### Out of scope

- Tracking: sent, paid or overdue status in the library, reminders, follow-ups. A payment written on the document (amount paid, the PAID stamp) is document content and stays.
- Reporting: totals per client, month or year, dashboards, exports for accounting.
- A client list kept apart from the invoices. Client suggestions come from past invoices only.
- A saved sender profile or a stored numbering sequence. A template carries the user's own details, and the next number is typed in; a counter kept between invoices is the start of tracking. Both existed once and were removed.
- Free-form layout: moving blocks around, a layout designer, custom CSS. One well-made layout stays correct in print.
- Country rules: per-country rule sets, warnings that an invoice is missing something, checking VAT numbers.
- Links between documents or their state, such as which quote was accepted or which invoice a credit note cancels. A credit note names the invoice it refers to as printed text.
- Sending or collecting: emailing from raseeda, payment providers, checking whether a payment arrived. The user downloads the PDF and sends it.
- Recurring invoices, or anything else that runs on a schedule.
- Sync of any kind: no cloud copy, no peer-to-peer, no synced folder.
- Accounts, teams, or sharing between people.
- A hosted API or a raseeda MCP server, since either would pass invoice data through a server.
- A blog, articles, or mass-produced pages per country or city.
- Translating the editor's own interface, which stays in English.
- Paid features of any kind (see Brand Commitments).

### Open questions

- E-invoices (Factur-X / ZUGFeRD, XRechnung, Peppol). Out for now, since they bring structured tax and party data and strict validation. Not ruled out: a Factur-X file is still a PDF made on the device, and EU countries are starting to require e-invoices between businesses (Germany from 2027).

## Operating Context

- Users edit one invoice at a time on a canvas, with settings alongside, then export to PDF (A4 or Letter) or print.
- Documents and reusable templates are saved locally. Import/export of all data (invoices, templates, images) is the backup story, since there is no cloud copy.
- Invoices are sent to clients as PDFs, so the rendered invoice is what the end client judges.
- Users work on both desktop and phones.

## Capabilities and Constraints

- Seller and client details, line items, tax (one rate or a rate per line), fees, discounts, terms, and payment details (bank name, account number, IBAN, BIC/SWIFT, sort code, each under a renameable label, other ways to pay such as PayPal or Pix, notes).
- Every amount can also show in a second currency, at a rate the user types in.
- Autosave with no Save step, undo and redo, and a version history per invoice.
- Customisable look: eleven invoice fonts, font weight, three sizes, and logo upload. The invoice font library is a user-facing feature, separate from the app's own typography.
- Any currency, with custom symbols.
- Save/load documents and templates in IndexedDB; full data import/export.
- PDF export via @react-pdf/renderer; print is a first-class target (A4 or Letter).
- No backend for data; deployed as static assets on Cloudflare Workers. The only request the app makes is the anonymous usage beacon to its own origin.
- Every page sends a Content-Security-Policy that refuses requests to any other origin. The homepage names it as a check visitors can make, so it must stay.
- A service worker saves the whole app once the editor has been opened, so later visits work offline.
- The editor has no accent-colour control today (the theme's accent is fixed at its default); do not advertise one.
- Must work for international users: any currency, multiple scripts and fonts, varied name and address formats.
- Mobile editing is a real scenario, not a desktop-only afterthought.

## Brand Commitments

- Name: raseeda (lowercase), served at raseeda.com.
- Voice: plain and direct, with no sign-up or marketing pressure ("There is nothing to sign up for", "Files are written to your machine, not someone else's").
- Open source: the code stays MIT-licensed and anyone can run their own copy with no raseeda server behind it, so the privacy promise never rests on trusting raseeda.com.
- Free: every feature is free and stays free, with no premium tier, watermark or invoice limit. If raseeda is ever funded, it is by donations or sponsorship, never by gating features or using data.
- Privacy claims on the site (no third-party analytics, no third-party requests, no cookies, anonymous usage counts only) are binding and must stay true.

## Evidence on Hand

- The working app and its README feature list.
- No customer testimonials, usage numbers, press, or case studies exist. Future work must not fabricate them.

## Product Principles

1. The invoice is the product. App chrome stays out of its way, and PDF/print output must be faithful to what is on screen.
2. Local-first is a promise, not a feature. Never add accounts, servers holding user data, tracking of individuals or third-party requests, and keep privacy copy honest.
3. Fast to a correct invoice. Defaults should be good enough that a first-time user can finish without configuration.
4. Customisation serves the freelancer's identity, not complexity. Power is available but never required.
5. Works for everyone's invoice: any currency, any language and region on the printed page, any device.

## Accessibility & Inclusion

Target WCAG AA for the app chrome. Support international content (currencies, scripts, name and address formats) and usable touch/mobile editing.
