// CSS writes #RRGGBBAA, Android reads #AARRGGBB.
import { hexChannels } from '../../model/kinds.mjs';
import { xmlDoc } from '../shared/docs.mjs';
import { androidName } from '../shared/names.mjs';

export function androidColor(hex, tokenPath) {
  const { red, green, blue, alpha = 'ff' } = hexChannels(hex, tokenPath);
  return `#${alpha}${red}${green}${blue}`.toUpperCase();
}

export const kinds = ['color'];

export const render = (tokens, { docs }) =>
  tokens
    .map(token =>
      [
        ...xmlDoc(docs, token.path, '    '),
        `    <color name="${androidName(token.path)}">${androidColor(token.value, token.path)}</color>`,
      ].join('\n'),
    )
    .join('\n');

export const codeSyntax = token => `@color/${androidName(token.path)}`;
