import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal, WritableSignal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';

import { BaseErrorResponse } from '@fz-original/app/shared/models/base-response';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { ToastService } from '@fz-original/app/shared/services/toast/toast.service';
import { IGNT_DIALOG_DATA, IGNT_DIALOG_REF, IgntButtonComponent, IgntDialogModule, IgntDialogRef } from '@ignite/common';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { forkJoin, map, Observable, of, take, tap } from 'rxjs';

import { TagChipComponent } from '../../components/tag-chip/tag-chip.component';
import { BookingTagsModalData, BookingTagsModalResult } from '../../models/booking-tags-modal.model';
import { Tag } from '../../models/tag.model';
import { TagAssignmentsService } from '../../services/tag-assignments.service';
import { TagsService } from '../../services/tags.service';
import { groupTagsByType, TagTypeGroup } from '../../utils/group-tags-by-type.util';
import { tagTargetIdOf, tagTargetSubtitleKey, tagTargetTypeOf } from '../../utils/tag-target.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntButtonComponent, IgntCheckboxComponent, IgntDialogModule, TagChipComponent, TranslateModule],
  selector: 'app-booking-tags-modal',
  standalone: true,
  styleUrl: './booking-tags-modal.component.scss',
  templateUrl: './booking-tags-modal.component.html',
})
export class BookingTagsModalComponent {
  readonly #data = inject<BookingTagsModalData>(IGNT_DIALOG_DATA);
  readonly #destroyRef = inject(DestroyRef);
  // `IGNT_DIALOG_REF` is an unparameterised `IgntDialogRef`, so the result type is named here.
  readonly #dialogRef = inject(IGNT_DIALOG_REF) as IgntDialogRef<BookingTagsModalResult>;
  readonly #partnerService = inject(PartnerService);
  readonly #tagAssignmentsService = inject(TagAssignmentsService);
  readonly #tagsService = inject(TagsService);
  readonly #toastService = inject(ToastService);
  readonly #translate = inject(TranslateService);

  readonly #lockedIds: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(new Set());
  readonly #partnerId = this.#partnerService.getActingOrganizationId();
  readonly #selectedIds: WritableSignal<readonly number[]> = signal<readonly number[]>([]);

  protected readonly isSaving: WritableSignal<boolean> = signal<boolean>(false);

  // An empty list is loading, failed or genuinely empty, and only the third reads as "no tags yet".
  protected readonly isLoading: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly hasLoadError: WritableSignal<boolean> = signal<boolean>(false);

  // The whole catalog: any tag may be attached to any target, so nothing filters by what it is "for".
  protected readonly tags: Signal<Tag[]> = toSignal(this.#load(), { initialValue: [] });

  // Grouped first so the blocks keep the order the catalog answered with, then locked-first inside each
  // one: sorting the flat list first would let a group whose only option is locked jump the queue.
  protected readonly groups: Signal<TagTypeGroup<Tag>[]> = computed<TagTypeGroup<Tag>[]>(() =>
    groupTagsByType(this.tags()).map(group => ({
      tags: [...group.tags.filter(tag => this.isLocked(tag)), ...group.tags.filter(tag => !this.isLocked(tag))],
      type: group.type,
    })),
  );

  protected readonly hasTagTypes: Signal<boolean> = computed<boolean>(() => this.groups().some(group => group.type !== null));
  protected readonly subtitleKey: Signal<string> = computed<string>(() => tagTargetSubtitleKey(this.#data.target));

  protected headingIdOf(group: TagTypeGroup<Tag>): string {
    return `booking-tags-modal-group-${group.type?.id ?? 'none'}`;
  }

  protected groupNameOf(group: TagTypeGroup<Tag>): string {
    return group.type?.name ?? this.#translate.instant('partnerTags.type.uncategorised');
  }

  protected isChecked(tag: Tag): boolean {
    return this.isLocked(tag) || this.isSelected(tag);
  }

  protected isLocked(tag: Tag): boolean {
    return this.#lockedIds().has(tag.id);
  }

  protected isSelected(tag: Tag): boolean {
    return this.#selectedIds().includes(tag.id);
  }

  protected onCancel(): void {
    if (this.isSaving()) {
      return;
    }

    this.#dialogRef.close();
  }

  // Guarded here as well as on the button, because a click can arrive between the two: the write is a
  // full replace and the selection is empty until the read lands, so saving early would clear the tags.
  protected onSave(): void {
    if (this.isSaving() || this.isLoading() || this.hasLoadError() || this.#partnerId === null) {
      return;
    }

    this.isSaving.set(true);
    const tagIds = this.#selectedIds();

    this.#tagAssignmentsService
      .replaceAssignments(this.#partnerId, this.#data.target, tagIds)
      .pipe(take(1), takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.isSaving.set(false);

        if (response.error !== null) {
          this.#toastError(response.error, 'partnerTags.error.saveFailed', true);

          return;
        }

        this.#dialogRef.close({ tagIds });
      });
  }

  // The save snapshots the selection, so a toggle accepted mid-request would be silently dropped.
  protected onToggle(tag: Tag): void {
    if (this.isSaving() || this.isLocked(tag)) {
      return;
    }

    const selected = this.#selectedIds();

    this.#selectedIds.set(selected.includes(tag.id) ? selected.filter(id => id !== tag.id) : [...selected, tag.id]);
  }

  // The selection comes from the assignments endpoint, never from what the opener is rendering: a
  // presentation-filtered payload would open a colourless tag unticked and the next save would drop it.
  #load(): Observable<Tag[]> {
    const partnerId = this.#partnerId;

    if (partnerId === null) {
      this.isLoading.set(false);
      this.hasLoadError.set(true);

      return of([]);
    }

    const target = this.#data.target;

    return forkJoin({
      assigned: this.#tagAssignmentsService.getAssignments(partnerId, tagTargetTypeOf(target), [tagTargetIdOf(target)]),
      catalog: this.#tagsService.getTags(partnerId),
    }).pipe(
      tap(({ assigned, catalog }) => {
        this.isLoading.set(false);

        const error = catalog.error ?? assigned.error;
        this.hasLoadError.set(error !== null && error !== undefined);

        if (error !== null && error !== undefined) {
          this.#toastError(error, 'partnerTags.error.loadFailed');

          return;
        }

        const assignedIds = (assigned.data?.[0]?.tags ?? []).map(tag => tag.id);
        this.#selectedIds.set(assignedIds);
        this.#lockedIds.set(new Set((this.#data.lockedTagIds ?? []).filter(id => !assignedIds.includes(id))));
      }),
      map(({ catalog }) => catalog.data ?? []),
    );
  }

  // The status decides the copy, since the envelope's message is the backend's own exception text. A
  // 404 only means "that tag is gone" on the write, the one call that names tag ids.
  #toastError(error: BaseErrorResponse, fallbackKey: string, sentTagIds = false): void {
    const isMissingTag = sentTagIds && error.code === 404;

    this.#toastService.addError(this.#translate.instant(isMissingTag ? 'partnerTags.error.notFound' : fallbackKey));
  }
}
