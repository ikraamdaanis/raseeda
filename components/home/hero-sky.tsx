import { ScriptOnce } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";
import { useOnScreen } from "~/hooks/use-on-screen";
import { cn } from "~/lib/utils";

// The homepage hero's sky, shared with the pages that open the same way (the
// not-found and error pages): a sky from behind the header (the section pulls
// up under it), inset from the viewport with rounded corners from `lg` and
// running to the screen's edges below it, with clouds drifting across it.

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

/**
 * The sky and its clouds around `children`, with the hero's entrance marked on
 * a page load. `hue` turns the sky to another oklch hue (the not-found and
 * error pages tint it); `className` goes on the sky itself.
 */
export function HeroSky({
  hue,
  className,
  children
}: {
  hue?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id="hero"
      suppressHydrationWarning
      className="-mt-16 lg:-mt-21 lg:p-3"
    >
      <ScriptOnce>{HERO_ENTRANCE_SCRIPT}</ScriptOnce>
      <div
        className={cn(
          "bg-sky relative isolate overflow-hidden pt-16 lg:rounded-[2rem] lg:pt-21",
          className
        )}
        style={
          hue === undefined
            ? undefined
            : ({ "--sky-hue": hue } as CSSProperties)
        }
      >
        <HeroClouds />
        {children}
      </div>
    </section>
  );
}

// The sky's drifting clouds, behind everything else in the hero. A cloud
// waits off the left edge (left-0, pulled back its own width by the drift)
// and the layer clips it until it crosses in. They drift from the first paint
// and hold still while the sky is scrolled away.
function HeroClouds() {
  const { ref, isOnScreen } = useOnScreen<HTMLDivElement>({ initial: true });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-paused={isOnScreen ? undefined : ""}
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
