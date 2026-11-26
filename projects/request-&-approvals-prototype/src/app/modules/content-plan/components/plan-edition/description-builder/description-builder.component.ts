import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  NgZone,
  OnDestroy,
  output,
  Renderer2,
  signal,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { COMPONENT_TYPES, PALETTE_ORDER } from './blocks/block-palette';
import { BlockContentComponent } from './components/block-content/block-content.component';
import { PropertiesPanelComponent } from './components/properties-panel/properties-panel.component';
import { Block, BlockProps, BlockType } from './models/block.model';
import { BlockDefaultsFactory } from './services/block-defaults.factory';
import { MaterialSymbolsFontLoader } from './services/material-symbols-font-loader.service';
import { cloneBlock } from './utils/block.utils';

/**
 * Narrow-layout breakpoint: below this width the palette/properties side panels
 * collapse and properties render as a bottom sheet. Keep in sync with the
 * matching SCSS media query for this component.
 */
const NARROW_VIEWPORT_QUERY = '(max-width: 1024px)';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DragDropModule, TranslateModule, BlockContentComponent, PropertiesPanelComponent],
  selector: 'app-description-builder',
  standalone: true,
  styleUrl: './description-builder.component.scss',
  templateUrl: './description-builder.component.html',
})
export class DescriptionBuilderComponent implements AfterViewInit, OnDestroy {
  // ── Inputs / outputs (signal-based API) ───────────────────────────────────

  readonly initialSchema = input<Block[]>([]);
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  /**
   * Locks the whole editor when `true`: palette/canvas drag, the "add
   * component" `+` button, the per-block properties and block deletion are all
   * blocked. Block selection (clicks on a canvas block) stays enabled so users
   * without edit rights can still inspect properties. Typically wired to
   * `!canEditPlan() || !hasEditContentPermission()`.
   */
  readonly disabled = input<boolean>(false);
  /**
   * Paints empty mandatory fields in the properties panel as errors. Wired by
   * the consumer after a publish attempt with missing mandatory content (see
   * `collectMissingMandatory`); cleared again when the user edits the schema.
   */
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly schemaChange = output<Block[]>();

  // ── Injected services ────────────────────────────────────────────────────

  readonly #renderer = inject(Renderer2);
  readonly #ngZone = inject(NgZone);
  readonly #document = inject(DOCUMENT);
  readonly #blockDefaults = inject(BlockDefaultsFactory);
  readonly #materialSymbolsFont = inject(MaterialSymbolsFontLoader);

  // ── Reactive state ───────────────────────────────────────────────────────

  /** Schema currently rendered in the canvas. */
  readonly blocks = signal<Block[]>([]);
  /** Id of the currently-selected block (`null` when none). */
  readonly selectedId = signal<string | null>(null);
  /** True while CDK drag-drop is moving a block. */
  readonly isDragging = signal(false);
  /** True while the palette is hovering its drop target on the canvas. */
  readonly isCanvasReceiving = signal(false);
  /**
   * True for the whole lifetime of a palette-item drag (from grab to release,
   * anywhere on screen). Collapses the canvas `+` button BEFORE the cursor
   * reaches the canvas, so CDK measures the drop list without it and the drop
   * placeholder lands where the block will actually be inserted.
   */
  readonly isPaletteDragging = signal(false);
  /** CSS `left` value for the floating delete zone (anchors it over the canvas). */
  readonly deleteZoneLeft = signal('50%');
  /** True once the drag has hovered the delete zone for the full confirmation delay. */
  readonly deleteZoneReady = signal(false);
  /** True while the cursor is actually inside the delete zone (independent of CDK's connected-list state). */
  readonly isDeleteZoneHovered = signal(false);
  /** Controls the floating "add component" popover (anchored to the canvas `+` button). */
  readonly addMenuOpen = signal(false);
  /** Horizontal screen position (px) used to align the add-menu modal with the `+` button. */
  readonly addMenuAnchorX = signal<number | null>(null);
  /**
   * Drives the responsive layout: at narrow viewports the palette and
   * properties side panels collapse, and the properties panel re-renders as
   * a bottom sheet that appears only when a block is selected. The 1024 px
   * threshold matches the reference design — wide enough to fit the
   * three-column layout comfortably, but below tablet-landscape sizes.
   *
   * Driven by the CDK `BreakpointObserver` (via `toSignal`), which emits the
   * current match synchronously on subscribe — so the value is correct from the
   * first render (no wide-layout flash) and teardown is automatic.
   */
  readonly isNarrowViewport = toSignal(
    inject(BreakpointObserver)
      .observe(NARROW_VIEWPORT_QUERY)
      .pipe(map(state => state.matches)),
    {
      initialValue: false,
    },
  );

  /**
   * The selected block resolved against the current `blocks` array. Recomputes
   * whenever either signal changes, so mutations (props change, delete, drag-
   * reorder) are reflected immediately in everything that reads it (inline
   * properties panel, bottom sheet content, etc.).
   */
  readonly selectedBlock = computed<Block | null>(() => this.blocks().find(b => b.id === this.selectedId()) ?? null);

  /**
   * The block shown inside the bottom sheet. Equal to `selectedBlock` while
   * a block is selected; persists the last value briefly during the close
   * animation so the panel doesn't flash its empty state mid-transition. The
   * cache is filled by an effect (below) and cleared by the cleanup timer in
   * `deselectAll`.
   */
  readonly sheetBlock = computed<Block | null>(() => this.selectedBlock() ?? this.#sheetBlockCache());

  readonly PALETTE_ORDER = PALETTE_ORDER;
  readonly COMPONENT_TYPES = COMPONENT_TYPES;
  readonly paletteItems: BlockType[] = [...PALETTE_ORDER];

  // ── View refs (signal queries) ───────────────────────────────────────────

  readonly canvasWrapRef = viewChild<ElementRef<HTMLElement>>('canvasWrap');
  /** Scrollable wrapper around the gray canvas (scroll lives outside the canvas box). */
  readonly canvasScrollRef = viewChild<ElementRef<HTMLElement>>('canvasScroll');
  readonly deleteZoneRef = viewChild<ElementRef<HTMLElement>>('deleteZone');

  // ── Imperative state (timers, observers, listeners) ──────────────────────

  readonly #sheetBlockCache = signal<Block | null>(null);
  #holdTimer: ReturnType<typeof setTimeout> | null = null;
  #deleteTimer: ReturnType<typeof setTimeout> | null = null;
  #resizeRafId: number | null = null;
  #sheetCloseTimerId: ReturnType<typeof setTimeout> | null = null;
  /** Renderer2 listener teardown callbacks, all flushed in ngOnDestroy. */
  readonly #unlistenCallbacks: Array<() => void> = [];

  constructor() {
    // The palette/canvas glyphs use the Material Symbols icon font, which is
    // loaded on demand (not from index.html) so only builder/translation users
    // fetch it. Idempotent — the service injects the <link> a single time.
    this.#materialSymbolsFont.ensureLoaded();

    // Sync `blocks` from the `initialSchema` input. This replaces the
    // previous `ngOnChanges` hook — `effect` fires once at construction AND
    // whenever the input signal changes, which matches what we want: parent
    // updates always reset the local copy.
    effect(() => {
      const schema = this.initialSchema();
      this.blocks.set(schema.length > 0 ? [...schema] : []);
      this.selectedId.set(null);
      // The cached sheet block belongs to the previous schema; clear it (and
      // any pending close timer) so the narrow bottom sheet never shows stale
      // content from a schema that is no longer on the canvas.
      if (this.#sheetCloseTimerId !== null) {
        clearTimeout(this.#sheetCloseTimerId);
        this.#sheetCloseTimerId = null;
      }
      this.#sheetBlockCache.set(null);
    });

    // Keep the bottom-sheet cache in sync with the live selection. Only
    // writes when a block IS selected — when selection clears, the cache
    // retains the previous value so the panel can fade out with content.
    // The cleanup timer in `deselectAll` clears the cache after the
    // animation finishes.
    effect(() => {
      const current = this.selectedBlock();
      if (current !== null) {
        this.#sheetBlockCache.set(current);
      }
    });
  }

  ngAfterViewInit(): void {
    // The delete zone is `position: fixed` and lives in the component view by
    // intent, but is appended to <body> to escape any ancestor that establishes
    // a containing block for fixed descendants (e.g. an ancestor with
    // `transform`, `filter`, or `will-change`). Done through Renderer2 so the
    // operation is testable and SSR-safe.
    const deleteZone = this.deleteZoneRef()?.nativeElement;
    if (deleteZone !== undefined) {
      this.#renderer.appendChild(this.#document.body, deleteZone);
    }
    this.#updateDeleteZonePosition();
    this.#setupSheetEscListener();

    // Window resize listener runs outside the Angular zone (rAF coalesces bursts);
    // re-enters the zone only to write to a bound property when the value actually
    // changes. Stored unlisten fn ensures clean teardown.
    this.#ngZone.runOutsideAngular(() => {
      const unlisten = this.#renderer.listen('window', 'resize', () => {
        if (this.#resizeRafId !== null) return;
        this.#resizeRafId = requestAnimationFrame(() => {
          this.#resizeRafId = null;
          this.#ngZone.run(() => this.#updateDeleteZonePosition());
        });
      });
      this.#unlistenCallbacks.push(unlisten);
    });
  }

  ngOnDestroy(): void {
    this.#clearHoldTimer();
    this.#cancelDeleteTimer();
    if (this.#resizeRafId !== null) {
      cancelAnimationFrame(this.#resizeRafId);
      this.#resizeRafId = null;
    }
    while (this.#unlistenCallbacks.length > 0) {
      const unlisten = this.#unlistenCallbacks.pop();
      unlisten?.();
    }
    this.deleteZoneRef()?.nativeElement?.remove();
    this.#document.body.classList.remove('db-dragging');
    this.#document.body.classList.remove('db-over-delete');
    if (this.#sheetCloseTimerId !== null) {
      clearTimeout(this.#sheetCloseTimerId);
      this.#sheetCloseTimerId = null;
    }
  }

  #setupSheetEscListener(): void {
    // ESC closes the bottom sheet (matches the convention users expect from
    // modal-like surfaces). Registered once at view-init and torn down via the
    // unlisten array. (The narrow/wide state itself is driven by `toSignal` +
    // BreakpointObserver, so no media-query listener is wired here.)
    const unlisten = this.#renderer.listen('document', 'keydown.escape', () => {
      if (this.addMenuOpen()) {
        this.closeAddMenu();
        return;
      }
      if (this.isNarrowViewport() && this.selectedId() !== null) {
        this.deselectAll();
      }
    });
    this.#unlistenCallbacks.push(unlisten);
  }

  #onGlobalMouseUp = (): void => {
    this.#clearHoldTimer();
    if (this.isDragging() === false) {
      this.#document.body.classList.remove('db-dragging');
    }
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  onPaletteDragStarted(): void {
    this.isPaletteDragging.set(true);
  }

  onPaletteDragEnded(): void {
    this.isPaletteDragging.set(false);
  }

  onPreviewDragEntered(): void {
    this.isCanvasReceiving.set(true);
  }

  onPreviewDragExited(): void {
    this.isCanvasReceiving.set(false);
  }

  onPreviewDrop(event: CdkDragDrop<BlockType[] | Block[]>): void {
    this.#stopDragging();
    if (this.disabled()) return;
    if (event.previousContainer === event.container) {
      // Reorder within the canvas. `moveItemInArray` mutates, so operate on
      // a copy and `set` the result back so the signal sees a new reference.
      this.blocks.update(curr => {
        const next = [...curr];
        moveItemInArray(next, event.previousIndex, event.currentIndex);
        return next;
      });
    } else {
      const type = event.item.data as BlockType;
      const block = this.#blockDefaults.createBlock(type);
      this.blocks.update(curr => {
        const next = [...curr];
        next.splice(event.currentIndex, 0, block);
        return next;
      });
      this.selectedId.set(block.id);
    }
    this.#emitSchema();
  }

  onDropToDelete(event: CdkDragDrop<Block[]>): void {
    const canDelete = this.deleteZoneReady();
    this.#stopDragging();
    if (this.disabled()) return;
    if (canDelete && event.previousContainer !== event.container) {
      const block = event.item.data as Block;
      this.deleteBlock(block.id);
    }
  }

  onBlockMouseDown(): void {
    this.#clearHoldTimer();
    // Locked canvas: skip the hold-timer + body.db-dragging dance entirely.
    // `cdkDragDisabled` already prevents drag from starting, but the 500ms
    // timer that flips the global cursor to `grabbing` runs independently of
    // CDK — without this guard the cursor would still change after a held
    // click on a read-only block.
    if (this.disabled()) return;
    // Attach via Renderer2 and remember the unlisten fn so that aborted gestures
    // (mousedown on a block, then unmount before mouseup) cannot leak the listener.
    const unlisten = this.#renderer.listen('document', 'mouseup', () => {
      this.#onGlobalMouseUp();
      const idx = this.#unlistenCallbacks.indexOf(unlisten);
      if (idx !== -1) this.#unlistenCallbacks.splice(idx, 1);
      unlisten();
    });
    this.#unlistenCallbacks.push(unlisten);

    this.#updateDeleteZonePosition();
    this.#holdTimer = setTimeout(() => {
      this.#holdTimer = null;
      this.#document.body.classList.add('db-dragging');
    }, 500);
  }

  onBlockDragStarted(id: string): void {
    this.#clearHoldTimer();
    // Reset delete-zone confirmation state at the start of every drag. The
    // previous drag may have left `deleteZoneReady` set (we intentionally
    // don't reset it in `#stopDragging` — see the note there).
    this.deleteZoneReady.set(false);
    this.isDeleteZoneHovered.set(false);
    // Wide layout: highlight the dragged block in the inline side panel
    // immediately (helpful context while moving). Narrow layout: skip the
    // selection — selecting opens the bottom-sheet modal, which would
    // interrupt the drag gesture before the user releases. The block can
    // still be selected afterwards via a real click (mousedown + mouseup
    // without drag), at which point `selectBlock` runs and the sheet opens.
    if (!this.isNarrowViewport()) {
      this.selectedId.set(id);
    } else if (this.selectedId() !== null) {
      // Narrow layout: a bottom sheet opened by a prior tap would overlay the
      // canvas and its backdrop would swallow the drag gesture. Close it when a
      // drag starts (deselectAll animates the sheet out without interrupting
      // the drag).
      this.deselectAll();
    }
    this.isDragging.set(true);
    this.#document.body.classList.add('db-dragging');
    this.#updateDeleteZonePosition();
  }

  onBlockDragEnded(): void {
    this.#stopDragging();
  }

  onDeleteZoneEntered(): void {
    // Idempotent: both `cdkDropListEntered` and native `pointerenter` can fire
    // on the same crossing — only one of them should arm the timer.
    if (this.isDeleteZoneHovered()) return;
    this.#document.body.classList.add('db-over-delete');
    this.isDeleteZoneHovered.set(true);
    this.#deleteTimer = setTimeout(() => {
      this.#deleteTimer = null;
      this.deleteZoneReady.set(true);
    }, 750);
  }

  onDeleteZoneExited(): void {
    this.#document.body.classList.remove('db-over-delete');
    this.isDeleteZoneHovered.set(false);
    this.#cancelDeleteTimer();
    this.deleteZoneReady.set(false);
  }

  onDeleteZonePointerEnter(): void {
    // Re-arms the spinner when the cursor re-enters the delete-zone from
    // empty (non-drop-list) space. CDK doesn't fire `cdkDropListEntered` in
    // that case because, from its perspective, no transition between
    // connected drop lists occurred.
    if (this.isDragging() && !this.isDeleteZoneHovered()) {
      this.onDeleteZoneEntered();
    }
  }

  onDeleteZonePointerLeave(): void {
    // Native pointerleave fires the moment the cursor leaves the element,
    // regardless of what's underneath — unlike CDK's `cdkDropListExited`,
    // which only fires when the cursor enters another connected drop list.
    // Without this, leaving the delete-zone into empty space leaves the
    // spinner spinning until the cursor re-enters the preview panel.
    if (this.isDeleteZoneHovered()) {
      this.onDeleteZoneExited();
    }
  }

  #clearHoldTimer(): void {
    if (this.#holdTimer !== null) {
      clearTimeout(this.#holdTimer);
      this.#holdTimer = null;
    }
  }

  #cancelDeleteTimer(): void {
    if (this.#deleteTimer !== null) {
      clearTimeout(this.#deleteTimer);
      this.#deleteTimer = null;
    }
  }

  #stopDragging(): void {
    this.isDragging.set(false);
    this.isDeleteZoneHovered.set(false);
    // CDK doesn't reliably fire `cdkDropListExited` after a successful drop
    // (only on cursor exit during an active drag), so reset here defensively
    // — otherwise the canvas-add button stays hidden after every drop.
    this.isCanvasReceiving.set(false);
    this.isPaletteDragging.set(false);
    this.#cancelDeleteTimer();
    // NOTE: `deleteZoneReady` is intentionally NOT reset here. CDK fires
    // `cdkDragEnded` (which calls this) BEFORE `cdkDropListDropped` (which
    // reads the flag in `onDropToDelete`); resetting too early would mask
    // the ready state and silently skip the delete. The flag is cleared on
    // cursor exit (`onDeleteZoneExited`) or when a new drag begins
    // (`onBlockDragStarted`).
    this.#document.body.classList.remove('db-dragging');
    this.#document.body.classList.remove('db-over-delete');
  }

  #updateDeleteZonePosition(): void {
    const canvasWrap = this.canvasWrapRef()?.nativeElement;
    if (canvasWrap === undefined) return;
    const rect = canvasWrap.getBoundingClientRect();
    this.deleteZoneLeft.set(`${rect.left + rect.width / 2}px`);
  }

  // ── Block selection ───────────────────────────────────────────────────────

  selectBlock(id: string, event: Event): void {
    event.stopPropagation();
    this.selectedId.set(id);
    // Cancel any pending close-cleanup — the sheet is opening again, so the
    // cache shouldn't be wiped mid-flight.
    if (this.#sheetCloseTimerId !== null) {
      clearTimeout(this.#sheetCloseTimerId);
      this.#sheetCloseTimerId = null;
    }
    this.#scrollBlockToTop(id);
  }

  /**
   * Scrolls the canvas so that the given block sits near the top of the
   * visible area with a small breathing-room offset above it. Without the
   * offset the block ends up flush against the canvas's inner edge, which
   * feels cramped. We use `getBoundingClientRect` math instead of
   * `scrollIntoView` because the latter also scrolls ancestor scroll
   * containers (the page itself), which would cause unwanted page-level
   * scrolling alongside the canvas scroll. Manual `scrollTo` on the canvas
   * keeps the effect strictly local.
   */
  #scrollBlockToTop(id: string): void {
    const canvas = this.canvasScrollRef()?.nativeElement;
    if (canvas === undefined) return;
    const el = canvas.querySelector<HTMLElement>(`[data-block-id="${id}"]`);
    if (el === null) return;
    const SELECTED_BLOCK_TOP_OFFSET_PX = 24;
    const canvasRect = canvas.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    const target = canvas.scrollTop + (elRect.top - canvasRect.top) - SELECTED_BLOCK_TOP_OFFSET_PX;
    // Clamp to a non-negative value so the first block doesn't try to scroll
    // past the top of the scrollable area (no-op on most browsers, but keeps
    // intent explicit).
    canvas.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }

  deselectAll(): void {
    this.selectedId.set(null);
    // The builder root click handler runs on any outside click; piggyback on
    // it to close the add-component popover too, so we don't need a separate
    // document listener.
    this.closeAddMenu();
    // Keep the cached sheet block populated for the duration of the close
    // transition (220 ms — matches the SCSS) so the bottom sheet shows its
    // last content while sliding out, instead of flashing the empty
    // "select a component" state. Cleared after the animation finishes.
    if (this.#sheetCloseTimerId !== null) clearTimeout(this.#sheetCloseTimerId);
    this.#sheetCloseTimerId = setTimeout(() => {
      this.#sheetBlockCache.set(null);
      this.#sheetCloseTimerId = null;
    }, 240);
  }

  // ── Add menu (floating "+" picker) ─────────────────────────────────────────

  toggleAddMenu(event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const willOpen = !this.addMenuOpen();
    if (willOpen) {
      // Anchor the modal's horizontal position to the clicked `+` button so it
      // stays aligned with it (vertical centering on screen is fixed via CSS).
      const button = event.currentTarget as HTMLElement | null;
      const rect = button?.getBoundingClientRect();
      this.addMenuAnchorX.set(rect ? rect.left + rect.width / 2 : null);
    }
    this.addMenuOpen.set(willOpen);
  }

  closeAddMenu(): void {
    if (this.addMenuOpen()) {
      this.addMenuOpen.set(false);
    }
  }

  addBlockByType(type: BlockType, event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const block = this.#blockDefaults.createBlock(type);
    this.blocks.update(curr => [...curr, block]);
    this.selectedId.set(block.id);
    this.addMenuOpen.set(false);
    this.#emitSchema();
  }

  // ── Block CRUD ────────────────────────────────────────────────────────────

  updateProps(id: string, props: BlockProps): void {
    const current = this.blocks().find(b => b.id === id);
    // Bail if the block no longer exists — e.g. a stale/queued `propsChange`
    // arriving after the block was removed: there is nothing to update, and
    // emitting would mark the plan dirty for a no-op change.
    if (current === undefined) {
      return;
    }
    // `activeIndex` (tab/card selection) is session-only UI state, omitted from
    // persisted DTOs, so a navigation-only change must never emit schemaChange
    // (which would mark the plan dirty in the parent).
    const isNavigationOnly = this.#isActiveIndexOnlyChange(current.props, props);
    if (this.disabled()) {
      // When the editor is locked we still let `activeIndex` changes through:
      // switching between tabs/cards is navigation, not edition (the user
      // needs to be able to inspect every tab even on a read-only plan). Any
      // other prop change is rejected as a defensive last line — every text /
      // image / color control upstream is already `[disabled]`, so this guard
      // shouldn't fire in practice.
      if (!isNavigationOnly) return;
      this.blocks.update(curr => curr.map(b => (b.id === id ? ({ ...b, props } as Block) : b)));
      return;
    }
    this.blocks.update(curr => curr.map(b => (b.id === id ? ({ ...b, props } as Block) : b)));
    // Skip emission (and the resulting dirty flag) for pure tab/card navigation.
    if (isNavigationOnly) return;
    this.#emitSchema();
  }

  #isActiveIndexOnlyChange(prev: BlockProps, next: BlockProps): boolean {
    const prevRecord = prev as unknown as Record<string, unknown>;
    const nextRecord = next as unknown as Record<string, unknown>;
    const allKeys = new Set([...Object.keys(prevRecord), ...Object.keys(nextRecord)]);
    for (const key of allKeys) {
      if (key === 'activeIndex') continue;
      if (prevRecord[key] !== nextRecord[key]) return false;
    }
    return true;
  }

  deleteBlock(id: string): void {
    if (this.disabled()) return;
    this.blocks.update(curr => curr.filter(b => b.id !== id));
    if (this.selectedId() === id) this.selectedId.set(null);
    this.#emitSchema();
  }

  duplicateBlock(id: string, event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const blocks = this.blocks();
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1) return;
    const copy = cloneBlock(blocks[idx]);
    this.blocks.set([...blocks.slice(0, idx + 1), copy, ...blocks.slice(idx + 1)]);
    this.selectedId.set(copy.id);
    this.#emitSchema();
  }

  moveUp(id: string, event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const idx = this.blocks().findIndex(b => b.id === id);
    if (idx <= 0) return;
    this.blocks.update(curr => {
      const next = [...curr];
      moveItemInArray(next, idx, idx - 1);
      return next;
    });
    this.#emitSchema();
  }

  moveDown(id: string, event: Event): void {
    event.stopPropagation();
    if (this.disabled()) return;
    const blocks = this.blocks();
    const idx = blocks.findIndex(b => b.id === id);
    if (idx === -1 || idx >= blocks.length - 1) return;
    this.blocks.update(curr => {
      const next = [...curr];
      moveItemInArray(next, idx, idx + 1);
      return next;
    });
    this.#emitSchema();
  }

  // ── Schema emission ───────────────────────────────────────────────────────

  #emitSchema(): void {
    this.schemaChange.emit([...this.blocks()]);
  }
}
