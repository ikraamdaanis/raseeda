import { config } from "zod";

// The app's Content-Security-Policy forbids eval, and zod probes for it with
// `new Function("")` the first time it parses an object, which the browser
// reports as a CSP violation. Jitless mode skips the probe and the compiled
// fast path, so every schema parses the same way with no violation.
config({ jitless: true });
