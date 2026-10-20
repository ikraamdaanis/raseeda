import { IconArrowUpRight } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FOCUS_RING, GithubMark } from "~/components/home/site-chrome";
import { APP_NAME } from "~/consts/app";
import { useOnScreen } from "~/hooks/use-on-screen";
import { cn } from "~/lib/utils";
import { SOURCE_URL } from "~/utils/site-meta";

// The open source section's closing panel: how to run a copy, beside a
// terminal that runs it. The terminal replays a real session (Bun 1.3.13 and
// Vite 8.3.4, copied from an actual `bun install` and `bun run dev` in this
// repository): commands type themselves in, output lands a line at a time,
// the dev server runs for a while, then ^C stops it, `clear` wipes the screen
// and the same prompt starts over. Behind it, three soft violet lights wander
// across the dark under a grid of dots, like the closing panel's, and a band
// of light runs around the terminal's edge. Everything moves only while the
// panel is on screen; with reduced motion the terminal shows the dev server
// running and nothing moves.

type Segment = { text: string; className?: string };

// A command typed at the prompt, a line of output after a delay, or the
// terminal waiting with the cursor on an empty line while a server runs.
type Step =
  | { kind: "command"; text: string }
  | { kind: "output"; segments: Segment[]; delayMs: number }
  | { kind: "wait"; durationMs: number };

// Colours after the terminal's own: Bun's bold names and grey versions,
// Vite's green banner and cyan address.
const DIM = "text-zinc-500";
const BRIGHT = "font-semibold text-white";
const GREEN = "text-emerald-400";
const CYAN = "text-cyan-300";

// The repository under the app's name, and the folder git clones it into. The
// GitHub repository still carries the old name until it's renamed (GitHub
// then redirects the old URL), so the terminal shows the name it will have.
const REPOSITORY = APP_NAME;

const CLONE_URL = `${SOURCE_URL.slice(0, SOURCE_URL.lastIndexOf("/") + 1)}${REPOSITORY}.git`;

const SESSION: Step[] = [
  { kind: "command", text: `git clone ${CLONE_URL}` },
  {
    kind: "output",
    delayMs: 300,
    segments: [{ text: `Cloning into '${REPOSITORY}'...` }]
  },
  {
    kind: "output",
    delayMs: 350,
    segments: [{ text: "remote: Enumerating objects: 5716, done." }]
  },
  {
    kind: "output",
    delayMs: 120,
    segments: [{ text: "remote: Counting objects: 100% (856/856), done." }]
  },
  {
    kind: "output",
    delayMs: 220,
    segments: [{ text: "remote: Compressing objects: 100% (456/456), done." }]
  },
  {
    kind: "output",
    delayMs: 120,
    segments: [
      {
        text: "remote: Total 5716 (delta 523), reused 537 (delta 393), pack-reused 4860 (from 3)"
      }
    ]
  },
  {
    kind: "output",
    delayMs: 900,
    segments: [
      {
        text: "Receiving objects: 100% (5716/5716), 12.30 MiB | 7.45 MiB/s, done."
      }
    ]
  },
  {
    kind: "output",
    delayMs: 300,
    segments: [{ text: "Resolving deltas: 100% (3693/3693), done." }]
  },
  { kind: "command", text: `cd ${REPOSITORY}` },
  { kind: "command", text: "bun install" },
  {
    kind: "output",
    delayMs: 350,
    segments: [
      { text: "bun install", className: BRIGHT },
      { text: " v1.3.13 (bf2e2cec)", className: DIM }
    ]
  },
  { kind: "output", delayMs: 0, segments: [] },
  {
    kind: "output",
    delayMs: 1400,
    segments: [
      { text: "792", className: GREEN },
      { text: " packages installed " },
      { text: "[2.61s]", className: "text-zinc-400" }
    ]
  },
  { kind: "command", text: "bun run dev" },
  {
    kind: "output",
    delayMs: 150,
    segments: [{ text: "$ vite dev", className: DIM }]
  },
  { kind: "output", delayMs: 0, segments: [] },
  {
    kind: "output",
    delayMs: 1300,
    segments: [
      { text: "  " },
      { text: "VITE", className: cn(GREEN, "font-semibold") },
      { text: " v8.3.4", className: GREEN },
      { text: "  ready in ", className: DIM },
      { text: "3044", className: BRIGHT },
      { text: " ms" }
    ]
  },
  { kind: "output", delayMs: 0, segments: [] },
  {
    kind: "output",
    delayMs: 160,
    segments: [
      { text: "  ➜  ", className: GREEN },
      { text: "Local:", className: BRIGHT },
      { text: "   " },
      { text: "http://localhost:", className: CYAN },
      { text: "3000", className: cn(CYAN, "font-semibold") },
      { text: "/", className: CYAN }
    ]
  },
  {
    kind: "output",
    delayMs: 90,
    segments: [
      { text: "  ➜  ", className: "text-emerald-400/50" },
      { text: "Network: use ", className: DIM },
      { text: "--host", className: BRIGHT },
      { text: " to expose", className: DIM }
    ]
  },
  {
    kind: "output",
    delayMs: 90,
    segments: [
      { text: "  ➜  ", className: "text-emerald-400/50" },
      { text: "press ", className: DIM },
      { text: "h + enter", className: BRIGHT },
      { text: " to show help", className: DIM }
    ]
  },
  { kind: "wait", durationMs: 3500 },
  { kind: "output", delayMs: 0, segments: [{ text: "^C", className: DIM }] },
  {
    kind: "output",
    delayMs: 250,
    segments: [
      { text: "✓ ", className: GREEN },
      { text: "Dev server stopped", className: "text-zinc-300" }
    ]
  },
  { kind: "command", text: "clear" }
];

// Where the session rests with reduced motion: the dev server up and running.
const RESTING_STEP = SESSION.findIndex(step => step.kind === "wait");

// The step at `index`, or nothing once the session is over.
function stepAt(index: number): Step | undefined {
  return index < SESSION.length ? SESSION[index] : undefined;
}

// A beat at the prompt before typing and a human, uneven typing rhythm. When
// `clear` runs the screen empties at once, as a real one does, and the same
// prompt starts over.
const PROMPT_PAUSE_MS = 700;
const ENTER_PAUSE_MS = 280;

// Long commands, like the clone URL, go in quicker, as a practised hand would
// type them.
function keystrokeDelay(index: number, length: number) {
  return length > 20 ? 25 + ((index * 37) % 30) : 55 + ((index * 37) % 45);
}

/**
 * Plays SESSION while `isPlaying`: how many steps are done and how much of
 * the current command is typed. Pausing keeps its place. With reduced motion it shows the dev server running and stays.
 */
function useSession(isPlaying: boolean) {
  const [done, setDone] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(RESTING_STEP);

      return;
    }

    if (!isPlaying) return;

    const step = stepAt(done);
    let delay: number;
    let advance: () => void;

    if (!step) {
      delay = 0;
      advance = () => {
        setDone(0);
        setTyped(0);
      };
    } else if (step.kind === "wait") {
      delay = step.durationMs;
      advance = () => setDone(done + 1);
    } else if (step.kind === "command" && typed < step.text.length) {
      delay =
        typed === 0 ? PROMPT_PAUSE_MS : keystrokeDelay(typed, step.text.length);
      advance = () => setTyped(typed + 1);
    } else {
      delay = step.kind === "command" ? ENTER_PAUSE_MS : step.delayMs;
      advance = () => {
        setDone(done + 1);
        setTyped(0);
      };
    }

    const timer = window.setTimeout(advance, delay);

    return () => window.clearTimeout(timer);
  }, [isPlaying, done, typed]);

  return { done, typed };
}

function Prompt({ children }: { children: ReactNode }) {
  return (
    <p className="break-all whitespace-pre-wrap">
      <span className="text-pink-400">❯ </span>
      <span className="text-emerald-300">{children}</span>
    </p>
  );
}

function Caret() {
  return (
    <span className="demo-anim demo-blink inline-block h-[1.15em] w-[0.6em] translate-y-[0.2em] bg-zinc-200" />
  );
}

// The session up to `done` steps, then where the cursor is: on the command
// being typed, or alone on an empty line while output is on its way or a
// server runs.
function Transcript({ done, typed }: { done: number; typed: number }) {
  const current = stepAt(done);

  return (
    <>
      {SESSION.slice(0, done).map((step, index) =>
        step.kind === "wait" ? null : step.kind === "command" ? (
          <Prompt key={index}>{step.text}</Prompt>
        ) : (
          <p key={index} className="min-h-6 break-words whitespace-pre-wrap">
            {step.segments.map((segment, segmentIndex) => (
              <span key={segmentIndex} className={segment.className}>
                {segment.text}
              </span>
            ))}
          </p>
        )
      )}
      {current?.kind === "command" && (
        <Prompt>
          {current.text.slice(0, typed)}
          <Caret />
        </Prompt>
      )}
      {current && current.kind !== "command" && (
        <p>
          <Caret />
        </p>
      )}
    </>
  );
}

// The terminal's screen holds 15 lines (8 on phones, so it never stands as a
// tall empty slab while the session starts); past that it scrolls to keep the
// newest line in view, as a real one does.
function Terminal({ isPlaying }: { isPlaying: boolean }) {
  const { done, typed } = useSession(isPlaying);
  const screenRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const screen = screenRef.current;

    if (screen) screen.scrollTop = screen.scrollHeight;
  }, [done, typed]);

  return (
    <figure className="min-w-0">
      <figcaption className="sr-only">
        A terminal cloning the repository, then running bun install and bun run
        dev, which serves {APP_NAME} at http://localhost:3000/
      </figcaption>
      <div className="relative isolate overflow-hidden rounded-[calc(var(--radius-xl)+1px)] bg-white/8 p-px">
        <span
          aria-hidden="true"
          className="demo-anim terminal-edge absolute top-1/2 left-1/2 -z-10 aspect-square w-[160%] -translate-1/2"
        />
        <div
          aria-hidden="true"
          className="flex flex-col overflow-hidden rounded-xl bg-[#0c0e10]/95"
        >
          <div className="relative flex h-10 items-center border-b border-white/5 px-4">
            <span className="flex gap-1.5">
              <span className="size-3 rounded-full bg-white/10" />
              <span className="size-3 rounded-full bg-white/10" />
              <span className="size-3 rounded-full bg-white/10" />
            </span>
            <span className="absolute inset-x-0 text-center text-xs text-zinc-500">
              ~/{APP_NAME}
            </span>
          </div>
          <div
            ref={screenRef}
            className="font-geist-mono h-60 overflow-hidden p-5 text-[0.8125rem] leading-6 text-zinc-200 sm:h-100"
          >
            <Transcript done={done} typed={typed} />
          </div>
        </div>
      </div>
    </figure>
  );
}

// The panel's lights: three soft blobs, violet, indigo and magenta, each
// wandering its own loop.
const LIGHTS = [
  "aurora-a -top-1/2 -left-1/4 w-[70%] bg-[radial-gradient(closest-side,oklch(0.52_0.17_295/0.6),transparent)]",
  "aurora-b -right-1/4 -bottom-2/3 w-[80%] bg-[radial-gradient(closest-side,oklch(0.5_0.16_270/0.55),transparent)]",
  "aurora-c top-1/4 left-1/3 w-[45%] bg-[radial-gradient(closest-side,oklch(0.55_0.17_330/0.35),transparent)]"
];

export function RunYourOwnCopy() {
  const { ref, isOnScreen } = useOnScreen<HTMLDivElement>({
    threshold: 0.25
  });

  return (
    <div
      ref={ref}
      data-playing={isOnScreen ? "" : undefined}
      className="relative isolate mt-12 grid gap-10 overflow-hidden rounded-2xl bg-zinc-950 p-6 ring-1 ring-white/5 sm:mt-16 sm:p-10 lg:grid-cols-[5fr_7fr] lg:items-center lg:gap-14 lg:p-14"
    >
      {LIGHTS.map(light => (
        <span
          key={light}
          aria-hidden="true"
          className={cn(
            "demo-anim absolute -z-10 aspect-square rounded-full",
            light
          )}
        />
      ))}
      <div
        aria-hidden="true"
        className="bg-dot-grid absolute inset-0 -z-10 mask-[radial-gradient(90%_100%_at_70%_100%,black,transparent_75%)] opacity-60"
      />
      <div className="flex flex-col items-start gap-5">
        <h3 className="text-2xl font-medium tracking-tight text-balance text-white">
          Run your own copy
        </h3>
        <p className="max-w-[44ch] text-base/7 text-pretty text-zinc-400 sm:text-sm/6">
          Clone it, install, and it runs on your machine. One more command puts
          it on your own Cloudflare account.
        </p>
        <a
          href={SOURCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "relative inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-base font-medium whitespace-nowrap text-white ring-1 ring-white/15 transition-colors duration-200 ease-in-out hover:bg-white/15 sm:py-2 sm:text-sm",
            FOCUS_RING
          )}
        >
          <GithubMark />
          Read the code
          <IconArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <Terminal isPlaying={isOnScreen} />
    </div>
  );
}
