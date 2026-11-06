// The no-break space between a figure and its currency ("12,5 €", "CHF 12.50"),
// not the ones grouping its digits ("98 765"). react-pdf hands a currency in
// letters over as a word of its own, so the space can end the word.
const FIGURE_CURRENCY_SPACE =
  /(?<=\d)\u00a0(?=\D|$)|(?<=[^\d\s])\u00a0(?=-?\d|$)/u;

// A hyphenation callback for the PDF's money cells. react-pdf otherwise breaks
// a figure too wide for its column anywhere, a no-break space included, and
// draws a hyphen there, so "98 765,43 zł" printed as "98 765,43 -" over "zł".
// This keeps each figure whole and lets it part from its currency at a plain
// space, which breaks without a hyphen.
export function breakBeforeCurrency(word: string): string[] {
  return word
    .split(FIGURE_CURRENCY_SPACE)
    .flatMap((part, index) => (index === 0 ? [part] : [" ", part]))
    .filter(Boolean);
}
