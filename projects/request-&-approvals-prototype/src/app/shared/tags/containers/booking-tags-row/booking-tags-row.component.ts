import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, Signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { BaseResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { Permissions } from '@fz-original/app/shared/services/user/permissions';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntDialogService, IgntTooltipDirective, type IgntDialogRef } from '@ignite/common';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { BehaviorSubject, distinctUntilChanged, filter, map, Observable, of, shareReplay, startWith, switchMap, take } from 'rxjs';

import { TagChipListComponent } from '../../components/tag-chip-list/tag-chip-list.component';
import { BookingTagsModalData, BookingTagsModalResult } from '../../models/booking-tags-modal.model';
import { BookingTagsRead, TagCatalogRead } from '../../models/booking-tags-row.model';
import { AssignedTag, TagAssignment } from '../../models/tag-assignment.model';
import { BookingTagTarget, LeadTagTarget, Tag } from '../../models/tag.model';
import { TagAssignmentsService } from '../../services/tag-assignments.service';
import { TagsService } from '../../services/tags.service';
import { groupTagsByType, TagTypeGroup } from '../../utils/group-tags-by-type.util';
import { inheritedTagsOf, mergedTagsOf } from '../../utils/tag-inheritance.util';
import { isSameTagTarget, tagTargetIdOf, tagTargetTypeOf } from '../../utils/tag-target.util';
import { BookingTagsModalComponent } from '../booking-tags-modal/booking-tags-modal.component';

const NO_TAGS: readonly AssignedTag[] = [];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[hidden]': '!isVisible()' },
  imports: [IgntIconButtonComponent, IgntTooltipDirective, TagChipListComponent, TranslateModule],
  selector: 'app-booking-tags-row',
  standalone: true,
  styleUrl: './booking-tags-row.component.scss',
  templateUrl: './booking-tags-row.component.html',
})
export class BookingTagsRowComponent {
  readonly target = input.required<BookingTagTarget | LeadTagTarget>();
  readonly sessionTypeIds = input<readonly number[]>([]);
  readonly canEdit = input<boolean>();

  protected readonly addIcon = ['fal', 'plus'] as const;

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #partnerService = inject(PartnerService);
  readonly #tagAssignmentsService = inject(TagAssignmentsService);
  readonly #tagsService = inject(TagsService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly #partnerId = this.#partnerService.getActingOrganizationId();
  readonly #reload$ = new BehaviorSubject<null>(null);
  readonly #sessionTypeIds$: Observable<readonly number[]> = toObservable(this.sessionTypeIds);
  readonly #target$: Observable<BookingTagTarget | LeadTagTarget> = toObservable(this.target).pipe(
    distinctUntilChanged((previous, current) => isSameTagTarget(previous, current)),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  #editorRef: IgntDialogRef<BookingTagsModalResult> | null = null;

  readonly #catalog$: Observable<TagCatalogRead> = this.#readCatalog().pipe(shareReplay({ bufferSize: 1, refCount: true }));
  readonly #shown$: Observable<TagCatalogRead> = this.#catalog$.pipe(filter(catalog => catalog === 'stocked' || catalog === 'failed'));

  readonly #catalog: Signal<TagCatalogRead> = toSignal(this.#catalog$, { initialValue: 'pending' });
  readonly #bookingRead: Signal<BookingTagsRead | null> = toSignal(this.#load(), { initialValue: null });
  readonly #ticketTypeRead: Signal<readonly AssignedTag[] | null> = toSignal(this.#loadTicketTypeTags(), { initialValue: null });

  readonly #inheritedTags: Signal<readonly AssignedTag[]> = computed(() =>
    inheritedTagsOf(this.#ticketTypeRead() ?? NO_TAGS, this.#bookingRead()?.tags ?? NO_TAGS),
  );

  readonly #canModifyTicketTypes: boolean = this.#userService.hasPermission(Permissions.CAN_MODIFY_TICKET_TYPES);

  protected readonly isEditable: Signal<boolean> = computed(() => this.canEdit() ?? this.#canModifyTicketTypes);

  protected readonly hasLoadError: Signal<boolean> = computed(() => this.#bookingRead()?.hasFailed === true);
  protected readonly isLoading: Signal<boolean> = computed(() => this.#bookingRead() === null || this.#ticketTypeRead() === null);
  protected readonly isVisible: Signal<boolean> = computed(() => {
    const isShown = this.#catalog() === 'stocked' || this.#catalog() === 'failed';

    return isShown && (this.isEditable() || this.hasLoadError() || this.tagsToShow().length > 0);
  });
  protected readonly tagsToShow: Signal<readonly AssignedTag[]> = computed(() => [
    ...(this.#bookingRead()?.tags ?? NO_TAGS),
    ...this.#inheritedTags(),
  ]);

  // The `+N` belongs to a group rather than to the row, so a type never hides behind another type's
  // overflow badge.
  protected readonly groups: Signal<TagTypeGroup<AssignedTag>[]> = computed(() => groupTagsByType(this.tagsToShow()));
  protected readonly hasTagTypes: Signal<boolean> = computed(() => this.groups().some(group => group.type !== null));

  protected groupNameOf(group: TagTypeGroup<AssignedTag>): string {
    return group.type?.name ?? this.#translateService.instant('partnerTags.type.uncategorised');
  }

  constructor() {
    this.#target$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#closeEditor());
    this.#destroyRef.onDestroy(() => this.#closeEditor());
  }

  protected openEditor(): void {
    const partnerId = this.#partnerId;

    if (partnerId === null || this.isLoading()) {
      return;
    }

    const data: BookingTagsModalData = { lockedTagIds: this.#inheritedTags().map(tag => tag.id), target: this.target() };
    const editorRef = this.#dialogService.openModal<BookingTagsModalResult, BookingTagsModalData>(BookingTagsModalComponent, {
      data,
      size: 'md',
    });

    this.#editorRef = editorRef;

    editorRef.closed$.pipe(take(1), takeUntilDestroyed(this.#destroyRef)).subscribe(result => {
      this.#editorRef = null;

      if (result === undefined) {
        return;
      }

      this.#reload$.next(null);
    });
  }

  #bookingReadOf(response: BaseResponse<TagAssignment[]>): BookingTagsRead {
    if (response.error !== null) {
      this.#toastService.addError(this.#translateService.instant('partnerTags.error.loadFailed'));

      return { hasFailed: true, tags: NO_TAGS };
    }

    return { hasFailed: false, tags: response.data?.[0]?.tags ?? NO_TAGS };
  }

  #catalogReadOf(response: BaseResponse<Tag[]>): TagCatalogRead {
    if (response.error !== null) {
      return response.error.code === 403 ? 'empty' : 'failed';
    }

    return (response.data ?? []).length === 0 ? 'empty' : 'stocked';
  }

  #closeEditor(): void {
    const editorRef = this.#editorRef;

    this.#editorRef = null;
    editorRef?.close();
  }

  #load(): Observable<BookingTagsRead | null> {
    const partnerId = this.#partnerId;

    if (partnerId === null) {
      return of({ hasFailed: false, tags: NO_TAGS });
    }

    return this.#shown$.pipe(
      switchMap(() => this.#target$),
      switchMap(target =>
        this.#reload$.pipe(
          switchMap(() => this.#tagAssignmentsService.getAssignments(partnerId, tagTargetTypeOf(target), [tagTargetIdOf(target)])),
          map(response => this.#bookingReadOf(response)),
          startWith<BookingTagsRead | null>(null),
        ),
      ),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  #loadTicketTypeTags(): Observable<readonly AssignedTag[] | null> {
    const partnerId = this.#partnerId;

    if (partnerId === null) {
      return of(NO_TAGS);
    }

    return this.#shown$.pipe(
      switchMap(() => this.#sessionTypeIds$),
      distinctUntilChanged(
        (previous, current) => previous.length === current.length && previous.every((id, index) => id === current[index]),
      ),
      switchMap(sessionTypeIds =>
        sessionTypeIds.length === 0
          ? of(NO_TAGS)
          : this.#tagAssignmentsService.getAssignments(partnerId, 'session_type', sessionTypeIds.map(String)).pipe(
              map(response => this.#ticketTypeTagsOf(response)),
              startWith<readonly AssignedTag[] | null>(null),
            ),
      ),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  #readCatalog(): Observable<TagCatalogRead> {
    const partnerId = this.#partnerId;

    if (partnerId === null) {
      return of<TagCatalogRead>('empty');
    }

    return this.#tagsService.getTags(partnerId).pipe(
      map(response => this.#catalogReadOf(response)),
      takeUntilDestroyed(this.#destroyRef),
    );
  }

  #ticketTypeTagsOf(response: BaseResponse<TagAssignment[]>): readonly AssignedTag[] {
    return response.error !== null ? NO_TAGS : mergedTagsOf(response.data ?? []);
  }
}
