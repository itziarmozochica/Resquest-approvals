// Text styles: five custom properties per style in the brand file (six for a
// link style, which adds its text decoration), plus
// _text-styles.scss, one emission-free mixin per style — the authoring API.
// That file must never emit CSS of its own: Angular's emulated encapsulation
// would duplicate it into every component compilation. Each mixin re-states
// its fields as var() references, so the values stay live across theme,
// breakpoint and brand. Mixins, not placeholders: an @include lands where the
// author writes it, so a BEM modifier declared after its base wins, and it
// works inside @media; an @extend lands where the placeholder is defined and
// cannot cross a media query. The platform's transforms deliver the weight as
// a number, the font size in px and the line-height unitless (150% -> 1.5),
// so a descendant with another font size keeps its own leading.
import { baseTokens, indexByPath } from '../../model/cascade.mjs';
import { kindOf } from '../../model/kinds.mjs';
import { comment, docLines, GENERATED } from '../shared/docs.mjs';
import { cssVar, NAMESPACE } from '../shared/names.mjs';
import { cssBlock } from './brand.mjs';
import { px } from './dimensions.mjs';

// There is no font-stack token, so the fallback after the brand typeface is a
// code-side decision, made once here rather than in every consuming app.
const FONT_FALLBACK = { 'Roboto Mono': 'monospace', 'Playfair Display': 'serif' };
const DEFAULT_FALLBACK = 'sans-serif';

export function fontStack(family) {
  const quoted = family.includes(' ') ? `"${family}"` : family;
  return `${quoted}, ${FONT_FALLBACK[family] ?? DEFAULT_FALLBACK}`;
}

function declarations(token) {
  const style = token.value;
  const name = cssVar(token.path);
  return [
    [`${name}-font-family`, fontStack(style.fontFamily)],
    [`${name}-font-weight`, style.fontWeight],
    [`${name}-font-size`, style.fontSize],
    [`${name}-line-height`, style.lineHeight],
    [`${name}-letter-spacing`, px(style.letterSpacing)],
    ...(style.textDecoration ? [[`${name}-text-decoration`, style.textDecoration]] : []),
  ];
}

export const kinds = ['typography'];

// Against a reference layer, a style re-declares only the fields that changed.
export function render(tokens, ctx) {
  const reference = ctx.reference ? indexByPath(ctx.reference) : null;
  return cssBlock(tokens, ctx, token => {
    const before = reference?.get(token.path);
    if (!before) {
      return declarations(token);
    }
    const beforeValues = new Map(declarations(before));
    return declarations(token).filter(([name, value]) => beforeValues.get(name) !== value);
  });
}

// font.body.lg.default -> fv-font-body-lg-default: the Figma text style's
// name, so Dev Mode and the stylesheet say the same thing.
export function textStyleName(tokenPath) {
  return `${NAMESPACE}-${tokenPath.replaceAll('.', '-')}`;
}

export function textStyles(byKey, docs) {
  const mixins = baseTokens(byKey)
    .filter(token => kindOf(token) === 'typography')
    .sort((left, right) => left.path.localeCompare(right.path))
    .map(token =>
      [
        ...docLines(docs, token.path).map(line => `// ${line}`),
        `@mixin ${textStyleName(token.path)} {`,
        ...declarations(token).map(([name]) => `  ${name.replace(`${cssVar(token.path)}-`, '')}: var(${name});`),
        '}',
      ].join('\n'),
    );
  return [
    comment(
      [GENERATED, 'Text-style mixins, one per text style.', 'This file must compile to zero CSS on its own (asserted in the test suite).'],
      '// ',
    ),
    '',
    mixins.join('\n\n'),
    '',
  ].join('\n');
}
