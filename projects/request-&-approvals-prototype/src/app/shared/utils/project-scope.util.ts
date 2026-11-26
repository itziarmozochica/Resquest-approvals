/**
 * Whether an optional project/launch id points at a real project, and therefore whether the API path
 * carries the `/projects/{id}` segment. Callers pass `''` as well as `null` for "no project", so both
 * mean the same here.
 */
export function hasProjectScope(projectId: string | null): projectId is string {
  return projectId !== null && projectId.length > 0;
}
