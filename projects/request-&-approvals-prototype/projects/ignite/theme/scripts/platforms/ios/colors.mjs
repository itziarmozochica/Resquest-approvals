import { hexChannels } from '../../model/kinds.mjs';
import { swiftDoc } from '../shared/docs.mjs';
import { camel, NAMESPACE, pascal } from '../shared/names.mjs';

const BYTE_MAX = 255;
const DECIMALS = 4;

// One hex byte as a 0-1 channel.
const unit = byte => (parseInt(byte, 16) / BYTE_MAX).toFixed(DECIMALS);

export function swiftColor(hex, tokenPath) {
  const { red, green, blue, alpha = 'ff' } = hexChannels(hex, tokenPath);
  return `UIColor(red: ${unit(red)}, green: ${unit(green)}, blue: ${unit(blue)}, alpha: ${unit(alpha)})`;
}

const colorSymbol = tokenPath => camel(tokenPath.replace(/^color-/u, ''));

export const kinds = ['color'];

export function render(tokens, { darkIndex, root, docs }) {
  const colors = tokens.map(token => {
    const dark = darkIndex.get(token.path)?.value ?? token.value;
    const name = colorSymbol(token.path);
    const light = swiftColor(token.value, token.path);
    const decl =
      dark === token.value
        ? `    public static let ${name} = ${light}`
        : `    public static let ${name} = ${root}.dynamicColor(light: ${light}, dark: ${swiftColor(dark, token.path)})`;
    return [...swiftDoc(docs, token.path, '    '), decl].join('\n');
  });
  return ['public enum Colors {', colors.join('\n'), '}'].join('\n');
}

export const codeSyntax = token => `${pascal(NAMESPACE)}.<Brand>.Colors.${colorSymbol(token.path)}`;
