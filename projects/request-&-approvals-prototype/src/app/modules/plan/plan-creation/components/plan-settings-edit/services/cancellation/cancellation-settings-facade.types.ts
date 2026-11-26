export type CancellationSettingsSaveOutcome = 'cancellationFailed' | 'dedicatedFailed' | 'saved';

export interface CancellationSettingsTrackingData {
  mode: 'creation' | 'edit';
  planName: string;
}
