import { DiagnoseTileDetail } from '../models/auto-diagnose.model';

const UNKNOWN_KEY = 'boxOffice.autoDiagnose.unknown';
const YES_KEY = 'boxOffice.autoDiagnose.yes';
const NO_KEY = 'boxOffice.autoDiagnose.no';

export function toDeviceDetail(labelKey: string, value: string | undefined): DiagnoseTileDetail {
  return value ? { labelKey, value } : { labelKey, translateValue: true, value: UNKNOWN_KEY };
}

export function toDeviceFlagDetail(labelKey: string, value: boolean | undefined): DiagnoseTileDetail {
  if (value === undefined) {
    return { labelKey, translateValue: true, value: UNKNOWN_KEY };
  }

  return { labelKey, translateValue: true, value: value ? YES_KEY : NO_KEY };
}
