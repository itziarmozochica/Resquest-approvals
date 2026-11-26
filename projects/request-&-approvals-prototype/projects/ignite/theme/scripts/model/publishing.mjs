// The one definition of "published": a token is in the Figma library only when
// its com.figma.hiddenFromPublishing flag is exactly false. Every token must
// declare the flag — checks.test.mjs fails one that doesn't — so a token can
// never pass the publishing check while silently missing from the generated
// output, or the other way round.
export const PUBLISHING_FLAG = 'com.figma.hiddenFromPublishing';
export const SCOPES = 'com.figma.scopes';

export const declaresPublishing = node => typeof node.$extensions?.[PUBLISHING_FLAG] === 'boolean';

export const isPublished = node => node.$extensions?.[PUBLISHING_FLAG] === false;

// A published colour with an empty scope list is a core or brand palette step:
// it is in the library only so another file can alias it, offered by no
// picker. checks.test.mjs keeps that set exact.
export const isAliasOnly = node =>
  isPublished(node) && node.$type === 'color' && Array.isArray(node.$extensions?.[SCOPES]) && !node.$extensions[SCOPES].length;

// What the generated outputs and the code syntax cover.
export const reachesCode = node => isPublished(node) && !isAliasOnly(node);
