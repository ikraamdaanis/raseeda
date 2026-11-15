# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

People starting out: new freelancers, solo operators and very small companies who need to bill a client now. They open raseeda in a browser, fill in their details and line items, and leave with a PDF. They do not want to sign up for an accounting suite or hand client and bank details to a third-party server. Many invoice repeat clients, so reusable templates matter.

raseeda is not for businesses whose invoices need accounting-grade detail: withholding tax, split or compound taxes, e-invoice formats, per-country rules. They have outgrown a quick invoice maker and should use accounting software, and raseeda does not try to keep them.

## Product Purpose

raseeda is a free, quick invoice generator that runs entirely in the browser. It lets someone create a professional invoice and export it to PDF in one click, with no account, no server holding their data and no tracking. Success is a first-time user going from opening the app to a good-looking PDF in a few minutes, without configuring anything, and trusting that their data never left their device.

## Positioning

Truly local-first. There are no accounts and no server-side data; all invoice data lives in the browser's IndexedDB. The only analytics are anonymous first-party counts (event name, country, browser family, OS, device type, language, the kind of site a visit came from, and bucketed invoice details such as the currency code, never names or amounts), with no identifiers or cookies. A hosted invoicing tool cannot truthfully make that claim.

## Scope

raseeda's job ends when the PDF is saved. A feature belongs if someone starting out would need it on their first few invoices, and it makes the document better or the next one faster to make. Anything about what happens after it's sent (chasing, tracking, reporting, collecting payment) is out, and so is detail only accounting software needs.

Anything past the basics is off by default and added from the page, so it never slows down a first invoice. A feature a new freelancer would never reach for isn't built at all, however small.

### In scope

- Invoices, and four close cousins made the same way: quotes, proforma invoices, receipts and credit notes. Each is a one-off document with its own title, dates and closing rows, and turning a quote into an invoice is a duplicate with the type changed. All five exist today, and a document can be duplicated as another type.
- Everything the printed document needs to say, including how to pay: bank details, other ways to pay such as PayPal, Venmo, Zelle, UPI or Wise, a payment QR code built on the device, or a payment link the user types in. Bank details (under labels the user can rename), other ways to pay, the payment link and a payment QR code (a SEPA transfer, a UPI payment or the payment link) exist today.
- A printed invoice in the user's own language and format: renameable labels, a language preset that sets every label at once, local date and number formats, and A4 or Letter paper. All of these exist today, with presets for English, German, French, Spanish, Italian, Dutch, Portuguese and Polish. The scripts are the ones the invoice fonts cover: Latin, Latin Extended, Vietnamese, Cyrillic and Greek.
- Styling the document: fonts, size, weight, colours, a logo, a signature (uploaded or drawn), section switches and renamed labels.
- Printing straight from the editor as well as downloading the PDF.
- The fields a basic valid invoice needs, such as a supply date, a tax rate (one, or one per line) and a tax note like "Reverse charge". What goes on the invoice is the user's responsibility.
- Reuse: templates, duplicating, and suggesting clients from past invoices while the client block is filled in. Suggesting line items from past invoices would fit the same way; it isn't built yet.
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
- Accounting-grade detail: withholding tax (such as Spain's IRPF), split or compound taxes on a line (CGST and SGST, GST and QST), amount in words, per-country payment slips such as the Swiss QR-bill. Someone who needs these should use accounting software.
- E-invoices (Factur-X / ZUGFeRD, XRechnung, Peppol). They bring structured tax and party data and strict validation, and the businesses that must send them (Germany from 2027) need accounting software anyway.
- Country rules: per-country rule sets, warnings that an invoice is missing something, checking VAT numbers.
- Scripts the invoice fonts don't cover, such as Arabic, Hebrew, Chinese, Japanese, Korean, Devanagari or Thai. Right-to-left text would mean a mirrored layout, and the fonts would add megabytes to the offline copy.
- Links between documents or their state, such as which quote was accepted or which invoice a credit note cancels. A credit note names the invoice it refers to as printed text.
- Sending or collecting: emailing from raseeda, payment providers, checking whether a payment arrived. The user downloads the PDF and sends it.
- Recurring invoices, or anything else that runs on a schedule.
- Sync of any kind: no cloud copy, no peer-to-peer, no synced folder.
- Accounts, teams, or sharing between people.
- A hosted API or a raseeda MCP server, since either would pass invoice data through a server.
- A blog, articles, or mass-produced pages per country or city.
- Translating the editor's own interface, which stays in English.
- Paid features of any kind (see Brand Commitments).

## Operating Context

- Users edit one invoice at a time on a canvas, with settings alongside, then export to PDF (A4 or Letter) or print.
- Documents and reusable templates are saved locally. Import/export of all data (invoices, templates, images) is the backup story, since there is no cloud copy.
- Invoices are sent to clients as PDFs, so the rendered invoice is what the end client judges.
- Users work on both desktop and phones.

## Capabilities and Constraints

- Seller and client details, line items, tax (one rate or a rate per line), fees, discounts, terms, and payment details (bank name, account number, IBAN, BIC/SWIFT, sort code, each under a renameable label, other ways to pay such as PayPal or Pix, notes).
- Every amount can also show in a second currency, at a rate the user types in.
- Autosave with no Save step, undo and redo, and a version history per invoice.
- Customisable look: eleven invoice fonts, font weight, three sizes, an accent and a text colour, logo upload, and a signature, uploaded or drawn. The invoice font library is a user-facing feature, separate from the app's own typography.
- Any currency, with custom symbols.
- Save/load documents and templates in IndexedDB; full data import/export.
- PDF export via @react-pdf/renderer; print is a first-class target (A4 or Letter).
- No backend for data; deployed as static assets on Cloudflare Workers. The only request the app makes is the anonymous usage beacon to its own origin.
- Every page sends a Content-Security-Policy that refuses requests to any other origin. The homepage names it as a check visitors can make, so it must stay.
- A service worker saves the whole app once the editor has been opened, so later visits work offline.
- Must work for international users: any currency, the scripts the invoice fonts cover, varied name and address formats.
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
3. Quick before complete. Defaults should be good enough that a first-time user can finish without configuration, and a new feature is judged by whether someone starting out needs it, not by how many cases it covers.
4. Customisation serves the freelancer's identity, not complexity. Power is available but never required, and stays off until it's added.
5. Works for the people it's for: any currency, their own language and number format on the printed page, any device.

## Accessibility & Inclusion

Target WCAG AA for the app chrome. Support international content (currencies, the scripts the invoice fonts cover, name and address formats) and usable touch/mobile editing.
