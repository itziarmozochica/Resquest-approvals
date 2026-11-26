// One brand's resources, in the standard qualifiers: values/ is the base,
// values-night/ the dark colours, values-sw*dp/ the breakpoint deltas, with
// one resource file per category inside each.
import { BASE_THEME, baseTokens, darkTokens, delta, viewportLayers } from '../../model/cascade.mjs';
import { byCategory } from '../../model/kinds.mjs';
import { GENERATED } from '../shared/docs.mjs';

// Android's closest equivalents to the two web breakpoints.
const QUALIFIER = { tablet: 'sw600dp', desktop: 'sw840dp' };

const FILE = { colors: 'colors.xml', dimensions: 'dimens.xml', typography: 'type.xml' };

const xmlFile = body => `<?xml version="1.0" encoding="utf-8"?>\n<!-- ${GENERATED} -->\n<resources>\n${body}\n</resources>\n`;

export function renderBrand(brand, byKey, { categories, docs }) {
  const base = baseTokens(byKey);
  const layers = [
    ['values', base],
    ['values-night', delta(base, darkTokens(byKey))],
    ...viewportLayers(byKey, BASE_THEME).map(({ viewport, tokens }) => [`values-${QUALIFIER[viewport]}`, tokens]),
  ];
  const out = [];
  for (const [dir, tokens] of layers) {
    for (const group of byCategory(categories, tokens)) {
      const body = group.tokens.length && group.category.render(group.tokens, { brand, dir, docs });
      if (body) {
        out.push({ destination: `${brand}/${dir}/${FILE[group.name]}`, contents: xmlFile(body) });
      }
    }
  }
  return out;
}
