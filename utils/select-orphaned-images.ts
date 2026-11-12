/**
 * Decide which stored image blobs are safe to delete.
 *
 * A blob is orphaned when no saved invoice, template or version references it.
 * Anything referenced is never returned, so callers can delete the result
 * without risking live data.
 */
export function selectOrphanedImageIds(
  storedImageIds: string[],
  referencedImageIds: Iterable<string>
): string[] {
  const referenced = new Set<string>();

  for (const referencedImageId of referencedImageIds) {
    if (referencedImageId) referenced.add(referencedImageId);
  }

  return storedImageIds.filter(storedImageId => !referenced.has(storedImageId));
}
