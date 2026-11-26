import { VIEWPORT_ORDER } from '../../model/cascade.mjs';
import { swiftDoc } from '../shared/docs.mjs';
import { camel } from '../shared/names.mjs';

// textDecoration (the font.*.link styles) is not emitted yet: the decoration is web-only
// until this platform maps it, so a link style matches its .strong sibling here.

const SWIFT_WEIGHT = { Regular: '.regular', Medium: '.medium', SemiBold: '.semibold', Bold: '.bold', ExtraBold: '.heavy' };

const PERCENT = 100;
const DECIMALS = 4;

export const kinds = ['typography'];

export function render(tokens, { byViewport, root, docs }) {
  const styles = tokens.map(token => {
    const arms = VIEWPORT_ORDER.map(viewport => {
      const { value } = byViewport[viewport].get(token.path);
      return (
        `        case .${viewport}: return ${root}.TextStyle(fontFamily: "${value.fontFamily}", ` +
        `fontWeight: ${SWIFT_WEIGHT[value.fontWeight] ?? '.regular'}, fontSize: ${value.fontSize}, ` +
        `lineHeight: ${(parseFloat(value.lineHeight) / PERCENT).toFixed(DECIMALS)}, letterSpacing: ${value.letterSpacing})`
      );
    });
    return [
      ...swiftDoc(docs, token.path, '    '),
      `    public static func ${camel(token.path.replace(/^font\./u, ''))}(_ viewport: ${root}.Viewport) -> ${root}.TextStyle {`,
      '        switch viewport {',
      ...arms,
      '        }',
      '    }',
    ].join('\n');
  });
  return ['public enum Typography {', styles.join('\n\n'), '}'].join('\n');
}
