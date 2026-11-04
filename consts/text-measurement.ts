// A character's advance, in ems, guessed where text can't be measured (a font
// that hasn't loaded, or no canvas on the server): wide enough for any font's
// figures, so a column sized by it never clips one.
export const FALLBACK_EM_PER_CHARACTER = 0.65;
