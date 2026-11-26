/* eslint-disable no-restricted-imports */
import {
  faFacebookF as fabFacebookF,
  faFacebookMessenger as fabFacebookMessenger,
  faInstagram as fabInstagram,
  faWhatsapp as fabWhatsapp,
} from '@fortawesome/free-brands-svg-icons';

export const brandIcons = {
  'facebook-f': fabFacebookF,
  'facebook-messenger': fabFacebookMessenger,
  instagram: fabInstagram,
  whatsapp: fabWhatsapp,
} as const;

export type BrandIconName = keyof typeof brandIcons;
