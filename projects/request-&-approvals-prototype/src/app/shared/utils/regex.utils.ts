import { StringUtil } from './string/string.util';

export const escapeRegExp = (input: string): string => {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

export const testMatchFilter = (filter: string, testedString: string): boolean => {
  const normalizedTestedString = StringUtil.normalizeString(testedString);
  const normalizedFilter = StringUtil.normalizeString(filter);
  return new RegExp(`^(?:.*)(${escapeRegExp(normalizedFilter)})(?:.*)$`, 'gi').test(normalizedTestedString);
};
