import { SliderItem } from '../../../../shared/components/sliders/ken-burns-slider/ken-burns-slider.component';
import { standbyCarouselConfig } from '../components/obo-second-screen-standby-carousel.config';
import { OboSecondScreenPartnerState } from '../models/obo-second-screen-partner.state';

/** Fever's own URL: the default banner link and QR, also for a configuration without a QR URL. */
export const FEVER_URL = 'feverup.com';
const CAPN_URL = 'patrimonionacional.es';
const REAL_MADRID_URL = 'realmadrid.com';
const REAL_MADRID_QR_URL = 'https://www.realmadrid.com/es-ES/tour-bernabeu/individual';

/** The URL the banner shows for a partner without a stored configuration. */
export function resolvePartnerUrl(partnerState: OboSecondScreenPartnerState): string {
  switch (partnerState) {
    case OboSecondScreenPartnerState.Capn:
      return CAPN_URL;
    case OboSecondScreenPartnerState.RealMadrid:
      return REAL_MADRID_URL;
    default:
      return FEVER_URL;
  }
}

/** The URL the banner's QR encodes for a partner without a stored configuration; Real Madrid points at the Tour Bernabéu page. */
export function resolvePartnerQrUrl(partnerState: OboSecondScreenPartnerState): string {
  return partnerState === OboSecondScreenPartnerState.RealMadrid ? REAL_MADRID_QR_URL : resolvePartnerUrl(partnerState);
}

/** The translation key of the standby title for a partner without a stored configuration. */
export function resolvePartnerStandbyTitleKey(partnerState: OboSecondScreenPartnerState): string {
  switch (partnerState) {
    case OboSecondScreenPartnerState.Capn:
      return 'oboSecondScreen.standBy.capn.title';
    case OboSecondScreenPartnerState.RealMadrid:
      return 'oboSecondScreen.standBy.realMadrid.title';
    default:
      return 'oboSecondScreen.standBy.other.title';
  }
}

/** The banner defaults of a partner: its hardcoded standby entry decides them, every other partner gets Fever's. */
export function resolvePartnerState(partnerId: number): OboSecondScreenPartnerState {
  return standbyCarouselConfig.get(partnerId)?.bannerPartnerState ?? OboSecondScreenPartnerState.Other;
}

/** The standby images a partner shows today without a configuration: its hardcoded entry, or none for the Fever mosaic. */
export function resolvePartnerStandbyItems(partnerId: number): SliderItem[] {
  return [...(standbyCarouselConfig.get(partnerId)?.items ?? [])];
}
