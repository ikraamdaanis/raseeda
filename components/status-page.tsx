import type { CSSProperties, ReactNode } from "react";
import {
  CONTAINER,
  PageHeader,
  SiteFooter
} from "~/components/home/site-chrome";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

// Each page's colour: the panel's glow turned to an oklch hue (the sky
// utilities read --sky-hue), and the small label above the heading in a
// matching shade. Amber warns that a page is missing; red says something
// broke.
const TONES = {
  warning: { hue: 70, eyebrow: "text-amber-800" },
  error: { hue: 25, eyebrow: "text-red-700" }
};

/**
 * The frame the not-found and error pages share, in the site's own dress:
 * the header and footer of the privacy page around a panel like the
 * homepage's closing one, the hero's sky gone pale with a glow rising from
 * its foot under a grid of dots. The glow holds still here; nothing on a
 * page that reports a problem should move. `isNoIndex` asks search engines
 * not to index the page (React moves the tag into the head): an error can
 * show in place of a real page's content, under that page's address.
 */
export function StatusPage({
  tone,
  isNoIndex = false,
  eyebrow,
  title,
  description,
  actions,
  children
}: {
  tone: keyof typeof TONES;
  isNoIndex?: boolean;
  eyebrow: string;
  title: string;
  description: ReactNode;
  actions: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate flex min-h-svh flex-col antialiased">
      {isNoIndex && <meta name="robots" content="noindex" />}
      <PageHeader />
      <main className="flex flex-1 flex-col lg:px-3">
        <section
          className="bg-glow relative isolate flex flex-1 items-center overflow-hidden lg:rounded-[2rem]"
          style={{ "--sky-hue": TONES[tone].hue } as CSSProperties}
        >
          <div
            aria-hidden="true"
            className="bg-glow-dome absolute inset-0 -z-10"
          />
          <div
            aria-hidden="true"
            className="bg-dot-grid absolute inset-0 -z-10 mask-[radial-gradient(70%_90%_at_50%_100%,black,transparent_75%)]"
          />
          <div
            className={cn(
              CONTAINER,
              "flex w-full flex-col items-center gap-8 py-24 text-center sm:py-32"
            )}
          >
            <div className="flex flex-col items-center gap-4">
              <p
                className={cn(
                  "font-medium",
                  TONES[tone].eyebrow,
                  typeClass("body", "compact")
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cn(
                  "font-medium tracking-[-0.035em] text-balance",
                  typeClass("display")
                )}
              >
                {title}
              </h1>
              <p
                className={cn(
                  "max-w-[48ch] text-balance text-zinc-600",
                  typeClass("body")
                )}
              >
                {description}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {actions}
            </div>
            {children}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
