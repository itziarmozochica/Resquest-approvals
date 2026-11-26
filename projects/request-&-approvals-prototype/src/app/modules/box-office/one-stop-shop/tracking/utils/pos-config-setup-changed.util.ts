import type { OSSConfig } from '../../models';

export function getPreviousSetupIdFromConfig(config: OSSConfig | null | undefined): string | null {
  const currentSetupId = config?.onsiteSetup?.id;

  if (currentSetupId == null || currentSetupId === '') {
    return null;
  }

  return String(currentSetupId);
}

export function getFromSetupIdForTracking(
  modalPreviousSetupId: string | number | null | undefined,
  config: OSSConfig | null | undefined,
): string | null {
  if (modalPreviousSetupId != null && String(modalPreviousSetupId) !== '') {
    return String(modalPreviousSetupId);
  }

  return getPreviousSetupIdFromConfig(config);
}
