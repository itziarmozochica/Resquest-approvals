// Entry point: resolves tokens/** in memory, renders the selected platforms,
// writes their files into dist/<platform>/ (write.mjs), and brings each
// published token's Figma code syntax in tokens/** up to date for those
// platforms (code-syntax.mjs).
//
//   pnpm --filter ignite tokens:build   (the package script passes --platforms=web: web is the only platform built for now)
//
// --platforms=<a,b> picks the platforms (selection.mjs); with no flag, every
// platform. The tests follow the flag the package script passes.
import { writeCodeSyntax } from './code-syntax.mjs';
import { renderPlatforms } from './emit.mjs';
import { resolveCombinations } from './resolve.mjs';
import { selectPlatforms } from './selection.mjs';
import { writeOutputs } from './write.mjs';

const [, , ...args] = process.argv;
const platforms = selectPlatforms(args);

const resolved = await resolveCombinations({ platforms });
console.log(`Resolved ${resolved.length} combinations:`);
for (const combo of resolved) {
  console.log(`  ${combo.name}`);
}
console.log(`Wrote ${writeOutputs(renderPlatforms({ resolved, platforms })).join(', ')}`);

const updated = writeCodeSyntax({ resolved, platforms });
console.log(updated.length ? `Updated the code syntax in ${updated.join(', ')}` : 'Code syntax already up to date');
