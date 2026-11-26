/**
 * Validates that a version string is in the format "major.minor.patch" with exactly 3 numeric parts.
 * @param version - Version string to validate
 * @returns Array of [major, minor, patch] numbers if valid, null otherwise
 */
function parseAndValidateSemanticVersion(version: string): [number, number, number] | null {
  if (typeof version !== 'string' || version.trim() === '') {
    return null;
  }

  const parts = version.trim().split('.');
  if (parts.length !== 3) {
    return null;
  }

  const parsedParts: number[] = [];
  for (const part of parts) {
    const num = Number(part);
    if (isNaN(num) || !Number.isInteger(num) || num < 0) {
      return null;
    }
    parsedParts.push(num);
  }

  return [parsedParts[0], parsedParts[1], parsedParts[2]];
}

/**
 * Parses and validates two semantic versions.
 * @param version - First version string
 * @param target - Second version string
 * @returns Tuple of parsed versions: [[major1, minor1, patch1], [major2, minor2, patch2]] or null if either is invalid
 */
function parseAndValidateSemanticVersions(version: string, target: string): [[number, number, number], [number, number, number]] | null {
  const parsedVersion = parseAndValidateSemanticVersion(version);
  const parsedTarget = parseAndValidateSemanticVersion(target);
  if (parsedVersion === null || parsedTarget === null) {
    return null;
  }
  return [parsedVersion, parsedTarget];
}

/**
 * Checks if a semantic version is greater than a target version.
 * @param version - Version to compare
 * @param target - Target version to compare against
 * @returns true if version > target, false otherwise (including when either version is invalid)
 */
export function isSemanticVersionGreaterThan(version: string, target: string): boolean {
  const parsed = parseAndValidateSemanticVersions(version, target);
  if (parsed === null) {
    return false;
  }
  const [v, t] = parsed;
  const [v1, v2, v3] = v;
  const [t1, t2, t3] = t;
  if (v1 !== t1) {
    return v1 > t1;
  }
  if (v2 !== t2) {
    return v2 > t2;
  }
  return v3 > t3;
}

/**
 * Checks if a semantic version is greater than or equal to a target version.
 * @param version - Version to compare
 * @param target - Target version to compare against
 * @returns true if version >= target, false otherwise (including when either version is invalid)
 */
export function isSemanticVersionGreaterOrEqual(version: string, target: string): boolean {
  const parsed = parseAndValidateSemanticVersions(version, target);
  if (parsed === null) {
    return false;
  }
  const [v, t] = parsed;
  const [v1, v2, v3] = v;
  const [t1, t2, t3] = t;
  if (v1 !== t1) {
    return v1 > t1;
  }
  if (v2 !== t2) {
    return v2 > t2;
  }
  return v3 >= t3;
}
