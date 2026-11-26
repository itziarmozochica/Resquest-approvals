import { kindOf } from '../../model/kinds.mjs';
import { cssVar } from '../shared/names.mjs';
import { cssBlock } from './brand.mjs';

// ts/size/px has already suffixed the dimension-typed lengths, but it skips
// two kinds of bare number: border-radius.* and border-width.* (typed number
// in Tokens Studio) and a typography letterSpacing. This suffixes a bare
// number and leaves anything else as it is.
export const px = value => (/^-?\d*\.?\d+$/u.test(String(value)) && Number(value) ? `${value}px` : String(value));

export const kinds = ['length', 'opacity', 'stacking', 'duration'];

// Opacity and z-index are unitless; a duration takes ms, zero included (a
// bare 0 is not a valid <time>).
const cssValue = token => {
  switch (kindOf(token)) {
    case 'opacity':
    case 'stacking':
      return String(token.value);
    case 'duration':
      return `${token.value}ms`;
    default:
      return px(token.value);
  }
};

export const render = (tokens, ctx) => cssBlock(tokens, ctx, token => [[cssVar(token.path), cssValue(token)]]);

export const codeSyntax = token => `var(${cssVar(token.path)})`;
