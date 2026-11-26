// Which platforms a run covers: the user's --platforms choice. The build takes
// it from its own command line; the tests take it from the flag the
// tokens:build script passes, so they check exactly what the build generates
// — rendering, code syntax, committed output — and skip the rest. No selection
// means every platform.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { PLATFORMS } from './platforms/index.mjs';

const NAMES = PLATFORMS.map(platform => platform.name);

const packageJson = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');

// The platform names a command line selects; an unknown option or platform throws.
export function selectPlatforms(args) {
  const { values } = parseArgs({ args, options: { platforms: { type: 'string' } }, allowPositionals: true });
  const listed = (values.platforms ?? '')
    .split(',')
    .map(name => name.trim())
    .filter(Boolean);
  const selected = listed.length ? listed : NAMES;
  const unknown = selected.filter(name => !NAMES.includes(name));
  if (unknown.length) {
    throw new Error(`Unknown platform(s): ${unknown.join(', ')} — pick from ${NAMES.join(', ')}.`);
  }
  return selected;
}

// The platforms `pnpm --filter ignite tokens:build` builds, read from its script.
export function buildPlatforms() {
  const { scripts } = JSON.parse(readFileSync(packageJson, 'utf8'));
  const [, ...args] = scripts['tokens:build'].split(/\s+/u);
  return selectPlatforms(args);
}
