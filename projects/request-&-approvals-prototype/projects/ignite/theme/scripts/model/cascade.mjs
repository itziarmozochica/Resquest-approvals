// The delta/cascade model every emitter shares: brand is a file, theme and
// viewport are layers holding only the tokens whose value actually changes.
// It also owns the axes: the emitters know exactly these themes and
// viewports, per brand.
export const VIEWPORT_ORDER = ['mobile', 'tablet', 'desktop'];
export const BASE_VIEWPORT = 'mobile';
export const BASE_THEME = 'light';
export const DARK_THEME = 'dark';

export const key = ({ theme, viewport }) => `${theme}|${viewport}`;
export const baseTokens = byKey => byKey.get(key({ theme: BASE_THEME, viewport: BASE_VIEWPORT }));
export const darkTokens = byKey => byKey.get(key({ theme: DARK_THEME, viewport: BASE_VIEWPORT }));

export function indexByPath(tokens) {
  return new Map(tokens.map(token => [token.path, token]));
}

// A delta is "every token whose resolved value differs from the reference".
// Composites compare by their serialised value so a typography style whose
// font-size moved at a breakpoint counts as changed.
export function delta(from, to) {
  const fromIndex = indexByPath(from);
  return to.filter(token => JSON.stringify(fromIndex.get(token.path)?.value) !== JSON.stringify(token.value));
}

// The cascade only works if the two runtime axes are independent: the set of
// colours dark changes must not depend on the viewport, and the set of
// lengths a breakpoint changes must not depend on the theme. That holds today
// (dark moves colour, viewport moves length) but it is an assumption the token
// set could break silently, so it is checked rather than trusted.
export function assertAxesAreOrthogonal(byKey, brand) {
  const signature = tokens =>
    tokens
      .map(token => `${token.path}=${JSON.stringify(token.value)}`)
      .sort()
      .join('\n');

  const [first, ...others] = VIEWPORT_ORDER.map(viewport => ({
    viewport,
    signature: signature(delta(byKey.get(key({ theme: BASE_THEME, viewport })), byKey.get(key({ theme: DARK_THEME, viewport })))),
  }));
  const differing = others.find(entry => entry.signature !== first.signature);
  if (differing) {
    throw new Error(
      `${brand}: the dark-theme delta is not the same at every viewport (${first.viewport} vs ${differing.viewport}). ` +
        `theme and viewport are no longer independent, so they can no longer be emitted as two flat cascade layers — ` +
        `the web emitter (scripts/platforms/web/brand.mjs) needs nested blocks before this combination can ship.`,
    );
  }
}

// Mobile-first: each viewport layer is the delta against the one below it,
// which travels with it as `below`.
export function viewportLayers(byKey, theme) {
  const [, ...above] = VIEWPORT_ORDER;
  return above.map((viewport, index) => {
    const below = byKey.get(key({ theme, viewport: VIEWPORT_ORDER[index] }));
    return { viewport, below, tokens: delta(below, byKey.get(key({ theme, viewport }))) };
  });
}

// One platform's view: brand -> "theme|viewport" -> that platform's tokens.
export function groupByBrand(combos, platform) {
  const brands = new Map();
  for (const combo of combos) {
    if (!brands.has(combo.axes.brand)) {
      brands.set(combo.axes.brand, new Map());
    }
    brands.get(combo.axes.brand).set(key(combo.axes), combo.tokens[platform]);
  }
  return brands;
}

// Every path a viewport/ set defines, in any combination. Which tokens sit on
// the viewport axis is a question about where a token is defined, not about
// whether its values differ today: spacing.layout.* is identical on all three
// breakpoints and is still a viewport token. A platform whose API shape
// depends on the answer (Swift) uses this, or a breakpoint diverging later
// would turn a constant into a function and break every call site.
export function viewportScopedPaths(combos) {
  return new Set(combos.flatMap(combo => [...combo.viewportScoped]));
}

// The emitters know exactly these axes and modes: the cascade is light/dark ×
// the VIEWPORT_ORDER breakpoints, per brand. core is a single-mode
// collection, so it adds no layer. Anything else in $themes.json — a
// "high-contrast" theme, a new "platform" group — would be built by Style
// Dictionary and then silently dropped (or, for a new axis, overwrite other
// combinations in groupByBrand). Fail the build instead, so a mode added in
// Tokens Studio cannot go green while shipping nothing.
export const KNOWN_AXES = ['core', 'theme', 'brand', 'viewport'];

// A group that is its own Figma collection but shares another group's modes:
// data's light and dark are theme's light and dark, so its sets join the
// theme option of the same name instead of becoming an axis of their own.
export const MIRRORED_GROUPS = { data: 'theme' };
export const KNOWN_THEMES = [BASE_THEME, DARK_THEME];

export function assertKnownAxesAndModes(combos) {
  const values = axis => [...new Set(combos.map(combo => combo.axes[axis]))].sort();
  const axes = [...new Set(combos.flatMap(combo => Object.keys(combo.axes)))].sort();
  const problems = [];
  const unknownAxes = axes.filter(axis => !KNOWN_AXES.includes(axis));
  if (unknownAxes.length) {
    problems.push(`unknown axis: ${unknownAxes.join(', ')}`);
  }
  const themes = values('theme');
  if (themes.join() !== [...KNOWN_THEMES].sort().join()) {
    problems.push(`themes are ${themes.join(', ')}, the emitters know ${KNOWN_THEMES.join(', ')}`);
  }
  const viewports = values('viewport');
  if (viewports.join() !== [...VIEWPORT_ORDER].sort().join()) {
    problems.push(`viewports are ${viewports.join(', ')}, the emitters know ${VIEWPORT_ORDER.join(', ')}`);
  }
  if (problems.length) {
    throw new Error(
      `tokens/$themes.json has modes the code generator does not emit (${problems.join('; ')}). ` +
        'Teach scripts/model/cascade.mjs and the platforms about them before adding them, or the outputs would silently leave them out.',
    );
  }
}
