import { PartnerSupportDataInterface } from '../../models/partner/partner-support-data.model';

export const supportConfig = new Map<string, PartnerSupportDataInterface>([
  [
    'PT',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 30),
      officeHoursEnd: new Date(0, 0, 0, 17, 30),
      guideLinkLanguage: 'pt',
      phone: '+351 300 600 262',
    },
  ],
  [
    'SG',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 30),
      officeHoursEnd: new Date(0, 0, 0, 17, 30),
      phone: '+65 3135 1063',
    },
  ],
  [
    'NZ',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 30),
      officeHoursEnd: new Date(0, 0, 0, 17, 30),
      phone: '+64 36 617 296',
    },
  ],
  [
    'AU',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 30),
      officeHoursEnd: new Date(0, 0, 0, 17, 30),
      phone: '+61 2 8806 0565',
    },
  ],
  [
    'UK',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 30),
      officeHoursEnd: new Date(0, 0, 0, 17, 30),
      phone: '+44 1647 407 040',
    },
  ],
  [
    'ES',
    {
      officeHoursBegin: new Date(0, 0, 0, 9, 30),
      officeHoursEnd: new Date(0, 0, 0, 18, 30),
      guideLinkLanguage: 'es',
      phone: '+34 910 783 400',
    },
  ],
  [
    'FR',
    {
      officeHoursBegin: new Date(0, 0, 0, 9, 30),
      officeHoursEnd: new Date(0, 0, 0, 18, 30),
      guideLinkLanguage: 'fr-fr',
      phone: '+33 (0)1 75 85 06 23',
    },
  ],
  [
    'US',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 0),
      officeHoursEnd: new Date(0, 0, 0, 20, 30),
      guideLinkLanguage: 'en-us',
      phone: '(667) 244-3490',
    },
  ],
  [
    'MX',
    {
      officeHoursBegin: new Date(0, 0, 0, 8, 0),
      officeHoursEnd: new Date(0, 0, 0, 20, 30),
      guideLinkLanguage: 'es',
      phone: '+52 55 9337 7273',
      whatsapp: '+52 55 9337 7249',
    },
  ],
  [
    'BE',
    {
      officeHoursBegin: new Date(0, 0, 0, 9, 30),
      officeHoursEnd: new Date(0, 0, 0, 18, 30),
      guideLinkLanguage: 'fr-fr',
      phone: '+33 (0)1 75 85 06 23',
    },
  ],
  [
    'BR',
    {
      officeHoursBegin: new Date(0, 0, 0, 10, 0),
      officeHoursEnd: new Date(0, 0, 0, 19, 0),
      guideLinkLanguage: 'pt',
      phone: '+55 15 2018 2027',
      whatsapp: '+55 15 2018 2026',
    },
  ],
]);
