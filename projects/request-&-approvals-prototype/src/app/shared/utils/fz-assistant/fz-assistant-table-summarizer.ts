import { FzAssistantTableSummary } from '@fz-original/app/shared/models/fz-assistant/fz-assistant-captured.model';
import {
  FZ_ASSISTANT_TABLE_HOST_SELECTORS,
  FZ_ASSISTANT_TABLE_INTERACTIVE_ROW_CLASS_NAMES,
  FZ_ASSISTANT_TABLE_NON_DATA_ROW_CLASS_NAMES,
} from '@fz-original/app/shared/models/fz-assistant/fz-assistant-discover.model';

type HeaderSource = 'columnheader' | 'first-row' | 'none';

interface HeaderRead {
  headers: string[];
  source: HeaderSource;
}

interface DataRowRead {
  interactive: boolean;
}

export interface FzAssistantTableSummarizerConfig {
  hostSelectors?: readonly string[];
  nonDataRowClassNames?: readonly string[];
  interactiveRowClassNames?: readonly string[];
}

/**
 * Builds Discover V1 `table_summary`: headers + row_count (+ optional has_interactive_rows).
 * Cell samples are intentionally omitted until a privacy-cleared revision.
 */
export class FzAssistantTableSummarizer {
  readonly #hostSelectors: readonly string[];
  readonly #nonDataRowClassNames: readonly string[];
  readonly #interactiveRowClassNames: readonly string[];

  constructor(config: FzAssistantTableSummarizerConfig = {}) {
    this.#hostSelectors = config.hostSelectors ?? FZ_ASSISTANT_TABLE_HOST_SELECTORS;
    this.#nonDataRowClassNames = config.nonDataRowClassNames ?? FZ_ASSISTANT_TABLE_NON_DATA_ROW_CLASS_NAMES;
    this.#interactiveRowClassNames = config.interactiveRowClassNames ?? FZ_ASSISTANT_TABLE_INTERACTIVE_ROW_CLASS_NAMES;
  }

  matches(element: Element): boolean {
    for (const selector of this.#hostSelectors) {
      if (selector.trim() === '') {
        continue;
      }

      try {
        if (element.matches(selector)) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  summarize(element: Element): FzAssistantTableSummary {
    const tableRoot = this.#resolvePrimaryTableRoot(element);
    const headerRead = this.#readHeaders(tableRoot);
    const dataRows = this.#readDataRows(tableRoot, headerRead.source);
    const hasInteractiveRows = dataRows.some(row => row.interactive);

    const summary: FzAssistantTableSummary = {
      headers: headerRead.headers,
      row_count: dataRows.length,
    };

    if (hasInteractiveRows) {
      summary.has_interactive_rows = true;
    }

    return summary;
  }

  #readHeaders(element: Element): HeaderRead {
    const fromColumnHeaders = this.#collectCellTexts(
      element,
      element.querySelectorAll('thead th, thead [role="columnheader"], [role="columnheader"]'),
    );
    if (fromColumnHeaders.length > 0) {
      return { headers: fromColumnHeaders, source: 'columnheader' };
    }

    // Align with `#collectDataRows`: skip aria-hidden / aria-busy / configured skeleton rows so a
    // leading non-data `tr` cannot supply headers while data rows skip it (or vice versa).
    const firstVisibleRow = this.#findFirstVisibleRow(element);
    if (firstVisibleRow !== null) {
      const fromFirstRow = this.#collectCellTexts(
        element,
        firstVisibleRow.querySelectorAll('th, td, [role="cell"], [role="gridcell"], [role="columnheader"]'),
      );
      if (fromFirstRow.length > 0) {
        return { headers: fromFirstRow, source: 'first-row' };
      }
    }

    return { headers: [], source: 'none' };
  }

  #findFirstVisibleRow(element: Element): Element | null {
    const rows = element.querySelectorAll('tr');
    for (let index = 0; index < rows.length; index++) {
      const row = rows.item(index);
      if (row === null || this.#isInsideNestedTable(element, row) || !this.#isVisibleDataRow(row)) {
        continue;
      }

      // `thead` is handled by the columnheader path; first-row fallback is for headerless tables.
      if (row.closest('thead') !== null) {
        continue;
      }

      return row;
    }

    return null;
  }

  #readDataRows(element: Element, headerSource: HeaderSource): DataRowRead[] {
    const skipFirstRow = headerSource === 'first-row';
    const bodyRows = this.#collectDataRows(element, element.querySelectorAll('tbody tr'), false, skipFirstRow);
    if (bodyRows.length > 0) {
      return bodyRows;
    }

    return this.#collectDataRows(element, element.querySelectorAll('tr'), true, skipFirstRow);
  }

  #collectCellTexts(root: Element, cells: NodeListOf<Element>): string[] {
    const headers: string[] = [];

    for (let index = 0; index < cells.length; index++) {
      const cell = cells.item(index);
      if (cell === null || this.#isInsideNestedTable(root, cell)) {
        continue;
      }

      const text = normalizeText(cell.textContent);
      if (text !== '') {
        headers.push(text);
      }
    }

    return headers;
  }

  #collectDataRows(root: Element, rows: NodeListOf<Element>, skipThead: boolean, skipFirstRow: boolean): DataRowRead[] {
    const dataRows: DataRowRead[] = [];
    let isFirstEligibleRow = true;

    for (let index = 0; index < rows.length; index++) {
      const row = rows.item(index);
      if (row === null || this.#isInsideNestedTable(root, row) || !this.#isVisibleDataRow(row)) {
        continue;
      }

      if (skipThead && row.closest('thead') !== null) {
        continue;
      }

      if (skipFirstRow && isFirstEligibleRow) {
        isFirstEligibleRow = false;
        continue;
      }

      isFirstEligibleRow = false;

      if (!this.#rowHasCells(root, row)) {
        continue;
      }

      dataRows.push({
        interactive: this.#isInteractiveRow(row),
      });
    }

    return dataRows;
  }

  #rowHasCells(root: Element, row: Element): boolean {
    const cells = row.querySelectorAll('th, td, [role="cell"], [role="gridcell"]');

    for (let index = 0; index < cells.length; index++) {
      const cell = cells.item(index);
      if (cell !== null && !this.#isInsideNestedTable(root, cell)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Prefer semantic busy/hidden signals; configured class names are Ignite fallbacks only.
   */
  #isVisibleDataRow(row: Element): boolean {
    if (row.getAttribute('aria-hidden') === 'true' || row.getAttribute('aria-busy') === 'true') {
      return false;
    }

    // Loading/hidden containers (e.g. table[aria-busy="true"]) should not contribute placeholder rows.
    if (row.parentElement?.closest('[aria-hidden="true"], [aria-busy="true"]') != null) {
      return false;
    }

    return !matchesConfiguredClass(row, this.#nonDataRowClassNames);
  }

  /**
   * Prefer role / tabindex; configured class names are Ignite fallbacks only.
   */
  #isInteractiveRow(row: Element): boolean {
    const role = row.getAttribute('role');
    if (role === 'button' || role === 'link') {
      return true;
    }

    const tabIndex = row.getAttribute('tabindex');
    if (tabIndex !== null && tabIndex !== '-1') {
      return true;
    }

    return matchesConfiguredClass(row, this.#interactiveRowClassNames);
  }

  /**
   * Composite hosts from {@link #hostSelectors} (anything other than `table`) wrap a native
   * table — resolve that inner table so summarize stays aligned with matches().
   */
  #resolvePrimaryTableRoot(element: Element): Element {
    if (!this.#isCompositeTableHost(element)) {
      return element;
    }

    const nestedTable = element.querySelector(':scope table');
    return nestedTable ?? element;
  }

  #isCompositeTableHost(element: Element): boolean {
    for (const selector of this.#hostSelectors) {
      const trimmed = selector.trim();
      // Native `table` hosts are already the primary root — no inner resolution.
      if (trimmed === '' || trimmed === 'table') {
        continue;
      }

      try {
        if (element.matches(trimmed)) {
          return true;
        }
      } catch {
        continue;
      }
    }

    return false;
  }

  // Composite hosts wrap a native table; that primary table is not nested.
  #isInsideNestedTable(root: Element, node: Element): boolean {
    let interveningHosts = 0;
    let current: Element | null = node.parentElement;

    while (current !== null && current !== root) {
      if (this.matches(current)) {
        interveningHosts += 1;
      }
      current = current.parentElement;
    }

    if (interveningHosts === 0) {
      return false;
    }

    // Native <table> roots: any intervening table host is nested content.
    if (root.tagName.toLowerCase() === 'table') {
      return true;
    }

    // Composite hosts own one primary native table; only further nests count.
    return interveningHosts > 1;
  }
}

function matchesConfiguredClass(element: Element, classNames: readonly string[]): boolean {
  for (const className of classNames) {
    const trimmed = className.trim();
    if (trimmed !== '' && element.classList.contains(trimmed)) {
      return true;
    }
  }

  return false;
}

function normalizeText(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  return value.replace(/\s+/g, ' ').trim();
}
