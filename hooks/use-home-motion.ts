import { useLayoutEffect, useSyncExternalStore } from "react";
import {
  HOME_MOTION_STORAGE_KEY,
  applyHomeMotion,
  clearHomeMotion,
  readHomeMotionPaused,
  writeHomeMotionPaused
} from "~/utils/home-motion";

// Components reading the choice re-render when it changes: from the toggle
// here or from another tab (the storage event).
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(listener => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);

  function handleStorage(event: StorageEvent) {
    if (event.key === HOME_MOTION_STORAGE_KEY) listener();
  }

  window.addEventListener("storage", handleStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

// A choice that couldn't be stored; it lasts until the page closes.
let unstoredPaused: boolean | null = null;

function getPaused() {
  return unstoredPaused ?? readHomeMotionPaused();
}

function setHomeMotionPaused(isPaused: boolean) {
  unstoredPaused = writeHomeMotionPaused(isPaused) ? null : isPaused;
  notify();
}

export function useHomeMotion() {
  const isPaused = useSyncExternalStore(subscribe, getPaused, () => false);

  return {
    isPaused,
    togglePaused: () => setHomeMotionPaused(!isPaused)
  };
}

// Mounted once by the homepage: keeps <html> in step with the choice, and
// clears it on the way out so no other page inherits it. It applies the
// stored choice rather than `isPaused`, which reads false while the page
// hydrates and would undo HOME_MOTION_SCRIPT for a frame.
export function useApplyHomeMotion() {
  const { isPaused } = useHomeMotion();

  useLayoutEffect(() => {
    applyHomeMotion(getPaused());
  }, [isPaused]);

  useLayoutEffect(() => clearHomeMotion, []);
}
