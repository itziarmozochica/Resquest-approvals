import { assertHex } from '../../model/kinds.mjs';
import { cssVar } from '../shared/names.mjs';
import { cssBlock } from './brand.mjs';

export const kinds = ['color'];

export const render = (tokens, ctx) => cssBlock(tokens, ctx, token => [[cssVar(token.path), assertHex(token.value, token.path)]]);

export const codeSyntax = token => `var(${cssVar(token.path)})`;
