/**
 * How a question restricts what customers may answer. `CUSTOM_PATTERN` is a
 * `validationRegex` on the question; `NO_RESTRICTION` is the absence of one.
 */
export enum AnswerFormat {
  CUSTOM_PATTERN = 'custom_pattern',
  NO_RESTRICTION = 'no_restriction',
}
