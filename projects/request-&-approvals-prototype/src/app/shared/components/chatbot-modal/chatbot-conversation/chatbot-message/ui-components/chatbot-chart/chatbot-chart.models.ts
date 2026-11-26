export interface StackedBarApiSeries {
  data?: (number | null)[];
  name?: string;
  stack?: string;
}

export interface StackedBarApiXAxis {
  boundaryGap?: boolean;
  data?: string[];
  name?: string;
  type?: string;
}

export interface StackedBarApiLegend {
  selectedMode?: boolean | 'single' | 'multiple';
  show?: boolean;
  top?: 'bottom' | 'top';
}
