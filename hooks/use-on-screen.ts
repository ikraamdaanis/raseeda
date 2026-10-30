import { useEffect, useRef, useState } from "react";

/**
 * Whether the element on `ref` is on screen: at least `threshold` of it in
 * view (any of it by default). Until the first check it reports `initial`,
 * so motion that should start at once can say so.
 */
export function useOnScreen<TElement extends Element>({
  threshold = 0,
  initial = false
}: {
  threshold?: number;
  initial?: boolean;
} = {}) {
  const ref = useRef<TElement>(null);
  const [isOnScreen, setIsOnScreen] = useState(initial);

  useEffect(() => {
    const element = ref.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      entries => setIsOnScreen(entries.some(entry => entry.isIntersecting)),
      { threshold }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isOnScreen };
}
