import type { VersionComparison } from './version-check.model';

const SEMVER_PATTERN = /^(?<major>\d+)\.(?<minor>\d+)\.(?<patch>\d+)$/u;

interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

function parse(version: string): ParsedVersion | null {
  const groups = SEMVER_PATTERN.exec(version)?.groups;
  if (groups === undefined) {
    return null;
  }
  return {
    major: Number(groups.major),
    minor: Number(groups.minor),
    patch: Number(groups.patch),
  };
}

/**
 * Classify a fetched version against the current baseline. Only the
 * highest-tier difference matters — a bump from `1.2.3` to `2.0.4` is
 * `major`, not `minor`, even though the minor digit also moved.
 *
 * A `behind` result — fetched strictly older than the baseline — is a
 * degenerate state (the deploy lane should mark rollbacks with
 * `autosync: false`). The caller treats it as a no-op so an open session
 * never downgrades itself.
 */
export function classifyVersion(fetched: string, baseline: string): VersionComparison {
  const parsedFetched = parse(fetched);
  const parsedBaseline = parse(baseline);
  if (parsedFetched === null || parsedBaseline === null) {
    return 'invalid';
  }
  if (parsedFetched.major > parsedBaseline.major) {
    return 'major';
  }
  if (parsedFetched.major < parsedBaseline.major) {
    return 'behind';
  }
  if (parsedFetched.minor > parsedBaseline.minor) {
    return 'minor';
  }
  if (parsedFetched.minor < parsedBaseline.minor) {
    return 'behind';
  }
  if (parsedFetched.patch < parsedBaseline.patch) {
    return 'behind';
  }
  return 'patchOrNone';
}
