/**
 * Wire shape of `{baseUrl}/version.json` — the artifact emitted by
 * `scripts/deploy.mjs`. Fields kept identical to FeverZone's for tooling
 * familiarity.
 */
export interface VersionJson {
  autosync: boolean;
  hash: string;
  version: string;
}

/**
 * Result of classifying a fetched version against the stored baseline.
 *
 * - `major` — a differing MAJOR digit: cached bundle is incompatible, forced reload.
 * - `minor` — a differing MINOR digit: user-facing update prompt.
 * - `patchOrNone` — same version, or only a differing PATCH digit: silent no-op.
 * - `behind` — the fetched version is strictly older than the baseline. Not expected
 *   under a healthy deploy lane; a rollback should carry `autosync: false` instead.
 *   Treated as no-op so we never downgrade or nag an open session.
 * - `invalid` — either input is not a parseable X.Y.Z string. Treated as no-op.
 */
export type VersionComparison = 'major' | 'minor' | 'patchOrNone' | 'behind' | 'invalid';

/**
 * Structured-log event names emitted at every decision point of the version
 * check. Names are stable so dashboards and alerts can key off them.
 */
export type VersionCheckSignal =
  | 'version_check.fetch_failed'
  | 'version_check.forced_reload'
  | 'version_check.no_action'
  | 'version_check.prompt_accepted'
  | 'version_check.prompt_dismissed'
  | 'version_check.prompt_shown'
  | 'version_check.reload_skipped'
  | 'version_check.suppressed_autosync';
