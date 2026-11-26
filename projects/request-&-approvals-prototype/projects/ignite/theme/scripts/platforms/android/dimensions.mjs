// Lengths as dp, then opacity as float dimen items, then z-index and
// durations (ms) as integers.
import { kindOf } from '../../model/kinds.mjs';
import { xmlDoc } from '../shared/docs.mjs';
import { androidName } from '../shared/names.mjs';

export const kinds = ['length', 'opacity', 'stacking', 'duration'];

const INTEGER_KINDS = new Set(['stacking', 'duration']);

export function render(tokens, { docs }) {
  const entry = (token, element) => [...xmlDoc(docs, token.path, '    '), `    ${element}`].join('\n');
  const lengths = tokens
    .filter(token => kindOf(token) === 'length')
    .map(token => entry(token, `<dimen name="${androidName(token.path)}">${token.value}dp</dimen>`));
  const opacities = tokens
    .filter(token => kindOf(token) === 'opacity')
    .map(token => entry(token, `<item name="${androidName(token.path)}" format="float" type="dimen">${token.value}</item>`));
  const integers = tokens
    .filter(token => INTEGER_KINDS.has(kindOf(token)))
    .map(token => entry(token, `<integer name="${androidName(token.path)}">${token.value}</integer>`));
  return [...lengths, ...opacities, ...integers].join('\n');
}

export const codeSyntax = token =>
  INTEGER_KINDS.has(kindOf(token)) ? `@integer/${androidName(token.path)}` : `@dimen/${androidName(token.path)}`;
