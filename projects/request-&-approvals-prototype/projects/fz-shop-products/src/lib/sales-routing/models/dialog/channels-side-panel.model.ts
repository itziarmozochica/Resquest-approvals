import type { RetailSetupType } from '../../../core/models/retail-setup-type.model';
import type { Channel } from '../sales-routing.model';

export interface ChannelsSidePanelData {
  channels: Channel[];
  cityName: string;
  placeName: string;
  planName: string;
  retailSetupType: RetailSetupType | null;
}
