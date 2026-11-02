import { toast } from "sonner";
import { APP_NAME } from "~/consts/app";

const UPDATE_CHECK_INTERVAL = 60 * 60 * 1000;
const NEW_VERSION_TOAST_ID = "new-version";

// A tab coming back into view looks for a new version at most once an hour.
export function isUpdateCheckDue(lastCheckedAt: number, now: number) {
  return now - lastCheckedAt >= UPDATE_CHECK_INTERVAL;
}

// The service worker serves pages from the cache and takes over open tabs as
// soon as a new version installs, so a tab left open keeps running the old
// build. This says so once the new one is in charge, and has a tab that comes
// back into view check for one. Returns a function that stops watching.
export function watchForNewVersion() {
  if (import.meta.env.DEV) return () => {};
  if (typeof navigator === "undefined") return () => {};
  if (!("serviceWorker" in navigator)) return () => {};

  const serviceWorker = navigator.serviceWorker;
  // The first install takes over a page that was loaded from the network, so
  // that page is already the latest build.
  let hadController = serviceWorker.controller !== null;
  // Loading the page has the browser check for a new version already.
  let lastCheckedAt = Date.now();

  function handleControllerChange() {
    if (hadController) showNewVersionToast();
    hadController = true;
  }

  function handleVisibilityChange() {
    if (document.visibilityState !== "visible") return;

    const now = Date.now();

    if (!isUpdateCheckDue(lastCheckedAt, now)) return;
    lastCheckedAt = now;
    // Offline, or the worker's script can't be fetched: try again next time.
    serviceWorker
      .getRegistration()
      .then(registration => registration?.update())
      .catch(() => {});
  }

  serviceWorker.addEventListener("controllerchange", handleControllerChange);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    serviceWorker.removeEventListener(
      "controllerchange",
      handleControllerChange
    );
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}

// Stays until it's acted on: reloading is safe anywhere, since the editor
// autosaves and recovers edits it hadn't written yet.
function showNewVersionToast() {
  toast(`A new version of ${APP_NAME} is ready`, {
    id: NEW_VERSION_TOAST_ID,
    duration: Infinity,
    action: {
      label: "Reload",
      onClick: () => location.reload()
    }
  });
}
