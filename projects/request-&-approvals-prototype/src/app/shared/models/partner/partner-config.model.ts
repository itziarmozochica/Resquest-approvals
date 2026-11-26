import { ConcessionTypeEnum } from '../../../modules/resellers/models/concession-type.enum';
import { PartnerBannerConfig } from './partner-banner-config.model';
import { PartnerFeaturesConfig } from './partner-features.config.model';
import { PartnerMetaConfig } from './partner-meta-config.model';
import { PartnerSupportData } from './partner-support-data.model';
import { PartnerUiConfig } from './partner-ui-config.model';
import { Partner } from './partner.model';

interface PartnerLoginConfig extends PartnerBannerConfig {
  showLogo?: boolean;
}

export interface PartnerCustomPaymentMethod {
  gateway: 'delegated';
  /** Font Awesome icon name. Omit when the method uses a dedicated image in the app (e.g. ANCV SVG). */
  icon?: string;
  label: string;
  method: string;
  enableStaffNotes?: boolean;
  enablePaymentDetails?: boolean;
  /** Also offers the method in the reservation "Mark as paid" list. Without it the method is box office only. */
  reservations?: boolean;
}

export interface PartnerPaymentConfig {
  customMethods?: PartnerCustomPaymentMethod[];
  enableStaffNotes?: boolean;
}

export interface PartnerConfig extends Partial<Partner> {
  availableConcessionTypes?: ConcessionTypeEnum[];
  features?: PartnerFeaturesConfig;
  login?: PartnerLoginConfig;
  meta?: PartnerMetaConfig;
  payments?: PartnerPaymentConfig;
  reservations?: PartnerBannerConfig;
  supportData?: PartnerSupportData;
  ui?: PartnerUiConfig;
}
