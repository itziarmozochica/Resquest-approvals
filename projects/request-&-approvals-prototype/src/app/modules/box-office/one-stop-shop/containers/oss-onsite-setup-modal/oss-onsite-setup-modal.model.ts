import type { OSSOnsiteSetupConfig } from '../../models';

export interface OssOnsiteSetupModalData {
  hasActiveShiftAndActiveOnsiteSetup: boolean;
  hasCloseButton: boolean;
  preselectedOnsiteSetupId?: string;
  preselectedVenueId?: string;
}

export interface RecentOnsiteSetupOption {
  id: string;
  name: string;
}

export type OssOnsiteSetupModalResult = OSSOnsiteSetupConfig;
