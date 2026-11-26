// Token-set invariants nothing else enforces. Reference integrity and JSON
// validity are not re-checked here: Style Dictionary already fails the build
// on them.
//
//   publishing rule · dimension 4px grid · viewport set parity ·
//   brand-locked values · component tokens in every brand ·
//   translucent surfaces link their opacity token ·
//   description refs resolve + color- prefix
//
// The rules' long-form source is becoming a repository skill (B2BP-1688).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { declaresPublishing, isAliasOnly, isPublished } from './model/publishing.mjs';

const tokensDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens');

/* ------------------------------------------------------------- loading */

function* tokenFiles(dir = tokensDir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* tokenFiles(abs);
    } else if (entry.name.endsWith('.json') && !entry.name.startsWith('$')) {
      yield abs;
    }
  }
}

const DATA = new Map([...tokenFiles()].map(abs => [path.relative(tokensDir, abs), JSON.parse(readFileSync(abs, 'utf8'))]));

function collectNodes(node, tokenPath, out) {
  if (!node || typeof node !== 'object') {
    return;
  }
  if ('$value' in node) {
    out.push([tokenPath.join('.'), node]);
    return;
  }
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith('$') && !key.startsWith('com.')) {
      collectNodes(child, [...tokenPath, key], out);
    }
  }
}

function nodesOf(file) {
  const out = [];
  collectNodes(DATA.get(file), [], out);
  return out;
}

const ALL_NODES = [...DATA.keys()].flatMap(file => nodesOf(file).map(([tokenPath, node]) => [file, tokenPath, node]));
const ALL_PATHS = new Set(ALL_NODES.map(([, tokenPath]) => tokenPath));

/* ------------------------------------------------------ publishing rule */

// The composites become Figma styles, so the style sets always publish.
const STYLE_SETS = new Set(['typography-style.json', 'elevation-style.json', 'focus-style.json']);
// The component tier: brand-owned overrides a designer binds on the component.
const COMPONENT_TOKENS = ['button.'];
const PUBLISHED_IN_BRAND = ['border-radius.', 'border-width.', ...COMPONENT_TOKENS];
const PUBLISHED_IN_CORE = ['border-width.focus', 'spacing.', 'size.'];
// Published with empty scopes: no Figma property binds them, they exist for code and Dev Mode.
const PUBLISHED_UNSCOPED = ['z-index.', 'motion-duration.'];
// Alias-only colours: every core and brand ramp step, published with empty
// scopes so another library file can alias it, offered by no picker, never in
// code. The whole palette publishes, so a new reference needs no flag change.
const ALIAS_ONLY_COLLECTIONS = new Set(['core', 'brand']);

function isAliasOnlyByRule(file, tokenPath) {
  const [collection] = file.split(path.sep);
  return ALIAS_ONLY_COLLECTIONS.has(collection) && tokenPath.startsWith('color.');
}

function shouldPublish(file, tokenPath, node) {
  if (STYLE_SETS.has(path.basename(file))) {
    return true;
  }
  const [collection] = file.split(path.sep);
  if (collection === 'core' && PUBLISHED_UNSCOPED.some(prefix => tokenPath.startsWith(prefix))) {
    return true;
  }
  if (isAliasOnlyByRule(file, tokenPath)) {
    return true;
  }
  if (!node.$extensions?.['com.figma.scopes']?.length) {
    return false;
  }
  if (collection === 'theme' || collection === 'data') {
    return true;
  }
  if (collection === 'core') {
    return PUBLISHED_IN_CORE.some(prefix => tokenPath.startsWith(prefix));
  }
  return collection === 'brand' && PUBLISHED_IN_BRAND.some(prefix => tokenPath.startsWith(prefix));
}

test('publishing: every token declares com.figma.hiddenFromPublishing explicitly', () => {
  const missing = ALL_NODES.filter(([, , node]) => !declaresPublishing(node)).map(([file, tokenPath]) => `${file}:${tokenPath}`);
  assert.deepEqual(missing, []);
});

test('publishing: only directly-bound tokens are published', () => {
  const problems = [];
  for (const [file, tokenPath, node] of ALL_NODES) {
    const published = isPublished(node);
    if (published !== shouldPublish(file, tokenPath, node)) {
      problems.push(`${file}:${tokenPath} ${published ? 'is published but should be hidden' : 'is hidden but should be published'}`);
    }
  }
  assert.deepEqual(problems, []);
});

// The empty scope list is what keeps them out of every picker and out of code
// (isAliasOnly), so a missing key, which Figma reads as every scope, fails here.
test('publishing: core and brand colours are alias-only', () => {
  const problems = ALL_NODES.filter(([file, tokenPath, node]) => isAliasOnlyByRule(file, tokenPath) && !isAliasOnly(node)).map(
    ([file, tokenPath]) => `${file}:${tokenPath}`,
  );
  assert.deepEqual(problems, []);
});

// A path that is a token in one set and a group in another can't survive the
// merge: one side silently wins and the other's references stop resolving.
test('no path is both a token and a group', () => {
  const both = [...ALL_PATHS].filter(tokenPath => [...ALL_PATHS].some(other => other.startsWith(`${tokenPath}.`)));
  assert.deepEqual(both.sort(), []);
});

/* -------------------------------------------------------- dimension grid */

// 8px base, half steps allowed; off-grid steps need a reason: 0-5 (0.5 — a
// path can't hold a decimal point), 1 and 2 are hairline strokes, 44 is the
// recommended touch target.
const DIMENSION_GRID = 4;
const DIMENSION_OFF_GRID = new Set(['0-5', '1', '2', '44']);

test('dimension raws land on the 4px grid or a documented exception', () => {
  const problems = [];
  for (const [tokenPath] of nodesOf(path.join('core', 'dimension.json'))) {
    const key = tokenPath.split('.').pop();
    if (!DIMENSION_OFF_GRID.has(key) && !Number.isInteger(Number(key) / DIMENSION_GRID)) {
      problems.push(`dimension.${key} is off the ${DIMENSION_GRID}px grid and not a documented exception`);
    }
  }
  assert.deepEqual(problems, []);
});

/* --------------------------------------------------- viewport set parity */

test('viewport sets define the same paths on every breakpoint', () => {
  const [reference, ...rest] = [...DATA.keys()]
    .filter(file => file.startsWith(`viewport${path.sep}`))
    .map(file => [file, nodesOf(file).map(([tokenPath]) => tokenPath)]);
  assert.ok(rest.length, 'expected several viewport sets');
  const [referenceFile, referencePaths] = reference;
  for (const [file, paths] of rest) {
    assert.deepEqual(paths.toSorted(), referencePaths.toSorted(), `${file} differs from ${referenceFile}`);
  }
});

/* -------------------------------------------------- brand-locked values */

// These sit in brand only so the picker shows one list, not because a brand
// may change them.
const LOCKED_ACROSS_BRANDS = ['border-radius.full', 'border-radius.none'];

test('brand-locked tokens are identical in every brand file', () => {
  const brandFiles = [...DATA.keys()].filter(file => file.startsWith(`brand${path.sep}`));
  assert.ok(brandFiles.length, 'expected brand sets');
  for (const locked of LOCKED_ACROSS_BRANDS) {
    const values = brandFiles.map(file => {
      const node = new Map(nodesOf(file)).get(locked);
      return [file, node ? JSON.stringify(node.$value) : '<missing>'];
    });
    const [, ...conflicting] = new Set(values.map(([, value]) => value));
    assert.deepEqual(conflicting, [], `${locked} differs across brands: ${JSON.stringify(values)}`);
  }
});

// The component tier is brand-owned, so every brand defines the same component
// paths: one missing would leave that brand's mode without the variable.
test('every brand file defines the same component tokens', () => {
  const brandFiles = [...DATA.keys()].filter(file => file.startsWith(`brand${path.sep}`));
  const componentPaths = file =>
    nodesOf(file)
      .map(([tokenPath]) => tokenPath)
      .filter(tokenPath => COMPONENT_TOKENS.some(prefix => tokenPath.startsWith(prefix)))
      .toSorted();
  const [reference, ...rest] = brandFiles;
  for (const file of rest) {
    assert.deepEqual(componentPaths(file), componentPaths(reference), `${file} differs from ${reference}`);
  }
});

// A brand's stroke scale picks a hairline raw from the dimension catalog; a
// literal, or a zero step, means an export left the brand drawing no outlines.
test('brand border-width steps reference a non-zero dimension raw', () => {
  const problems = [];
  for (const file of [...DATA.keys()].filter(name => name.startsWith(`brand${path.sep}`))) {
    for (const [tokenPath, node] of nodesOf(file).filter(([found]) => found.startsWith('border-width.'))) {
      if (!/^\{dimension\.(?!0\})[0-9-]+\}$/u.test(String(node.$value))) {
        problems.push(`${file}:${tokenPath} is ${JSON.stringify(node.$value)}`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

/* --------------------------------------------- description references */

const descriptions = ALL_NODES.filter(([, , node]) => typeof node.$description === 'string').map(([file, tokenPath, node]) => [
  file,
  tokenPath,
  node.$description,
]);

// Style Dictionary resolves {…} in every key of a token, so a brace in a
// description is read as a reference and breaks the build. A description
// names a token bare (font-family.body), never as {font-family.body}.
test('descriptions: no braces', () => {
  const problems = descriptions.filter(([, , text]) => /[{}]/u.test(text)).map(([file, tokenPath]) => `${file}:${tokenPath}`);
  assert.deepEqual(problems, []);
});

// A colour reference written without its color- prefix names nothing — the
// variable a designer searches for is color-surface/static/raised. The
// lookbehind keeps color-surface.static.raised from matching as a bare one.
const BARE_COLOR_RE = /(?<![\w-])(?<role>surface|content|border|focus|data|shadow)(?<rest>(?:[./][a-z0-9][a-z0-9-]*){2,})/gu;

test('descriptions: colour references carry their color- prefix', () => {
  const problems = [];
  for (const [file, tokenPath, description] of descriptions) {
    for (const [bare] of description.matchAll(BARE_COLOR_RE)) {
      problems.push(`${file}:${tokenPath} says '${bare}' — write 'color-${bare.replaceAll('/', '.')}'`);
    }
  }
  assert.deepEqual(problems, []);
});

// "there is no color-content.interactive.accent" — a path the prose names in
// order to rule out; naming it is the point, not a broken reference. Sticky,
// so it tests the text just before lastIndex: the lookbehind is the whole match.
const RULED_OUT_RE = /(?<=(?:\bno|\binvent(?:ing)?\s+an?)\s+)/iuy;
const ruledOut = (text, index) => {
  RULED_OUT_RE.lastIndex = index;
  return RULED_OUT_RE.test(text);
};

// A RegExp escape for the syntax characters (RegExp.escape needs Node 24).
const escapeRe = text => text.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

test('descriptions: every referenced token name resolves', () => {
  const properties = [...new Set([...ALL_PATHS].map(known => known.replace(/\..*$/u, '')))].sort(
    (left, right) => right.length - left.length,
  );
  const refRe = new RegExp(
    `(?<![\\w-])(?<property>${properties.map(escapeRe).join('|')})(?<rest>(?:\\.(?:[a-z0-9][a-z0-9-]*|\\*))+)`,
    'gu',
  );
  const resolves = candidate => {
    if (candidate.includes('*')) {
      const pattern = new RegExp(
        `^${candidate
          .split('.')
          .map(segment => (segment === '*' ? '[^.]+' : escapeRe(segment)))
          .join('\\.')}(?:\\.|$)`,
        'u',
      );
      return [...ALL_PATHS].some(known => pattern.test(known));
    }
    return ALL_PATHS.has(candidate) || [...ALL_PATHS].some(known => known.startsWith(`${candidate}.`));
  };

  const problems = [];
  for (const [file, tokenPath, description] of descriptions) {
    for (const match of description.matchAll(refRe)) {
      const [reference] = match;
      if (!resolves(reference) && !ruledOut(description, match.index)) {
        problems.push(`${file}:${tokenPath} references '${reference}', which does not exist`);
      }
    }
  }
  assert.deepEqual(problems, []);
});

/* --------------------------------------------- alpha from opacity token */

// Tokens Studio exports a translucent colour as a Figma variable linked to both
// its colour and its alpha only when $value is rgba({color}, {opacity}) and no
// studio.tokens.modify is set; a modifier, or a literal alpha, flattens it to a
// hex. So every translucent surface takes its alpha from opacity.<role>, the
// colour's last path segment (…weak.hover composites at opacity.hover), typed
// opacity so Tokens Studio links it. Shadows keep a literal alpha: no opacity
// token carries their amounts.
const RGBA_REF_RE = /^rgba\(\s*\{(?<color>[^}]+)\}\s*,\s*\{(?<alpha>[^}]+)\}\s*\)$/u;

test('every translucent surface links its colour and its opacity token', () => {
  const problems = [];
  for (const file of DATA.keys()) {
    const found = new Map(nodesOf(file));
    for (const [tokenPath, node] of found) {
      if (node.$extensions?.['studio.tokens']?.modify) {
        problems.push(
          `${file}:${tokenPath} uses studio.tokens.modify, which Tokens Studio exports flat; write rgba({color}, {opacity.<role>})`,
        );
      }
      const translucentSurface =
        tokenPath.startsWith('color-surface.') && typeof node.$value === 'string' && node.$value.startsWith('rgba(');
      const role = tokenPath.split('.').pop();
      if (translucentSurface && RGBA_REF_RE.exec(node.$value)?.groups.alpha !== `opacity.${role}`) {
        problems.push(`${file}:${tokenPath} is ${node.$value}, expected rgba({color}, {opacity.${role}})`);
      } else if (translucentSurface && found.get(`opacity.${role}`)?.$type !== 'opacity') {
        problems.push(`${file}:${tokenPath} composites at opacity.${role}, which must exist and be typed opacity`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
