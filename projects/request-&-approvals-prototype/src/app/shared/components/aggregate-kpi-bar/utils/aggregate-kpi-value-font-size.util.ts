export const AGGREGATE_KPI_VALUE_MAX_FONT_SIZE_PX = 32;
export const AGGREGATE_KPI_VALUE_MIN_FONT_SIZE_PX = 11;
export const AGGREGATE_KPI_VALUE_LINE_HEIGHT_RATIO = 1.25;

export const AGGREGATE_KPI_LABEL_MAX_FONT_SIZE_PX = 14;
export const AGGREGATE_KPI_LABEL_MIN_FONT_SIZE_PX = 11;
export const AGGREGATE_KPI_LABEL_FONT_SIZE_OFFSET_PX = 1;
export const AGGREGATE_KPI_LABEL_LINE_HEIGHT_RATIO = 16 / 14;

export function applyAggregateKpiValueFontSize(
  element: HTMLElement,
  fontSizePx: number,
  lineHeightRatio = AGGREGATE_KPI_VALUE_LINE_HEIGHT_RATIO,
): void {
  element.style.fontSize = `${fontSizePx}px`;
  element.style.lineHeight = `${Math.round(fontSizePx * lineHeightRatio)}px`;
}

export function applyAggregateKpiLabelFontSize(
  element: HTMLElement,
  fontSizePx: number,
  lineHeightRatio = AGGREGATE_KPI_LABEL_LINE_HEIGHT_RATIO,
): void {
  element.style.fontSize = `${fontSizePx}px`;
  element.style.lineHeight = `${Math.round(fontSizePx * lineHeightRatio)}px`;
}

export function clearAggregateKpiValueFontSize(element: HTMLElement): void {
  element.style.fontSize = '';
  element.style.lineHeight = '';
}

export function clearAggregateKpiLabelFontSize(element: HTMLElement): void {
  element.style.fontSize = '';
  element.style.lineHeight = '';
}

export function computeAggregateKpiLabelFontSize(
  valueFontSizePx: number,
  offsetPx = AGGREGATE_KPI_LABEL_FONT_SIZE_OFFSET_PX,
  minFontSizePx = AGGREGATE_KPI_LABEL_MIN_FONT_SIZE_PX,
  maxFontSizePx = AGGREGATE_KPI_LABEL_MAX_FONT_SIZE_PX,
): number {
  const scaledLabel = Math.round((valueFontSizePx / AGGREGATE_KPI_VALUE_MAX_FONT_SIZE_PX) * maxFontSizePx);
  const oneStepBelow = valueFontSizePx - offsetPx;
  const labelSize = Math.max(minFontSizePx, Math.min(maxFontSizePx, scaledLabel, oneStepBelow));

  return Math.min(labelSize, valueFontSizePx - offsetPx);
}

export function measureMaxFittingAggregateKpiValueFontSize(
  element: HTMLElement,
  maxFontSizePx = AGGREGATE_KPI_VALUE_MAX_FONT_SIZE_PX,
  minFontSizePx = AGGREGATE_KPI_VALUE_MIN_FONT_SIZE_PX,
  lineHeightRatio = AGGREGATE_KPI_VALUE_LINE_HEIGHT_RATIO,
): number {
  applyAggregateKpiValueFontSize(element, maxFontSizePx, lineHeightRatio);

  let fontSize = maxFontSizePx;

  while (fontSize > minFontSizePx && element.scrollWidth > element.clientWidth) {
    fontSize -= 1;
    applyAggregateKpiValueFontSize(element, fontSize, lineHeightRatio);
  }

  return fontSize;
}

export function measureUnifiedAggregateKpiValueFontSize(
  valueElements: HTMLElement[],
  maxFontSizePx = AGGREGATE_KPI_VALUE_MAX_FONT_SIZE_PX,
  minFontSizePx = AGGREGATE_KPI_VALUE_MIN_FONT_SIZE_PX,
  lineHeightRatio = AGGREGATE_KPI_VALUE_LINE_HEIGHT_RATIO,
): number | null {
  if (!valueElements.length) {
    return maxFontSizePx;
  }

  if (valueElements.some(element => element.clientWidth <= 0)) {
    return null;
  }

  const fitSizes = valueElements.map(element =>
    measureMaxFittingAggregateKpiValueFontSize(element, maxFontSizePx, minFontSizePx, lineHeightRatio),
  );

  return Math.min(...fitSizes);
}
