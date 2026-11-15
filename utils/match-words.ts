// Text as it's compared for suggestions: lower case, without accents, so
// "cafe" finds "Café", a pasted decomposed "Café" is the same text, and "ist"
// finds "İstanbul".
export function toMatchable(text: string) {
  return text.normalize("NFKD").replace(/\p{M}/gu, "").toLocaleLowerCase();
}

// Every typed word starts one of the text's words, so "ac" finds "Acme Ltd"
// and "Black Acme", and "acme l" finds "Acme Ltd". Both are matchable already.
export function matchesWords(text: string, typedWords: string[]) {
  const textWords = text.split(/\s+/);

  return typedWords.every(typedWord =>
    textWords.some(textWord => textWord.startsWith(typedWord))
  );
}

// The words typed, ready to match with.
export function toTypedWords(typed: string) {
  return toMatchable(typed.trim()).split(/\s+/).filter(Boolean);
}
