import type { OnsiteSetupSelection } from '@fz/ticketing';

export interface FztOnsiteSetupModalData {
  hasActiveShiftAndActiveOnsiteSetup: boolean;
  hasCloseButton: boolean;
  isMobileOrTablet: boolean;
  partnerId: string;
  userName: string | null;
  preselectedOnsiteSetupId?: string;
  preselectedVenueId?: string;
}

export type FztOnsiteSetupModalResult = OnsiteSetupSelection;

export interface FztRecentOnsiteSetupOption {
  id: string;
  name: string;
}
