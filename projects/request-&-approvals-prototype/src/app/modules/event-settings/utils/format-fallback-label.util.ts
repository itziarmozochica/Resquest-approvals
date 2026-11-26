export const formatFallbackLabel = (apiValue: string): string => {
  return apiValue
    .split(/[-_]/)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
