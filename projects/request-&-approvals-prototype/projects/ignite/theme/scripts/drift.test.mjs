// The drift guard: the committed generated files are the contract, so this
// test renders the platforms tokens:build builds (its --platforms flag, read
// by selection.mjs) from tokens/** in memory and compares each with its
// dist/<platform>/: a two-way compare, so changed, stale and untracked files
// all fail (the holes a `git diff --exit-code` would leave). dist/ holds
// nothing else, and the code syntax the generator writes into tokens/** must
// be up to date for the same platforms. The committed web files are also
// checked for their shape: the text-style mixins compile to zero CSS and keep
// author order, and each brand file has its theme blocks and its own brand's
// descriptions. Runs through the turbo
// `test:ci → test:scripts` edge. Fix a failure by regenerating
// (`pnpm --filter ignite tokens:build`), never by editing output.
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import * as sass from 'sass';

import { codeSyntaxUpdates } from './code-syntax.mjs';
import { renderPlatforms } from './emit.mjs';
import { reachesCode } from './model/publishing.mjs';
import { docLines } from './platforms/shared/docs.mjs';
import { cssVar } from './platforms/shared/names.mjs';
import { resolveCombinations } from './resolve.mjs';
import { buildPlatforms } from './selection.mjs';
import { writeOutputs } from './write.mjs';

const themeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(themeDir, 'dist');
const webDir = path.join(distDir, 'web');

const platforms = buildPlatforms();
const built = platform => ({ skip: !platforms.includes(platform) && `${platform} is not in tokens:build --platforms` });
const resolved = await resolveCombinations({ platforms });
const rendered = renderPlatforms({ resolved, platforms });

function filesIn(root) {
  const out = new Map();
  if (!existsSync(root)) {
    return out;
  }
  for (const entry of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (entry.isFile()) {
      const abs = path.join(entry.parentPath, entry.name);
      out.set(path.relative(root, abs).split(path.sep).join('/'), readFileSync(abs, 'utf8'));
    }
  }
  return out;
}

for (const name of platforms) {
  test(`dist/${name} matches tokens/** + generator (no drift, no stale, no untracked)`, () => {
    const fresh = new Map(rendered.get(name).map(file => [file.destination, file.contents]));
    const committed = filesIn(path.join(distDir, name));
    const freshOnly = [...fresh.keys()].filter(file => !committed.has(file));
    const committedOnly = [...committed.keys()].filter(file => !fresh.has(file));
    assert.deepEqual(freshOnly, [], `generated but not committed (run tokens:build and git add): ${freshOnly}`);
    assert.deepEqual(committedOnly, [], `committed but no longer generated (stale — run tokens:build): ${committedOnly}`);
    for (const [key, content] of fresh) {
      assert.ok(committed.get(key) === content, `${name}/${key} drifted from tokens/** — run \`pnpm --filter ignite tokens:build\``);
    }
  });
}

test('dist/ holds only the platforms tokens:build builds', () => {
  const extra = readdirSync(distDir).filter(entry => !platforms.includes(entry));
  assert.deepEqual(extra, [], `not built by tokens:build (--platforms=${platforms}): delete dist/${extra}`);
});

test('every published token carries its up-to-date code syntax in tokens/**', () => {
  const stale = codeSyntaxUpdates({ resolved, platforms }).map(update => update.file);
  assert.deepEqual(stale, [], `stale code syntax (run \`pnpm --filter ignite tokens:build\`): ${stale}`);
});

test('writing replaces a platform folder, so a file no longer produced cannot linger', () => {
  const [name] = platforms;
  const temp = mkdtempSync(path.join(tmpdir(), 'fv-tokens-write-'));
  try {
    mkdirSync(path.join(temp, name), { recursive: true });
    writeFileSync(path.join(temp, name, 'removed-output.txt'), 'stale\n');
    writeOutputs(new Map([[name, rendered.get(name)]]), { distDir: temp });
    assert.equal(existsSync(path.join(temp, name, 'removed-output.txt')), false, 'a file no longer produced is gone');
    assert.deepEqual(
      [...filesIn(path.join(temp, name)).keys()].sort(),
      rendered
        .get(name)
        .map(file => file.destination)
        .sort(),
    );
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('committed _text-styles.scss compiles to zero CSS on its own', built('web'), () => {
  assert.equal(sass.compile(path.join(webDir, '_text-styles.scss')).css.trim(), '');
});

test('text-style mixins keep author order and work inside @media', built('web'), () => {
  const scss = [
    "@use 'text-styles' as text;",
    '.chip__label { @include text.fv-font-body-sm-default; }',
    '.chip__label--large { @include text.fv-font-body-lg-default; }',
    '@media (min-width: 768px) { .title { @include text.fv-font-heading-lg; } }',
  ].join('\n');
  const { css } = sass.compileString(scss, { loadPaths: [webDir] });
  assert.ok(css.indexOf('.chip__label {') < css.indexOf('.chip__label--large {'), 'the modifier must come after its base');
  assert.match(css, /@media \(min-width: 768px\) \{\s*\.title \{/u);
});

test('brand files expose dark, light and auto themes on any element', built('web'), () => {
  const brandDir = path.join(webDir, 'brands');
  for (const file of readdirSync(brandDir)) {
    const css = readFileSync(path.join(brandDir, file), 'utf8');
    assert.match(css, /^\[data-theme="dark"\] \{/mu, `${file}: dark block`);
    // auto shares the light block, so a nested auto node under a dark ancestor
    // restores light when the OS is light; the dark media block below wins otherwise.
    assert.match(css, /^\[data-theme="light"\],\n\[data-theme="auto"\] \{/mu, `${file}: light block, shared with auto`);
    assert.match(css, /@media \(prefers-color-scheme: dark\) \{\n {2}\[data-theme="auto"\] \{/u, `${file}: auto block`);
    assert.doesNotMatch(css, /:root\[data-theme|:root:not\(\[data-theme/u, `${file}: theme selectors must not require :root`);
  }
});

test('brand files document each token with their own brand description', built('web'), () => {
  const cssComment = text => `/* ${text.replace(/\*\//gu, '* /')} */`;
  const walk = (node, tokenPath, out) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (typeof node.$value !== 'undefined') {
      out.push([tokenPath.join('.'), node]);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (!key.startsWith('$')) {
        walk(value, [...tokenPath, key], out);
      }
    }
  };

  const documented = ([, node]) => reachesCode(node) && typeof node.$description === 'string';
  // Each top-level declaration's doc: the first line of the comment run right
  // above it (null when there is none).
  const docsAbove = lines => {
    const docs = new Map();
    let first = null;
    for (const line of lines) {
      if (line.trimStart().startsWith('/*')) {
        first ??= line;
      } else {
        const name = /^ {2}(?<name>--[\w-]+):/u.exec(line)?.groups.name;
        if (name && !docs.has(name)) {
          docs.set(name, first);
        }
        first = null;
      }
    }
    return docs;
  };

  const problems = [];
  for (const file of readdirSync(path.join(webDir, 'brands'))) {
    const brand = path.basename(file, '.css');
    const docs = docsAbove(readFileSync(path.join(webDir, 'brands', file), 'utf8').split('\n'));
    const tokens = [];
    walk(JSON.parse(readFileSync(path.join(themeDir, 'tokens', 'brand', `${brand}.json`), 'utf8')), [], tokens);
    for (const [tokenPath, node] of tokens.filter(documented)) {
      const name = cssVar(tokenPath);
      const [summary] = docLines(new Map([[tokenPath, node.$description]]), tokenPath);
      if (docs.has(name) && docs.get(name) !== `  ${cssComment(summary)}`) {
        problems.push(`${file}: ${tokenPath} is documented with another brand's or theme's text`);
      }
    }
  }
  assert.deepEqual(problems, []);
});
