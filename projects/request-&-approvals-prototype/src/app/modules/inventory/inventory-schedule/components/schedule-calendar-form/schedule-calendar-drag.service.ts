import { computed, DestroyRef, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { fromEvent } from 'rxjs';

/** Minimum pointer movement before a drag can start (mouse and touch). */
const POINTER_DRAG_START_THRESHOLD_PX = 10;

@Injectable()
export class ScheduleCalendarDragService {
  readonly #dragStartCol = signal<number | null>(null);
  readonly #dragStartRow = signal<number | null>(null);
  readonly #dragEndCol = signal<number | null>(null);
  readonly #dragEndRow = signal<number | null>(null);
  /** `undefined` = no drag; `null` = closed tier; `number` = tier id. */
  readonly #dragTierId = signal<number | null | undefined>(undefined);
  readonly #dragCapacityTemplateId = signal<string | null | undefined>(undefined);
  readonly #isPotentialDrag = signal<boolean>(false);
  readonly #isDragging = signal<boolean>(false);
  readonly #dragMousePosition = signal<{ x: number; y: number }>({ x: 0, y: 0 });
  /** First pointer sample after a potential drag is armed; later moves must exceed `POINTER_DRAG_START_THRESHOLD_PX` before `#tryStartDrag` runs. */
  readonly #pointerArmPosition = signal<{ x: number; y: number } | null>(null);
  readonly #emptyRowSet: ReadonlySet<number> = Object.freeze(new Set<number>());

  readonly #dragRect = computed<{ minCol: number; maxCol: number; minRow: number; maxRow: number } | null>(() => {
    if (!this.#isDragging()) return null;
    const startCol = this.#dragStartCol();
    const startRow = this.#dragStartRow();
    const endCol = this.#dragEndCol();
    const endRow = this.#dragEndRow();
    if (startCol == null || startRow == null || endCol == null || endRow == null) return null;
    return {
      minCol: Math.min(startCol, endCol),
      maxCol: Math.max(startCol, endCol),
      minRow: Math.min(startRow, endRow),
      maxRow: Math.max(startRow, endRow),
    };
  });

  readonly #highlightedCells = computed<Map<number, Set<number>>>(() => {
    const rect = this.#dragRect();
    if (!rect) return new Map();
    const result = new Map<number, Set<number>>();
    for (let col = rect.minCol; col <= rect.maxCol; col++) {
      const rows = new Set<number>();
      for (let row = rect.minRow; row <= rect.maxRow; row++) {
        rows.add(row);
      }
      result.set(col, rows);
    }
    return result;
  });

  readonly isDragging = this.#isDragging.asReadonly();
  readonly dragMousePosition = this.#dragMousePosition.asReadonly();
  readonly dragTierId = computed(() => this.#dragTierId());
  readonly dragCapacityTemplateId = computed(() => this.#dragCapacityTemplateId());
  readonly highlightedCells = this.#highlightedCells;

  initialize(destroyRef: DestroyRef, onDragComplete: () => void): void {
    fromEvent<MouseEvent>(document, 'mousemove')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(event => {
        if (!this.#isPotentialDrag()) return;
        if (this.#isDragging()) {
          this.#dragMousePosition.set({ x: event.clientX, y: event.clientY });
          this.#syncDragEndFromClientPoint(event.clientX, event.clientY);
          return;
        }

        const armPos = this.#pointerArmPosition();
        if (!armPos) {
          this.#pointerArmPosition.set({ x: event.clientX, y: event.clientY });
          return;
        }

        const dx = event.clientX - armPos.x;
        const dy = event.clientY - armPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < POINTER_DRAG_START_THRESHOLD_PX) {
          return;
        }

        const dragResult = this.#tryStartDrag(event.clientX, event.clientY);
        // null = pointer not over a calendar cell (e.g. time labels); keep potential drag until mouseup or a valid cell is hit
        if (dragResult === null || dragResult === false) {
          return;
        }
      });
    fromEvent(document, 'mouseup')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        if (this.#shouldTearDownDragAfterPointerEnd()) {
          this.#onPointerEnd(onDragComplete);
        }
      });
    fromEvent<TouchEvent>(document, 'touchend')
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        if (this.#shouldTearDownDragAfterPointerEnd()) {
          this.#onPointerEnd(onDragComplete);
        }
      });
    fromEvent<TouchEvent>(document, 'touchmove', { passive: false })
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(event => {
        if (!this.#isPotentialDrag()) return;
        const touch = event.touches[0];

        if (this.#isDragging()) {
          event.preventDefault();
          this.#dragMousePosition.set({ x: touch.clientX, y: touch.clientY });
          this.#syncDragEndFromClientPoint(touch.clientX, touch.clientY);
          return;
        }

        const startPos = this.#pointerArmPosition();
        if (!startPos) {
          this.#pointerArmPosition.set({ x: touch.clientX, y: touch.clientY });
          event.preventDefault();
          return;
        }

        const dx = touch.clientX - startPos.x;
        const dy = touch.clientY - startPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < POINTER_DRAG_START_THRESHOLD_PX) {
          event.preventDefault();
          return;
        }

        this.#tryStartDrag(touch.clientX, touch.clientY);
        event.preventDefault();
      });
    destroyRef.onDestroy(() => {
      if (this.#shouldTearDownDragAfterPointerEnd()) {
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    });
  }

  onCellMouseDown(columnIndex: number, event: { rowIndex: number; tierId: number | null; capacityTemplateId: string | null }): void {
    this.#isPotentialDrag.set(true);
    this.#dragTierId.set(event.tierId);
    this.#dragCapacityTemplateId.set(event.capacityTemplateId);
    this.#dragStartCol.set(columnIndex);
    this.#dragStartRow.set(event.rowIndex);
    this.#dragEndCol.set(columnIndex);
    this.#dragEndRow.set(event.rowIndex);
  }

  getDragOriginRow(columnIndex: number): number | null {
    if (!this.#isDragging()) return null;
    return this.#dragStartCol() === columnIndex ? this.#dragStartRow() : null;
  }

  getHighlightedRows(columnIndex: number): ReadonlySet<number> {
    return this.#highlightedCells().get(columnIndex) ?? this.#emptyRowSet;
  }

  isHighlightedLeftEdge(columnIndex: number): boolean {
    return this.#dragRect()?.minCol === columnIndex;
  }

  isHighlightedRightEdge(columnIndex: number): boolean {
    return this.#dragRect()?.maxCol === columnIndex;
  }

  #onPointerEnd(onDragComplete: () => void): void {
    if (this.#isDragging()) {
      onDragComplete();
    }
    this.#isPotentialDrag.set(false);
    this.#isDragging.set(false);
    this.#dragStartCol.set(null);
    this.#dragStartRow.set(null);
    this.#dragEndCol.set(null);
    this.#dragEndRow.set(null);
    this.#dragTierId.set(undefined);
    this.#dragCapacityTemplateId.set(undefined);
    this.#pointerArmPosition.set(null);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }

  #shouldTearDownDragAfterPointerEnd(): boolean {
    return this.#isPotentialDrag() || this.#isDragging() || document.body.style.cursor === 'grabbing';
  }

  #syncDragEndFromClientPoint(clientX: number, clientY: number): void {
    const target = document.elementFromPoint(clientX, clientY);
    const cellWrapper = target?.closest<HTMLElement>('[data-col][data-row]');
    if (!cellWrapper) return;
    const col = Number(cellWrapper.dataset['col']);
    const row = Number(cellWrapper.dataset['row']);
    if (isNaN(col) || isNaN(row)) return;
    this.#dragEndCol.set(col);
    this.#dragEndRow.set(row);
  }

  #tryStartDrag(clientX: number, clientY: number): boolean | null {
    const target = document.elementFromPoint(clientX, clientY);
    const cellWrapper = target?.closest<HTMLElement>('[data-col][data-row]');
    if (!cellWrapper) return null;

    const col = Number(cellWrapper.dataset['col']);
    const row = Number(cellWrapper.dataset['row']);
    if (isNaN(col) || isNaN(row) || (col === this.#dragStartCol() && row === this.#dragStartRow())) {
      return false;
    }

    this.#isDragging.set(true);
    this.#dragEndCol.set(col);
    this.#dragEndRow.set(row);
    this.#dragMousePosition.set({ x: clientX, y: clientY });
    document.body.style.cursor = 'grabbing';
    document.body.style.userSelect = 'none';
    return true;
  }
}
