// Writes the code syntax of each token that reaches code — the name Figma's Dev Mode shows
// for a variable, one per platform — into the token's own entry in tokens/**,
// as $extensions['com.figma.codeSyntax']. Tokens Studio reads that key when it
// exports and sets it on the Figma variable, so a rename in code reaches the
// designer's inspector on the next sync instead of drifting.
//
// Each platform's colors and dimensions categories own the strings, and Figma
// has exactly three slots (WEB, ANDROID, iOS); only the selected platforms
// (--platforms, selection.mjs) fill theirs. The composites have none: they
// become Figma styles, and a style has no code syntax. The generator owns the
// key — it adds, updates and removes it — so it is never edited by hand.
//
// Files are edited in place, so the only bytes that change are the
// code-syntax entries: key order (including number-like keys such as "050",
// which a plain JSON.parse would move after "900") and the trailing newline
// stay exactly as Tokens Studio wrote them.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { viewportScopedPaths } from './model/cascade.mjs';
import { categoryFor } from './model/kinds.mjs';
import { reachesCode } from './model/publishing.mjs';
import { PLATFORMS } from './platforms/index.mjs';

export const CODE_SYNTAX = 'com.figma.codeSyntax';

const FIGMA_SLOT = { web: 'WEB', android: 'ANDROID', ios: 'iOS' };

const KEPT = '\uE000';
const NUMBER_KEY = /(?<!\\)"(?<digits>\d+)"(?<space>\s*):/gu;
const KEPT_KEY = new RegExp(`"${KEPT}(?<digits>\\d+)":`, 'gu');
const JSON_INDENT = 2;

const defaultTokensDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'tokens');

function codeSyntaxOf(token, ctx) {
  const entry = {};
  for (const platform of PLATFORMS.filter(candidate => ctx.platforms.includes(candidate.name))) {
    const slot = FIGMA_SLOT[platform.name];
    const syntax = slot && categoryFor(platform.categories, token).codeSyntax?.(token, ctx);
    if (syntax) {
      entry[slot] = syntax;
    }
  }
  return Object.keys(entry).length ? entry : undefined;
}

// One token file's text with every code-syntax entry brought up to date. ctx
// carries the selected platforms, each path's resolved type (the DTCG one the
// emitters classify, not the Tokens Studio one in the file) and what a
// platform's codeSyntax needs (viewportScoped, for Swift).
export function withCodeSyntax(raw, ctx) {
  const tree = JSON.parse(raw.replace(NUMBER_KEY, `"${KEPT}$<digits>"$<space>:`));
  const visit = (node, tokenPath) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (typeof node.$value === 'undefined') {
      for (const [key, value] of Object.entries(node)) {
        if (!key.startsWith('$')) {
          visit(value, [...tokenPath, key.replace(KEPT, '')]);
        }
      }
      return;
    }
    const id = tokenPath.join('.');
    const expected = reachesCode(node) ? codeSyntaxOf({ path: id, type: ctx.types.get(id) }, ctx) : undefined;
    if (expected) {
      node.$extensions[CODE_SYNTAX] = expected;
    } else if (node.$extensions) {
      delete node.$extensions[CODE_SYNTAX];
    }
  };
  visit(tree, []);
  const text = JSON.stringify(tree, null, JSON_INDENT).replace(KEPT_KEY, '"$<digits>":');
  return raw.endsWith('\n') ? `${text}\n` : text;
}

// The token files whose code syntax is missing or stale, with their updated text.
export function codeSyntaxUpdates({ resolved, platforms, tokensDir = defaultTokensDir }) {
  // A token's type is the same on every platform, so any resolved one will do.
  const types = new Map(
    resolved.flatMap(combo => {
      const [tokens] = Object.values(combo.tokens);
      return tokens.map(token => [token.path, token.type]);
    }),
  );
  const ctx = { platforms, viewportScoped: viewportScopedPaths(resolved), types };
  return readdirSync(tokensDir, { recursive: true })
    .filter(file => file.endsWith('.json') && !path.basename(file).startsWith('$'))
    .sort()
    .flatMap(file => {
      const raw = readFileSync(path.join(tokensDir, file), 'utf8');
      const contents = withCodeSyntax(raw, ctx);
      return contents === raw ? [] : [{ file, contents }];
    });
}

export function writeCodeSyntax({ resolved, platforms, tokensDir = defaultTokensDir }) {
  const updates = codeSyntaxUpdates({ resolved, platforms, tokensDir });
  for (const { file, contents } of updates) {
    writeFileSync(path.join(tokensDir, file), contents, 'utf8');
  }
  return updates.map(update => update.file);
}
