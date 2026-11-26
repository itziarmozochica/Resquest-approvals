// Token path -> platform symbol name. One function per spelling convention;
// every emitter imports from here so a naming change lands everywhere at once.
//
// NAMESPACE is the Fever foundations prefix, on every generated name. Code is
// the one place that needs it: a stylesheet, an Android resource table and a
// Swift module are all shared global spaces. It is fv, not Ignite's ignt-: the
// foundations serve every Fever product, and ignt- stays with Ignite's own
// selectors, component knobs and the 2023 --ignt-color-* foundations, so the
// two never collide. Figma does not need it — a library is already a namespace
// there — so tokens/** stays unprefixed.
export const NAMESPACE = 'fv';

const segments = tokenPath => tokenPath.split('.').flatMap(part => part.split('-'));

const FIRST_LETTER = /^./u;

export const cssVar = tokenPath => `--${NAMESPACE}-${tokenPath.replace(/\./gu, '-')}`;
export const androidName = tokenPath => `${NAMESPACE}_${tokenPath.replace(/[.-]/gu, '_')}`;
export const pascal = tokenPath =>
  segments(tokenPath)
    .map(segment => segment.replace(FIRST_LETTER, letter => letter.toUpperCase()))
    .join('');
export const camel = tokenPath => pascal(tokenPath).replace(FIRST_LETTER, letter => letter.toLowerCase());
