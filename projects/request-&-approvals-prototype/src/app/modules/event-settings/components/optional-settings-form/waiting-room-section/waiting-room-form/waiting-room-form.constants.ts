import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';

import { visibilityMode, waitingRoomI18n } from '../waiting-room-section.constants';
import type { WaitingRoomFormGroup } from '../waiting-room-section.types';

export const formI18n = {
  language: `${waitingRoomI18n}.language`,
  launchingDatetime: {
    dateLabel: `${waitingRoomI18n}.launchingDatetime.date`,
    helper: `${waitingRoomI18n}.launchingDatetimeHelper`,
    timeLabel: `${waitingRoomI18n}.launchingDatetime.time`,
    title: `${waitingRoomI18n}.launchingDatetimeLabel`,
  },
  languageHelper: `${waitingRoomI18n}.languageHelper`,
  maxOutflow: `${waitingRoomI18n}.maxOutflow.label`,
  maxOutflowHelper: `${waitingRoomI18n}.maxOutflow.helperText`,
  maxOutflowPlanMax: `${waitingRoomI18n}.maxOutflow.planMax`,
  maxOutflowPlanType: `${waitingRoomI18n}.maxOutflow.planType`,
  maxOutflowPlanTypePrefix: `${waitingRoomI18n}.maxOutflow`,
  maxOutflowInvalidValueError: `${waitingRoomI18n}.maxOutflow.errors.invalidValue`,
  maxOutflowMaxExceededError: `${waitingRoomI18n}.maxOutflow.errors.maxExceeded`,
  minutesInPreQueue: `${waitingRoomI18n}.minutesInPreQueue`,
  minutesInPreQueueHelper: `${waitingRoomI18n}.minutesInPreQueueHelper`,
  integerError: `${waitingRoomI18n}.integerError`,
  minutesInPreQueueIntegerError: `${waitingRoomI18n}.minutesInPreQueueIntegerError`,
  minutesInPreQueueMaxError: `${waitingRoomI18n}.minutesInPreQueueMaxError`,
  minutesInPreQueueMinError: `${waitingRoomI18n}.minutesInPreQueueMinError`,
  name: `${waitingRoomI18n}.name`,
  nameHelper: `${waitingRoomI18n}.nameHelper`,
  timezone: `${waitingRoomI18n}.timezone`,
  timezoneHelper: `${waitingRoomI18n}.timezoneHelper`,
  visibilityModeLabel: `${waitingRoomI18n}.visibilityModeLabel`,
  visibilityModeHelper: `${waitingRoomI18n}.visibilityModeHelper`,
  visibilityMode: {
    visibleAtPeak: `${waitingRoomI18n}.visibilityMode.visibleAtPeak`,
    alwaysVisible: `${waitingRoomI18n}.visibilityMode.alwaysVisible`,
  },
} as const;

export const languageOptions: SelectOption[] = [
  { id: 'ar-BH', title: 'Arabic (Bahrain)' },
  { id: 'ar-MA', title: 'Arabic (Morocco)' },
  { id: 'ar-QA', title: 'Arabic (Qatar)' },
  { id: 'ar-SA', title: 'Arabic (Saudi Arabia)' },
  { id: 'az-Latn-AZ', title: 'Azerbaijani (Latin, Azerbaijan)' },
  { id: 'bg-BG', title: 'Bulgarian (Bulgaria)' },
  { id: 'ca-ES', title: 'Catalan (Spain)' },
  { id: 'zh-HK', title: 'Chinese (Hong Kong)' },
  { id: 'zh-CN', title: 'Chinese (S)' },
  { id: 'zh-TW', title: 'Chinese (T)' },
  { id: 'hr-HR', title: 'Croatian (Croatia)' },
  { id: 'cs-CZ', title: 'Czech (Czech Republic)' },
  { id: 'da-DK', title: 'Danish (Denmark)' },
  { id: 'en-AU', title: 'English (Australia)' },
  { id: 'en-GB', title: 'English (United Kingdom)' },
  { id: 'en-US', title: 'English (United States)' },
  { id: 'et-EE', title: 'Estonian (Estonia)' },
  { id: 'fo-FO', title: 'Faroese (Faroe Islands)' },
  { id: 'fi-FI', title: 'Finnish (Finland)' },
  { id: 'fr-CA', title: 'French (Canada)' },
  { id: 'fr-FR', title: 'French (France)' },
  { id: 'gl-ES', title: 'Galician (Spain)' },
  { id: 'ka-GE', title: 'Georgian (Georgia)' },
  { id: 'de-DE', title: 'German (Germany)' },
  { id: 'el-GR', title: 'Greek (Greece)' },
  { id: 'he-IL', title: 'Hebrew (Israel)' },
  { id: 'hu-HU', title: 'Hungarian (Hungary)' },
  { id: 'is-IS', title: 'Icelandic (Iceland)' },
  { id: 'id-ID', title: 'Indonesian (Indonesia)' },
  { id: 'it-IT', title: 'Italian (Italy)' },
  { id: 'ja-JP', title: 'Japanese (Japan)' },
  { id: 'kk-KZ', title: 'Kazakh (Kazakhstan)' },
  { id: 'ko-KR', title: 'Korean (Korea)' },
  { id: 'lv-LV', title: 'Latvian (Latvia)' },
  { id: 'lt-LT', title: 'Lithuanian (Lithuania)' },
  { id: 'nb-NO', title: 'Norwegian (Bokmål) (Norway)' },
  { id: 'pl-PL', title: 'Polish (Poland)' },
  { id: 'pt-BR', title: 'Portuguese (Brazil)' },
  { id: 'pt-PT', title: 'Portuguese (Portugal)' },
  { id: 'ro-RO', title: 'Romanian (Romania)' },
  { id: 'ru-RU', title: 'Russian (Russia)' },
  { id: 'sr-Latn-RS', title: 'Serbian (Latin, Serbia)' },
  { id: 'sk-SK', title: 'Slovak (Slovakia)' },
  { id: 'sl-SI', title: 'Slovenian (Slovenia)' },
  { id: 'es-CL', title: 'Spanish (Chile)' },
  { id: 'es-MX', title: 'Spanish (Mexico)' },
  { id: 'es-ES', title: 'Spanish (Spain)' },
  { id: 'sv-SE', title: 'Swedish (Sweden)' },
  { id: 'gsw-FR', title: 'Swiss German (France)' },
  { id: 'th-TH', title: 'Thai (Thailand)' },
  { id: 'tr-TR', title: 'Turkish (Turkey)' },
  { id: 'uk-UA', title: 'Ukrainian (Ukraine)' },
  { id: 'vi-VN', title: 'Vietnamese (Viet Nam)' },
  { id: 'cy-GB', title: 'Welsh (United Kingdom)' },
];

export const waitingRoomFormField = {
  CHANNEL_ID: 'channelId',
  LAUNCHING_DATETIME: 'launchingDatetime',
  LANGUAGE: 'language',
  MAX_OUTFLOW: 'maxOutflow',
  MINUTES_IN_PRE_QUEUE: 'minutesInPreQueue',
  TIMEZONE: 'timezone',
  VISIBILITY_MODE: 'visibilityMode',
  WAITING_ROOM_NAME: 'waitingRoomName',
} as const;

export const waitingRoomInvalidSubmitControlKeys: readonly (keyof WaitingRoomFormGroup['controls'])[] = [
  'waitingRoomName',
  'launchingDatetime',
  'maxOutflow',
  'minutesInPreQueue',
  'timezone',
  'language',
  'visibilityMode',
];

export const visibilityModeOptions = [
  { id: visibilityMode.VISIBLE_AT_PEAK, titleKey: formI18n.visibilityMode.visibleAtPeak },
  { id: visibilityMode.ALWAYS_VISIBLE, titleKey: formI18n.visibilityMode.alwaysVisible },
] as const;

export const timezoneOptions: SelectOption[] = [
  {
    id: 'Dateline Standard Time',
    title: '(UTC-12:00) International Date Line West',
  },
  {
    id: 'UTC-11',
    title: '(UTC-11:00) Coordinated Universal Time-11',
  },
  {
    id: 'Aleutian Standard Time',
    title: '(UTC-10:00) Aleutian Islands',
  },
  {
    id: 'Hawaiian Standard Time',
    title: '(UTC-10:00) Hawaii',
  },
  {
    id: 'Marquesas Standard Time',
    title: '(UTC-09:30) Marquesas Islands',
  },
  {
    id: 'Alaskan Standard Time',
    title: '(UTC-09:00) Alaska',
  },
  {
    id: 'UTC-09',
    title: '(UTC-09:00) Coordinated Universal Time-09',
  },
  {
    id: 'Pacific Standard Time (Mexico)',
    title: '(UTC-08:00) Baja California',
  },
  {
    id: 'UTC-08',
    title: '(UTC-08:00) Coordinated Universal Time-08',
  },
  {
    id: 'Pacific Standard Time',
    title: '(UTC-08:00) Pacific Time (US & Canada)',
  },
  {
    id: 'US Mountain Standard Time',
    title: '(UTC-07:00) Arizona',
  },
  {
    id: 'Mountain Standard Time (Mexico)',
    title: '(UTC-07:00) Chihuahua, La Paz, Mazatlan',
  },
  {
    id: 'Mountain Standard Time',
    title: '(UTC-07:00) Mountain Time (US & Canada)',
  },
  {
    id: 'Central America Standard Time',
    title: '(UTC-06:00) Central America',
  },
  {
    id: 'Central Standard Time',
    title: '(UTC-06:00) Central Time (US & Canada)',
  },
  {
    id: 'Easter Island Standard Time',
    title: '(UTC-06:00) Easter Island',
  },
  {
    id: 'Central Standard Time (Mexico)',
    title: '(UTC-06:00) Guadalajara, Mexico City, Monterrey',
  },
  {
    id: 'Canada Central Standard Time',
    title: '(UTC-06:00) Saskatchewan',
  },
  {
    id: 'SA Pacific Standard Time',
    title: '(UTC-05:00) Bogota, Lima, Quito, Rio Branco',
  },
  {
    id: 'Eastern Standard Time (Mexico)',
    title: '(UTC-05:00) Chetumal',
  },
  {
    id: 'Eastern Standard Time',
    title: '(UTC-05:00) Eastern Time (US & Canada)',
  },
  {
    id: 'Haiti Standard Time',
    title: '(UTC-05:00) Haiti',
  },
  {
    id: 'Cuba Standard Time',
    title: '(UTC-05:00) Havana',
  },
  {
    id: 'US Eastern Standard Time',
    title: '(UTC-05:00) Indiana (East)',
  },
  {
    id: 'Turks And Caicos Standard Time',
    title: '(UTC-05:00) Turks and Caicos',
  },
  {
    id: 'Paraguay Standard Time',
    title: '(UTC-04:00) Asuncion',
  },
  {
    id: 'Atlantic Standard Time',
    title: '(UTC-04:00) Atlantic Time (Canada)',
  },
  {
    id: 'Venezuela Standard Time',
    title: '(UTC-04:00) Caracas',
  },
  {
    id: 'Central Brazilian Standard Time',
    title: '(UTC-04:00) Cuiaba',
  },
  {
    id: 'SA Western Standard Time',
    title: '(UTC-04:00) Georgetown, La Paz, Manaus, San Juan',
  },
  {
    id: 'Pacific SA Standard Time',
    title: '(UTC-04:00) Santiago',
  },
  {
    id: 'Newfoundland Standard Time',
    title: '(UTC-03:30) Newfoundland',
  },
  {
    id: 'Tocantins Standard Time',
    title: '(UTC-03:00) Araguaina',
  },
  {
    id: 'E. South America Standard Time',
    title: '(UTC-03:00) Brasilia',
  },
  {
    id: 'SA Eastern Standard Time',
    title: '(UTC-03:00) Cayenne, Fortaleza',
  },
  {
    id: 'Argentina Standard Time',
    title: '(UTC-03:00) City of Buenos Aires',
  },
  {
    id: 'Greenland Standard Time',
    title: '(UTC-03:00) Greenland',
  },
  {
    id: 'Montevideo Standard Time',
    title: '(UTC-03:00) Montevideo',
  },
  {
    id: 'Magallanes Standard Time',
    title: '(UTC-03:00) Punta Arenas',
  },
  {
    id: 'Saint Pierre Standard Time',
    title: '(UTC-03:00) Saint Pierre and Miquelon',
  },
  {
    id: 'Bahia Standard Time',
    title: '(UTC-03:00) Salvador',
  },
  {
    id: 'UTC-02',
    title: '(UTC-02:00) Coordinated Universal Time-02',
  },
  {
    id: 'Mid-Atlantic Standard Time',
    title: '(UTC-02:00) Mid-Atlantic - Old',
  },
  {
    id: 'Azores Standard Time',
    title: '(UTC-01:00) Azores',
  },
  {
    id: 'Cape Verde Standard Time',
    title: '(UTC-01:00) Cabo Verde Is.',
  },
  {
    id: 'UTC',
    title: '(UTC) Coordinated Universal Time',
  },
  {
    id: 'GMT Standard Time',
    title: '(UTC+00:00) Dublin, Edinburgh, Lisbon, London',
  },
  {
    id: 'Greenwich Standard Time',
    title: '(UTC+00:00) Monrovia, Reykjavik',
  },
  {
    id: 'Sao Tome Standard Time',
    title: '(UTC+00:00) Sao Tome',
  },
  {
    id: 'Morocco Standard Time',
    title: '(UTC+01:00) Casablanca',
  },
  {
    id: 'W. Europe Standard Time',
    title: '(UTC+01:00) Amsterdam, Berlin, Bern, Rome, Stockholm, Vienna',
  },
  {
    id: 'Central Europe Standard Time',
    title: '(UTC+01:00) Belgrade, Bratislava, Budapest, Ljubljana, Prague',
  },
  {
    id: 'Romance Standard Time',
    title: '(UTC+01:00) Brussels, Copenhagen, Madrid, Paris',
  },
  {
    id: 'Central European Standard Time',
    title: '(UTC+01:00) Sarajevo, Skopje, Warsaw, Zagreb',
  },
  {
    id: 'W. Central Africa Standard Time',
    title: '(UTC+01:00) West Central Africa',
  },
  {
    id: 'Jordan Standard Time',
    title: '(UTC+02:00) Amman',
  },
  {
    id: 'GTB Standard Time',
    title: '(UTC+02:00) Athens, Bucharest',
  },
  {
    id: 'Middle East Standard Time',
    title: '(UTC+02:00) Beirut',
  },
  {
    id: 'Egypt Standard Time',
    title: '(UTC+02:00) Cairo',
  },
  {
    id: 'E. Europe Standard Time',
    title: '(UTC+02:00) Chisinau',
  },
  {
    id: 'Syria Standard Time',
    title: '(UTC+02:00) Damascus',
  },
  {
    id: 'West Bank Standard Time',
    title: '(UTC+02:00) Gaza, Hebron',
  },
  {
    id: 'South Africa Standard Time',
    title: '(UTC+02:00) Harare, Pretoria',
  },
  {
    id: 'FLE Standard Time',
    title: '(UTC+02:00) Helsinki, Kyiv, Riga, Sofia, Tallinn, Vilnius',
  },
  {
    id: 'Israel Standard Time',
    title: '(UTC+02:00) Jerusalem',
  },
  {
    id: 'Kaliningrad Standard Time',
    title: '(UTC+02:00) Kaliningrad',
  },
  {
    id: 'Sudan Standard Time',
    title: '(UTC+02:00) Khartoum',
  },
  {
    id: 'Libya Standard Time',
    title: '(UTC+02:00) Tripoli',
  },
  {
    id: 'Namibia Standard Time',
    title: '(UTC+02:00) Windhoek',
  },
  {
    id: 'Arabic Standard Time',
    title: '(UTC+03:00) Baghdad',
  },
  {
    id: 'Turkey Standard Time',
    title: '(UTC+03:00) Istanbul',
  },
  {
    id: 'Arab Standard Time',
    title: '(UTC+03:00) Kuwait, Riyadh',
  },
  {
    id: 'Belarus Standard Time',
    title: '(UTC+03:00) Minsk',
  },
  {
    id: 'Russian Standard Time',
    title: '(UTC+03:00) Moscow, St. Petersburg',
  },
  {
    id: 'E. Africa Standard Time',
    title: '(UTC+03:00) Nairobi',
  },
  {
    id: 'Iran Standard Time',
    title: '(UTC+03:30) Tehran',
  },
  {
    id: 'Arabian Standard Time',
    title: '(UTC+04:00) Abu Dhabi, Muscat',
  },
  {
    id: 'Astrakhan Standard Time',
    title: '(UTC+04:00) Astrakhan, Ulyanovsk',
  },
  {
    id: 'Azerbaijan Standard Time',
    title: '(UTC+04:00) Baku',
  },
  {
    id: 'Russia Time Zone 3',
    title: '(UTC+04:00) Izhevsk, Samara',
  },
  {
    id: 'Mauritius Standard Time',
    title: '(UTC+04:00) Port Louis',
  },
  {
    id: 'Saratov Standard Time',
    title: '(UTC+04:00) Saratov',
  },
  {
    id: 'Georgian Standard Time',
    title: '(UTC+04:00) Tbilisi',
  },
  {
    id: 'Volgograd Standard Time',
    title: '(UTC+04:00) Volgograd',
  },
  {
    id: 'Caucasus Standard Time',
    title: '(UTC+04:00) Yerevan',
  },
  {
    id: 'Afghanistan Standard Time',
    title: '(UTC+04:30) Kabul',
  },
  {
    id: 'West Asia Standard Time',
    title: '(UTC+05:00) Ashgabat, Tashkent',
  },
  {
    id: 'Ekaterinburg Standard Time',
    title: '(UTC+05:00) Ekaterinburg',
  },
  {
    id: 'Pakistan Standard Time',
    title: '(UTC+05:00) Islamabad, Karachi',
  },
  {
    id: 'Qyzylorda Standard Time',
    title: '(UTC+05:00) Qyzylorda',
  },
  {
    id: 'India Standard Time',
    title: '(UTC+05:30) Chennai, Kolkata, Mumbai, New Delhi',
  },
  {
    id: 'Sri Lanka Standard Time',
    title: '(UTC+05:30) Sri Jayawardenepura',
  },
  {
    id: 'Nepal Standard Time',
    title: '(UTC+05:45) Kathmandu',
  },
  {
    id: 'Central Asia Standard Time',
    title: '(UTC+06:00) Astana',
  },
  {
    id: 'Bangladesh Standard Time',
    title: '(UTC+06:00) Dhaka',
  },
  {
    id: 'Omsk Standard Time',
    title: '(UTC+06:00) Omsk',
  },
  {
    id: 'Myanmar Standard Time',
    title: '(UTC+06:30) Yangon (Rangoon)',
  },
  {
    id: 'SE Asia Standard Time',
    title: '(UTC+07:00) Bangkok, Hanoi, Jakarta',
  },
  {
    id: 'Altai Standard Time',
    title: '(UTC+07:00) Barnaul, Gorno-Altaysk',
  },
  {
    id: 'W. Mongolia Standard Time',
    title: '(UTC+07:00) Hovd',
  },
  {
    id: 'North Asia Standard Time',
    title: '(UTC+07:00) Krasnoyarsk',
  },
  {
    id: 'N. Central Asia Standard Time',
    title: '(UTC+07:00) Novosibirsk',
  },
  {
    id: 'Tomsk Standard Time',
    title: '(UTC+07:00) Tomsk',
  },
  {
    id: 'China Standard Time',
    title: '(UTC+08:00) Beijing, Chongqing, Hong Kong, Urumqi',
  },
  {
    id: 'North Asia East Standard Time',
    title: '(UTC+08:00) Irkutsk',
  },
  {
    id: 'Singapore Standard Time',
    title: '(UTC+08:00) Kuala Lumpur, Singapore',
  },
  {
    id: 'W. Australia Standard Time',
    title: '(UTC+08:00) Perth',
  },
  {
    id: 'Taipei Standard Time',
    title: '(UTC+08:00) Taipei',
  },
  {
    id: 'Ulaanbaatar Standard Time',
    title: '(UTC+08:00) Ulaanbaatar',
  },
  {
    id: 'Aus Central W. Standard Time',
    title: '(UTC+08:45) Eucla',
  },
  {
    id: 'Transbaikal Standard Time',
    title: '(UTC+09:00) Chita',
  },
  {
    id: 'Tokyo Standard Time',
    title: '(UTC+09:00) Osaka, Sapporo, Tokyo',
  },
  {
    id: 'North Korea Standard Time',
    title: '(UTC+09:00) Pyongyang',
  },
  {
    id: 'Korea Standard Time',
    title: '(UTC+09:00) Seoul',
  },
  {
    id: 'Yakutsk Standard Time',
    title: '(UTC+09:00) Yakutsk',
  },
  {
    id: 'Cen. Australia Standard Time',
    title: '(UTC+09:30) Adelaide',
  },
  {
    id: 'AUS Central Standard Time',
    title: '(UTC+09:30) Darwin',
  },
  {
    id: 'E. Australia Standard Time',
    title: '(UTC+10:00) Brisbane',
  },
  {
    id: 'AUS Eastern Standard Time',
    title: '(UTC+10:00) Canberra, Melbourne, Sydney',
  },
  {
    id: 'West Pacific Standard Time',
    title: '(UTC+10:00) Guam, Port Moresby',
  },
  {
    id: 'Tasmania Standard Time',
    title: '(UTC+10:00) Hobart',
  },
  {
    id: 'Vladivostok Standard Time',
    title: '(UTC+10:00) Vladivostok',
  },
  {
    id: 'Lord Howe Standard Time',
    title: '(UTC+10:30) Lord Howe Island',
  },
  {
    id: 'Bougainville Standard Time',
    title: '(UTC+11:00) Bougainville Island',
  },
  {
    id: 'Russia Time Zone 10',
    title: '(UTC+11:00) Chokurdakh',
  },
  {
    id: 'Magadan Standard Time',
    title: '(UTC+11:00) Magadan',
  },
  {
    id: 'Norfolk Standard Time',
    title: '(UTC+11:00) Norfolk Island',
  },
  {
    id: 'Sakhalin Standard Time',
    title: '(UTC+11:00) Sakhalin',
  },
  {
    id: 'Central Pacific Standard Time',
    title: '(UTC+11:00) Solomon Is., New Caledonia',
  },
  {
    id: 'Russia Time Zone 11',
    title: '(UTC+12:00) Anadyr, Petropavlovsk-Kamchatsky',
  },
  {
    id: 'New Zealand Standard Time',
    title: '(UTC+12:00) Auckland, Wellington',
  },
  {
    id: 'UTC+12',
    title: '(UTC+12:00) Coordinated Universal Time+12',
  },
  {
    id: 'Fiji Standard Time',
    title: '(UTC+12:00) Fiji',
  },
  {
    id: 'Kamchatka Standard Time',
    title: '(UTC+12:00) Petropavlovsk-Kamchatsky - Old',
  },
  {
    id: 'Chatham Islands Standard Time',
    title: '(UTC+12:45) Chatham Islands',
  },
  {
    id: 'UTC+13',
    title: '(UTC+13:00) Coordinated Universal Time+13',
  },
  {
    id: 'Tonga Standard Time',
    title: "(UTC+13:00) Nuku'alofa",
  },
  {
    id: 'Samoa Standard Time',
    title: '(UTC+13:00) Samoa',
  },
  {
    id: 'Line Islands Standard Time',
    title: '(UTC+14:00) Kiritimati Island',
  },
];
