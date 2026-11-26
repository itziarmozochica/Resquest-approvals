export const AGGREGATE_KPI_HORIZONTAL_LAYOUT_MIN_WIDTH_PX = 768;

const aggregateKpiHorizontalLayoutMediaQuery = (): MediaQueryList | null => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }

  return window.matchMedia(`(min-width: ${AGGREGATE_KPI_HORIZONTAL_LAYOUT_MIN_WIDTH_PX}px)`);
};

export const usesAggregateKpiHorizontalLayout = (): boolean => {
  const mediaQuery = aggregateKpiHorizontalLayoutMediaQuery();

  return mediaQuery?.matches ?? true;
};

export const subscribeToAggregateKpiLayoutChanges = (onChange: () => void): (() => void) => {
  const mediaQuery = aggregateKpiHorizontalLayoutMediaQuery();

  if (!mediaQuery) {
    return () => undefined;
  }

  mediaQuery.addEventListener('change', onChange);

  return () => mediaQuery.removeEventListener('change', onChange);
};
