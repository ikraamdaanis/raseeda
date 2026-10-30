import { IconArrowRight, IconMenu2 } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  CONTAINER,
  FOCUS_RING,
  INK_PILL,
  Wordmark
} from "~/components/home/site-chrome";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";

// The homepage's header, shared with the pages that open on the same sky (the
// not-found and error pages): sticky, clear over the hero and solid once the
// page scrolls, with the section links and the way into the editor.

// Single-line controls: buttons, labels, nav links.
const CONTROL_TEXT = typeClass("body", "compact");

const SECTIONS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#privacy", label: "Privacy" },
  { href: "#features", label: "Features" },
  { href: "#compare", label: "Compare" },
  { href: "#questions", label: "Questions" }
];

// The first stop for keyboard users: hidden until focused, then a pill in the
// top corner that jumps past the header to the page's <main id="main">.
export function SkipLink() {
  return (
    <a
      href="#main"
      className={cn(
        "fixed top-3 left-3 z-60 -translate-y-[calc(100%+2.5rem)] rounded-full bg-white px-4 py-2 font-medium shadow-lg ring-1 ring-zinc-950/10 focus:translate-y-0",
        CONTROL_TEXT,
        FOCUS_RING
      )}
    >
      Skip to content
    </a>
  );
}

// The hero's buttons, which the header watches. Every page with this header
// gives its hero's buttons this id.
export const HERO_ACTIONS_ID = "hero-actions";

// How far the page scrolls before the header turns solid.
const HEADER_SOLID_SCROLL = 24;

// The header's two states live on <html>, so CSS draws them
// (`.home-header` in globals.css) without waiting for React:
// `data-header-solid` once the page has scrolled 24px, and
// `data-header-pill` once the hero's buttons have gone under the bar (64px). HEADER_STATE_SCRIPT sets them as the
// page parses, right after the hero, and on every scroll, including the
// reload's restore, so a reload mid-page paints the solid header at once.
function updateHeaderState() {
  const actions = document.getElementById(HERO_ACTIONS_ID);

  if (!actions) return;

  const isPastHero = actions.getBoundingClientRect().bottom < 64;
  const root = document.documentElement;

  root.toggleAttribute(
    "data-header-solid",
    isPastHero || scrollY > HEADER_SOLID_SCROLL
  );
  root.toggleAttribute("data-header-pill", isPastHero);
}

// Tells HEADER_STATE_SCRIPT that useHeaderState has taken over.
const HEADER_HANDOVER_EVENT = "home-header-handover";

// The header only animates between states once `data-header-ready` is set,
// two frames after the page has finished parsing: by then a reload's scroll
// is restored, so the header paints in its final state with no transition or
// pill entrance playing.
export const HEADER_STATE_SCRIPT = `(function(){var root=document.documentElement;function update(){var actions=document.getElementById(${JSON.stringify(HERO_ACTIONS_ID)});if(!actions)return;var past=actions.getBoundingClientRect().bottom<64;root.toggleAttribute("data-header-solid",past||scrollY>${HEADER_SOLID_SCROLL});root.toggleAttribute("data-header-pill",past)}function ready(){update();requestAnimationFrame(function(){requestAnimationFrame(function(){update();root.setAttribute("data-header-ready","")})})}update();addEventListener("scroll",update,{passive:true});addEventListener("resize",update);document.addEventListener(${JSON.stringify(HEADER_HANDOVER_EVENT)},function(){removeEventListener("scroll",update);removeEventListener("resize",update)},{once:true});if(document.readyState==="loading")addEventListener("DOMContentLoaded",ready);else ready()})()`;

// The same tracking once the page has hydrated, and on a client-side visit,
// where the inline script doesn't run; the states are cleared on the way out
// so no other page inherits them. On hydration it takes over from the inline
// script, whose listeners stand down, so each scroll is measured once and
// nothing is left listening after the page.
export function useHeaderState() {
  useEffect(() => {
    const root = document.documentElement;

    document.dispatchEvent(new Event(HEADER_HANDOVER_EVENT));
    updateHeaderState();
    addEventListener("scroll", updateHeaderState, { passive: true });
    addEventListener("resize", updateHeaderState);

    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => root.setAttribute("data-header-ready", ""))
    );

    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("scroll", updateHeaderState);
      removeEventListener("resize", updateHeaderState);
      root.removeAttribute("data-header-solid");
      root.removeAttribute("data-header-pill");
      root.removeAttribute("data-header-ready");
    };
  }, []);
}

// The header sticks to the top. Over the hero it is clear, part of the sky,
// with the quiet "Open the editor" link. Once the page has scrolled 24px, well
// before the headline reaches it, it takes the canvas behind it; from
// `lg` it also rises by its top padding, so the bar sits flush with the top
// of the window. Once the hero's buttons pass under it, the link gives way
// to the Create invoice pill, so the editor is one tap away anywhere on the
// page, phones included. Both states are CSS on <html> attributes (see
// updateHeaderState), so they paint before the page hydrates. The section
// links are the homepage's; other pages pass `sectionPath="/"` so they lead
// there.
export function SiteHeader({ sectionPath = "" }: { sectionPath?: string }) {
  return (
    <header className="home-header sticky top-0 z-40 backdrop-blur-[0px] lg:pt-5">
      <div className={cn(CONTAINER, "flex h-16 items-center gap-4")}>
        <div className="flex flex-1 items-center">
          <Wordmark />
        </div>
        <nav
          aria-label="Sections"
          className="flex items-center gap-1 max-lg:hidden"
        >
          {SECTIONS.map(section => (
            <a
              key={section.href}
              href={`${sectionPath}${section.href}`}
              className={cn(
                "hover:text-ink rounded-full px-3 py-2 whitespace-nowrap text-zinc-600",
                CONTROL_TEXT,
                FOCUS_RING
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-2">
          <span className="home-header-swap">
            <span className="home-header-pill">
              <CreateInvoiceLink />
            </span>
            <span className="home-header-link">
              <HeaderAction />
            </span>
          </span>
          <PhoneMenu sectionPath={sectionPath} />
        </div>
      </div>
    </header>
  );
}

// Below `lg` the section links fold into a native disclosure, so they work
// before hydration. Once hydrated it also closes on Escape or a tap outside,
// like any menu.
function PhoneMenu({ sectionPath }: { sectionPath: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      setIsOpen(false);
      menuRef.current?.querySelector("summary")?.focus();
    }

    function handlePointerDown(event: PointerEvent) {
      if (!(event.target instanceof Node)) return;
      if (menuRef.current?.contains(event.target)) return;

      setIsOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <details
      ref={menuRef}
      open={isOpen}
      onToggle={event => setIsOpen(event.currentTarget.open)}
      className="relative lg:hidden"
    >
      <summary
        className={cn(
          "flex size-11 cursor-pointer list-none items-center justify-center rounded-full [&::-webkit-details-marker]:hidden",
          FOCUS_RING
        )}
      >
        <IconMenu2 className="size-6 shrink-0" aria-hidden="true" />
        <span className="sr-only">Sections</span>
      </summary>
      <nav
        aria-label="Sections"
        className="absolute top-full right-0 z-10 mt-2 flex w-56 flex-col rounded-xl bg-white p-1.5 shadow-lg ring-1 ring-zinc-950/10"
      >
        {SECTIONS.map(section => (
          <a
            key={section.href}
            href={`${sectionPath}${section.href}`}
            onClick={() => setIsOpen(false)}
            className={cn(
              "hover:text-ink rounded-lg px-3 py-3 text-zinc-700 transition-colors duration-200 ease-in-out hover:bg-zinc-100",
              CONTROL_TEXT,
              FOCUS_RING
            )}
          >
            {section.label}
          </a>
        ))}
      </nav>
    </details>
  );
}

// The page's one primary action, shaped the same everywhere it appears: a pill
// in the homepage ink, larger on touch screens. It preloads the editor on
// hover or touch (the router's default), not on sight: the editor's code is
// over 500 KB and, fetched at load, it held up the hero on phones.
export function CreateInvoiceLink() {
  return (
    <Link to="/create" className={INK_PILL}>
      Create invoice
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
      />
    </Link>
  );
}

// The header's way into the editor while the hero shows: a quiet text link,
// so it never repeats the hero's button right below it. A returning visitor
// lands back on their latest invoice. Phones skip it: the hero's button is
// the first thing under the header, and the link would crowd the menu button.
function HeaderAction() {
  return (
    <Link
      to="/create"
      className={cn(
        "hover:text-brand-800 text-ink relative inline-flex items-center gap-1 rounded-sm px-1 py-2 font-medium whitespace-nowrap max-sm:hidden",
        CONTROL_TEXT,
        FOCUS_RING
      )}
    >
      Open the editor
      <IconArrowRight className="size-4 shrink-0" aria-hidden="true" />
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
      />
    </Link>
  );
}
