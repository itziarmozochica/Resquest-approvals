import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  input,
  Input,
  linkedSignal,
  output,
  Output,
  Signal,
  untracked,
  ViewChild,
} from '@angular/core';
import { outputFromObservable, takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

import { MessageModalComponent } from '@fz-original/app/shared/components/message-modal/message-modal.component';
import { NoteDraft } from '@fz-original/app/shared/components/notes/models/note-draft.model';
import {
  customerNotesSource,
  CustomerNotesStoreContract,
} from '@fz-original/app/shared/components/notes/models/store/customer-notes-store.model';
import { NoteHistoryEntry, parseNoteHistory } from '@fz-original/app/shared/components/notes/note-history.util';
import {
  noteEditFormMode,
  NoteInput,
  NotesEditFormComponent,
} from '@fz-original/app/shared/components/notes/notes-edit-form/notes-edit-form.component';
import { NotesEntriesComponent } from '@fz-original/app/shared/components/notes/notes-entries/notes-entries.component';
import { NotesTimelineMessageComponent } from '@fz-original/app/shared/components/notes/notes-timeline-message/notes-timeline-message.component';
import { DraftCustomerNotesStore } from '@fz-original/app/shared/components/notes/store/draft-customer-notes.store';
import { OrderCustomerNotesStore } from '@fz-original/app/shared/components/notes/store/order-customer-notes.store';
import { QuoteCustomerNotesStore } from '@fz-original/app/shared/components/notes/store/quote-customer-notes.store';
import { ReservationCustomerNotesStore } from '@fz-original/app/shared/components/notes/store/reservation-customer-notes.store';
import {
  audiencesForNewNote,
  customerNotesSourceFor,
  isSameQuoteCustomerNotesRef,
  latestCustomerNoteChangeAt,
  toCustomerNoteInput,
  toQuoteCustomerNotesRef,
} from '@fz-original/app/shared/components/notes/utils/customer-notes.util';
import { SharedComponentsModule } from '@fz-original/app/shared/components/shared-components.module';
import { PermissionBaseModule } from '@fz-original/app/shared/directives/permission-based/permission-base.module';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { noteAudience, NoteAudienceET } from '@fz-original/app/shared/models/customer-note/note-audience.model';
import { OrderNote } from '@fz-original/app/shared/models/order/order-note.model';
import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntButtonComponent } from '@ignite/common';
import { IgntExpansionPanelComponent } from '@ignite/legacy/components/ignt-expansion-panel/ignt-expansion-panel.component';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';

import { OrderSectionTileComponent } from '../order/components/order-section-tile/order-section-tile.component';

interface UnifiedNote {
  id: string;
  message: string;
  modified_at: string;
  title: string | null;
  username: string | null;
}

export interface NoteChanges {
  message: string;
  title: string | null;
}

export const noteAction = {
  CREATE: 'CREATE',
  DELETE: 'DELETE',
  UPDATE: 'UPDATE',
} as const;

export type NoteActionET = (typeof noteAction)[keyof typeof noteAction];

export interface NoteActionEvent {
  action: NoteActionET;
  noteChanges?: NoteChanges;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.notes--empty]': 'isEmpty()' },
  imports: [
    IgntButtonComponent,
    IgntExpansionPanelComponent,
    OrderSectionTileComponent,
    IgntLinkComponent,
    IgntListItemComponent,
    IgntTagComponent,
    IconsModule,
    SharedComponentsModule,
    NotesEditFormComponent,
    NotesEntriesComponent,
    NotesTimelineMessageComponent,
    TranslateModule,
    PipesModule,
    PermissionBaseModule,
  ],
  providers: [OrderCustomerNotesStore, QuoteCustomerNotesStore, ReservationCustomerNotesStore],
  selector: 'app-notes',
  styleUrl: './notes.component.scss',
  templateUrl: './notes.component.html',
})
export class NotesComponent {
  readonly #changeDetectorRef = inject(ChangeDetectorRef);

  readonly #destroyRef = inject(DestroyRef);
  readonly #draftCustomerNotesStore = inject(DraftCustomerNotesStore, { optional: true });
  readonly #modalService = inject(NgbModal);
  readonly #optimizelyService = inject(OptimizelyService);
  permissions = Permissions;
  readonly #translateService = inject(TranslateService);
  readonly #orderCustomerNotesStore = inject(OrderCustomerNotesStore);
  readonly #quoteCustomerNotesStore = inject(QuoteCustomerNotesStore);
  readonly #reservationCustomerNotesStore = inject(ReservationCustomerNotesStore);
  readonly #userService = inject(UserService);
  readonly #isCustomerNotesFeatureEnabled = this.#optimizelyService.isFeatureEnabled(FeatureFlags.GAME_CENTERS_RESERVATIONS) === true;
  readonly #canManageCustomerNotes =
    this.#isCustomerNotesFeatureEnabled &&
    this.#userService.hasPermission(Permissions.CAN_RESERVE_ON_BEHALF) &&
    this.#userService.hasPermission(Permissions.CAN_MODIFY_RESERVATION);

  get hasRequiredPermission(): boolean {
    return this.permissionOverride() ?? this.requiredPermissions.some(permission => this.#userService.hasPermission(permission));
  }

  get isAppendOnlyHistoryEnabled(): boolean {
    return this.#optimizelyService.isFeatureEnabled(FeatureFlags.APPEND_ONLY_NOTE_HISTORY) === true;
  }

  readonly customerNotesDraft = input(false);
  /** With `customerNotesQuoteId`, points the panel at that quote's customer notes and nothing else. */
  readonly customerNotesLeadId = input<string | null>(null);
  readonly customerNotesOrderId = input<number | null>(null);
  readonly customerNotesQuoteId = input<string | null>(null);
  /** Shows the customer notes without Add new or Edit, for a record whose notes can no longer change. */
  readonly customerNotesReadOnly = input(false);
  readonly customerNotesReservationId = input<string | null>(null);
  /**
   * A quote customer note the backend accepted: created, edited or deleted from this panel. Quote
   * panels only: reservation and order panels never emit it.
   */
  readonly quoteCustomerNotesSaved = outputFromObservable(
    toObservable(this.#quoteCustomerNotesStore.savedChangeCount).pipe(
      filter((count: number) => count > 0),
      map((): void => undefined),
    ),
  );
  /**
   * The newest change among the quote's customer notes as the backend stamped it, `null` with none,
   * on every read of them. Quote panels only. Lets the host compare it with the quote's last send
   * even after a reload or an edit made by someone else.
   */
  readonly quoteCustomerNotesChangedAt = outputFromObservable(
    toObservable(computed(() => latestCustomerNoteChangeAt(this.#quoteCustomerNotesStore.notes()))),
  );
  readonly #customerNotesQuote = computed(() => toQuoteCustomerNotesRef(this.customerNotesLeadId(), this.customerNotesQuoteId()), {
    equal: isSameQuoteCustomerNotesRef,
  });
  /**
   * A staff note change the parent could not persist. The form closes as soon as it is submitted, so a new
   * value reopens it with what the user typed and an error, ready to try again.
   */
  readonly failedSave = input<NoteActionEvent | null>(null);
  /** The retry form `failedSave` opened was closed, resubmitted or not: the parent can let the failure go. */
  readonly failedSaveDismissed = output<void>();
  readonly #customerNotesSource = computed(() =>
    customerNotesSourceFor(
      { canManageCustomerNotes: this.#canManageCustomerNotes, isQuoteCustomerNotesEnabled: this.#isCustomerNotesFeatureEnabled },
      {
        draft: this.customerNotesDraft() && this.#draftCustomerNotesStore !== null,
        orderId: this.customerNotesOrderId(),
        quote: this.#customerNotesQuote(),
        reservationId: this.customerNotesReservationId(),
      },
    ),
  );
  readonly #customerNotesStore = computed<CustomerNotesStoreContract | null>(() => {
    switch (this.#customerNotesSource()) {
      case customerNotesSource.Draft:
        return this.#draftCustomerNotesStore;
      case customerNotesSource.Order:
        return this.#orderCustomerNotesStore;
      case customerNotesSource.Quote:
        return this.#quoteCustomerNotesStore;
      case customerNotesSource.Reservation:
        return this.#reservationCustomerNotesStore;
      default:
        return null;
    }
  });
  protected readonly isCustomerNotesEnabled = computed(() => this.#customerNotesStore() !== null);
  readonly #customerNotesOrderIdToLoad = computed(() =>
    this.#customerNotesSource() === customerNotesSource.Order ? this.customerNotesOrderId() : null,
  );
  readonly #customerNotesQuoteToLoad = computed(
    () => (this.#customerNotesSource() === customerNotesSource.Quote ? this.#customerNotesQuote() : null),
    { equal: isSameQuoteCustomerNotesRef },
  );
  readonly #customerNotesReservationIdToLoad = computed(() =>
    this.#customerNotesSource() === customerNotesSource.Reservation ? this.customerNotesReservationId() : null,
  );
  protected readonly customerNotes = computed(() => this.#customerNotesStore()?.notes().map(toCustomerNoteInput) ?? []);
  // Until the customer notes are known, Add new stays hidden: offering Customer could POST a second one,
  // and a draft opened meanwhile would keep the audiences it started with.
  readonly #areCustomerNotesPending = computed(() => {
    const store = this.#customerNotesStore();
    return store !== null && (store.isLoading() || store.isMutating());
  });
  readonly #canAddCustomerNote = computed(() => {
    const store = this.#customerNotesStore();
    return store !== null && !this.customerNotesReadOnly() && store.error() === null && this.customerNotes().length === 0;
  });
  readonly #customerNotesMutationError = computed(() => this.#customerNotesStore()?.mutationError() ?? null);
  protected readonly newNoteAudiences = computed(() =>
    this.isCustomerNotesEnabled() && !this.#areCustomerNotesPending()
      ? audiencesForNewNote(this.hasRequiredPermission && this.unifiedNote() === null, this.#canAddCustomerNote())
      : [],
  );
  readonly #draft = linkedSignal<NoteActionEvent | null, NoteDraft | null>({
    source: this.failedSave,
    computation: failedSave => (failedSave === null ? null : untracked(() => this.#retryDraftOf(failedSave))),
  });
  protected readonly draft = this.#draft.asReadonly();
  readonly note = input<OrderNote | null>(null);
  protected readonly noteAudience = noteAudience;
  readonly tileLayout = input(false);
  /** Non-null takes over from `requiredPermissions` — for a gate that isn't an org-membership permission. */
  readonly permissionOverride = input<boolean | null>(null);

  readonly #parsedNoteHistory = computed(() => parseNoteHistory(this.note()));

  readonly #noteHistoryEntriesNewestFirst = computed(() => {
    const parsed = this.#parsedNoteHistory();
    return [...parsed.entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  });

  readonly unifiedNote: Signal<UnifiedNote | null> = computed(() => {
    const note = this.note();
    if (!note) {
      return null;
    }

    const parsed = this.#parsedNoteHistory();
    if (parsed.entries.length > 0 && (parsed.isStructured || this.isAppendOnlyHistoryEnabled)) {
      const latest = this.#noteHistoryEntriesNewestFirst()[0]!;
      return {
        id: note.id,
        message: latest.message,
        modified_at: latest.createdAt || note.modifiedAt,
        title: latest.title ? latest.title : (note.title ?? null),
        username: latest.author.email || note.username || null,
      };
    }

    return {
      id: note.id,
      title: note.title ?? null,
      message: note.message,
      username: note.username ?? null,
      modified_at: note.modifiedAt,
    };
  });

  readonly timelineEntries: Signal<NoteHistoryEntry[]> = computed(() => {
    if (!this.isAppendOnlyHistoryEnabled) {
      return [];
    }
    return this.#noteHistoryEntriesNewestFirst();
  });

  /**
   * A customer note is being written. Add new is held back meanwhile (a second click could POST a
   * second note), but the Notes row stays: the first note of a record would otherwise make the panel
   * vanish until the save comes back.
   */
  protected readonly isSavingCustomerNote = computed(() => this.#customerNotesStore()?.isMutating() ?? false);
  protected readonly hasAnyNote = computed(() => this.unifiedNote() !== null || this.customerNotes().length > 0);

  /**
   * Whether the panel draws nothing: no note to list, nothing to add and no draft open. The host
   * still sits in its parent's layout, so a parent that spaces its children (a flex gap) can hide
   * it on this class instead of keeping an empty slot.
   */
  protected readonly isEmpty = computed(() => {
    const canAddNote = this.isCustomerNotesEnabled() ? this.newNoteAudiences().length > 0 : this.hasRequiredPermission;
    return this.draft() === null && !this.hasAnyNote() && !canAddNote && !this.isSavingCustomerNote();
  });

  readonly noteCount: Signal<number | undefined> = computed(() => {
    const total = (this.#internalNoteCount() ?? 0) + this.customerNotes().length;
    return total > 0 ? total : undefined;
  });

  readonly #internalNoteCount: Signal<number | undefined> = computed(() => {
    const note = this.note();
    if (!note) {
      return undefined;
    }
    if (this.isAppendOnlyHistoryEnabled) {
      const count = this.#parsedNoteHistory().entries.length;
      return count > 0 ? count : undefined;
    }
    return note.title || note.message ? 1 : undefined;
  });

  @Output() deleteNote = new EventEmitter<void>();

  @ViewChild(IgntExpansionPanelComponent) expansionPanel: IgntExpansionPanelComponent | undefined;
  @Input() hideNoteDetails$ = new BehaviorSubject(false);
  @Input() isCollapsed = true;

  localTimezone: string = Intl.DateTimeFormat().resolvedOptions().timeZone;

  @Output() noteUpdated = new EventEmitter<NoteActionEvent>();
  @Input() requiredPermissions: Permissions[] = [Permissions.CAN_VIEW_VALIDATE];
  readonly NoteEditFormMode = noteEditFormMode;

  @Input() showErrorSubject = new BehaviorSubject<{ code: string; message: string } | null>(null);
  @Input() showValidationAppMessage = false;

  constructor() {
    this.hideNoteDetails$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(value => {
      if (value) {
        this.hideNoteDetails();
        this.#changeDetectorRef.markForCheck();
        setTimeout(() => {
          this.hideNoteDetails$.next(false);
        }, 0);
      }
    });

    this.showErrorSubject.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(error => {
      if (error) {
        this.#showErrorModal(error);
        this.showErrorSubject.next(null);
      }
    });

    // A failed load only withholds Customer from Add new: every order card on a page has its own panel,
    // so a modal per failure would stack one per card over the page.
    this.#orderCustomerNotesStore.loadNotes(this.#customerNotesOrderIdToLoad);
    this.#quoteCustomerNotesStore.loadNotes(this.#customerNotesQuoteToLoad);
    this.#reservationCustomerNotesStore.loadNotes(this.#customerNotesReservationIdToLoad);

    toObservable(this.#customerNotesMutationError)
      .pipe(
        filter(error => error !== null),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(error => {
        this.#showErrorModal(error);
        this.#customerNotesStore()?.clearMutationError();
      });
  }

  clickOnShowNoteDetail(note: UnifiedNote): void {
    this.#draft.set({
      audience: noteAudience.Internal,
      availableAudiences: this.isCustomerNotesEnabled() ? [noteAudience.Internal] : [],
      mode: noteEditFormMode.Update,
      note,
    });
  }

  onEditCustomerNote(note: NoteInput): void {
    this.#draft.set({
      audience: noteAudience.Customer,
      availableAudiences: [noteAudience.Customer],
      mode: noteEditFormMode.Update,
      note,
    });
  }

  onAudienceChange(audience: NoteAudienceET): void {
    this.#draft.update(draft => (draft ? { ...draft, audience } : draft));
  }

  onEditLinkClick(note: UnifiedNote): void {
    if (this.isAppendOnlyHistoryEnabled) {
      this.#draft.set({
        audience: noteAudience.Internal,
        availableAudiences: this.isCustomerNotesEnabled() ? [noteAudience.Internal] : [],
        mode: noteEditFormMode.Create,
        note: null,
      });
      return;
    }
    this.clickOnShowNoteDetail(note);
  }

  trackTimelineEntry(_index: number, entry: NoteHistoryEntry): string {
    return `${entry.createdAt}|${entry.author.email}|${entry.title}|${entry.message}`;
  }

  hideNoteDetails(): void {
    const wasRetrying = this.#draft()?.hasSaveError === true;
    this.#draft.set(null);
    if (wasRetrying) {
      this.failedSaveDismissed.emit();
    }
    this.#changeDetectorRef.markForCheck();
  }

  onAddNote(): void {
    const availableAudiences = this.newNoteAudiences();
    this.#draft.set({
      audience: availableAudiences[0] ?? noteAudience.Internal,
      availableAudiences,
      mode: noteEditFormMode.Create,
      note: null,
    });
    if (this.expansionPanel) {
      this.expansionPanel.accordionItem.open();
    }
  }

  onDeleteNote(): void {
    this.#openDeleteNoteModal();
  }

  #openDeleteNoteModal(): void {
    const draft = this.#draft();
    const modal = this.#modalService.open(MessageModalComponent, {
      centered: true,
    });

    modal.componentInstance.title = this.#translateService.instant('boxOffice.order.notes.deleteNoteTitle');
    modal.componentInstance.messages = [this.#translateService.instant('boxOffice.order.notes.deleteNoteConfirmMessage')];
    modal.componentInstance.cancelButtonLabel = this.#translateService.instant('boxOffice.order.notes.deleteNoteTitle');
    modal.componentInstance.acceptButtonLabel = this.#translateService.instant('boxOffice.order.notes.keepEditing');
    modal.componentInstance.showDangerCancelButton = true;

    modal.componentInstance.responseEmitter.pipe(take(1)).subscribe((response: boolean) => {
      if (!response) {
        if (draft?.audience === noteAudience.Customer && draft.note) {
          this.#customerNotesStore()?.deleteNote(draft.note.id);
        } else {
          this.deleteNote.emit();
        }
        this.hideNoteDetails();
      }
    });
  }

  processFormChanges(event: NoteChanges | null): void {
    const draft = this.#draft();
    if (!event || !draft) {
      this.hideNoteDetails();
      return;
    }

    const noteChanges: NoteChanges = {
      title: event.title,
      message: event.message,
    };

    if (draft.audience === noteAudience.Customer) {
      this.#saveCustomerNote(draft, noteChanges);
    } else {
      const action = draft.mode === noteEditFormMode.Create ? noteAction.CREATE : noteAction.UPDATE;
      this.noteUpdated.emit({
        action,
        noteChanges,
      });
    }
    this.hideNoteDetails();
  }

  #retryDraftOf(failedSave: NoteActionEvent): NoteDraft | null {
    const note = this.unifiedNote();
    const isOnExistingNote = failedSave.action !== noteAction.CREATE && note !== null;
    if (failedSave.action === noteAction.DELETE && !isOnExistingNote) {
      return null;
    }

    return {
      audience: noteAudience.Internal,
      availableAudiences: this.isCustomerNotesEnabled() ? [noteAudience.Internal] : [],
      hasSaveError: true,
      mode: isOnExistingNote ? noteEditFormMode.Update : noteEditFormMode.Create,
      note: isOnExistingNote ? note : null,
      pendingChanges: failedSave.noteChanges ?? (isOnExistingNote ? { message: note.message, title: note.title } : null),
    };
  }

  #saveCustomerNote(draft: NoteDraft, changes: NoteChanges): void {
    if (draft.mode === noteEditFormMode.Update && draft.note) {
      this.#customerNotesStore()?.updateNote({ changes, noteId: draft.note.id });
      return;
    }
    this.#customerNotesStore()?.createNote(changes);
  }

  #showErrorModal(error: { message: string }): void {
    const modal = this.#modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.#translateService.instant('common.errorTitle');
    modal.componentInstance.messages = [this.#translateService.instant(error.message ?? 'errors.generic')];
  }
}
