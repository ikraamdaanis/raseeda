import handler, { createServerEntry } from "@tanstack/react-start/server-entry";
import { env } from "cloudflare:workers";
import { handleAnalyticsEvent } from "~/app/analytics-event";
import { CONTENT_SECURITY_POLICY } from "~/consts/content-security-policy";
import { SECURITY_HEADERS } from "~/consts/security-headers";

// Every page goes out with a Content-Security-Policy that only lets it talk to
// the app's own origin, so the browser itself enforces that invoice data has
// nowhere else to go. The one thing pages send back to that origin is an
// anonymous event name for the usage counts (/api/event). Every response gets
// the baseline security headers.
export default createServerEntry({
  async fetch(request) {
    const response =
      new URL(request.url).pathname === "/api/event"
        ? await handleAnalyticsEvent(request, env.ANALYTICS)
        : await handler.fetch(request);
    const contentType = response.headers.get("content-type") ?? "";
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      headers.set(name, value);
    }

    if (contentType.includes("text/html")) {
      headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  }
});
