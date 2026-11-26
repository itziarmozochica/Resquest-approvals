export const EDIT_ONSITE_SETUP_QUERY_PARAM = 'editOnsiteSetup';

export function parseEditOnsiteSetupParam(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  if (trimmedValue === '') {
    return null;
  }

  return trimmedValue;
}
