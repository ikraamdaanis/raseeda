// The box a signature prints in (issue #128), 5 x 2cm at the foot of the
// page. An uploaded signature is fitted inside it; a drawn one is drawn at its
// shape.
export const SIGNATURE_WIDTH_MM = 50;
export const SIGNATURE_HEIGHT_MM = 20;

// A drawn signature is stored as a PNG at three times the box's CSS pixels
// (567 x 227, about 290 dpi), so it prints sharply.
export const DRAWN_SIGNATURE_SCALE = 3;

// Points per millimetre, for the PDF.
export const POINTS_PER_MM = 72 / 25.4;
