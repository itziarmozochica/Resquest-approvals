// brands/<brand>.css — the branding/dynamic layer, plain CSS. Every layer is one block per category, in the categories' order. Only the
// :root block carries descriptions: the dark and breakpoint layers repeat
// paths already declared there, and repeating the prose per override would
// bury the handful of values that actually change.
import { BASE_THEME, baseTokens, darkTokens, delta, viewportLayers } from '../../model/cascade.mjs';
import { byCategory } from '../../model/kinds.mjs';
import { docLines, GENERATED } from '../shared/docs.mjs';

// No breakpoint token exists yet, so these are the generator's assumption.
const BREAKPOINTS = { tablet: 768, desktop: 1024 };

const cssComment = text => `/* ${text.replace(/\*\//gu, '* /')} */`;

// The block a web category renders: each token's [name, value] declarations,
// preceded by its description when the block is documented.
export function cssBlock(tokens, { docs, indent, documented }, declarationsOf) {
  const out = [];
  for (const token of tokens) {
    const declarations = declarationsOf(token);
    if (declarations.length) {
      if (documented) {
        out.push(...docLines(docs, token.path).map(line => `${indent}${cssComment(line)}`));
      }
      out.push(...declarations.map(([name, value]) => `${indent}${name}: ${value};`));
      if (documented) {
        out.push('');
      }
    }
  }
  return out.join('\n').replace(/\n+$/u, '');
}

function layer(categories, tokens, ctx) {
  return byCategory(categories, tokens)
    .filter(group => group.tokens.length)
    .map(group => group.category.render(group.tokens, ctx))
    .filter(Boolean)
    .join(ctx.documented ? '\n\n' : '\n');
}

export function renderBrand(brand, byKey, { categories, docs }) {
  const base = baseTokens(byKey);
  const dark = delta(base, darkTokens(byKey));
  const block = (tokens, { indent, reference = null, documented = false }) =>
    layer(categories, tokens, { docs, indent, reference, documented });
  const out = [
    ['/*', ...[GENERATED, `Brand: ${brand}.`].map(line => ` * ${line}`), ' */'].join('\n'),
    '',
    ':root {',
    block(base, { indent: '  ', documented: true }),
    '}',
  ];

  for (const { viewport, below, tokens } of viewportLayers(byKey, BASE_THEME)) {
    if (tokens.length) {
      out.push(
        '',
        `@media (min-width: ${BREAKPOINTS[viewport]}px) {`,
        '  :root {',
        block(tokens, { indent: '    ', reference: below }),
        '  }',
        '}',
      );
    } else {
      out.push('', cssComment(`${viewport}: no token changes value at this breakpoint.`));
    }
  }

  // Theme selectors carry no :root, so data-theme works on any element: custom
  // properties inherit, and the nearest data-theme wins for its subtree. Each
  // block re-declares only the tokens the theme changes (theme and viewport
  // are orthogonal, see assertAxesAreOrthogonal), so breakpoint values inherit
  // untouched. The light block exists to restore light inside a dark subtree;
  // auto shares it, so a nested auto node follows a light OS too, and the dark
  // media block after it, of equal specificity, wins when the OS is dark.
  if (dark.length) {
    const themed = new Set(dark.map(token => token.path));
    out.push(
      '',
      cssComment('Explicit theme, on <html> or any element.'),
      '[data-theme="dark"] {',
      '  color-scheme: dark;',
      block(dark, { indent: '  ', reference: base }),
      '}',
      '',
      '[data-theme="light"],',
      '[data-theme="auto"] {',
      '  color-scheme: light;',
      block(
        base.filter(token => themed.has(token.path)),
        { indent: '  ' },
      ),
      '}',
      '',
      cssComment('Automatic: data-theme="auto" follows the OS preference.'),
      '@media (prefers-color-scheme: dark) {',
      '  [data-theme="auto"] {',
      '    color-scheme: dark;',
      block(dark, { indent: '    ', reference: base }),
      '  }',
      '}',
    );
  }
  out.push('');
  return [{ destination: `brands/${brand}.css`, contents: out.join('\n') }];
}
