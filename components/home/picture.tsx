import type { ComponentProps } from "react";

// Every marketing picture has an AVIF beside its WebP (scripts/
// encode-homepage-avif.ts), about 40% lighter; the WebP stays for browsers
// without AVIF.
export function toAvif(srcSet: string) {
  return srcSet.replaceAll(".webp", ".avif");
}

/**
 * An image that offers its AVIF first. The <picture> draws no box of its own,
 * so the image keeps its place in its parent's layout.
 */
export function Picture({
  src,
  srcSet,
  sizes,
  alt,
  ...props
}: ComponentProps<"img"> & { src: string; alt: string }) {
  return (
    <picture className="contents">
      <source type="image/avif" srcSet={toAvif(srcSet ?? src)} sizes={sizes} />
      <img src={src} srcSet={srcSet} sizes={sizes} alt={alt} {...props} />
    </picture>
  );
}
