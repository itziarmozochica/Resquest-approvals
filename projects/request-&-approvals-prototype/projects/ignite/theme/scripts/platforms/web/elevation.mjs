import { cssVar } from '../shared/names.mjs';
import { cssBlock } from './brand.mjs';

export const kinds = ['shadow'];

// Top-level layers of a box-shadow shorthand: commas inside rgba() stay put.
const layersOf = shorthand => shorthand.split(/,(?![^(]*\))/u).map(layer => layer.trim());

// A focus ring is two opaque zero-blur bands. Figma draws both as shadows; code
// draws the outer band as an outline, because forced-colors mode drops
// box-shadow and focus has to survive it. The inner band stays a box-shadow
// and is what the outline is offset by.
// An inset ring (focus.ring-inset) mirrors it inside the edge: the edge band is
// an outline pulled in by a negative offset, the band inside it an inset shadow.
function focusDeclarations(token) {
  const layers = layersOf(token.value).map(layer => {
    const [first, ...rest] = layer.split(/\s+/u);
    const inset = first === 'inset';
    const [, , , spread, ...color] = inset ? rest : [first, ...rest];
    return { color: color.join(' '), inset, spread: Number.parseFloat(spread) };
  });
  const name = cssVar(token.path);
  const [narrow, wide, ...extra] = layers;
  if (!wide || extra.length || narrow.inset !== wide.inset || narrow.spread >= wide.spread) {
    throw new Error(`${token.path}: a focus ring is two bands of the same kind, the narrower one first`);
  }
  if (narrow.inset) {
    return [
      [`${name}-outline`, `${narrow.spread}px solid ${narrow.color}`],
      [`${name}-outline-offset`, `-${narrow.spread}px`],
      [`${name}-shadow`, `inset 0 0 0 ${wide.spread}px ${wide.color}`],
    ];
  }
  const [inner, outer] = layers;
  return [
    [`${name}-outline`, `${outer.spread - inner.spread}px solid ${outer.color}`],
    [`${name}-outline-offset`, `${inner.spread}px`],
    [`${name}-shadow`, `0 0 0 ${inner.spread}px ${inner.color}`],
  ];
}

// Elevation values are already the box-shadow shorthand (shadow/css/shorthand).
export const render = (tokens, ctx) =>
  cssBlock(tokens, ctx, token => (token.path.startsWith('focus.') ? focusDeclarations(token) : [[cssVar(token.path), token.value]]));
