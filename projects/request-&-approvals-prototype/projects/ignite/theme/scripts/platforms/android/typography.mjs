// TextAppearance styles. Android takes letter-spacing as a multiple of the
// font size, not a length, and line-height as an absolute sp value rather than
// a percentage — both are converted here so the XML says the same thing the
// token does.
import { xmlDoc } from '../shared/docs.mjs';
import { NAMESPACE, pascal } from '../shared/names.mjs';

// textDecoration (the font.*.link styles) is not emitted yet: the decoration is web-only
// until this platform maps it, so a link style matches its .strong sibling here.

const PERCENT = 100;
// Rounding steps: line-height to 0.01 sp, letter-spacing to 0.0001 em.
const LINE_HEIGHT_STEP = 100;
const TRACKING_STEP = 10_000;
const roundTo = (value, step) => Math.round(value * step) / step;

export const kinds = ['typography'];

export function render(tokens, { docs }) {
  return tokens
    .map(token => {
      const style = token.value;
      const size = Number(style.fontSize);
      const lineHeight = roundTo(size * (parseFloat(style.lineHeight) / PERCENT), LINE_HEIGHT_STEP);
      // A zero font size has no tracking to scale (and would divide by zero).
      const tracking = size ? roundTo(Number(style.letterSpacing) / size, TRACKING_STEP) : size;
      return [
        ...xmlDoc(docs, token.path, '    '),
        `    <style name="TextAppearance.${pascal(NAMESPACE)}.${pascal(token.path.replace(/^font\./u, ''))}">`,
        `        <!-- font family: ${style.fontFamily} ${style.fontWeight} — map to a font resource app-side -->`,
        `        <item name="android:textSize">${size}sp</item>`,
        `        <item name="android:lineHeight">${lineHeight}sp</item>`,
        `        <item name="android:letterSpacing">${tracking}</item>`,
        '    </style>',
      ].join('\n');
    })
    .join('\n');
}
