import { classifyVersion } from './classify-version';
import type { VersionComparison } from './version-check.model';

export function isNewerVersion(fetched: string, baseline: string): boolean {
  const comparison: VersionComparison = classifyVersion(fetched, baseline);
  if (comparison === 'major' || comparison === 'minor') {
    return true;
  }
  return comparison === 'patchOrNone' && classifyVersion(baseline, fetched) === 'behind';
}
