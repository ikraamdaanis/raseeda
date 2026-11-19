// The browser enforces this on every page. Data may only go to the app's own
// origin: an anonymous usage event (/api/event), and the page views Cloudflare
// Web Analytics reports to /cdn-cgi/rum from the script Cloudflare adds to each
// page, the one script loaded from elsewhere. `data:` and `blob:` are in-memory
// URLs (logos, generated PDFs) that never leave the device; a `blob:` frame is
// how Print shows the PDF it made. Inline scripts and styles carry the
// server-rendered hydration state, and `wasm-unsafe-eval` lets the PDF layout
// engine (Yoga) start its WebAssembly module.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");
