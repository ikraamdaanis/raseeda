import {
  IconAlertTriangle,
  IconArrowUpRight,
  IconBan,
  IconCheck,
  IconCircleCheckFilled,
  IconPlus,
  IconX
} from "@tabler/icons-react";
import { createFileRoute, ScriptOnce } from "@tanstack/react-router";
import type {
  ComponentProps,
  ComponentType,
  CSSProperties,
  ReactNode
} from "react";
import { useEffect, useState } from "react";
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
import { HeroSky } from "~/components/home/hero-sky";
import {
  HERO_INVOICE_NUMBER,
  PDF_RENDERS,
  renderSrc,
  renderSrcSet
} from "~/components/home/pdf-renders";
import { RunYourOwnCopy } from "~/components/home/run-your-own-copy";
import {
  CONTAINER,
  FOCUS_RING,
  SiteFooter,
  SOFT_PILL
} from "~/components/home/site-chrome";
import {
  CreateInvoiceLink,
  HEADER_STATE_SCRIPT,
  HERO_ACTIONS_ID,
  SiteHeader,
  SkipLink,
  useHeaderState
} from "~/components/home/site-header";
import { APP_NAME } from "~/consts/app";
import { useOnScreen } from "~/hooks/use-on-screen";
import { typeClass } from "~/lib/type-scale";
import { cn } from "~/lib/utils";
import { canUseStorage } from "~/utils/can-use-storage";
import { canonicalLink, siteMeta, SOURCE_URL } from "~/utils/site-meta";
import { HOME_STRUCTURED_DATA } from "~/utils/structured-data";

export const Route = createFileRoute("/")({
  component: HomePage,
  // The invoice in the hero's editor window preloads too, so it downloads
  // alongside the CSS rather than after it; the preload mirrors the AVIF branch
  // of its <picture>, widths and sizes too, so it fetches the same file, and a
  // browser without AVIF skips it. It is the page's largest paint, so it asks
  // for high priority: an image preload otherwise starts low and waits behind
  // the fonts.
  head: () => ({
    meta: siteMeta({ path: "/" }),
    links: [
      canonicalLink("/"),
      {
        rel: "preload",
        as: "image",
        type: "image/avif",
        href: toAvif(heroPicture.src),
        imageSrcSet: toAvif(heroPicture.srcSet),
        imageSizes: heroPicture.sizes,
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

// Every homepage picture has an AVIF beside its WebP (scripts/
// encode-homepage-avif.ts), about 40% lighter; the WebP stays for browsers
// without AVIF.
function toAvif(srcSet: string) {
  return srcSet.replaceAll(".webp", ".avif");
}

const TEXT_LINK = cn(
  "inline-flex items-center gap-1 rounded-sm font-medium text-ink hover:text-brand-700",
  typeClass("body"),
  FOCUS_RING
);

// Headlines are in the page's own face (font-home). Sizes come from the type
// roles, which the homepage sets at marketing values through `.home-type`.
const HEADING = "font-medium tracking-[-0.035em] text-balance";

// Single-line controls: buttons, labels, nav links.
const CONTROL_TEXT = typeClass("body", "compact");

// Balanced so short copy never ends on a stub of a line; past six lines
// browsers fall back to normal wrapping.
const BODY_TEXT = cn("text-balance text-zinc-600", typeClass("body"));

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
      "Upload your logo and set the whole invoice in any of eleven fonts, at three sizes.",
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
// phrases wrap into tall rows in the narrow phone columns. A cross is only for
// what a kind of tool never does: where exceptions exist (free or desktop
// accounting software, an open source generator), the cell says "Some" or
// "Rarely" instead.
type ComparisonValue = boolean | "Some" | "Rarely";

// One value per column, in column order. Keep labels to about 35 characters so
// a phone shows them in two or three lines.
const COMPARISON_ROWS: {
  label: string;
  cells: [ComparisonValue, ComparisonValue, ComparisonValue];
}[] = [
  { label: "Free, with no paid plan", cells: [true, "Some", "Rarely"] },
  { label: "No account needed", cells: [true, "Some", "Rarely"] },
  {
    label: "Invoice data stays on your device",
    cells: [true, "Rarely", "Rarely"]
  },
  { label: "No watermark on the PDF", cells: [true, "Some", true] },
  { label: "Open source", cells: [true, "Rarely", "Some"] },
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

// Whether this browser refuses storage (StorageBlockedNote reads it). The
// check waits until the page has loaded and gone idle, so it never competes
// with the hero, and it loads nothing: see canUseStorage.
function useIsStorageBlocked() {
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let idleHandle: number | undefined;

    function check() {
      void canUseStorage().then(canUse => {
        if (!isCancelled) setIsBlocked(!canUse);
      });
    }

    // Safari has no requestIdleCallback; a timeout after load is close enough.
    function scheduleCheck() {
      idleHandle =
        typeof requestIdleCallback === "function"
          ? requestIdleCallback(check, { timeout: 2000 })
          : window.setTimeout(check, 200);
    }

    if (document.readyState === "complete") scheduleCheck();
    else addEventListener("load", scheduleCheck, { once: true });

    return () => {
      isCancelled = true;
      removeEventListener("load", scheduleCheck);

      if (idleHandle === undefined) return;

      if (typeof cancelIdleCallback === "function") {
        cancelIdleCallback(idleHandle);
      } else {
        window.clearTimeout(idleHandle);
      }
    };
  }, []);

  return isBlocked;
}

function HomePage() {
  useHeaderState();

  return (
    <div className="home-type selection:bg-brand-100 bg-canvas text-ink font-home isolate min-h-svh antialiased">
      <SkipLink />
      <SiteHeader />
      <main id="main" className="overflow-x-clip">
        <Hero />
        <ScriptOnce>{HEADER_STATE_SCRIPT}</ScriptOnce>
        <HowItWorks />
        <Privacy />
        <Features />
        <Comparison />
        <OpenSource />
        <Questions />
        <Closing />
      </main>
      <SiteFooter />
    </div>
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

  // The description sits right under its title at every width, so the two
  // read as one block rather than drifting to opposite edges of the page.
  return (
    <div className="flex flex-col gap-5">
      <h2 className={cn(HEADING, typeClass("title"), "max-w-[35ch]")}>
        {title}
      </h2>
      <p className={cn(BODY_TEXT, "max-w-[48ch]")}>{description}</p>
    </div>
  );
}

// The hero is a sky from behind the header (the section pulls up under it) to
// the editor window's cut: inset from the viewport with rounded corners from
// `lg`, and running to the screen's edges below it. The copy sits centred on
// it and the window rises from its foot. The copy rises into place line by
// line, 60ms apart, then the editor window fades in. On phones the copy and
// buttons sit on the left, in line with the editor window's crop below them;
// from `sm` they are centred over the whole window.
function Hero() {
  return (
    <HeroSky>
      <div
        className={cn(
          CONTAINER,
          "flex flex-col items-start gap-8 pt-14 sm:items-center sm:pt-20 sm:text-center"
        )}
      >
        <div className="flex flex-col items-start gap-5 sm:items-center">
          <h1 className={cn(HEADING, typeClass("display"))}>
            <span className="hero-focus block">Make the invoice.</span>
            <span className="hero-focus block [animation-delay:60ms]">
              Keep your data.
            </span>
          </h1>
          <p className="hero-focus text-ink/75 max-w-[48ch] text-lg/7 text-pretty [animation-delay:120ms]">
            A free,{" "}
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="open source on GitHub (opens in a new tab)"
              className={cn(
                "group text-ink inline-flex items-center gap-0.5 rounded-sm whitespace-nowrap",
                FOCUS_RING
              )}
            >
              <span className="border-ink/40 group-hover:border-ink border-b border-dotted">
                open source
              </span>
              <IconArrowUpRight
                className="size-4 shrink-0"
                aria-hidden="true"
              />
            </a>{" "}
            invoice maker that runs in your browser. No account, and nothing you
            type is uploaded.
          </p>
        </div>
        <div
          id={HERO_ACTIONS_ID}
          className="hero-focus flex flex-wrap items-center gap-3 [animation-delay:180ms] sm:justify-center"
        >
          <CreateInvoiceLink />
          <a href="#how-it-works" className={SOFT_PILL}>
            See how it works
          </a>
        </div>
        <StorageBlockedNote />
      </div>
      <HeroVisual />
    </HeroSky>
  );
}

/**
 * The editor, shown rather than described: the real editor layout, both side
 * panels open, with a real PDF of the invoice on its desk, in a frosted bezel
 * that rises from the foot of the sky. From `lg` the whole window's width
 * sits in the page's column. On tablets the window is drawn at a fixed zoom
 * from its top-left corner and runs off the sky's right edge, a readable crop
 * of the invoices panel and the page. Phones, too narrow for both, get the
 * desk alone: the window framed on the page and its margins, scaled to fit,
 * so the invoice itself, logo to totals, is what they see. The bezel and
 * window run off the sky's foot, where they are cut, so only their top
 * corners are rounded. The window is drawn once, its bezel and crop set per
 * breakpoint in CSS, so phones and larger screens share the same markup.
 */
function HeroVisual() {
  return (
    <figure
      aria-label={`The ${APP_NAME} editor with a sample invoice`}
      className={cn(
        CONTAINER,
        "hero-fade mt-12 [animation-delay:240ms] sm:mt-16"
      )}
    >
      <div className="rounded-t-2xl bg-white/45 p-1.5 pb-0 shadow-[0_24px_64px_-16px_rgb(16_60_90/0.25)] ring-1 ring-white/70 [--bezel-radius:--spacing(5)] [--pad:--spacing(2)] sm:w-max sm:rounded-t-(--bezel-radius) sm:p-(--pad) sm:pb-0 sm:max-lg:rounded-tr-none sm:max-lg:pr-0 lg:w-full">
        <div className="overflow-hidden rounded-t-[0.625rem] [--zoom:0.65] sm:w-[calc(1440px*var(--zoom))] sm:rounded-t-[calc(var(--bezel-radius)-var(--pad))] sm:max-lg:rounded-tr-none md:[--zoom:0.75] lg:w-auto">
          <ScaledFrame fill className={HERO_FRAME}>
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

// The part of the window the hero shows. Phones get the desk from just left
// of the page (which starts 307px in, past the invoices panel and the desk's
// margin) to just right of it, cut a little below the payment terms: 834 x
// 990 from x 287. From `sm`, the window's full width down to the invoice's
// totals: 1440 x 860.
const HERO_FRAME =
  "[--frame-height:990] [--frame-width:834] [--frame-x:287] sm:[--frame-height:860] sm:[--frame-width:1440] sm:[--frame-x:0]";

/**
 * A real PDF in the editor canvas's place: a screenshot of the top of
 * the page on the same paper, shown first thing, so it preloads with the page.
 * It decodes synchronously: left to itself, WebKit decodes a picture this
 * large off the main thread, so a reload painted the paper blank for a frame
 * before the invoice appeared.
 */
function PdfPaper({ render }: { render: typeof PDF_RENDERS.hero }) {
  const picture = pdfPicture(render);

  return (
    <div
      className="border-paper-border bg-paper overflow-hidden border shadow-md"
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
    >
      <Picture
        src={picture.src}
        srcSet={picture.srcSet}
        sizes={picture.sizes}
        alt={render.alt}
        width={picture.width}
        height={Math.round(
          (picture.width * render.crop.height) / render.crop.width
        )}
        fetchPriority="high"
        decoding="sync"
        className="block h-auto w-full"
      />
    </div>
  );
}

// A render's <img> attributes. It is laid out at the page's CSS width before
// the frame scales it, so `sizes` is that width, and the browser picks the
// file for its pixel density from there: the narrower one on a standard
// screen, the wider on a dense one.
function pdfPicture(render: typeof PDF_RENDERS.hero) {
  const width = Math.max(...render.widths);

  return {
    src: renderSrc(render, width),
    srcSet: renderSrcSet(render),
    sizes: `${PAGE_WIDTH}px`,
    width
  };
}

const heroPicture = pdfPicture(PDF_RENDERS.hero);

/**
 * An image that offers its AVIF first. The <picture> draws no box of its own,
 * so the image keeps its place in its parent's layout.
 */
function Picture({
  src,
  srcSet,
  sizes,
  alt,
  ...props
}: ComponentProps<"img"> & { src: string; alt: string }) {
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={toAvif(srcSet ?? src)} sizes={sizes} />
      <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} {...props} />
    </picture>
  );
}

// A browser that refuses storage gets told what that means and how to fix it,
// right under the hero's buttons, before anyone starts an invoice.
function StorageBlockedNote() {
  const isBlocked = useIsStorageBlocked();

  if (!isBlocked) return null;

  return (
    <p
      className={cn(
        typeClass("body"),
        "text-ink/80 flex max-w-[52ch] items-start gap-2 text-left text-pretty"
      )}
    >
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
// further down. Three across from `lg`; on tablets each step is a row, its
// tile beside its words, so the demo stays big enough to read; phones stack.
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
    title: "Download the PDF",
    description:
      "Download an A4 PDF, with no watermark, or print it, then send it to your client however you like.",
    demo: DownloadDemo,
    hues: [TILE_HUES.blush, TILE_HUES.lavender]
  },
  {
    title: "Keep a copy",
    description:
      "Invoices save in this browser, so a repeat client’s next invoice starts from the last one. Clearing the browser’s site data deletes them, so back them up with Export Data in the File menu.",
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
        <ol className="mt-12 grid gap-x-6 gap-y-12 sm:mt-16 lg:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="flex flex-col gap-6 md:grid md:grid-cols-2 md:items-center md:gap-8 lg:flex lg:items-stretch lg:gap-6"
            >
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

// Two across from `lg`; below it the cards stack, so each scene draws at its
// full size rather than shrunk into a half-width tablet column.
function Features() {
  return (
    <section id="features" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="What goes on the invoice."
          description="Your logo, your client’s currency, the right tax, and the bank details they need to pay you."
        />
        <ul className="mt-12 grid gap-x-6 gap-y-12 sm:mt-16 lg:grid-cols-2">
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
          title={`How ${APP_NAME} compares with other ways to invoice.`}
          description={`Each column is the typical tool of its kind. ${APP_NAME} makes the invoice and stops there; to email invoices and track payments, you want accounting software.`}
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
                    // Phones set the short headers at 12px, hyphenated if a
                    // word is still wider than the narrowest columns.
                    "flex items-end justify-center px-0.5 pt-4 pb-3 text-center text-xs/4 font-medium text-balance hyphens-auto min-[400px]:px-1 sm:text-sm/5 md:px-4",
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
// columns answer in greys (an ink tick, a faint cross, "Some" or "Rarely"
// where tools vary), so the eye reads raseeda's column first and nothing reads as a
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
        className="mx-auto size-5 shrink-0 text-zinc-500"
        aria-hidden="true"
      />
      <span className="sr-only">No</span>
    </>
  );
}

// Each promise on the page, first as what it means for your invoices
// (`outcome`, in plain words), then as the code that keeps it: the real
// lines, with their real line numbers, from the file on GitHub. `highlight`
// is the line that does the work.
const PROOFS: {
  title: string;
  description: string;
  outcome: { label: string; status: string; isRefused?: boolean }[];
  path: string;
  firstLine: number;
  lines: string[];
  highlight: number;
  hues: [number, number];
}[] = [
  {
    title: "Other websites are blocked",
    description:
      "Every page carries this policy. Your browser enforces it, so third-party trackers, analytics and every other site are refused.",
    outcome: [
      { label: "This site", status: "Allowed" },
      {
        label: "Third-party analytics",
        status: "Blocked",
        isRefused: true
      },
      { label: "Any other website", status: "Blocked", isRefused: true }
    ],
    path: "consts/content-security-policy.ts",
    firstLine: 12,
    lines: [
      `  "img-src 'self' data: blob:",`,
      `  "font-src 'self' data:",`,
      `  "connect-src 'self' data: blob:",`,
      `  "worker-src 'self' blob:",`,
      `  "frame-src 'none'",`
    ],
    highlight: 14,
    hues: [TILE_HUES.sky, TILE_HUES.sage]
  },
  {
    title: "Invoices stay in this browser",
    description:
      "They're saved in your browser's own database, on your device. There's no account and no copy on a server.",
    outcome: [
      { label: "Invoices and templates", status: "This device" },
      { label: "Logos and images", status: "This device" },
      { label: "Copy on a server", status: "None", isRefused: true }
    ],
    path: "db/index.ts",
    firstLine: 178,
    lines: [
      "class InvoiceDatabase extends Dexie {",
      "  templates!: Table<InvoiceTemplate, string>;",
      "  invoices!: Table<InvoiceDocument, string>;",
      "  images!: Table<StoredImage, string>;",
      "  drafts!: Table<InvoiceDraft, string>;"
    ],
    highlight: 178,
    hues: [TILE_HUES.lavender, TILE_HUES.sky]
  },
  {
    title: "Tested on every change",
    description:
      "Every change runs a browser test that loads this page and fails if it asks another website for anything.",
    outcome: [
      { label: "This page", status: "Loaded" },
      { label: "Requests to other sites", status: "None", isRefused: true },
      { label: "Checked", status: "Every change" }
    ],
    path: "e2e/home.spec.ts",
    firstLine: 123,
    lines: [
      `    return url.protocol.startsWith("http") && url.origin !== homeOrigin;`,
      "  });",
      "",
      "  expect(requested.length).toBeGreaterThan(0);",
      "  expect(elsewhere).toEqual([]);"
    ],
    highlight: 127,
    hues: [TILE_HUES.butter, TILE_HUES.blush]
  }
];

// The privacy promise in plain words, then on each tile what it means for your
// invoices above the lines of code that keep it, so a reader who can't read
// code still gets the promise and one who can gets the proof.
function Privacy() {
  return (
    <section id="privacy" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="Your invoices never leave your device."
          description="Not to us and not to anyone else. The page is blocked from sending data to any other site, and the code is public, so you don’t have to take our word for it."
        />
        <ul className="mt-12 grid gap-x-6 gap-y-12 sm:mt-16 lg:grid-cols-3">
          {PROOFS.map(proof => (
            <li key={proof.path} className="flex min-w-0 flex-col gap-6">
              <CodeTile proof={proof} />
              <div className="flex flex-col gap-2">
                <h3 className={cn(typeClass("subtitle"), "font-medium")}>
                  {proof.title}
                </h3>
                <p className={BODY_TEXT}>{proof.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// The licence and how to run a copy, for readers who want the code itself.
function OpenSource() {
  return (
    <section id="open-source" className="py-16 sm:py-20">
      <div className={CONTAINER}>
        <SectionHeading
          title="Open source, all of it."
          description="MIT licensed and public on GitHub. Read every line, or run your own copy."
        />
        <RunYourOwnCopy />
      </div>
    </section>
  );
}

// Words the snippets colour as keywords, and their strings.
const CODE_TOKEN =
  /("[^"]*"|`[^`]*`|\b(?:export|const|class|extends|return|new)\b)/;

function CodeLine({ text }: { text: string }) {
  return text.split(CODE_TOKEN).map((part, index) => {
    if (!part) return null;

    const isString = /^["`]/.test(part);
    const isKeyword = !isString && CODE_TOKEN.test(part);

    return (
      <span
        key={index}
        className={cn(
          isString && "text-brand-700",
          isKeyword && "text-violet-600"
        )}
      >
        {part}
      </span>
    );
  });
}

// A promise's outcome card over the file it comes from, on a tile like the
// feature cards'. The card says what happens to your data; the file below,
// open at the lines that matter, runs off the tile's right and bottom edges,
// where it was cut, fading out at the right so a long line reads as
// continuing, and its path links to those lines on GitHub.
function CodeTile({ proof }: { proof: (typeof PROOFS)[number] }) {
  const lastLine = proof.firstLine + proof.lines.length - 1;

  return (
    <div
      className="bg-tile relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl pt-6 pl-6 ring-1 ring-zinc-950/5"
      style={
        {
          "--tile-hue-a": proof.hues[0],
          "--tile-hue-b": proof.hues[1]
        } as CSSProperties
      }
    >
      <span
        aria-hidden="true"
        className="absolute -top-1/3 -left-1/4 -z-10 aspect-square w-[85%] rounded-full bg-[radial-gradient(closest-side,oklch(0.94_0.035_var(--tile-hue-a)),transparent)]"
      />
      <span
        aria-hidden="true"
        className="absolute -right-1/4 -bottom-1/3 -z-10 aspect-square w-[80%] rounded-full bg-[radial-gradient(closest-side,oklch(0.95_0.03_var(--tile-hue-b)),transparent)]"
      />
      <ul className="mr-6 flex flex-col rounded-xl bg-white px-4 py-1 shadow-[0_8px_24px_-8px_rgb(16_40_60/0.18)] ring-1 ring-zinc-950/5">
        {proof.outcome.map(row => {
          const Icon = row.isRefused ? IconBan : IconCircleCheckFilled;

          return (
            <li
              key={row.label}
              className={cn(
                "text-ink flex items-center justify-between gap-3 border-t border-zinc-950/5 py-2.5 first:border-t-0",
                CONTROL_TEXT
              )}
            >
              <span className="min-w-0">{row.label}</span>
              <span className="flex shrink-0 items-center gap-1.5 font-medium">
                <Icon
                  className="text-brand-600 size-4 shrink-0"
                  aria-hidden="true"
                />
                {row.status}
              </span>
            </li>
          );
        })}
      </ul>
      <div className="flex min-h-0 flex-1 flex-col rounded-tl-xl bg-white shadow-[0_8px_24px_-8px_rgb(16_40_60/0.18)] ring-1 ring-zinc-950/5">
        <a
          href={`${SOURCE_URL}/blob/main/${proof.path}#L${proof.firstLine}-L${lastLine}`}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "font-geist-mono flex items-center gap-1.5 rounded-tl-xl border-b border-zinc-950/5 px-4 py-3 text-xs text-zinc-500 hover:text-zinc-900",
            FOCUS_RING
          )}
        >
          <span className="truncate">{proof.path}</span>
          <IconArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
        <div className="font-geist-mono flex flex-col mask-[linear-gradient(to_right,black_calc(100%-3rem),transparent)] py-3 text-[0.75rem] leading-6 text-zinc-800">
          {proof.lines.map((line, index) => {
            const lineNumber = proof.firstLine + index;
            const isHighlighted = lineNumber === proof.highlight;

            return (
              <p
                key={lineNumber}
                className={cn(
                  "flex gap-4 border-l-2 border-transparent pr-4 pl-3 whitespace-pre",
                  isHighlighted && "border-brand-500 bg-brand-50"
                )}
              >
                <span className="w-7 shrink-0 text-right text-zinc-500 tabular-nums select-none">
                  {lineNumber}
                </span>
                <span>
                  <CodeLine text={line} />
                </span>
              </p>
            );
          })}
        </div>
      </div>
    </div>
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

// The last word before the footer: a panel in the hero's sky colour, inset
// and rounded like the hero from `lg` and edge to edge below it, with a glow
// rising from its foot under a grid of dots. The glow breathes slowly in and
// out (animate-glow-breathe) while the panel is on screen; the dots hold
// still.
function Closing() {
  const { ref, isOnScreen } = useOnScreen<HTMLDivElement>({ initial: true });

  return (
    <section className="pt-16 sm:pt-24 lg:px-3">
      <div
        ref={ref}
        data-paused={isOnScreen ? undefined : ""}
        className="bg-glow relative isolate overflow-hidden lg:rounded-[2rem]"
      >
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
