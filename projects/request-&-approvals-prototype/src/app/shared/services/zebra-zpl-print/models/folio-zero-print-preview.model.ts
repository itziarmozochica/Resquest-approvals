import { SessionTypeCatalogItem } from '@fz-original/app/shared/services/sessions/session-type-catalog.model';

export interface FolioZeroPrintPreview {
  currency: string;
  isoCountryCode: string;
  placeAddress: string;
  placeId: number;
  placeName: string;
  planId: number;
  planName: string;
  printDateTime: string;
  selectedSessionTypes: SessionTypeCatalogItem[];
  timezone: string;
}

export type FolioZeroPrintOptions = {
  onBeforeErrorDialog?: () => void;
};
