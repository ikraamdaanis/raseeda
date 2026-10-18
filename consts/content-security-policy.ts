// The browser enforces this on every page. Nothing may be fetched
// from, sent to, or embedded from any origin but the app's own, and the only
// thing pages send that origin is an anonymous usage event name (/api/event).
// `data:` and `blob:` are in-memory URLs (logos, generated PDFs) that never
// leave the device. Inline scripts and styles carry the server-rendered
// hydration state, and `wasm-unsafe-eval` lets the PDF layout engine (Yoga)
// start its WebAssembly module.
export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join("; ");
