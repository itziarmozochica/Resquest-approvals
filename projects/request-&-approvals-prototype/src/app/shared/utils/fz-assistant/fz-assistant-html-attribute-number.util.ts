/**
 * HTML's own readings of a numeric attribute value, for every side that has to agree with the browser
 * about what a control declares.
 *
 * The two readings here are deliberately *not* the same algorithm, because HTML does not use one:
 * `min`, `max` and `step` are held to the strict `valid floating-point number` grammar, while
 * `maxlength` and `minlength` go through the lenient *rules for parsing non-negative integers*, which
 * stop at the first character they cannot use. `maxlength="5px"` is a limit of 5; `min="5px"` is no
 * bound at all. Each function below carries the engine evidence for its own half.
 *
 * Verified against Chromium 141, Firefox 142 and WebKit 26 rather than read off the spec, because
 * jsdom - the engine the unit suites run in - parses *both* attributes leniently, so `min="+5"` is a
 * bound of 5 there and a bound in no real browser. Pin a spec to the reading, not to `validity`, for
 * any attribute value that is not canonically formatted.
 */

// `-?(\d+\.?|\d*\.\d+)([eE][+-]?\d+)?`: HTML's `valid floating-point number`, plus the trailing dot -
// see `parseFzAssistantHtmlNumber` for why that one form is allowed in.
const HTML_FLOATING_POINT_NUMBER = /^-?(?:\d+\.?|\d*\.\d+)(?:[eE][+-]?\d+)?$/;

/**
 * The number HTML reads out of `min`, `max`, `step` or the `value` step base, or `undefined` where it
 * reads none.
 *
 * These four are the strict half: no leading `+`, no surrounding whitespace, no trailing anything.
 * Every engine ignores `+5`, `5px`, `0x10`, `1,5`, `1_000`, `" 5"` and `"5 "` outright, and applies
 * `.5`, `05`, `-0`, `5.0` and `1e1`. `Number()` used to stand in for this and disagreed on exactly the
 * forms that matter: it read `+5` and `" 5"` as 5 and `0x10` as 16, so Discover published bounds and
 * grids no browser enforces, and the agent self-limited - or picked from a grid - against nothing.
 *
 * The one form engines disagree about is a trailing dot: Chromium ignores `min="5."` (the grammar says
 * to), Firefox and WebKit apply it. It is accepted here, so the reading covers whatever the running
 * engine enforces. That direction is chosen deliberately: `satisfiesFzAssistantNumericConstraints`
 * asks `validity`, so a bound we failed to publish becomes a refusal the agent was never told about,
 * while one we publish where the engine enforces nothing only over-constrains it. It is the same trade
 * `readPattern` makes in `fz-assistant-text-constraints.util.ts` by compiling under either regex flag.
 */
export function parseFzAssistantHtmlNumber(declared: string): number | undefined {
  if (!HTML_FLOATING_POINT_NUMBER.test(declared)) {
    return undefined;
  }

  // `1e400` is a number by the grammar and a bound by no engine, all three reading it as absent.
  const parsed = Number(declared);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * The length HTML reads out of `maxlength` or `minlength`, or `undefined` where it reads none.
 *
 * This is the lenient half, and the leniency is not cosmetic: all three engines read `maxlength="5px"`
 * and `" 5"` and `"5 "` as 5, `"2.5"` as 2, `"+8"` as 8, `"1e3"` and `"1_000"` as 1, and `"0x10"` as 0.
 * A negative length is an error rather than a bound, and so is anything with no digits to collect.
 *
 * Base 10 is passed explicitly, because HTML's integer rules know no other base: left to guess,
 * `Number.parseInt` reads `0x10` as 16 where every engine stops at the `x` and reads 0. jsdom's own
 * reflected `maxLength` has that bug, so it is the one case a spec must not pin against jsdom.
 */
export function parseFzAssistantHtmlNonNegativeInteger(declared: string): number | undefined {
  if (hasNonAsciiWhitespacePrefix(declared) || hasSignPrefix(declared)) {
    return undefined;
  }

  const parsed = Number.parseInt(declared, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : undefined;
}

/**
 * HTML's integer rules treat a leading `-` as an error, so a negative length is no length at all - and
 * `>= 0` alone does not say that: `Number.parseInt('-0')` is `-0`, which passes the comparison and
 * published a limit of zero, telling the agent a field takes no characters where no engine enforces
 * anything. `-0px` reads the same way. Refused here rather than compared for, because the rules refuse
 * the sign before they collect a digit.
 *
 * A leading `+` is not a sign to these rules - every engine reads `maxlength="+8"` as 8 - so only `-`
 * is named. That is the opposite of `parseFzAssistantHtmlNumber`, whose strict grammar rejects `+5`.
 */
function hasSignPrefix(declared: string): boolean {
  return declared.trimStart().startsWith('-');
}

/**
 * `Number.parseInt` skips Unicode whitespace as well as the ASCII kind, while HTML skips only ASCII
 * whitespace and then stops at the first character it cannot use. Without this the non-breaking space
 * in `maxlength="\u00a05"` would read as the limit of 5 that every engine ignores.
 */
function hasNonAsciiWhitespacePrefix(declared: string): boolean {
  const skipped = declared.length - declared.trimStart().length;
  return /[^\t\n\f\r ]/.test(declared.slice(0, skipped));
}
