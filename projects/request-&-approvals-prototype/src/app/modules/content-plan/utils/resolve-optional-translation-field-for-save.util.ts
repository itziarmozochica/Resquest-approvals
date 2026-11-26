export type OptionalFieldSaveValue = string | undefined;

export function resolveOptionalTextFieldForSave(
  current: string | undefined | null,
  persisted: string | undefined | null,
  isPopulated: (value: string | undefined | null) => boolean,
): OptionalFieldSaveValue {
  if (isPopulated(current)) {
    return current ?? '';
  }
  if (isPopulated(persisted)) {
    return '';
  }
  return undefined;
}
