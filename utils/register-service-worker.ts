// Registers the app's service worker (scripts/service-worker.js, built as
// /sw.js) once the page has finished loading, so saving the site for next time
// never competes with the visit in front of it. Production builds only: the
// dev server has no /sw.js. Installing it downloads the whole app, editor and
// PDF builder included, so a homepage visitor whose browser asks to save data
// skips it; it installs when they open the editor instead.
export const REGISTER_SERVICE_WORKER_SCRIPT = `if ("serviceWorker" in navigator && !(location.pathname === "/" && navigator.connection && navigator.connection.saveData)) {
  addEventListener("load", function () {
    navigator.serviceWorker.register("/sw.js").catch(function () {});
  });
}`;
