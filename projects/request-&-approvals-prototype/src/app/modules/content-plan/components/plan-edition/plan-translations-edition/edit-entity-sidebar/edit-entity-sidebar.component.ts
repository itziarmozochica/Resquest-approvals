import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  output,
  signal,
  Signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  UnsavedChangesDialogComponent,
  UnsavedChangesDialogData,
} from '@fz-original/app/shared/components/unsaved-changes-dialog/unsaved-changes-dialog.component';
import { TemplatedTooltipDirective } from '@fz-original/app/shared/directives/templated-tooltip.directive';
import { IGNT_DIALOG_TRANSLATIONS, IgntDialogModule, IgntDialogRef, IgntDialogService, type IgntDialogTranslations } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { take } from 'rxjs';

import { EditEntitySidebarDiscardModalConfig, EditEntitySidebarEntityType, EditEntitySidebarItem } from './edit-entity-sidebar.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IgntButtonComponent,
    IgntDialogModule,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntListItemComponent,
    IgntTagComponent,
    TemplatedTooltipDirective,
  ],
  selector: 'app-edit-entity-sidebar',
  standalone: true,
  styleUrl: './edit-entity-sidebar.component.scss',
  templateUrl: './edit-entity-sidebar.component.html',
})
export class EditEntitySidebarComponent {
  readonly #dialogService = inject(IgntDialogService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #injector = inject(Injector);

  readonly dialogTranslations = input.required<Partial<IgntDialogTranslations>>();
  readonly discardModalConfig = input.required<EditEntitySidebarDiscardModalConfig>();
  readonly entityType = input.required<EditEntitySidebarEntityType>();
  readonly hasChanges = input.required<boolean>();
  readonly items = input.required<readonly EditEntitySidebarItem[]>();
  readonly saveLabel = input.required<string>();
  readonly searchAriaLabel = input.required<string>();
  readonly searchPlaceholder = input.required<string>();
  readonly title = input.required<string>();

  readonly testIdPrefix: Signal<string> = computed<string>(() => `edit-entity-sidebar-${this.entityType()}`);
  readonly canEdit = input<boolean>(false);
  readonly searchQuery = input<string>('');

  readonly closed = output<void>();
  readonly itemToggle = output<string>();
  readonly save = output<void>();
  readonly searchQueryChange = output<string>();

  private readonly panelTemplate = viewChild.required<TemplateRef<unknown>>('sidePanelTemplate');

  readonly filteredItems: Signal<readonly EditEntitySidebarItem[]> = computed<readonly EditEntitySidebarItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const allItems = this.items();
    if (query === '') {
      return allItems;
    }
    return allItems.filter((item: EditEntitySidebarItem) => item.name.toLowerCase().includes(query));
  });

  #panelRef: IgntDialogRef<unknown> | null = null;
  #allowCloseBypass = false;
  #suppressClosedEmitOnce = false;
  #openGeneration = 0;
  readonly #isOpenSignal = signal<boolean>(false);
  readonly #isSavePending = signal<boolean>(false);
  readonly isSavePending: Signal<boolean> = this.#isSavePending.asReadonly();

  close(): void {
    if (!this.#panelRef) {
      return;
    }
    this.#allowCloseBypass = true;
    this.#panelRef.close();
    this.#allowCloseBypass = false;
  }

  isOpen(): boolean {
    return this.#isOpenSignal();
  }

  isOpenSignal(): Signal<boolean> {
    return this.#isOpenSignal.asReadonly();
  }

  onItemClick(itemId: string): void {
    if (!this.canEdit()) {
      return;
    }
    this.itemToggle.emit(itemId);
  }

  onSaveClick(): void {
    this.#emitSaveWhenAllowed();
  }

  #emitSaveWhenAllowed(): void {
    if (!this.canEdit() || !this.hasChanges() || this.#isSavePending()) {
      return;
    }
    this.#isSavePending.set(true);
    this.save.emit();
  }

  resetSavePending(): void {
    this.#isSavePending.set(false);
  }

  onSearchQueryChange(value: string | number | null | undefined): void {
    if (value === null || value === undefined) {
      this.searchQueryChange.emit('');
      return;
    }
    this.searchQueryChange.emit(String(value));
  }

  open(): void {
    this.#openGeneration += 1;
    const openGeneration = this.#openGeneration;
    if (this.#panelRef) {
      this.#suppressClosedEmitOnce = true;
      this.#allowCloseBypass = true;
      this.#panelRef.close();
      this.#allowCloseBypass = false;
    }
    const panelRef = this.#dialogService.openSidePanel(this.panelTemplate(), {
      disableCloseShortcuts: true,
      injector: Injector.create({
        parent: this.#injector,
        providers: [
          {
            provide: IGNT_DIALOG_TRANSLATIONS,
            useValue: signal(this.dialogTranslations()),
          },
        ],
      }),
    });
    this.#patchPanelCloseGuard(panelRef);
    this.#panelRef = panelRef;
    this.#isOpenSignal.set(true);
    const openedRef = panelRef;
    openedRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      if (openGeneration !== this.#openGeneration || this.#panelRef !== openedRef) {
        return;
      }
      this.#panelRef = null;
      this.#isOpenSignal.set(false);
      this.#isSavePending.set(false);
    });
  }

  #patchPanelCloseGuard(panelRef: IgntDialogRef<unknown>): void {
    type PanelCloseFn = (result?: unknown) => void;
    const ref = panelRef as IgntDialogRef<unknown> & { close: PanelCloseFn };
    const originalClose: PanelCloseFn = ref.close.bind(ref);
    ref.close = (result?: unknown): void => {
      if (this.#allowCloseBypass || !this.hasChanges()) {
        originalClose(result);
        if (this.#suppressClosedEmitOnce) {
          this.#suppressClosedEmitOnce = false;
          return;
        }
        this.closed.emit();
        return;
      }
      this.#showDiscardModal();
    };
  }

  #showDiscardModal(): void {
    const config = this.discardModalConfig();
    this.#dialogService
      .openModal<boolean, UnsavedChangesDialogData>(UnsavedChangesDialogComponent, {
        data: {
          acceptLabel: config.saveButtonLabel,
          cancelLabel: config.cancelButtonLabel,
          message: config.question,
          title: config.title,
        },
        disableCloseShortcuts: false,
      })
      .closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe((shouldSave?: boolean) => {
        if (shouldSave === true) {
          this.#emitSaveWhenAllowed();
          return;
        }
        if (shouldSave === false) {
          this.close();
          return;
        }
      });
  }
}
