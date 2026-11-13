import { useEffect, useState } from "react";

// A QR code's path for some text, drawn once the QR library has loaded. It
// loads only when there's a code to draw, so it stays out of the page's first
// load; null until then, and for no text.
export function useQrCodePath(text: string) {
  const [drawn, setDrawn] = useState<{
    text: string;
    size: number;
    path: string;
  } | null>(null);

  useEffect(() => {
    if (!text) return;

    let isCurrent = true;

    import("~/utils/qr-code")
      .then(({ getQrCodePath }) => {
        if (isCurrent) setDrawn({ text, ...getQrCodePath(text) });
      })
      .catch(() => {
        // Offline before the library loaded: Preview shows no code, and the
        // PDF loads it again when it's made.
      });

    return () => {
      isCurrent = false;
    };
  }, [text]);

  return drawn?.text === text ? drawn : null;
}
