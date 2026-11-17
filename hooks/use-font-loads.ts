import { useEffect, useState } from "react";
import { forgetMeasuredWidths } from "~/utils/measure-text-width";

// Bumps when a web font finishes loading, so text measured in a fallback font
// is measured again. A component reading measured widths calls it and opts
// out of the compiler ("use no memo"), since nothing it reads changes.
export function useFontLoads() {
  const [fontLoads, setFontLoads] = useState(0);

  useEffect(() => {
    function handleLoadingDone() {
      forgetMeasuredWidths();
      setFontLoads(count => count + 1);
    }

    document.fonts.addEventListener("loadingdone", handleLoadingDone);

    return () =>
      document.fonts.removeEventListener("loadingdone", handleLoadingDone);
  }, []);

  return fontLoads;
}
