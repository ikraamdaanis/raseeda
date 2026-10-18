// Registers the app's service worker (scripts/service-worker.js, built as
// /sw.js) once the page has finished loading, so saving the site for next time
// never competes with the visit in front of it. Production builds only: the
// dev server has no /sw.js.
export const REGISTER_SERVICE_WORKER_SCRIPT = `if ("serviceWorker" in navigator) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}`;
