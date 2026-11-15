// A PDF of more than one page prints "1 / 2" on each page, which reads the
// same in every label language. A one-page PDF prints no number.
export function getPageNumberLabel({
  pageNumber,
  totalPages
}: {
  pageNumber: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return "";

  return `${pageNumber} / ${totalPages}`;
}
