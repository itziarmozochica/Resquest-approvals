// Resolves the Tokens Studio JSON in tokens/** into fully computed values (no
// {references}, no formulas) for every theme x brand x viewport combination,
// in memory, and hands them to the code generator (emit.mjs).
// tokens/$metadata.json (tokenSetOrder) and tokens/$themes.json (which sets
// each theme enables, grouped as theme/brand/viewport, with data folded into
// theme by MIRRORED_GROUPS) drive the combinations
// and the file order, so nothing is hand-listed.
//
// The tokens-studio preprocessor aligns Tokens Studio's types with DTCG
// (sizing/spacing → dimension, boxShadow → shadow, shadow x/y → offsetX/
// offsetY), which also lets ts/resolveMath evaluate the "{a} - {b}" offsets
// of the directional elevation.edge.* layers. Every platform then shares the
// same value transforms (SHARED), and adds the Style Dictionary built-ins it
// declares as `transforms` in platforms/<name>/index.mjs; each platform gets
// its own token list. Two Tokens Studio shapes need custom transforms:
// - rgba({ref}, a): a translucent colour is a computed value rather than an
//   alias with a modifier, because Figma follows an alias to the palette
//   variable underneath and loses the transparency. Style Dictionary resolves
//   the {ref} but keeps the rgba() wrapper, and the built-in color/hex8 does
//   not reach it; value/collapse-rgba-to-hex turns it into an 8-digit hex.
// - opacity.* is typed opacity and written as a percentage ("38%"): Tokens
//   Studio exports it to Figma's 0-100 opacity variables and links it as the
//   alpha of a translucent colour's rgba({color}, {opacity.<role>}). Code wants
//   0-1, so value/opacity-percent-to-decimal divides by 100, before the rgba()
//   that references it collapses to hex.
//
// The custom transforms live on each Style Dictionary instance (hooks); only
// sd-transforms' own registration is global.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { register } from '@tokens-studio/sd-transforms';
import StyleDictionary from 'style-dictionary';

import { MIRRORED_GROUPS } from './model/cascade.mjs';
import { reachesCode } from './model/publishing.mjs';
import { PLATFORMS } from './platforms/index.mjs';

// format 'hex' keeps the modify-alpha output an 8-digit hex, the same colour
// string the rgba() collapse produces.
register(StyleDictionary, { withSDBuiltins: false, 'ts/color/modifiers': { format: 'hex' } });

// warnings: 'error' turns a token collision — one path defined by two sets of
// the same combination — into a build failure, which enforces the layer rule:
// a value lives in exactly one layer (theme/AGENTS.md). A broken reference
// throws under Style Dictionary's defaults, which this keeps.
const LOG = { verbosity: 'silent', warnings: 'error' };

const tokensDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens');
const viewportDir = `${path.join(tokensDir, 'viewport')}${path.sep}`;

const metadata = JSON.parse(readFileSync(path.join(tokensDir, '$metadata.json'), 'utf8'));
const themes = JSON.parse(readFileSync(path.join(tokensDir, '$themes.json'), 'utf8'));
const order = metadata.tokenSetOrder;

const groups = {};
for (const theme of themes) {
  const enabledSets = Object.entries(theme.selectedTokenSets)
    .filter(([, state]) => state === 'enabled')
    .map(([set]) => set);
  (groups[theme.group] ??= []).push({ name: theme.name, sets: enabledSets });
}

for (const [mirror, leader] of Object.entries(MIRRORED_GROUPS)) {
  const mirrorModes = (groups[mirror] ?? []).map(option => option.name).sort();
  const leaderModes = groups[leader].map(option => option.name).sort();
  if (groups[mirror] && mirrorModes.join() !== leaderModes.join()) {
    throw new Error(
      `tokens/$themes.json: group "${mirror}" has modes ${mirrorModes.join(', ')}, but it mirrors "${leader}", which has ${leaderModes.join(', ')}.`,
    );
  }
  for (const option of groups[mirror] ?? []) {
    groups[leader].find(candidate => candidate.name === option.name).sets.push(...option.sets);
  }
  delete groups[mirror];
}

const setsOwnedByAGroup = new Set(
  Object.values(groups)
    .flat()
    .flatMap(option => option.sets),
);
const alwaysOnSets = order.filter(set => !setsOwnedByAGroup.has(set));

function cartesian(axes) {
  return axes.reduce((combos, axis) => combos.flatMap(combo => axis.map(option => [...combo, option])), [[]]);
}

const axisNames = Object.keys(groups);
const combinations = cartesian(axisNames.map(name => groups[name].map(option => ({ axis: name, ...option }))));
// Axes with only one option (e.g. the core/foundations group) never vary.
const SINGLE_OPTION = 1;
const varies = axis => groups[axis].length > SINGLE_OPTION;

const TRANSPARENT = 0;
const OPAQUE = 1;
const BYTE_MAX = 255;
const HEX_RADIX = 16;
const BYTE_DIGITS = 2;
const PERCENT = 100;

function applyAlpha(hex, alpha) {
  const clamped = Math.min(OPAQUE, Math.max(TRANSPARENT, alpha));
  const channel = Math.round(clamped * BYTE_MAX)
    .toString(HEX_RADIX)
    .padStart(BYTE_DIGITS, '0');
  return `${hex}${channel}`;
}

const RGBA_HEX_RE = /^rgba\(\s*#(?<hex>[0-9a-fA-F]{6})\s*,\s*(?<alpha>[\d.]+)\s*\)$/u;

function collapseRgba(value) {
  const match = RGBA_HEX_RE.exec(value);
  if (!match) {
    return value;
  }
  const { hex, alpha } = match.groups;
  return applyAlpha(`#${hex}`, parseFloat(alpha));
}

// ts/color/modifiers' hex format shortens a colour whose channels are pairs of
// the same digit (#aaddffcc → #adfc); every emitter reads two digits a channel.
const SHORT_HEX_RE = /^#(?<digits>[0-9a-fA-F]{3,4})$/u;

const TRANSFORMS = {
  'value/expand-short-hex': {
    type: 'value',
    transitive: true,
    filter: token => typeof token.$value === 'string' && SHORT_HEX_RE.test(token.$value),
    transform: token => `#${[...SHORT_HEX_RE.exec(token.$value).groups.digits].map(digit => digit + digit).join('')}`,
  },
  'value/collapse-rgba-to-hex': {
    type: 'value',
    transitive: true,
    filter: token => typeof token.$value === 'string' && RGBA_HEX_RE.test(token.$value),
    transform: token => collapseRgba(token.$value),
  },
  'value/opacity-percent-to-decimal': {
    type: 'value',
    transitive: true,
    filter: ({ path: [group], $value: value }) => group === 'opacity' && Number.isFinite(Number(String(value).replace(/%$/u, ''))),
    transform: token => String(Number(String(token.$value).replace(/%$/u, '')) / PERCENT),
  },
};

const SHARED = [
  'ts/resolveMath',
  'ts/color/modifiers',
  'value/expand-short-hex',
  'value/collapse-rgba-to-hex',
  'value/opacity-percent-to-decimal',
];

// A Style Dictionary instance with the whole resolution config, one platform
// per registry entry. `input` is { source } (files) or { tokens } (an object).
// Initialised explicitly so an init failure (a collision) rejects here
// instead of escaping as an unhandled rejection.
export async function styleDictionary(input) {
  const sd = new StyleDictionary(
    {
      ...input,
      log: LOG,
      hooks: { transforms: TRANSFORMS },
      preprocessors: ['tokens-studio'],
      platforms: Object.fromEntries(PLATFORMS.map(platform => [platform.name, { transforms: [...SHARED, ...platform.transforms] }])),
    },
    { init: false },
  );
  await sd.init();
  return sd;
}

// A token list as plain JSON ({ path, value, type }), only the tokens that reach code.
const published = allTokens =>
  JSON.parse(
    JSON.stringify(allTokens.filter(reachesCode).map(token => ({ path: token.path.join('.'), value: token.$value, type: token.$type }))),
  );

async function resolveCombination(combo, selected) {
  // Single-option axes would add constant noise to every combo name, so they
  // stay out of the name but are still listed in axes below.
  const name = combo
    .filter(option => varies(option.axis))
    .map(option => option.name)
    .join('-');
  const enabledSets = new Set([...alwaysOnSets, ...combo.flatMap(option => option.sets)]);
  // Preserve tokenSetOrder so Style Dictionary sees the sets in the same
  // order Tokens Studio does (later file wins on a duplicate path).
  const source = order.filter(set => enabledSets.has(set)).map(set => path.join(tokensDir, `${set}.json`));

  const sd = await styleDictionary({ source });
  const perPlatform = await Promise.all(selected.map(platform => sd.getPlatformTokens(platform.name)));
  // Platforms differ only in values: paths, source files and descriptions are
  // the same on each, so the first one's list answers for all.
  const [{ allTokens }] = perPlatform;
  return {
    name,
    axes: Object.fromEntries(combo.map(option => [option.axis, option.name])),
    tokens: Object.fromEntries(selected.map((platform, index) => [platform.name, published(perPlatform[index].allTokens)])),
    viewportScoped: new Set(
      allTokens.filter(token => path.resolve(token.filePath).startsWith(viewportDir)).map(token => token.path.join('.')),
    ),
    descriptions: new Map(allTokens.filter(token => token.$description).map(token => [token.path.join('.'), token.$description])),
  };
}

// Every combination resolved: its axes, each selected platform's published
// tokens, the paths a viewport/ set defines, and each token's description. No
// selection: every platform.
export function resolveCombinations({ platforms = PLATFORMS.map(platform => platform.name) } = {}) {
  const selected = PLATFORMS.filter(platform => platforms.includes(platform.name));
  return Promise.all(combinations.map(combo => resolveCombination(combo, selected)));
}
