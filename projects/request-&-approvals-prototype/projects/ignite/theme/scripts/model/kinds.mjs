// kindOf() is the one place that classifies a token; assertHex() is the one
// place a colour string is trusted; byCategory() hands each platform category
// the tokens of the kinds it owns.

// The IR's $type vocabulary is DTCG's, aligned by the tokens-studio
// preprocessor (sizing/spacing → dimension, boxShadow → shadow). Two Tokens
// Studio habits survive it: border-radius.* and border-width.* are typed
// number, and opacity keeps Tokens Studio's opacity type (resolve.mjs has
// already turned it into a 0-1 decimal); z-index.* and motion-duration.* are
// numbers too, a unitless stacking order and a duration in milliseconds. This
// collapses all of that into the seven kinds the emitters actually
// distinguish. An unknown $type throws: a new token type must be classified
// here before any emitter can be trusted with it, rather than silently
// falling into "length".
export function kindOf(token) {
  switch (token.type) {
    case 'color':
      return 'color';
    case 'typography':
      return 'typography';
    case 'shadow':
      return 'shadow';
    case 'dimension':
      return 'length';
    case 'opacity':
      return 'opacity';
    case 'number':
      if (token.path.startsWith('opacity')) {
        return 'opacity';
      }
      if (token.path.startsWith('z-index.')) {
        return 'stacking';
      }
      return token.path.startsWith('motion-duration.') ? 'duration' : 'length';
    default:
      throw new Error(`${token.path}: unclassified $type "${token.type}" — add it to kindOf() in scripts/model/kinds.mjs`);
  }
}

const HEX_COLOR = /^#(?<red>[0-9a-f]{2})(?<green>[0-9a-f]{2})(?<blue>[0-9a-f]{2})(?<alpha>[0-9a-f]{2})?$/iu;

// Every colour reaching an emitter must already be a plain 6- or 8-digit hex —
// resolve.mjs resolves references, modify-alpha and rgba() first. Anything
// else (a CSS keyword, an unresolved {ref}) would be silently mangled into
// invalid XML/Swift, which has happened: a literal "white" shipped as `#WHITE`
// and `UIColor(red: NaN, …)`. Fail the build instead. Returns the two-digit
// channels ({ red, green, blue, alpha }; alpha is undefined on a 6-digit hex).
export function hexChannels(value, tokenPath) {
  const match = typeof value === 'string' && HEX_COLOR.exec(value);
  if (!match) {
    throw new Error(`${tokenPath}: expected a 6- or 8-digit hex colour in the resolved output, got ${JSON.stringify(value)}`);
  }
  return match.groups;
}

export function assertHex(value, tokenPath) {
  hexChannels(value, tokenPath);
  return value;
}

// The category of a platform ({ colors, dimensions, … }) that owns a token's
// kind. A kind no category owns throws: every platform decides what happens
// to every token, rather than dropping one.
export function categoryFor(categories, token) {
  const kind = kindOf(token);
  const category = Object.values(categories).find(candidate => candidate.kinds.includes(kind));
  if (!category) {
    throw new Error(`${token.path}: no category owns kind "${kind}" — add it to one category's kinds`);
  }
  return category;
}

// Splits tokens over a platform's categories, keeping source order inside each.
export function byCategory(categories, tokens) {
  const groups = Object.entries(categories).map(([name, category]) => ({ name, category, tokens: [] }));
  for (const token of tokens) {
    const category = categoryFor(categories, token);
    groups.find(group => group.category === category).tokens.push(token);
  }
  return groups;
}
