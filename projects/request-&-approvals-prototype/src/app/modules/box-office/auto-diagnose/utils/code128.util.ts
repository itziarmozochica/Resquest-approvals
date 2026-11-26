import { Code128Bar, Code128Fnc3, Code128Symbol } from '../models/code128.model';

const PATTERNS: readonly string[] = [
  '212222',
  '222122',
  '222221',
  '121223',
  '121322',
  '131222',
  '122213',
  '122312',
  '132212',
  '221213',
  '221312',
  '231212',
  '112232',
  '122132',
  '122231',
  '113222',
  '123122',
  '123221',
  '223211',
  '221132',
  '221231',
  '213212',
  '223112',
  '312131',
  '311222',
  '321122',
  '321221',
  '312212',
  '322112',
  '322211',
  '212123',
  '212321',
  '232121',
  '111323',
  '131123',
  '131321',
  '112313',
  '132113',
  '132311',
  '211313',
  '231113',
  '231311',
  '112133',
  '112331',
  '132131',
  '113123',
  '113321',
  '133121',
  '313121',
  '211331',
  '231131',
  '213113',
  '213311',
  '213131',
  '311123',
  '311321',
  '331121',
  '312113',
  '312311',
  '332111',
  '314111',
  '221411',
  '431111',
  '111224',
  '111422',
  '121124',
  '121421',
  '141122',
  '141221',
  '112214',
  '112412',
  '122114',
  '122411',
  '142112',
  '142211',
  '241211',
  '221114',
  '413111',
  '241112',
  '134111',
  '111242',
  '121142',
  '121241',
  '114212',
  '124112',
  '124211',
  '411212',
  '421112',
  '421211',
  '212141',
  '214121',
  '412121',
  '111143',
  '111341',
  '131141',
  '114113',
  '114311',
  '411113',
  '411311',
  '113141',
  '114131',
  '311141',
  '411131',
  '211412',
  '211214',
  '211232',
  '2331112',
];

const START_B = 104;
const STOP = 106;
const FNC3_SET_B = 96;
const CHECKSUM_MODULO = 103;
const SET_B_OFFSET = 32;
const SET_B_FIRST_CHAR = 32;
const SET_B_LAST_CHAR = 127;

export const CODE128_QUIET_ZONE_MODULES = 10;

/**
 * Encodes printable ASCII in Code 128 set B. `fnc3` adds the FNC3 character scanners read as a menu (programming)
 * command instead of data: Zebra codes and the Honeywell suffix code lead with it, Honeywell's defaults code ends with it.
 */
export function encodeCode128(text: string, fnc3: Code128Fnc3 = Code128Fnc3.none): Code128Symbol {
  const dataValues: number[] = [...text].map(toSetBValue);
  const values: number[] = [
    START_B,
    ...(fnc3 === Code128Fnc3.leading ? [FNC3_SET_B] : []),
    ...dataValues,
    ...(fnc3 === Code128Fnc3.trailing ? [FNC3_SET_B] : []),
  ];
  const checksum: number =
    values.reduce((sum: number, value: number, index: number) => sum + value * Math.max(index, 1), 0) % CHECKSUM_MODULO;

  return toSymbol([...values, checksum, STOP]);
}

function toSetBValue(character: string): number {
  const code: number = character.charCodeAt(0);

  if (code < SET_B_FIRST_CHAR || code > SET_B_LAST_CHAR) {
    throw new RangeError(`Code 128 set B cannot encode character code ${code}`);
  }

  return code - SET_B_OFFSET;
}

function toSymbol(values: number[]): Code128Symbol {
  const bars: Code128Bar[] = [];
  let cursor = CODE128_QUIET_ZONE_MODULES;

  for (const value of values) {
    [...PATTERNS[value]].forEach((width: string, index: number) => {
      const modules = Number(width);

      if (index % 2 === 0) {
        bars.push({ width: modules, x: cursor });
      }
      cursor += modules;
    });
  }

  return { bars, totalModules: cursor + CODE128_QUIET_ZONE_MODULES };
}
