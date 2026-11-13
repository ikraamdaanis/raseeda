-- The anonymous usage counts (issue #85) for the last 30 days, from the
-- usage_events dataset in Workers Analytics Engine. Run one statement at a
-- time against the SQL API, with a token that has Account Analytics Read:
--
--   curl "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql" \
--     --header "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
--     --data "SELECT blob1 AS event, SUM(_sample_interval) AS events FROM usage_events GROUP BY event"
--
-- Analytics Engine samples rows, so count with SUM(_sample_interval), never
-- count(). The columns are positional (app/analytics-event.ts): blob1 event,
-- blob2 country, blob3 browser, blob4 OS, blob5 device, blob6 page path,
-- blob7 referrer, blob8 source, blob9 language, blob10 currency, blob11 display
-- mode, blob12 library size. double1 is the count; double2 onwards are a
-- PDF's printed sections in SECTION_BITS order (consts/analytics-events.ts):
-- double2 logo, double3 PO number, double4 service period, double5 date of
-- supply, double6 shipping, double7 discounts, double8 tax, double9 fees,
-- double10 amount paid, double11 second currency, double12 payment details,
-- double13 notes, double14 terms, double15 late payment, double16 paid stamp,
-- double17 signature, double18 payment QR code.
-- page_view is the closest thing to visits, pdf_opened and pdf_downloaded to
-- invoices made and invoice_saved to invoices kept. Rows written before issue #104 have the
-- newer columns empty.

-- How often each event happened: page views, editor opens, PDFs, saves,
-- templates, exports and imports.
SELECT blob1 AS event, SUM(_sample_interval) AS events
FROM usage_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event
ORDER BY events DESC;

-- Each event by country (ISO code; XX when unknown).
SELECT blob1 AS event, blob2 AS country, SUM(_sample_interval) AS events
FROM usage_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, country
ORDER BY event, events DESC;

-- Each event by browser family.
SELECT blob1 AS event, blob3 AS browser, SUM(_sample_interval) AS events
FROM usage_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, browser
ORDER BY event, events DESC;

-- Each event by operating system.
SELECT blob1 AS event, blob4 AS os, SUM(_sample_interval) AS events
FROM usage_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, os
ORDER BY event, events DESC;

-- Each event by device type.
SELECT blob1 AS event, blob5 AS device, SUM(_sample_interval) AS events
FROM usage_events
WHERE timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, device
ORDER BY event, events DESC;

-- Page views by page.
SELECT blob6 AS page, SUM(_sample_interval) AS page_views
FROM usage_events
WHERE blob1 = 'page_view' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY page
ORDER BY page_views DESC;

-- Page views by the kind of site the visit came from. Only a page load's first
-- page view names one; the pages after it are "internal".
SELECT blob7 AS referrer, SUM(_sample_interval) AS page_views
FROM usage_events
WHERE blob1 = 'page_view' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY referrer
ORDER BY page_views DESC;

-- Page views by the ?ref= or utm_source on the landing page.
SELECT blob8 AS source, SUM(_sample_interval) AS page_views
FROM usage_events
WHERE blob1 = 'page_view' AND blob8 != ''
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY source
ORDER BY page_views DESC;

-- Landings, PDFs and saves by referrer: which channels bring people who make
-- invoices. Compare each row's PDFs and saves with its landings.
SELECT blob7 AS referrer, blob1 AS event, SUM(_sample_interval) AS events
FROM usage_events
WHERE blob1 IN ('page_view', 'pdf_opened', 'pdf_downloaded', 'invoice_saved')
  AND blob7 NOT IN ('', 'internal')
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY referrer, event
ORDER BY referrer, event;

-- Each event by browser language.
SELECT blob1 AS event, blob9 AS language, SUM(_sample_interval) AS events
FROM usage_events
WHERE blob9 != '' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, language
ORDER BY event, events DESC;

-- PDFs and saves by the invoice's currency ("other" for anything not listed).
SELECT blob1 AS event, blob10 AS currency, SUM(_sample_interval) AS events
FROM usage_events
WHERE blob1 IN ('pdf_opened', 'pdf_downloaded', 'invoice_saved')
  AND blob10 != ''
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, currency
ORDER BY event, events DESC;

-- Each event in a browser tab or the installed app.
SELECT blob1 AS event, blob11 AS display, SUM(_sample_interval) AS events
FROM usage_events
WHERE blob11 != '' AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY event, display
ORDER BY event, events DESC;

-- Editor opens by how many invoices were already saved: 0 is a first visit
-- (or cleared storage), 2-5 and 6+ are people who keep using it.
SELECT blob12 AS library, SUM(_sample_interval) AS editor_opens
FROM usage_events
WHERE blob1 = 'editor_opened' AND blob12 != ''
  AND timestamp > NOW() - INTERVAL '30' DAY
GROUP BY library
ORDER BY library;

-- PDFs with each optional section printed, out of all PDFs that report them.
SELECT
  SUM(_sample_interval) AS pdfs,
  SUM(double2 * _sample_interval) AS logo,
  SUM(double3 * _sample_interval) AS po_number,
  SUM(double4 * _sample_interval) AS service_period,
  SUM(double5 * _sample_interval) AS supply_date,
  SUM(double6 * _sample_interval) AS shipping,
  SUM(double7 * _sample_interval) AS discounts,
  SUM(double8 * _sample_interval) AS tax,
  SUM(double9 * _sample_interval) AS fees,
  SUM(double10 * _sample_interval) AS amount_paid,
  SUM(double11 * _sample_interval) AS second_currency,
  SUM(double12 * _sample_interval) AS payment_details,
  SUM(double13 * _sample_interval) AS notes,
  SUM(double14 * _sample_interval) AS terms,
  SUM(double15 * _sample_interval) AS late_payment,
  SUM(double16 * _sample_interval) AS paid_stamp,
  SUM(double17 * _sample_interval) AS signature,
  SUM(double18 * _sample_interval) AS payment_qr_code
FROM usage_events
WHERE blob1 IN ('pdf_opened', 'pdf_downloaded') AND blob12 != ''
  AND timestamp > NOW() - INTERVAL '30' DAY;
