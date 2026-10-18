import {
  IconAlertTriangle,
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconCircleCheckFilled,
  IconMenu2,
  IconPlus,
  IconX
} from "@tabler/icons-react";
import { createFileRoute, Link, ScriptOnce } from "@tanstack/react-router";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  EditorWindow,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  ScaledFrame
} from "~/components/home/editor-preview";
import {
  CurrencyDemo,
  DemoTile,
  DetailsDemo,
  DownloadDemo,
  FEATURE_PHONE_SCENE,
  FEATURE_SCENE,
  FontDemo,
  PaymentDemo,
  SavedDemo,
  STEP_SCENE,
  TILE_HUES,
  TotalsDemo
} from "~/components/home/feature-demos";
import {
  HERO_INVOICE_NUMBER,
  PDF_RENDERS
} from "~/components/home/pdf-renders";
import { Picture, toAvif } from "~/components/home/picture";
import {
  CONTAINER,
  CreateInvoiceLink,
  FOCUS_RING,
  SiteFooter,
  Wordmark
} from "~/components/home/site-chrome";
import { APP_NAME } from "~/consts/app";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { canonicalLink, siteMeta, SOURCE_URL } from "~/utils/site-meta";
import { HOME_STRUCTURED_DATA } from "~/utils/structured-data";

export const Route = createFileRoute("/")({
  component: HomePage,
  // The invoice in the hero's editor window preloads too, so it downloads
  // alongside the CSS rather than after it; the preload mirrors the AVIF branch
  // of its <picture>, and a browser without AVIF skips it.
  head: () => ({
    meta: siteMeta({ path: "/" }),
    links: [
      canonicalLink("/"),
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        href: toAvif(PDF_RENDERS.hero.src)
      }
    ],
    // JSON-LD is data, never run. Escaping "<" keeps any text in it from
    // closing the script tag early.
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(HOME_STRUCTURED_DATA).replace(/</g, "\\u003c")
      }
    ]
  })
});

// Runs as the HTML is parsed, at the top of the hero. It marks the hero to
// play its entrance (globals.css), which only happens when the homepage loads
// as a page: ScriptOnce writes the script into the server's HTML alone, so
// coming back through a link shows the hero at rest.
const HERO_ENTRANCE_SCRIPT = `(function () {
  var hero = document.getElementById("hero");
  if (hero) hero.dataset.entrance = "";
})();`;

// Runs as the HTML is parsed, straight after the clouds, and starts each one
// at a random point in its crossing, so no two visits open on the same sky.
// Without it they start where HERO_CLOUDS puts them.
const CLOUD_PHASE_SCRIPT = `(function () {
  document.querySelectorAll("[data-cloud]").forEach(function (cloud) {
    var duration = parseFloat(cloud.style.getPropertyValue("--duration"));
    cloud.style.setProperty("--delay", -(Math.random() * duration) + "s");
  });
})();`;

// The secondary action beside CreateInvoiceLink: the same pill, frosted white
// over a coloured panel, so it never outweighs the ink one. Like the ink pill,
// its hover colour eases in and out over 200ms rather than snapping.
const SOFT_PILL = cn(
  "text-ink relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/60 px-4 py-2.5 text-base font-medium whitespace-nowrap ring-1 ring-white/80 backdrop-blur-sm transition-colors duration-200 ease-in-out hover:bg-white/85 sm:py-2 sm:text-sm",
  FOCUS_RING
);

const TEXT_LINK = cn(
  "inline-flex items-center gap-1 rounded-sm font-medium text-ink hover:text-brand-600",
  typeClass("body"),
  FOCUS_RING
);

// Headlines are Geist, like the rest of the page. Sizes come from the type
// roles, which the homepage sets at marketing values through `.home-type`.
const HEADING = "font-medium tracking-[-0.035em] text-balance";

// Single-line controls: buttons, labels, nav links.
const CONTROL_TEXT = typeClass("body", "compact");

// Balanced so short copy never ends on a stub of a line; past six lines
// browsers fall back to normal wrapping.
const BODY_TEXT = cn("text-balance text-zinc-600", typeClass("body"));

const SECTIONS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#compare", label: "Compare" },
  { href: "#features", label: "Features" },
  { href: "#questions", label: "Questions" }
];

// The clouds drifting across the hero's sky, left to right. Each crosses at
// its own pace, the larger (nearer) ones faster, and the paces share no
// common rhythm, so the sky never visibly repeats. `top` is a percentage of
// the sky's height and `size` a percentage of its width (half that in rem at
// least, so phones still get clouds, not specks); `phase` is how far through
// its crossing a cloud starts.
const HERO_CLOUDS: {
  shape: "heap" | "bank" | "puff";
  top: number;
  size: number;
  seconds: number;
  phase: number;
  opacity: number;
  isFlipped?: boolean;
}[] = [
  { shape: "bank", top: 4, size: 30, seconds: 151, phase: 0.1, opacity: 0.55 },
  {
    shape: "puff",
    top: 13,
    size: 20,
    seconds: 193,
    phase: 0.55,
    opacity: 0.6,
    isFlipped: true
  },
  { shape: "heap", top: 21, size: 38, seconds: 109, phase: 0.3, opacity: 0.75 },
  {
    shape: "puff",
    top: 31,
    size: 16,
    seconds: 211,
    phase: 0.85,
    opacity: 0.5,
    isFlipped: true
  },
  {
    shape: "puff",
    top: 34,
    size: 24,
    seconds: 167,
    phase: 0.62,
    opacity: 0.65
  },
  {
    shape: "heap",
    top: 40,
    size: 44,
    seconds: 97,
    phase: 0.72,
    opacity: 0.85,
    isFlipped: true
  },
  { shape: "bank", top: 49, size: 34, seconds: 131, phase: 0.05, opacity: 0.7 },
  { shape: "heap", top: 55, size: 40, seconds: 89, phase: 0.42, opacity: 0.9 }
];

const CLOUD_SHAPES = {
  heap: "bg-cloud-heap aspect-5/2",
  bank: "bg-cloud-bank aspect-4/1",
  puff: "bg-cloud-puff aspect-2/1"
};

// Each feature shows the editor doing it, a short loop on a pale tile, rather
// than an icon. The demos are built from the editor's own pieces
// (components/home/feature-demos.tsx).
const FEATURES: {
  title: string;
  description: string;
  demo: ComponentType<{ width: number; height: number }>;
  hues: [number, number];
  isBleeding?: boolean;
}[] = [
  {
    title: "Your logo, your type",
    description:
      "Upload your logo and set the whole invoice in any of ten fonts, at three sizes.",
    demo: FontDemo,
    hues: [TILE_HUES.lavender, TILE_HUES.blush],
    isBleeding: true
  },
  {
    title: "Any currency",
    description:
      "Choose the currency for each invoice, with custom symbols when you need them.",
    demo: CurrencyDemo,
    hues: [TILE_HUES.sage, TILE_HUES.butter]
  },
  {
    title: "Tax, fees and discounts",
    description: `Add VAT or sales tax, fees, and a fixed or percentage discount. ${APP_NAME} does the sums, taxing the amount after any discount.`,
    demo: TotalsDemo,
    hues: [TILE_HUES.butter, TILE_HUES.blush]
  },
  {
    title: "Payment details clients can use",
    description:
      "Bank name, account and routing numbers, IBAN, BIC / SWIFT and sort code, laid out so your client can pay without asking.",
    demo: PaymentDemo,
    hues: [TILE_HUES.sky, TILE_HUES.sage]
  }
];

// The rest of what the editor does, too small for a card each.
const MORE_FEATURES = [
  "Templates for repeat clients",
  "Import and export backups",
  "Shipping address",
  "PO number and service period",
  "Notes and terms",
  "Late payment terms",
  "Tax-exempt invoices",
  "Amount paid and balance due"
];

// What a visitor would otherwise reach for. The other columns describe the
// typical tool of each kind, not any one product, and a cell that varies says
// so rather than claim a tick or a cross.
// Short labels fit the narrow value columns on phones.
const COMPARISON_COLUMNS = [
  { label: APP_NAME, shortLabel: APP_NAME },
  { label: "Online invoice generators", shortLabel: "Generators" },
  { label: "Accounting software", shortLabel: "Accounting" }
];

// One row per feature at every width: the label, then one value column per
// entry in the columns list (`--comparison-columns`, set on the table). The
// columns share the width in proportion, label first: 1.3 under 400px so the
// short headers fit, 1.5 on larger phones, 2 from `md`. Proportions rather
// than fixed widths keep the label readable when the text size goes up.
const COMPARISON_GRID =
  "grid grid-cols-[minmax(0,1.3fr)_repeat(var(--comparison-columns),minmax(0,1fr))] min-[400px]:grid-cols-[minmax(0,1.5fr)_repeat(var(--comparison-columns),minmax(0,1fr))] md:grid-cols-[minmax(0,2fr)_repeat(var(--comparison-columns),minmax(0,1fr))]";

// A cell is a tick, a cross, or one short word where tools vary; longer
// phrases wrap into tall rows in the narrow phone columns.
type ComparisonValue = boolean | "Some" | "Paid" | "Varies";

// One value per column, in column order. Keep labels to about 35 characters so
// a phone shows them in two or three lines.
const COMPARISON_ROWS: {
  label: string;
  cells: [ComparisonValue, ComparisonValue, ComparisonValue];
}[] = [
  { label: "Free, with no paid plan", cells: [true, "Some", false] },
  { label: "No account needed", cells: [true, "Some", false] },
  { label: "Invoice data stays on your device", cells: [true, false, false] },
  { label: "No watermark on the PDF", cells: [true, "Some", true] },
  { label: "Open source", cells: [true, false, false] },
  { label: "Sends invoices and tracks payment", cells: [false, "Some", true] }
];

// Grouped so no list asks the reader to weigh more than four questions.
const QUESTION_GROUPS: {
  title: string;
  questions: { question: string; answer: string }[];
}[] = [
  {
    title: "Making invoices",
    questions: [
      {
        question: `Does ${APP_NAME} send the invoice to my client?`,
        answer: `No. ${APP_NAME} makes the PDF and you send it however you like, usually as an email attachment. It never contacts your client, and there’s nothing on our side that could.`
      },
      {
        question: "Can I add VAT or sales tax?",
        answer: `Yes. Enter a tax rate and ${APP_NAME} charges it on the amount after any discount, then adds it to the total. For reverse charge or zero-rated work, mark the invoice tax-exempt and add a note such as “Reverse charge”.`
      },
      {
        question: "Can I reuse an invoice for the same client?",
        answer:
          "Yes. Save any invoice as a template, and the next invoice for that client starts from it instead of a blank page."
      },
      {
        question: "Can I use it on my phone?",
        answer:
          "Yes. The editor opens fitted to your screen. Zoom in to edit a section, then download the PDF from the top bar."
      }
    ]
  },
  {
    title: "Your data",
    questions: [
      {
        question: "Where are my invoices saved?",
        answer:
          "In this browser, on this device. Clearing this browser’s site data deletes them, and other browsers can’t see them. To back them up or move them, choose Export Data from the editor’s File menu; the file includes your bank details, so keep it somewhere safe."
      },
      {
        question: "Can I use a private window?",
        answer:
          "Yes, but private windows usually throw their storage away when you close them. Download your PDF, or export your data from the File menu, before you close the window."
      },
      {
        question: "Why is it free, and what’s the catch?",
        answer: `There’s very little to pay for. ${APP_NAME} keeps no accounts and stores nothing about you on a server; once a page has loaded, your browser does all the work. There’s no paid plan, no ads and nothing about you to sell: beyond anonymous counts, like how many PDFs are made, the site collects nothing. The code is public on GitHub under the MIT licence, so you can check.`
      }
    ]
  }
];

// Whether this browser refuses storage: null until known. The database module
// loads on demand so first-time visitors never download it.
function useStorageBlocked() {
  const [blocked, setBlocked] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    import("~/db")
      .then(database => database.countInvoices())
      .then(() => {
        if (!cancelled) setBlocked(false);
      })
      .catch(() => {
        if (!cancelled) setBlocked(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return blocked;
}

function HomePage() {
  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <a
        href="#main"
        className={cn(
          "fixed top-3 left-3 z-60 -translate-y-16 rounded-full bg-white px-4 py-2 font-medium shadow-lg ring-1 ring-zinc-950/10 focus:translate-y-0",
          CONTROL_TEXT,
          FOCUS_RING
        )}
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="overflow-x-clip">
        <Hero />
        <HowItWorks />
        <Comparison />
        <Features />
        <Questions />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-10 lg:pt-5">
      <div className={cn(CONTAINER, "flex h-16 items-center gap-4")}>
        <div className="flex flex-1 items-center">
          <Wordmark />
        </div>
        <nav
          aria-label="Sections"
          className="flex items-center gap-1 max-md:hidden"
        >
          {SECTIONS.map(section => (
            <a
              key={section.href}
              href={section.href}
              className={cn(
                "hover:text-ink rounded-full px-3 py-2 text-zinc-600",
                CONTROL_TEXT,
                FOCUS_RING
              )}
            >
              {section.label}
            </a>
          ))}
        </nav>
        <div className="flex flex-1 items-center justify-end gap-1">
          <HeaderAction />
          <PhoneMenu />
        </div>
      </div>
    </header>
  );
}

// Below `md` the section links fold into a native disclosure, so they work
// before hydration. Once hydrated it also closes on Escape or a tap outside,
// like any menu.
function PhoneMenu() {
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
      className="relative md:hidden"
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
            href={section.href}
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

// The header's way into the editor: a quiet text link, so it never repeats
// the hero's button right below it. Phones skip it: the hero's button is the
// first thing under the header, and the link would crowd the menu button.
function HeaderAction() {
  return (
    <Link
      to="/create"
      className={cn(
        "hover:text-brand-600 text-ink relative inline-flex items-center gap-1 rounded-sm px-1 py-2 font-medium whitespace-nowrap max-sm:hidden",
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

function SectionHeading({
  title,
  description,
  isCentered = false
}: {
  title: ReactNode;
  description: ReactNode;
  isCentered?: boolean;
}) {
  if (isCentered) {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <h2 className={cn(HEADING, typeClass("title"), "max-w-[35ch]")}>
          {title}
        </h2>
        <p className={cn(BODY_TEXT, "max-w-[48ch]")}>{description}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
      <h2 className={cn(HEADING, typeClass("title"), "max-w-[35ch]")}>
        {title}
      </h2>
      <p className={cn(BODY_TEXT, "max-w-[48ch] lg:max-w-[40ch]")}>
        {description}
      </p>
    </div>
  );
}

// The hero is a sky from behind the header (the section pulls up under it) to
// the editor window's cut: inset from the viewport with rounded corners from
// `lg`, and running to the screen's edges below it. The copy sits centred on
// it and the window rises from its foot. The copy comes into focus line by
// line, 80ms apart, then the editor window fades in. On phones the copy and
// buttons sit on the left, in line with the editor window's crop below them;
// from `sm` they are centred over the whole window.
function Hero() {
  return (
    <section
      id="hero"
      suppressHydrationWarning
      className="-mt-16 lg:-mt-21 lg:p-3"
    >
      <ScriptOnce>{HERO_ENTRANCE_SCRIPT}</ScriptOnce>
      <div className="bg-sky relative isolate overflow-hidden pt-16 lg:rounded-[2rem] lg:pt-21">
        <HeroClouds />
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-start gap-8 pt-14 sm:items-center sm:pt-20 sm:text-center"
          )}
        >
          <div className="flex flex-col items-start gap-5 sm:items-center">
            <h1 className={cn(HEADING, typeClass("display"))}>
              <span className="hero-focus block">Send the invoice.</span>
              <span className="hero-focus block [animation-delay:80ms]">
                Keep everything else.
              </span>
            </h1>
            <p className="hero-focus text-ink/75 max-w-[48ch] text-lg/7 text-pretty [animation-delay:160ms]">
              Free and private.{" "}
              <a
                href={SOURCE_URL}
                aria-label="Open source on GitHub"
                className={cn(
                  "group text-ink inline-flex items-center gap-0.5 rounded-sm whitespace-nowrap",
                  FOCUS_RING
                )}
              >
                <span className="border-ink/40 group-hover:border-ink flex items-center border-b border-dotted">
                  <GithubMark />
                  pen source
                </span>
                <IconArrowUpRight
                  className="size-4 shrink-0"
                  aria-hidden="true"
                />
              </a>
            </p>
          </div>
          <div className="hero-focus flex flex-wrap items-center gap-3 [animation-delay:240ms] sm:justify-center">
            <CreateInvoiceLink />
            <a href="#how-it-works" className={SOFT_PILL}>
              See how it works
            </a>
          </div>
        </div>
        <HeroVisual />
      </div>
      <div className={CONTAINER}>
        <StorageBlockedNote />
      </div>
    </section>
  );
}

// GitHub's mark, standing in for the O of "Open source": round, a little
// under the cap height so it sits on the line like the letter would.
function GithubMark() {
  return (
    <svg
      viewBox="0 0 98 96"
      aria-hidden="true"
      className="mr-px size-[0.78em] shrink-0 fill-current"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M48.854 0C21.839 0 0 22 0 49.217c0 21.756 13.993 40.172 33.405 46.69 2.427.49 3.316-1.059 3.316-2.362 0-1.141-.08-5.052-.08-9.127-13.59 2.934-16.42-5.867-16.42-5.867-2.184-5.704-5.42-7.17-5.42-7.17-4.448-3.015.324-3.015.324-3.015 4.934.326 7.523 5.052 7.523 5.052 4.367 7.496 11.404 5.378 14.235 4.074.404-3.178 1.699-5.378 3.074-6.6-10.839-1.141-22.243-5.378-22.243-24.283 0-5.378 1.94-9.778 5.014-13.2-.485-1.222-2.184-6.275.486-13.038 0 0 4.125-1.304 13.426 5.052a46.97 46.97 0 0 1 12.214-1.63c4.125 0 8.33.571 12.213 1.63 9.302-6.356 13.427-5.052 13.427-5.052 2.67 6.763.97 11.816.485 13.038 3.155 3.422 5.015 7.822 5.015 13.2 0 18.905-11.404 23.06-22.324 24.283 1.78 1.548 3.316 4.481 3.316 9.126 0 6.6-.08 11.897-.08 13.526 0 1.304.89 2.853 3.316 2.364 19.412-6.52 33.405-24.935 33.405-46.691C97.707 22 75.788 0 48.854 0z"
      />
    </svg>
  );
}

// The sky's drifting clouds, behind everything else in the hero. A cloud
// waits off the left edge (left-0, pulled back its own width by the drift)
// and the layer clips it until it crosses in.
function HeroClouds() {
  return (
    <div
      aria-hidden="true"
      className="@container absolute inset-0 -z-10 overflow-hidden"
    >
      {HERO_CLOUDS.map((cloud, index) => (
        <div
          key={index}
          data-cloud
          suppressHydrationWarning
          className={cn(
            "animate-cloud-drift absolute top-(--top) left-0 w-[max(calc(var(--size)*1cqw),calc(var(--size)*0.5rem))]",
            CLOUD_SHAPES[cloud.shape],
            cloud.isFlipped && "-scale-x-100"
          )}
          style={
            {
              "--top": `${cloud.top}%`,
              "--size": cloud.size,
              "--duration": `${cloud.seconds}s`,
              "--delay": `${-cloud.phase * cloud.seconds}s`,
              opacity: cloud.opacity
            } as CSSProperties
          }
        />
      ))}
      <ScriptOnce>{CLOUD_PHASE_SCRIPT}</ScriptOnce>
    </div>
  );
}

/**
 * The editor, shown rather than described: the real editor layout, both side
 * panels open, with a real PDF of the invoice on its desk, in a frosted bezel
 * that rises from the foot of the sky. From `lg` the whole window's width
 * sits in the page's column. Below it the window is drawn at a fixed zoom from
 * its top-left corner and runs off the sky's right edge, so phones and
 * tablets see a readable crop of the invoices panel and the page. The bezel
 * and window run off the sky's foot, where they are cut, so only their top
 * corners are rounded.
 */
function HeroVisual() {
  return (
    <figure
      aria-label={`The ${APP_NAME} editor with a sample invoice`}
      className={cn(
        CONTAINER,
        "hero-fade mt-12 [animation-delay:320ms] sm:mt-16"
      )}
    >
      <div className="w-max rounded-t-(--bezel-radius) bg-white/45 p-(--pad) pb-0 shadow-[0_24px_64px_-16px_rgb(16_60_90/0.25)] ring-1 ring-white/70 [--bezel-radius:--spacing(4)] [--pad:--spacing(1.5)] max-lg:rounded-tr-none max-lg:pr-0 sm:[--bezel-radius:--spacing(5)] sm:[--pad:--spacing(2)] lg:w-full">
        <div className="w-[calc(1440px*var(--zoom))] overflow-hidden rounded-t-[calc(var(--bezel-radius)-var(--pad))] [--zoom:0.55] max-lg:rounded-tr-none sm:[--zoom:0.65] md:[--zoom:0.75] lg:w-auto">
          <ScaledFrame {...HERO_FRAME} fill>
            <EditorWindow documentName={HERO_INVOICE_NUMBER} {...HERO_WINDOW}>
              <PdfPaper render={PDF_RENDERS.hero} />
            </EditorWindow>
          </ScaledFrame>
        </div>
      </div>
    </figure>
  );
}

// The hero's editor window, at a laptop's width so the page fits between the
// two panels (256px + 288px + the 858px desk), drawn taller than the frame
// shows so the sky's foot always cuts it.
const HERO_WINDOW = { width: 1440, height: 1100 };

// The part of the window the hero shows: its full width, down to the
// invoice's totals.
const HERO_FRAME = { width: 1440, height: 860 };

/**
 * A real PDF in the editor canvas's place: a screenshot of the top of
 * the page on the same paper, shown first thing, so it preloads with the page.
 * It decodes synchronously: left to itself, WebKit decodes a picture this
 * large off the main thread, so a reload painted the paper blank for a frame
 * before the invoice appeared.
 */
function PdfPaper({ render }: { render: typeof PDF_RENDERS.hero }) {
  return (
    <div
      className="border-paper-border bg-paper overflow-hidden border shadow-md"
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
    >
      <Picture
        src={render.src}
        alt={render.alt}
        width={render.width}
        height={Math.round(
          (render.width * render.crop.height) / render.crop.width
        )}
        fetchPriority="high"
        decoding="sync"
        className="block h-auto w-full"
      />
    </div>
  );
}


// A browser that refuses storage gets told what that means and how to fix it.
function StorageBlockedNote() {
  const blocked = useStorageBlocked();

  if (!blocked) return null;

  return (
    <p className={cn(BODY_TEXT, "mt-6 flex items-start gap-2")}>
      <IconAlertTriangle
        className="size-5 h-lh shrink-0 text-amber-600 sm:size-4"
        aria-hidden="true"
      />
      This browser is blocking storage, so invoices can’t be saved here. You can
      still make one and download the PDF. To save them, leave private browsing
      or allow this site to store data, then reload.
    </p>
  );
}

// From a blank page to a sent invoice, in the order a visitor does it. Each
// step plays a short loop of the editor doing it, like the feature cards
// further down.
const STEPS: {
  title: string;
  description: string;
  demo: ComponentType<{ width: number; height: number }>;
  hues: [number, number];
}[] = [
  {
    title: "Add the details",
    description: `Your details, your client and the line items. ${APP_NAME} does the sums as you type.`,
    demo: DetailsDemo,
    hues: [TILE_HUES.butter, TILE_HUES.sky]
  },
  {
    title: "Send the PDF",
    description:
      "Download an A4 PDF or print it, then send it to your client however you like.",
    demo: DownloadDemo,
    hues: [TILE_HUES.blush, TILE_HUES.lavender]
  },
  {
    title: "Keep a copy",
    description:
      "Invoices save in this browser, so a repeat client’s next invoice starts from the last one.",
    demo: SavedDemo,
    hues: [TILE_HUES.sage, TILE_HUES.sky]
  }
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="How it works."
          description={`${APP_NAME} is a private invoice generator: no sign-up and nothing to install. Open the editor and start typing.`}
        />
        <ol className="mt-12 grid gap-x-6 gap-y-12 sm:mt-16 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex flex-col gap-6">
              <DemoTile
                scene={step.demo}
                hues={step.hues}
                size={STEP_SCENE}
                className="aspect-4/3"
              />
              <div className="flex flex-col gap-2">
                <h3
                  className={cn(
                    typeClass("subtitle"),
                    "flex items-center gap-3 font-medium"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      typeClass("caption"),
                      "bg-brand-50 text-brand-600 flex size-7 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums"
                    )}
                  >
                    {index + 1}
                  </span>
                  {step.title}
                </h3>
                <p className={BODY_TEXT}>{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="What goes on the invoice."
          description="For freelancers and anyone with a side project who needs to bill a client, not set up accounting software."
        />
        <ul className="mt-12 grid gap-x-6 gap-y-12 sm:mt-16 md:grid-cols-2">
          {FEATURES.map(feature => (
            <li key={feature.title} className="flex flex-col gap-6">
              <DemoTile
                scene={feature.demo}
                hues={feature.hues}
                size={FEATURE_SCENE}
                phoneSize={FEATURE_PHONE_SCENE}
                isBleeding={feature.isBleeding}
                className="sm:aspect-16/10"
              />
              <div className="flex flex-col gap-2">
                <h3 className={cn(typeClass("subtitle"), "font-medium")}>
                  {feature.title}
                </h3>
                <p className={cn(BODY_TEXT, "max-w-[52ch]")}>
                  {feature.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-12 flex flex-col gap-6 rounded-xl bg-white p-6 ring-1 ring-zinc-950/10 sm:mt-16 sm:p-8">
          <h3 className={cn(typeClass("subtitle"), "font-medium")}>
            Also in the editor
          </h3>
          <ul className="grid gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-4">
            {MORE_FEATURES.map(feature => (
              <li
                key={feature}
                className={cn(
                  "flex items-center gap-2 text-zinc-700",
                  CONTROL_TEXT
                )}
              >
                <IconCheck
                  className="text-brand-600 size-5 shrink-0 sm:size-4"
                  aria-hidden="true"
                />
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// A real <table>, so text extractors and AI crawlers keep the comparison,
// laid out as one grid per row. The roles repeat the elements' own because
// Safari drops table semantics from table elements given a CSS display.
// (jsx-a11y also reads <td> as an interactive grid cell, so it objects to
// role="cell" on one.)
/* eslint-disable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */
function Comparison() {
  const [ownColumn, ...otherColumns] = COMPARISON_COLUMNS;
  const tableLabel = `${ownColumn.label} compared with ${new Intl.ListFormat(
    "en",
    { type: "conjunction" }
  ).format(otherColumns.map(column => column.label.toLowerCase()))}`;

  return (
    <section id="compare" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title={`How ${APP_NAME} compares with other invoice generators.`}
          description={`${APP_NAME} makes the invoice and stops there. To email invoices and track payments, you want accounting software.`}
          isCentered
        />
        <table
          role="table"
          aria-label={tableLabel}
          className="mx-auto mt-12 block max-w-4xl rounded-2xl bg-white p-2 ring-1 ring-zinc-950/10 sm:mt-16 sm:p-6 md:p-8"
          style={
            {
              "--comparison-columns": COMPARISON_COLUMNS.length
            } as CSSProperties
          }
        >
          <thead role="rowgroup" className="block">
            <tr role="row" className={COMPARISON_GRID}>
              <th role="columnheader" scope="col">
                <span className="sr-only">Feature</span>
              </th>
              {COMPARISON_COLUMNS.map((column, index) => (
                <th
                  key={column.label}
                  role="columnheader"
                  scope="col"
                  className={cn(
                    // Phones set the short headers small (11px under 400px,
                    // then 12px) so they fit the narrowest columns.
                    "flex items-end justify-center px-0.5 pt-4 pb-3 text-center text-[11px]/4 font-medium text-balance min-[400px]:px-1 min-[400px]:text-xs/4 sm:text-sm/5 md:px-4",
                    index === 0
                      ? "text-brand-700 bg-brand-50 rounded-t-xl"
                      : "text-zinc-600"
                  )}
                >
                  <span className="md:hidden">{column.shortLabel}</span>
                  <span className="max-md:hidden">{column.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody role="rowgroup" className="block">
            {COMPARISON_ROWS.map((row, rowIndex) => {
              const isLastRow = rowIndex === COMPARISON_ROWS.length - 1;

              return (
                <tr
                  key={row.label}
                  role="row"
                  className={cn(
                    COMPARISON_GRID,
                    "border-t",
                    rowIndex === 0 ? "border-zinc-950/10" : "border-zinc-950/5"
                  )}
                >
                  <th
                    role="rowheader"
                    scope="row"
                    className={cn(
                      typeClass("caption"),
                      "text-ink self-center py-4 pr-2 text-left font-normal text-balance wrap-break-word min-[400px]:pr-3 md:pr-6"
                    )}
                  >
                    {row.label}
                  </th>
                  {COMPARISON_COLUMNS.map((column, cellIndex) => (
                    <td
                      key={column.label}
                      role="cell"
                      className={cn(
                        "flex items-center justify-center px-1 py-4 md:px-4",
                        cellIndex === 0 && "bg-brand-50",
                        cellIndex === 0 && isLastRow && "rounded-b-xl"
                      )}
                    >
                      <ComparisonCell
                        value={row.cells[cellIndex]}
                        isOwnColumn={cellIndex === 0}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* eslint-enable jsx-a11y/no-redundant-roles, jsx-a11y/no-interactive-element-to-noninteractive-role */

// Only raseeda's column carries colour: a filled brand tick. The other
// columns answer in greys (an ink tick, a faint cross, "Some" where tools
// vary), so the eye reads raseeda's column first and nothing reads as a
// warning. The shapes differ too, so the table reads without colour.
function ComparisonCell({
  value,
  isOwnColumn
}: {
  value: ComparisonValue;
  isOwnColumn: boolean;
}) {
  if (typeof value === "string") {
    return (
      <span className={cn(typeClass("caption"), "text-zinc-600")}>{value}</span>
    );
  }

  if (value) {
    return (
      <>
        {isOwnColumn ? (
          <IconCircleCheckFilled
            className="text-brand-600 mx-auto size-6 shrink-0"
            aria-hidden="true"
          />
        ) : (
          <IconCheck
            className="text-ink mx-auto size-5 shrink-0"
            aria-hidden="true"
          />
        )}
        <span className="sr-only">Yes</span>
      </>
    );
  }

  return (
    <>
      <IconX
        className="mx-auto size-5 shrink-0 text-zinc-400"
        aria-hidden="true"
      />
      <span className="sr-only">No</span>
    </>
  );
}

function Questions() {
  return (
    <section id="questions" className="py-16 sm:py-20">
      <div className={cn(CONTAINER, "grid gap-x-6 gap-y-12 lg:grid-cols-3")}>
        <div className="flex flex-col items-start gap-6">
          <h2 className={cn(HEADING, typeClass("title"), "max-w-[35ch]")}>
            Questions before you start.
          </h2>
          <p className={cn(BODY_TEXT, "max-w-[40ch]")}>
            Something else, or found a bug? Open an issue on GitHub; you’ll need
            a free GitHub account to post.
          </p>
          <a
            href={`${SOURCE_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(TEXT_LINK, "min-h-11")}
          >
            Ask on GitHub
            <IconArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
        <div className="flex flex-col gap-12 lg:col-span-2">
          {QUESTION_GROUPS.map(group => (
            <div key={group.title} className="flex flex-col gap-4">
              <h3
                className={cn(typeClass("body"), "font-medium text-zinc-500")}
              >
                {group.title}
              </h3>
              <div className="flex flex-col gap-px overflow-hidden rounded-xl bg-zinc-950/10 ring-1 ring-zinc-950/10">
                {group.questions.map(item => (
                  <details key={item.question} className="group bg-white px-5">
                    <summary
                      className={cn(
                        "flex cursor-pointer list-none items-center justify-between gap-6 rounded-sm py-5 font-medium [&::-webkit-details-marker]:hidden",
                        typeClass("subtitle", "compact"),
                        FOCUS_RING
                      )}
                    >
                      {item.question}
                      <IconPlus
                        className="size-5 shrink-0 text-zinc-500 group-open:rotate-45"
                        aria-hidden="true"
                      />
                    </summary>
                    <p
                      className={cn(BODY_TEXT, "max-w-[64ch] pb-6 text-pretty")}
                    >
                      {item.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// The closing band mirrors the hero: dark headline, teal second line, and a
// painting that runs the full width of the viewport. The page rising from the
// panel's foot is a real PDF. Its box is sized from the page's own
// width, so it always shows the same top share of the page, and the page runs
// past the box to be cut by the panel's foot: 4:3 shows about half on phones,
// 16:9 about 40% from `sm`. Like the hero, the copy sits above the panel.
// The last word before the footer: a panel in the hero's sky colour, inset
// and rounded like the hero from `lg` and edge to edge below it, with a glow
// rising from its foot under a grid of dots. The glow breathes slowly in and
// out (animate-glow-breathe); the dots hold still.
function Closing() {
  return (
    <section className="pt-16 sm:pt-24 lg:px-3">
      <div className="bg-glow relative isolate overflow-hidden lg:rounded-[2rem]">
        <div
          aria-hidden="true"
          className="bg-glow-dome animate-glow-breathe absolute inset-0 -z-10"
        />
        <div
          aria-hidden="true"
          className="bg-dot-grid absolute inset-0 -z-10 mask-[radial-gradient(70%_90%_at_50%_100%,black,transparent_75%)]"
        />
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-center gap-8 py-24 text-center sm:py-32"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <p className={cn("text-brand-700 font-medium", CONTROL_TEXT)}>
              Nothing to sign up for
            </p>
            <h2 className={cn(HEADING, typeClass("display"))}>
              <span className="block">Your next invoice</span>
              <span className="block">starts here.</span>
            </h2>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <CreateInvoiceLink />
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={SOFT_PILL}
            >
              View the source
              <IconArrowUpRight
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
