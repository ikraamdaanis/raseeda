import { ScriptOnce } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { HeroSky } from "~/components/home/hero-sky";
import { CONTAINER, SiteFooter } from "~/components/home/site-chrome";
import {
  HEADER_STATE_SCRIPT,
  HERO_ACTIONS_ID,
  SiteHeader,
  SkipLink,
  useHeaderState
} from "~/components/home/site-header";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

// Each page's colour: the hero's sky turned to another oklch hue, and the
// small label above the heading in a matching shade. Amber warns that a page
// is missing; red says something broke.
const TONES = {
  warning: { hue: 70, eyebrow: "text-amber-800" },
  error: { hue: 25, eyebrow: "text-red-800" }
};

/**
 * The frame the not-found and error pages share: the homepage's own header,
 * behaving exactly as it does there, over the homepage's hero sky in the
 * page's tone, filling the screen, with the copy and buttons set like the
 * hero's. On phones the copy sits on the left and the sky runs edge to edge;
 * from `sm` the copy is centred, and from `lg` the sky is inset and rounded.
 * `isNoIndex` asks search engines not to index the page (React moves the tag
 * into the head): an error can show in place of a real page's content, under
 * that page's address.
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
  useHeaderState();

  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      {isNoIndex && <meta name="robots" content="noindex" />}
      <SkipLink />
      <SiteHeader sectionPath="/" />
      <main id="main" className="overflow-x-clip">
        <HeroSky
          hue={TONES[tone].hue}
          className="flex min-h-svh flex-col justify-center lg:min-h-[calc(100svh-1.5rem)]"
        >
          <div
            className={cn(
              CONTAINER,
              "flex w-full flex-col items-start gap-8 pt-14 pb-24 sm:items-center sm:pt-20 sm:pb-32 sm:text-center"
            )}
          >
            <div className="flex flex-col items-start gap-5 sm:items-center">
              <p
                className={cn(
                  "hero-focus font-medium",
                  TONES[tone].eyebrow,
                  typeClass("body", "compact")
                )}
              >
                {eyebrow}
              </p>
              <h1
                className={cn(
                  "hero-focus font-medium tracking-[-0.035em] text-balance [animation-delay:60ms]",
                  typeClass("display")
                )}
              >
                {title}
              </h1>
              <p className="hero-focus text-ink/75 max-w-[48ch] text-lg/7 text-pretty [animation-delay:120ms]">
                {description}
              </p>
            </div>
            <div
              id={HERO_ACTIONS_ID}
              className="hero-focus flex flex-wrap items-center gap-3 [animation-delay:180ms] sm:justify-center"
            >
              {actions}
            </div>
            {children && (
              <div className="hero-fade w-full max-w-md [animation-delay:240ms]">
                {children}
              </div>
            )}
          </div>
        </HeroSky>
        <ScriptOnce>{HEADER_STATE_SCRIPT}</ScriptOnce>
      </main>
      <SiteFooter />
    </div>
  );
}
