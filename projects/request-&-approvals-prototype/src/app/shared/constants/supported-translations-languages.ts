/**
 * Supported languages for internationalization
 * This is the single source of truth for all supported languages in the application
 */
export const SUPPORTED_LANGUAGES: Readonly<string[]> = [
  'en', // English
  'ar', // Arabic (RTL)
  'ca', // Catalan
  'de', // German
  'es', // Spanish
  'fr', // French
  'he', // Hebrew (RTL)
  'id', // Indonesian
  'it', // Italian
  'ja', // Japanese
  'ko', // Korean
  'nl', // Dutch
  'pt', // Portuguese
  'pt-BR', // Portuguese (Brazil)
  'sv', // Swedish
  'zh', // Chinese
] as const;
