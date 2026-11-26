// The post-process step: every rendered platform's files land in
// dist/<platform>/, a folder that platform owns, wiped and rewritten so a file
// it no longer produces cannot linger. Nothing here knows who consumes the
// files: ignite's src/foundations forwards the web text styles, and an app
// links a web brand file as its own stylesheet.
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const themeDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Writes renderPlatforms()'s files; returns one "platform → folder" line per platform.
export function writeOutputs(rendered, { distDir = path.join(themeDir, 'dist') } = {}) {
  const written = [];
  for (const [name, files] of rendered) {
    const dir = path.join(distDir, name);
    rmSync(dir, { recursive: true, force: true });
    for (const file of files) {
      const dest = path.join(dir, file.destination);
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, file.contents, 'utf8');
    }
    written.push(`${name} → ${path.relative(themeDir, dir)}`);
  }
  return written;
}
