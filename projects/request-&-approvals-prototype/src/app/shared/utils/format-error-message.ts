export const formatErrorMessage = (message: string | null | undefined): string =>
  message && !message.startsWith('errors.') && /^\d+$/.test(message) ? `errors.${message}` : (message ?? '');
