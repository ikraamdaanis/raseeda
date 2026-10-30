import interFont from "@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2?url";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconArrowUpRight,
  IconCheck,
  IconCloudOff,
  IconCode,
  IconEyeOff,
  IconFileTypePdf,
  IconMenu2,
  IconPlus,
  IconUserOff,
  IconX
} from "@tabler/icons-react";
import { createFileRoute, Link, ScriptOnce } from "@tanstack/react-router";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import {
  EditorWindow,
  getTitleStyle,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  ScaledFrame
} from "~/components/home/editor-preview";
import {
  CLOSING_RENDER,
  HERO_INVOICE_NUMBER,
  PDF_RENDER_SCALE,
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
import { formatCurrencyWithCode } from "~/consts/currencies";
import { getInvoiceFontDefinition } from "~/consts/invoice-fonts";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import type { InvoiceFont } from "~/types";
import { canonicalLink, siteMeta, SOURCE_URL } from "~/utils/site-meta";
import { HOME_STRUCTURED_DATA } from "~/utils/structured-data";

export const Route = createFileRoute("/")({
  component: HomePage,
  // The homepage is set in Inter, so its latin subset preloads here rather
  // than in the root head, where every route would download it.
  // The hero painting and the invoice in its editor window preload too, so
  // they download alongside the CSS rather than after it; each preload mirrors
  // one AVIF branch of a <picture>, and a browser without AVIF skips them.
  head: () => ({
    meta: siteMeta({ path: "/" }),
    links: [
      canonicalLink("/"),
      {
        rel: "preload",
        href: interFont,
        as: "font",
        type: "font/woff2",
        crossOrigin: "anonymous"
      },
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        href: toAvif(PDF_RENDERS.hero.src)
      },
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        media: "(max-width: 639px)",
        imageSrcSet: toAvif(HERO_PORTRAIT_SRCSET),
        imageSizes: "100vw",
        fetchPriority: "high"
      },
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        media: "(min-width: 640px)",
        imageSrcSet: toAvif(HERO_LANDSCAPE_SRCSET),
        imageSizes: HERO_LANDSCAPE_SIZES,
        fetchPriority: "high"
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

// The hero painting's sizes, shared by its <picture> and the head's preloads.
const HERO_PORTRAIT_SRCSET =
  "/home/hero-harbour-portrait-900.webp 900w, /home/hero-harbour-portrait-1350.webp 1350w";

const HERO_LANDSCAPE_SRCSET =
  "/home/hero-harbour-1600.webp 1600w, /home/hero-harbour-2400.webp 2400w, /home/hero-harbour-3200.webp 3200w";

const HERO_LANDSCAPE_SIZES = "(max-width: 1023px) 1960px, max(100vw, 2250px)";

// Runs as the HTML is parsed, straight after the hero painting and before the
// copy. It marks the hero to play its entrance (globals.css), which only
// happens when the homepage loads as a page: ScriptOnce writes the script into
// the server's HTML alone, so coming back through a link shows the hero at
// rest. The painting usually lands before React hydrates, so the check is made
// here too: if it isn't loaded yet it holds back its entrance, so the blurred
// placeholder shows, and plays it once the painting loads.
const HERO_ENTRANCE_SCRIPT = `(function () {
  var hero = document.getElementById("hero");
  if (hero) hero.dataset.entrance = "";
  var painting = document.getElementById("hero-painting");
  if (!painting || painting.complete) return;
  painting.dataset.loading = "";
  function show() {
    delete painting.dataset.loading;
  }
  painting.addEventListener("load", show, { once: true });
  painting.addEventListener("error", show, { once: true });
})();`;

const TEXT_LINK = cn(
  "inline-flex items-center gap-1 rounded-sm font-medium text-ink hover:text-ink-blue",
  typeClass("body"),
  FOCUS_RING
);

// Headlines use Inter's Display optical size, which the browser picks up from
// the opsz axis at large sizes. Sizes come from the type roles, which the
// homepage sets at marketing values through `.home-type`.
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

// The privacy promise in four words, each on a tile of one of the secondary
// hues. Features get their own section, so they stay out of this strip.
const FACTS: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tile: string;
}[] = [
  {
    label: "No account",
    icon: IconUserOff,
    tile: "bg-blush-tint text-blush-ink"
  },
  {
    label: "No uploads",
    icon: IconCloudOff,
    tile: "bg-sage-tint text-sage-ink"
  },
  {
    label: "No trackers",
    icon: IconEyeOff,
    tile: "bg-butter-tint text-butter-ink"
  },
  {
    label: "Open source",
    icon: IconCode,
    tile: "bg-lavender-tint text-lavender-ink"
  }
];

// Paper lifted off a feature card's wash.
const PAPER_SHADOW =
  "shadow-[0_4px_16px_-6px_rgb(0_0_0/0.12)] outline-1 -outline-offset-1 outline-zinc-950/5";

// The secondary hues' washes: a pale painting in each hue, over its flat tint
// so the panel already has its colour while the painting loads.
// Each painting comes at 600px and 1200px wide; phones and the step cards
// take the small one.
const WASHES = {
  lavender: { tint: "bg-lavender-tint", name: "wash-lavender" },
  sage: { tint: "bg-sage-tint", name: "wash-sage" },
  butter: { tint: "bg-butter-tint", name: "wash-butter" },
  blush: { tint: "bg-blush-tint", name: "wash-blush" }
};

// Each feature shows a fragment of a real invoice rather than an icon, on a
// pale wash of its own colour. Blue belongs to billsend and its controls, so
// the features take the secondary hues, all at the same lightness. A specimen
// that is a crop of a PDF page runs off the card where it was cut, so only the
// paper's edge shows; the others sit on a slip of paper.
const FEATURES: {
  title: string;
  description: string;
  specimen: ReactNode;
  hue: keyof typeof WASHES;
  isPageCrop?: boolean;
}[] = [
  {
    title: "Your logo, your type",
    description:
      "Upload your logo and set the whole invoice in any of ten fonts, at three sizes.",
    specimen: <TypeSpecimen />,
    hue: "lavender"
  },
  {
    title: "Any currency",
    description:
      "Choose the currency for each invoice, with custom symbols when you need them.",
    specimen: <CurrencySpecimen />,
    hue: "sage"
  },
  {
    title: "Tax, fees and discounts",
    description:
      "Add VAT or sales tax, fees, and a fixed or percentage discount. billsend does the sums, taxing the amount after any discount.",
    specimen: <TotalsSpecimen />,
    hue: "butter",
    isPageCrop: true
  },
  {
    title: "Payment details clients can use",
    description:
      "Bank name, account and routing numbers, IBAN, BIC / SWIFT and sort code, laid out so your client can pay without asking.",
    specimen: <PaymentSpecimen />,
    hue: "blush",
    isPageCrop: true
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
  { label: "billsend", shortLabel: "billsend" },
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
        question: "Does billsend send the invoice to my client?",
        answer:
          "No. billsend makes the PDF and you send it however you like, usually as an email attachment. It never contacts your client, and there’s nothing on our side that could."
      },
      {
        question: "Can I add VAT or sales tax?",
        answer:
          "Yes. Enter a tax rate and billsend charges it on the amount after any discount, then adds it to the total. For reverse charge or zero-rated work, mark the invoice tax-exempt and add a note such as “Reverse charge”."
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
        answer:
          "There’s very little to pay for. billsend keeps no accounts and stores nothing about you on a server; once a page has loaded, your browser does all the work. There’s no paid plan, no ads and nothing about you to sell: beyond anonymous counts, like how many PDFs are made, the site collects nothing. The code is public on GitHub under the MIT licence, so you can check."
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
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink isolate min-h-svh font-sans font-features-['cv02','cv03','cv04','cv11'] antialiased">
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
    <header className="relative z-10">
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
              "hover:text-ink rounded-lg px-3 py-3 text-zinc-700 hover:bg-zinc-100",
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
        "hover:text-ink-blue text-ink relative inline-flex items-center gap-1 rounded-sm px-1 py-2 font-medium whitespace-nowrap max-sm:hidden",
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

// The hero is one painting, the full width of the viewport, from behind the
// header (the section pulls up under it) to the editor window's cut. The copy
// sits centred on its sky, over a fade to the canvas colour that keeps the
// nav and headline legible, and the window rises from the painting's foot.
// The painting is cut from an 8K master in three widths, up to 3200px: on a
// 2x screen a 4096px cut looked no different and weighed twice as much.
// Covering a hero taller than 16:9 draws it wider than the viewport (about
// 1960px by `lg`, 2250px from there), hence the sizes. Phones get a 9:16
// centre crop, since they only ever show its middle. It decodes in step with
// the page (no decoding="async"), so a reload with the file cached paints it
// in the first frame instead of flashing the placeholder for a frame or two.
// Its entrance waits for it: HERO_ENTRANCE_SCRIPT holds it back until it loads.
// The copy comes into focus line by line, 80ms apart, then the editor window
// fades in.
function Hero() {
  return (
    <section id="hero" suppressHydrationWarning className="-mt-16">
      <div className="bg-hero-placeholder relative isolate overflow-hidden pt-16">
        <picture>
          <source
            type="image/avif"
            media="(max-width: 639px)"
            srcSet={toAvif(HERO_PORTRAIT_SRCSET)}
            sizes="100vw"
            width={1350}
            height={2400}
          />
          <source
            media="(max-width: 639px)"
            srcSet={HERO_PORTRAIT_SRCSET}
            sizes="100vw"
            width={1350}
            height={2400}
          />
          <source
            type="image/avif"
            srcSet={toAvif(HERO_LANDSCAPE_SRCSET)}
            sizes={HERO_LANDSCAPE_SIZES}
          />
          <img
            id="hero-painting"
            src="/home/hero-harbour-2400.webp"
            srcSet={HERO_LANDSCAPE_SRCSET}
            sizes={HERO_LANDSCAPE_SIZES}
            alt=""
            width={3200}
            height={1800}
            fetchPriority="high"
            suppressHydrationWarning
            className="hero-settle absolute inset-0 -z-10 size-full object-cover"
          />
        </picture>
        <ScriptOnce>{HERO_ENTRANCE_SCRIPT}</ScriptOnce>
        <div
          aria-hidden="true"
          className="from-canvas/60 via-canvas/25 absolute inset-x-0 top-0 -z-10 h-1/2 bg-linear-to-b to-transparent"
        />
        <div
          className={cn(
            CONTAINER,
            "flex flex-col items-center gap-10 pt-16 text-center sm:pt-24"
          )}
        >
          <div className="flex flex-col items-center gap-6">
            <h1 className={cn(HEADING, typeClass("display"))}>
              <span className="hero-focus block">Send the invoice.</span>
              <span className="hero-focus text-ink-blue block [animation-delay:80ms]">
                Keep everything else.
              </span>
            </h1>
            <p className="hero-focus text-ink/75 max-w-[48ch] text-lg/7 text-pretty [animation-delay:160ms]">
              A free invoice generator in your browser.{" "}
              <br className="max-sm:hidden" />
              No account, and your details never leave your device.
            </p>
          </div>
          <div className="hero-focus flex flex-wrap items-center justify-center gap-x-6 gap-y-3 [animation-delay:240ms]">
            <CreateInvoiceLink />
            <a
              href="#how-it-works"
              className={cn(TEXT_LINK, "py-2.5 text-base sm:py-2 sm:text-sm")}
            >
              See how it works
            </a>
          </div>
        </div>
        <HeroVisual />
      </div>
      <div className={CONTAINER}>
        <StorageBlockedNote />
        <ul className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-zinc-950/10 py-8 lg:grid-cols-4">
          {FACTS.map(fact => (
            <li
              key={fact.label}
              className={cn(
                "flex items-center gap-3 font-medium text-zinc-700",
                CONTROL_TEXT
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  fact.tile
                )}
              >
                <fact.icon className="size-4" />
              </span>
              {fact.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/**
 * The editor, shown rather than described: the real editor layout with a real
 * billsend PDF of the invoice on its desk, rising from the foot of the hero's
 * painting. The window keeps to the page's column inside a 17:10 frame; on
 * phones the frame is a fixed 638px of window tall (at the 0.6 zoom), which
 * ends it just under the fourth line item. The frame's min-h-0 holds its
 * height while the window overflows it, and the painting's overflow-hidden
 * makes the cut. The window starts at the frame's top. From `lg` the whole
 * window sits centred in the frame. Below it the window is drawn at a fixed
 * zoom, inset --pad from the frame's left edge, and runs off the viewport's
 * right edge and the frame's foot, so phones and tablets see a readable crop
 * of its top-left corner.
 */
function HeroVisual() {
  return (
    <figure
      aria-label="The billsend editor with a sample invoice"
      className={cn(
        CONTAINER,
        "hero-fade relative mt-14 h-[calc(638px*0.6)] min-h-0 [animation-delay:320ms] sm:mt-16 sm:aspect-17/10 sm:h-auto"
      )}
    >
      <div className="pl-(--pad) [--pad:--spacing(5)] sm:[--pad:--spacing(10)] lg:px-(--pad) lg:[--pad:--spacing(16)]">
        <div className="w-[calc(1024px*var(--zoom))] [--zoom:0.6] sm:[--zoom:0.7] md:[--zoom:0.92] lg:hidden">
          <ScaledFrame
            {...HERO_WINDOW}
            fill
            className="rounded-tl-xl shadow-2xl"
          >
            <EditorWindow documentName={HERO_INVOICE_NUMBER} {...HERO_WINDOW}>
              <PdfPaper render={PDF_RENDERS.hero} />
            </EditorWindow>
          </ScaledFrame>
        </div>
        <ScaledFrame
          {...HERO_WINDOW}
          className="rounded-t-xl shadow-2xl max-lg:hidden"
        >
          <EditorWindow documentName={HERO_INVOICE_NUMBER} {...HERO_WINDOW}>
            <PdfPaper render={PDF_RENDERS.hero} />
          </EditorWindow>
        </ScaledFrame>
      </div>
    </figure>
  );
}

// The hero's editor window, drawn taller than any frame shows so the frame's
// foot always cuts it: the tallest need is a phone's 638px of window. Each
// crop zoom is the smallest that still reaches the frame's right edge at the
// top of its range (571px of window at 639px, 679px at 767px, 935px at
// 1023px).
const HERO_WINDOW = { width: 1024, height: 1240 };

/**
 * A real billsend PDF in the editor canvas's place: a screenshot of the top of
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

const EDITOR_FONTS: InvoiceFont[] = ["geist", "lora", "jetbrains-mono"];

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
// step shows a slip of the app doing it, on a wash of one of the secondary
// hues, like the feature cards further down.
const STEPS: {
  title: string;
  description: string;
  specimen: ReactNode;
  hue: keyof typeof WASHES;
}[] = [
  {
    title: "Add the details",
    description:
      "Your details, your client and the line items. billsend does the sums as you type.",
    specimen: <DetailsSpecimen />,
    hue: "butter"
  },
  {
    title: "Send the PDF",
    description:
      "Download an A4 PDF or print it, then send it to your client however you like.",
    specimen: <PdfSpecimen />,
    hue: "blush"
  },
  {
    title: "Keep a copy",
    description:
      "Invoices save in this browser, so a repeat client’s next invoice starts from the last one.",
    specimen: <SavedSpecimen />,
    hue: "sage"
  }
];

// The slip each step's specimen sits on: the app's own surface, in Geist.
const SLIP = cn(
  PAPER_SHADOW,
  "font-geist flex w-full max-w-64 flex-col rounded-lg bg-white p-3 text-xs text-zinc-950"
);

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="How it works."
          description="billsend is a private invoice generator: no sign-up and nothing to install. Open the editor and start typing."
        />
        <ol className="mt-12 grid gap-6 sm:mt-16 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col overflow-hidden rounded-xl bg-white ring-1 ring-zinc-950/10"
            >
              <div
                aria-hidden="true"
                className={cn(
                  "relative isolate flex h-48 items-center justify-center p-6",
                  WASHES[step.hue].tint
                )}
              >
                <Wash
                  hue={step.hue}
                  sizes="(min-width: 1152px) 370px, (min-width: 768px) 33vw, 100vw"
                />
                {step.specimen}
              </div>
              <div className="flex flex-col gap-2 p-6">
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
                      "bg-brand-50 text-ink-blue flex size-7 shrink-0 items-center justify-center rounded-full font-semibold tabular-nums"
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

// The page's pictures below the hero load straight away at low priority, not
// lazily: lazy loading fetches an image only as it nears the viewport (late
// in Safari), so it popped in while scrolling. They total about 450 KB, and
// low priority keeps them behind the hero.
// `sizes` is the card's width: a third of the column for the steps, half for
// the features, and the full width below `md`.
function Wash({ hue, sizes }: { hue: keyof typeof WASHES; sizes: string }) {
  const { name } = WASHES[hue];

  return (
    <Picture
      src={`/home/${name}.webp`}
      srcSet={`/home/${name}-600.webp 600w, /home/${name}.webp 1200w`}
      sizes={sizes}
      alt=""
      width={1200}
      height={900}
      fetchPriority="low"
      className="absolute inset-0 -z-10 size-full object-cover"
    />
  );
}

// A client typed in, and the lines summing as they go.
function DetailsSpecimen() {
  return (
    <div className={cn(SLIP, "gap-2")}>
      <span className="text-zinc-500">Bill to</span>
      <span className="ring-brand-600 rounded-md px-2 py-1.5 font-medium ring-2">
        Harbor & Pine Co.
        <span className="bg-brand-600 ml-px inline-block h-3.5 w-px translate-y-0.5" />
      </span>
      <div className="mt-1 flex flex-col gap-1.5 border-t border-zinc-950/10 pt-2.5 tabular-nums">
        <span className="flex justify-between gap-4">
          Editorial illustrations
          <span>$1,800.00</span>
        </span>
        <span className="flex justify-between gap-4">
          Cover artwork
          <span>$950.00</span>
        </span>
        <span className="flex justify-between gap-4 font-semibold">
          Total
          <span>$2,750.00 USD</span>
        </span>
      </div>
    </div>
  );
}

// The finished file, ready to download.
function PdfSpecimen() {
  return (
    <div className={cn(SLIP, "gap-3")}>
      <div className="flex items-center gap-3">
        <span className="bg-blush-tint text-blush-ink flex size-9 shrink-0 items-center justify-center rounded-md">
          <IconFileTypePdf className="size-5" />
        </span>
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">INV-0043.pdf</span>
          <span className="text-zinc-500">A4, 1 page</span>
        </span>
      </div>
      <span className="bg-brand-600 rounded-md py-1.5 text-center font-medium text-white">
        Download
      </span>
    </div>
  );
}

// Past invoices waiting in the browser, a repeat client among them.
function SavedSpecimen() {
  return (
    <div className={cn(SLIP, "gap-1")}>
      <span className="pb-1 text-zinc-500">Saved in this browser</span>
      {[
        { number: "INV-0043", client: "Harbor & Pine Co." },
        { number: "INV-0042", client: "Fieldnote Press" },
        { number: "INV-0041", client: "Harbor & Pine Co." }
      ].map(saved => (
        <span
          key={saved.number}
          className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 odd:bg-zinc-50"
        >
          <span className="font-medium tabular-nums">{saved.number}</span>
          <span className="truncate text-zinc-500">{saved.client}</span>
        </span>
      ))}
    </div>
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
            <li
              key={feature.title}
              className="row-span-2 grid grid-rows-subgrid gap-6"
            >
              <div
                aria-hidden="true"
                className={cn(
                  "relative isolate flex items-center overflow-hidden rounded-xl p-(--pad) ring-1 ring-zinc-950/5 [--pad:--spacing(6)] sm:[--pad:--spacing(8)]",
                  WASHES[feature.hue].tint,
                  !feature.isPageCrop && "min-h-48 max-sm:[--pad:--spacing(4)]"
                )}
              >
                <Wash
                  hue={feature.hue}
                  sizes="(min-width: 1152px) 560px, (min-width: 768px) 50vw, 100vw"
                />
                {feature.isPageCrop ? (
                  feature.specimen
                ) : (
                  <div
                    className={cn(
                      PAPER_SHADOW,
                      "w-full rounded-lg bg-white p-4 sm:p-6"
                    )}
                  >
                    {feature.specimen}
                  </div>
                )}
              </div>
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

// The invoice title in three of the editor's faces, set as the editor sets it.
// The size follows the card's width so three titles fit a phone's paper slip:
// the monospace "Invoice" is 4.2em wide, so three plus two gaps need 12.6em.
function TypeSpecimen() {
  return (
    <div className="@container grid w-full grid-cols-3 gap-4">
      {EDITOR_FONTS.map(specimenFont => (
        <div key={specimenFont} className="flex flex-col gap-2">
          <p
            className="text-[length:min(1.875rem,calc((100cqi-2rem)/12.6))] leading-tight"
            style={{ ...getTitleStyle(specimenFont), fontSize: undefined }}
          >
            Invoice
          </p>
          <p className={cn(typeClass("caption"), "text-zinc-500")}>
            {getInvoiceFontDefinition(specimenFont).name}
          </p>
        </div>
      ))}
    </div>
  );
}

// One total in four currencies, formatted by the editor's own formatter.
function CurrencySpecimen() {
  return (
    <ul className="font-geist flex w-full flex-col gap-2 text-lg font-semibold text-zinc-950 tabular-nums sm:text-xl">
      {[
        { symbol: "$", code: "USD" },
        { symbol: "€", code: "EUR" },
        { symbol: "£", code: "GBP" },
        { symbol: "¥", code: "JPY" }
      ].map(currency => (
        <li key={currency.code} className="whitespace-nowrap">
          {formatCurrencyWithCode(2475, currency.symbol, currency.code)}
        </li>
      ))}
    </ul>
  );
}

/**
 * A crop of a real billsend PDF, filling its container's width. The two
 * feature crops share an aspect ratio so their cards match.
 */
function PdfCrop({
  render,
  className
}: {
  render: (typeof PDF_RENDERS)[keyof typeof PDF_RENDERS];
  className?: string;
}) {
  return (
    <Picture
      src={render.src}
      alt={render.alt}
      width={Math.round(render.crop.width * PDF_RENDER_SCALE)}
      height={Math.round(render.crop.height * PDF_RENDER_SCALE)}
      fetchPriority="low"
      className={cn("block h-auto w-full max-w-none min-w-0 grow", className)}
    />
  );
}

// A print studio's totals with a 10% discount, New York City's 8.875% sales
// tax and a delivery fee. Cut from the middle of the page, it runs off the card
// on every side but the page's right edge.
function TotalsSpecimen() {
  return (
    <PdfCrop
      render={PDF_RENDERS.totals}
      className={cn(PAPER_SHADOW, "-my-(--pad) -ml-(--pad) sm:mr-[16%]")}
    />
  );
}

function PaymentSpecimen() {
  return (
    <PdfCrop
      render={PDF_RENDERS.payment}
      className={cn(PAPER_SHADOW, "-my-(--pad) -mr-(--pad) sm:ml-[16%]")}
    />
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
          title="How billsend compares with other invoice generators."
          description="billsend makes the invoice and stops there. To email invoices and track payments, you want accounting software."
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
                      ? "text-ink-blue rounded-t-xl bg-blue-50 font-semibold"
                      : "text-zinc-500"
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
                  className={cn(COMPARISON_GRID, "border-t border-zinc-950/10")}
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
                        cellIndex === 0 && "bg-blue-50",
                        cellIndex === 0 && isLastRow && "rounded-b-xl"
                      )}
                    >
                      <ComparisonCell value={row.cells[cellIndex]} />
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

// Colour carries the answer: sage yes, blush no, butter where tools vary. The
// shapes differ too, so the table reads without colour.
function ComparisonCell({ value }: { value: ComparisonValue }) {
  if (typeof value === "string") {
    return (
      <span className={cn(typeClass("caption"), "text-butter-ink font-medium")}>
        {value}
      </span>
    );
  }

  if (value) {
    return (
      <>
        <IconCheck
          className="text-sage-ink mx-auto size-5 shrink-0"
          aria-hidden="true"
        />
        <span className="sr-only">Yes</span>
      </>
    );
  }

  return (
    <>
      <IconX
        className="text-blush-ink mx-auto size-5 shrink-0"
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

// The closing band mirrors the hero: dark headline, blue second line, and a
// painting that runs the full width of the viewport. The page rising from the
// panel's foot is a real billsend PDF. Its box is sized from the page's own
// width, so it always shows the same top share of the page, and the page runs
// past the box to be cut by the panel's foot: 4:3 shows about half on phones,
// 16:9 about 40% from `sm`. Like the hero, the copy sits above the panel.
function Closing() {
  return (
    <section className="bg-white pt-16 sm:pt-20">
      <div className={CONTAINER}>
        <div className="flex flex-col gap-8 xl:flex-row xl:justify-between xl:gap-16">
          <h2 className={cn(HEADING, typeClass("display"), "max-w-[20ch]")}>
            <span className="block">Your next invoice</span>
            <span className="text-ink-blue block">starts here.</span>
          </h2>
          <div className="flex flex-col items-start gap-6 xl:justify-end">
            <p className={cn(BODY_TEXT, "max-w-[48ch]")}>
              Free, with no account. Opens straight into the editor.
            </p>
            <CreateInvoiceLink />
          </div>
        </div>
      </div>
      <div className="relative isolate mt-12 flex justify-center overflow-hidden bg-blue-100 px-6 pt-12 pb-16 sm:mt-16 sm:pt-16 sm:pb-20">
        <Picture
          src="/home/closing-city.webp"
          srcSet="/home/closing-city-900.webp 900w, /home/closing-city-1200.webp 1200w, /home/closing-city.webp 1792w"
          sizes="100vw"
          alt=""
          width={1792}
          height={1008}
          fetchPriority="low"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="relative aspect-4/3 w-full max-w-md sm:aspect-video sm:max-w-xl lg:max-w-2xl"
        >
          <Picture
            src={CLOSING_RENDER.src}
            alt={CLOSING_RENDER.alt}
            width={CLOSING_RENDER.width}
            height={Math.round(
              (CLOSING_RENDER.width * PAGE_HEIGHT) / PAGE_WIDTH
            )}
            fetchPriority="low"
            className="absolute inset-x-0 top-0 h-auto w-full shadow-[0_12px_32px_-12px_rgb(0_0_0/0.25)] outline-1 -outline-offset-1 outline-zinc-950/5"
          />
        </div>
      </div>
    </section>
  );
}
