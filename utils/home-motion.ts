// Whether the homepage's looping motion (the clouds, the demo tiles, the
// panel's lights and terminal, the closing glow) is paused. The choice lives
// in localStorage, so it holds on the next visit, and is applied as
// data-home-motion="paused" on <html> while the homepage is open.
export const HOME_MOTION_STORAGE_KEY = "home-motion";

const PAUSED = "paused";

export function readHomeMotionPaused(): boolean {
  try {
    return localStorage.getItem(HOME_MOTION_STORAGE_KEY) === PAUSED;
  } catch {
    return false;
  }
}

// Returns false when storage is blocked (some private windows, site data
// turned off), so the caller can hold the choice in memory instead.
export function writeHomeMotionPaused(isPaused: boolean): boolean {
  try {
    if (isPaused) {
      localStorage.setItem(HOME_MOTION_STORAGE_KEY, PAUSED);
    } else {
      localStorage.removeItem(HOME_MOTION_STORAGE_KEY);
    }

    return true;
  } catch {
    return false;
  }
}

export function applyHomeMotion(isPaused: boolean) {
  const root = document.documentElement;

  if (isPaused) {
    root.dataset.homeMotion = PAUSED;
  } else {
    delete root.dataset.homeMotion;
  }
}

export function clearHomeMotion() {
  delete document.documentElement.dataset.homeMotion;
}

// Runs as the homepage's HTML is parsed, so a visitor who paused the motion
// last time never sees a frame of it this time.
export const HOME_MOTION_SCRIPT = `(function(){try{if(localStorage.getItem(${JSON.stringify(HOME_MOTION_STORAGE_KEY)})===${JSON.stringify(PAUSED)})document.documentElement.setAttribute("data-home-motion",${JSON.stringify(PAUSED)})}catch(error){}})()`;
