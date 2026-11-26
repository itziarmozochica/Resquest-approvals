import { SliderItem } from '../../../../shared/components/sliders/ken-burns-slider/ken-burns-slider.component';
import { CAPN_ID, JR_EAST, REAL_MADRID_PARTNER_ID } from '../../../../shared/services/partner/partner.service';
import { OboSecondScreenPartnerState } from '../models/obo-second-screen-partner.state';

export interface StandbyCarouselPartnerConfig {
  readonly items: readonly SliderItem[];
  readonly bannerPartnerState: OboSecondScreenPartnerState;
}

const capnCarouselItems: readonly SliderItem[] = [
  {
    image:
      'https://applications-media.feverup.com/image/upload/f_auto,w_1120,h_432,c_fill,g_auto/fever2/plan/photo/d8461e44-6da3-11ee-af19-4643c7976a4d.jpg',
    alt: '',
  },
  {
    image:
      'https://applications-media.feverup.com/image/upload/f_auto,w_1120,h_432,c_fill,g_auto/fever2/plan/photo/d869d05a-6da3-11ee-af19-4643c7976a4d.jpg',
    alt: '',
  },
  {
    image:
      'https://applications-media.feverup.com/image/upload/f_auto,w_1120,h_432,c_fill,g_auto/fever2/plan/photo/d85744bc-6da3-11ee-af19-4643c7976a4d.jpg',
    alt: '',
  },
];

const jrEastCarouselItems: readonly SliderItem[] = [
  {
    image: 'https://montakanawa.jp/wp-content/themes/montakanawa2025/common/images/top/invitation-01.webp',
    alt: '',
  },
];

const realMadridCarouselItems: readonly SliderItem[] = [
  {
    image: 'https://b2b-partners-prod.s3.eu-west-1.amazonaws.com/images/second-screen/stand-by/real-madrid/real-madrid-01.jpg',
    alt: '',
  },
  {
    image: 'https://b2b-partners-prod.s3.eu-west-1.amazonaws.com/images/second-screen/stand-by/real-madrid/real-madrid-02.jpg',
    alt: '',
  },
  {
    image: 'https://b2b-partners-prod.s3.eu-west-1.amazonaws.com/images/second-screen/stand-by/real-madrid/real-madrid-03.jpg',
    alt: '',
  },
  {
    image: 'https://b2b-partners-prod.s3.eu-west-1.amazonaws.com/images/second-screen/stand-by/real-madrid/real-madrid-04.jpg',
    alt: '',
  },
];

export const standbyCarouselConfig: ReadonlyMap<number, StandbyCarouselPartnerConfig> = new Map([
  [CAPN_ID, { items: capnCarouselItems, bannerPartnerState: OboSecondScreenPartnerState.Capn }],
  [JR_EAST, { items: jrEastCarouselItems, bannerPartnerState: OboSecondScreenPartnerState.Other }],
  [REAL_MADRID_PARTNER_ID, { items: realMadridCarouselItems, bannerPartnerState: OboSecondScreenPartnerState.RealMadrid }],
]);
