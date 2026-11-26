// Unit checks for the generator — the pieces whose behaviour must not drift
// under refactoring, with inputs that don't depend on the live token set. A
// platform's checks run only when tokens:build builds it (its --platforms
// flag, selection.mjs); the others are skipped, with the reason.
//
//   pnpm --filter ignite test:scripts
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { CODE_SYNTAX, withCodeSyntax } from './code-syntax.mjs';
import { assertKnownAxesAndModes, delta, groupByBrand, viewportLayers } from './model/cascade.mjs';
import { assertHex, byCategory, kindOf } from './model/kinds.mjs';
import { androidColor } from './platforms/android/colors.mjs';
import { PLATFORMS } from './platforms/index.mjs';
import { swiftColor } from './platforms/ios/colors.mjs';
import { docLines, GENERATED } from './platforms/shared/docs.mjs';
import { androidName, camel, cssVar, pascal } from './platforms/shared/names.mjs';
import { px, render as webDimensions } from './platforms/web/dimensions.mjs';
import { fontStack, textStyleName, render as webTypography } from './platforms/web/typography.mjs';
import { styleDictionary } from './resolve.mjs';
import { buildPlatforms } from './selection.mjs';

const scriptsDir = path.dirname(fileURLToPath(import.meta.url));

const CATEGORIES = ['colors', 'dimensions', 'typography', 'elevation'];
const KINDS = ['color', 'duration', 'length', 'opacity', 'shadow', 'stacking', 'typography'];

const platforms = buildPlatforms();
const built = platform => ({ skip: !platforms.includes(platform) && `${platform} is not in tokens:build --platforms` });
const builtPlatforms = PLATFORMS.filter(platform => platforms.includes(platform.name));

test('platforms: the same six files and the same entry points in every built platform', async () => {
  const names = PLATFORMS.map(platform => platform.name);
  assert.equal(new Set(names).size, names.length, 'platform names must be unique');
  const modules = new Map(
    await Promise.all(
      builtPlatforms.flatMap(platform =>
        ['brand', ...CATEGORIES].map(async file => [`${platform.name}/${file}`, await import(`./platforms/${platform.name}/${file}.mjs`)]),
      ),
    ),
  );
  for (const platform of builtPlatforms) {
    assert.deepEqual(Object.keys(platform).sort(), ['categories', 'name', 'render', 'transforms'], `${platform.name}: the platform record`);
    assert.equal(typeof platform.render, 'function');
    assert.ok(Array.isArray(platform.transforms), `${platform.name}: transforms is a list of Style Dictionary transform names`);
    assert.deepEqual(
      readdirSync(path.join(scriptsDir, 'platforms', platform.name)).sort(),
      ['brand.mjs', 'index.mjs', ...CATEGORIES.map(name => `${name}.mjs`)].sort(),
      `${platform.name}: the six files`,
    );
    assert.equal(typeof modules.get(`${platform.name}/brand`).renderBrand, 'function', `${platform.name}/brand.mjs exports renderBrand`);
    assert.deepEqual(Object.keys(platform.categories), CATEGORIES, `${platform.name}: the categories, in order`);
    for (const [name, category] of Object.entries(platform.categories)) {
      assert.equal(category, modules.get(`${platform.name}/${name}`), `${platform.name}: categories.${name} is ${name}.mjs`);
      assert.ok(category.kinds.length, `${platform.name}/${name}: owns at least one kind`);
      assert.equal(typeof category.render, 'function', `${platform.name}/${name}: render`);
      assert.equal(
        typeof category.codeSyntax === 'function',
        name === 'colors' || name === 'dimensions',
        `${platform.name}/${name}: codeSyntax on colours and dimensions only`,
      );
    }
    assert.deepEqual(
      Object.values(platform.categories)
        .flatMap(category => category.kinds)
        .sort(),
      KINDS,
      `${platform.name}: every kind owned exactly once`,
    );
  }
});

test('platforms: render() emits marked files inside each built platform output folder', () => {
  const tokens = [
    { path: 'color-surface.static.main', type: 'color', value: '#ffffff' },
    { path: 'spacing.inset.md', type: 'dimension', value: '16' },
  ];
  const byKey = new Map(
    ['light', 'dark'].flatMap(theme => ['mobile', 'tablet', 'desktop'].map(viewport => [`${theme}|${viewport}`, tokens])),
  );
  const ctx = { brands: new Map([['acme', byKey]]), viewportScoped: new Set(), docs: new Map() };
  for (const platform of builtPlatforms) {
    const files = platform.render(ctx);
    assert.ok(files.length, `${platform.name}: emits at least one file`);
    for (const file of files) {
      assert.ok(
        !path.isAbsolute(file.destination) && !file.destination.split('/').includes('..'),
        `${platform.name}: ${file.destination} stays inside its folder`,
      );
      assert.ok(file.contents.includes(GENERATED), `${platform.name}: ${file.destination} carries the do-not-edit generator header`);
    }
  }
});

test('withCodeSyntax: the built platforms name published atomic tokens only, nothing else edited', () => {
  const token = (type, value, { hidden, ...extra }) => ({
    $value: value,
    $type: type,
    $extensions: { 'com.figma.hiddenFromPublishing': hidden, ...extra },
  });
  // Written as text so the fixture keeps "050" before "100" and has no trailing newline.
  const raw = [
    '{',
    '  "color": {',
    `    "050": ${JSON.stringify(token('color', '#ffffff', { hidden: true, [CODE_SYNTAX]: { WEB: 'stale' } }))},`,
    `    "100": ${JSON.stringify(token('color', '#eeeeee', { hidden: true }))}`,
    '  },',
    `  "color-surface": { "static": { "main": ${JSON.stringify(token('color', '{color.050}', { hidden: false }))} } },`,
    `  "spacing": { "layout": { "md": ${JSON.stringify(token('spacing', '16', { hidden: false }))} } },`,
    `  "font": { "body": ${JSON.stringify(token('typography', {}, { hidden: false }))} }`,
    '}',
  ].join('\n');
  // The resolved (DTCG) types classify the token, not the Tokens Studio ones in the file.
  const types = new Map([
    ['color-surface.static.main', 'color'],
    ['spacing.layout.md', 'dimension'],
    ['font.body', 'typography'],
  ]);
  const ctx = { platforms, viewportScoped: new Set(['spacing.layout.md']), types };
  const out = withCodeSyntax(raw, ctx);
  const tree = JSON.parse(out);
  const names = {
    web: ['WEB', 'var(--fv-color-surface-static-main)'],
    android: ['ANDROID', '@color/fv_color_surface_static_main'],
    ios: ['iOS', 'Fv.<Brand>.Colors.surfaceStaticMain'],
  };
  assert.deepEqual(tree['color-surface'].static.main.$extensions[CODE_SYNTAX], Object.fromEntries(platforms.map(name => names[name])));
  if (platforms.includes('ios')) {
    assert.equal(tree.spacing.layout.md.$extensions[CODE_SYNTAX].iOS, 'Fv.<Brand>.Dimensions.spacingLayoutMd(viewport)');
  }
  assert.equal(CODE_SYNTAX in tree.font.body.$extensions, false, 'a composite is a Figma style: no code syntax');
  assert.equal(CODE_SYNTAX in tree.color['050'].$extensions, false, 'a stale entry on a hidden token is removed');
  assert.ok(out.indexOf('"050"') < out.indexOf('"100"'), 'number-like keys keep their order');
  assert.ok(out.endsWith('}'), 'no trailing newline is added');
  assert.equal(withCodeSyntax(out, ctx), out, 'a second pass changes nothing');
});

test('names: one token path, every platform spelling', () => {
  const tokenPath = 'color-surface.static.main';
  assert.equal(cssVar(tokenPath), '--fv-color-surface-static-main');
  assert.equal(androidName(tokenPath), 'fv_color_surface_static_main');
  assert.equal(pascal(tokenPath), 'ColorSurfaceStaticMain');
  assert.equal(camel(tokenPath), 'colorSurfaceStaticMain');
});

test('kindOf: classifies every published kind, throws on a new one', () => {
  assert.equal(kindOf({ path: 'color-content.static.primary', type: 'color' }), 'color');
  assert.equal(kindOf({ path: 'spacing.inset.md', type: 'dimension' }), 'length');
  assert.equal(kindOf({ path: 'border-radius.button.md', type: 'number' }), 'length');
  assert.equal(kindOf({ path: 'opacity.disabled', type: 'opacity' }), 'opacity');
  assert.equal(kindOf({ path: 'opacity.disabled', type: 'number' }), 'opacity');
  assert.equal(kindOf({ path: 'z-index.raised', type: 'number' }), 'stacking');
  assert.equal(kindOf({ path: 'motion-duration.fast', type: 'number' }), 'duration');
  assert.equal(kindOf({ path: 'font.body.lg.default', type: 'typography' }), 'typography');
  assert.equal(kindOf({ path: 'elevation.raised', type: 'shadow' }), 'shadow');
  assert.throws(() => kindOf({ path: 'motion.duration.fast', type: 'duration' }), /unclassified/u);
  // Tokens Studio's own types never reach it: the tokens-studio preprocessor aligns them first.
  assert.throws(() => kindOf({ path: 'spacing.inset.md', type: 'spacing' }), /unclassified/u);
});

test('byCategory: source order inside each category, throws on a kind no category owns', () => {
  const categories = { colors: { kinds: ['color'] }, dimensions: { kinds: ['length'] } };
  const tokens = [
    { path: 'spacing.a', type: 'dimension' },
    { path: 'color-x.b', type: 'color' },
    { path: 'spacing.c', type: 'dimension' },
  ];
  assert.deepEqual(
    byCategory(categories, tokens).map(group => [group.name, group.tokens.map(token => token.path)]),
    [
      ['colors', ['color-x.b']],
      ['dimensions', ['spacing.a', 'spacing.c']],
    ],
  );
  assert.throws(() => byCategory(categories, [{ path: 'elevation.raised', type: 'shadow' }]), /no category owns kind "shadow"/u);
});

test('android: elevation is reported once per brand and never emitted', built('android'), context => {
  const warn = context.mock.method(console, 'warn', () => {});
  const { elevation } = PLATFORMS.find(platform => platform.name === 'android').categories;
  const shadow = [{ path: 'elevation.raised', type: 'shadow', value: [] }];
  assert.equal(elevation.render(shadow, { brand: 'acme', dir: 'values', docs: new Map() }), '');
  assert.equal(elevation.render(shadow, { brand: 'acme', dir: 'values-night', docs: new Map() }), '');
  assert.deepEqual(
    warn.mock.calls.map(call => call.arguments),
    [['android: acme: 1 elevation token(s) not emitted — no Android elevation mapping yet']],
  );
});

test('assertHex: accepts 6 and 8 digits, rejects keywords and refs', () => {
  assert.equal(assertHex('#FFFFFF', 't'), '#FFFFFF');
  assert.equal(assertHex('#5c575514', 't'), '#5c575514');
  // the two shapes that have actually reached an emitter and shipped garbage
  assert.throws(() => assertHex('white', 't'), /expected a 6- or 8-digit hex/u);
  assert.throws(() => assertHex('{color.white}', 't'), /expected a 6- or 8-digit hex/u);
  assert.throws(() => assertHex('rgba(#FFFFFF, 0.5)', 't'), /expected a 6- or 8-digit hex/u);
});

test('androidColor: #RRGGBB gains FF, #RRGGBBAA reorders to #AARRGGBB', built('android'), () => {
  assert.equal(androidColor('#0b79c8', 't'), '#FF0B79C8');
  assert.equal(androidColor('#5C575514', 't'), '#145C5755');
  assert.throws(() => androidColor('white', 't'));
});

test('swiftColor: channels to 4 decimals, alpha from the 8th digit', built('ios'), () => {
  assert.equal(swiftColor('#FFFFFF', 't'), 'UIColor(red: 1.0000, green: 1.0000, blue: 1.0000, alpha: 1.0000)');
  assert.equal(swiftColor('#00000080', 't'), 'UIColor(red: 0.0000, green: 0.0000, blue: 0.0000, alpha: 0.5020)');
  assert.throws(() => swiftColor('white', 't'));
});

test('px: a bare number gains px, zero stays unitless, a length already in px is left alone', built('web'), () => {
  assert.equal(px('0'), '0');
  assert.equal(px('16'), '16px');
  assert.equal(px('-0.5'), '-0.5px');
  assert.equal(px('16px'), '16px');
});

test('web dimensions: z-index stays unitless, a duration is in ms, a length in px', built('web'), () => {
  const ctx = { docs: new Map(), indent: '', documented: false };
  const tokens = [
    { path: 'z-index.raised', type: 'number', value: 10 },
    { path: 'motion-duration.instant', type: 'number', value: 0 },
    { path: 'motion-duration.fast', type: 'number', value: 100 },
    { path: 'border-radius.button.md', type: 'number', value: 8 },
  ];
  assert.equal(
    webDimensions(tokens, ctx),
    [
      '--fv-z-index-raised: 10;',
      '--fv-motion-duration-instant: 0ms;',
      '--fv-motion-duration-fast: 100ms;',
      '--fv-border-radius-button-md: 8px;',
    ].join('\n'),
  );
});

test('fontStack: quotes multi-word families, picks the right fallback', built('web'), () => {
  assert.equal(fontStack('Playfair Display'), '"Playfair Display", serif');
  assert.equal(fontStack('Montserrat'), 'Montserrat, sans-serif');
});

test('web typography: five custom properties per style, only the changed fields against a reference', built('web'), () => {
  // As the web platform's transforms deliver it (see the resolve test below).
  const style = {
    path: 'font.body.lg.default',
    type: 'typography',
    value: { fontFamily: 'Montserrat', fontWeight: 600, fontSize: '16px', lineHeight: 1.5, letterSpacing: '0' },
  };
  const ctx = { docs: new Map(), indent: '', documented: false, reference: null };
  assert.equal(
    webTypography([style], ctx),
    [
      '--fv-font-body-lg-default-font-family: Montserrat, sans-serif;',
      '--fv-font-body-lg-default-font-weight: 600;',
      '--fv-font-body-lg-default-font-size: 16px;',
      '--fv-font-body-lg-default-line-height: 1.5;',
      '--fv-font-body-lg-default-letter-spacing: 0;',
    ].join('\n'),
  );
  const larger = { ...style, value: { ...style.value, fontSize: '18px' } };
  assert.equal(webTypography([larger], { ...ctx, reference: [style] }), '--fv-font-body-lg-default-font-size: 18px;');
  const link = { ...style, path: 'font.body.lg.link', value: { ...style.value, textDecoration: 'underline' } };
  assert.match(webTypography([link], ctx), /--fv-font-body-lg-link-text-decoration: underline;$/u);
});

test('resolve: the web built-ins deliver what its categories rely on', built('web'), async () => {
  const sd = await styleDictionary({
    tokens: {
      space: { $type: 'spacing', $value: '16' },
      radius: { $type: 'number', $value: '8' },
      text: {
        $type: 'typography',
        $value: { fontFamily: 'Montserrat', fontWeight: 'SemiBold', fontSize: '16', lineHeight: '150%', letterSpacing: '-0.5' },
      },
      // The color-shadow.* shape a shadow layer references: rgba({ref}, a).
      neutral: { $type: 'color', $value: '#585858' },
      halo: { $type: 'color', $value: 'rgba({neutral}, 0.05)' },
      // The directional elevation.edge.* shape: an offset written as a subtraction,
      // in Tokens Studio's own x/y keys (JSON, as the token files spell them).
      edge: {
        $type: 'boxShadow',
        $value: JSON.parse('[{ "x": "0", "y": "0 - 2", "blur": "4", "spread": "0", "color": "{halo}", "type": "dropShadow" }]'),
      },
    },
  });
  const { allTokens } = await sd.getPlatformTokens('web');
  const value = name => allTokens.find(({ path: [root] }) => root === name).$value;
  assert.equal(value('space'), '16px');
  assert.equal(value('radius'), '8', 'a number-typed length stays bare; web/dimensions.mjs adds its px');
  assert.deepEqual(value('text'), { fontFamily: 'Montserrat', fontWeight: 600, fontSize: '16px', lineHeight: 1.5, letterSpacing: '-0.5' });
  assert.equal(value('edge'), '0 -2px 4px 0 #5858580d', 'a layer colour arrives collapsed to hex, not rgba()');
});

test('resolve: a broken reference and a path two sets define differently both fail the build', async () => {
  const broken = await styleDictionary({ tokens: { swatch: { $type: 'color', $value: '{missing}' } } });
  const [platform] = platforms;
  await assert.rejects(broken.getPlatformTokens(platform), /could not be found/u);
  const dir = mkdtempSync(path.join(tmpdir(), 'fv-collision-'));
  try {
    const set = (file, value) => {
      writeFileSync(path.join(dir, file), JSON.stringify({ spacing: { md: { $type: 'spacing', $value: value } } }));
      return path.join(dir, file);
    };
    await assert.rejects(styleDictionary({ source: [set('a.json', '16'), set('b.json', '24')] }), /collisions/u);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('delta: only changed values, composites compared by content', () => {
  const from = [
    { path: 'a', value: '1' },
    { path: 'b', value: { fontSize: '16' } },
  ];
  const to = [
    { path: 'a', value: '1' },
    { path: 'b', value: { fontSize: '18' } },
  ];
  assert.deepEqual(
    delta(from, to).map(token => token.path),
    ['b'],
  );
});

test('viewportLayers: mobile-first, each layer against the one below', () => {
  const byKey = new Map([
    ['light|mobile', [{ path: 'a', value: '1' }]],
    ['light|tablet', [{ path: 'a', value: '2' }]],
    ['light|desktop', [{ path: 'a', value: '2' }]],
  ]);
  assert.deepEqual(
    viewportLayers(byKey, 'light').map(layer => [layer.viewport, layer.tokens.map(token => token.value)]),
    [
      ['tablet', ['2']],
      ['desktop', []],
    ],
  );
});

test('groupByBrand: one platform view, a map of theme|viewport per brand', () => {
  const combos = [
    { axes: { brand: 'x', theme: 'light', viewport: 'mobile' }, tokens: { web: ['x on web'], other: ['x on other'] } },
    { axes: { brand: 'y', theme: 'dark', viewport: 'mobile' }, tokens: { web: ['y on web'], other: ['y on other'] } },
  ];
  const brands = groupByBrand(combos, 'web');
  assert.deepEqual([...brands.keys()], ['x', 'y']);
  assert.deepEqual(brands.get('x').get('light|mobile'), ['x on web']);
  assert.deepEqual(groupByBrand(combos, 'other').get('y').get('dark|mobile'), ['y on other']);
});

test('assertKnownAxesAndModes: accepts the known cascade, rejects a new mode or axis', () => {
  const combo = (theme, viewport) => ({ axes: { core: 'Value', brand: 'b', theme, viewport }, tokens: [] });
  const known = ['light', 'dark'].flatMap(theme => ['mobile', 'tablet', 'desktop'].map(viewport => combo(theme, viewport)));
  assert.doesNotThrow(() => assertKnownAxesAndModes(known));
  assert.throws(() => assertKnownAxesAndModes([...known, combo('high-contrast', 'mobile')]), /themes are dark, high-contrast, light/u);
  assert.throws(() => assertKnownAxesAndModes([...known, combo('light', 'wide')]), /viewports are/u);
  assert.throws(
    () => assertKnownAxesAndModes(known.map(entry => ({ ...entry, axes: { ...entry.axes, platform: 'web' } }))),
    /unknown axis: platform/u,
  );
});

test('docLines: folds the three-part description onto three lines', () => {
  const docs = new Map([['t', 'What it is.\n\nUsed in:\nButtons.\n\nDo not:\nUse it on text.']]);
  assert.deepEqual(docLines(docs, 't'), ['What it is.', 'Used in: Buttons.', 'Do not: Use it on text.']);
  assert.deepEqual(docLines(docs, 'missing'), []);
});

test('textStyleName: the Figma text style path is the mixin name', built('web'), () => {
  assert.equal(textStyleName('font.heading.md'), 'fv-font-heading-md');
  assert.equal(textStyleName('font.body.lg.default'), 'fv-font-body-lg-default');
  assert.equal(textStyleName('font.body.lg.strong'), 'fv-font-body-lg-strong');
  assert.equal(textStyleName('font.micro.caps'), 'fv-font-micro-caps');
  assert.equal(textStyleName('font.caption.default'), 'fv-font-caption-default');
});
