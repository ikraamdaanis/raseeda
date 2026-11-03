// Sent with every response, besides the CSP on pages. HTTPS only,
// for a year; no guessing a file's type from its contents; no Referer on
// links out (to GitHub, say), so nothing about the visit leaves with them,
// but one between the site's own pages, so the usage counts can tell a move
// within the site from a new visit (utils/track.ts); no framing by other
// sites, for browsers that predate the CSP's frame-ancestors; and no camera,
// microphone, location, payment or interest tracking, which the app never
// needs. public/_headers sends the same for static files.
export const SECURITY_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()"
};
