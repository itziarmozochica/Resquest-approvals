import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { canModifyTicketProtection } from '@fz-original/app/shared/models/session-type/session-type.util';
import { PartnerService } from '@fz-original/app/shared/services/partner/partner.service';
import { AddOnCategory, SessionType, SessionTypeInventory } from '@fz-original/app/shared/services/sessions/session-type.model';
import { SessionTypeService } from '@fz-original/app/shared/services/sessions/session-type.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import {
  IGNT_DIALOG_REF,
  IgntAlertComponent,
  IgntButtonComponent,
  IgntDialogContentComponent,
  IgntDialogFooterComponent,
  IgntDialogHeaderComponent,
  IgntDialogRef,
  type IgntButtonIcon,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntCheckboxComponent } from '@ignite/legacy/components/ignt-checkbox/ignt-checkbox.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';
import { catchError, EMPTY, forkJoin, map, Observable, of, tap } from 'rxjs';

import { crossEventBulkEditStepCompleted } from '../../../tracking/events/cross-event-bulk-edit-step-completed.event';
import {
  CrossEventBulkEditLoadedInventory,
  CrossEventBulkEditTicketType,
  CrossEventBulkEditTicketTypeRow,
  CrossEventBulkEditTicketTypeSortColumn,
} from '../../models/cross-event-bulk-edit-ticket-type.model';
import {
  CrossEventBulkEditPanelStep,
  crossEventBulkEditTicketTypeSelectionLimit,
} from '../../models/store/cross-event-bulk-edit-store.model';
import { CrossEventBulkEditStore } from '../../store/cross-event-bulk-edit.store';
import { toSelectProductsStepCompletedData } from '../../utils/cross-event-bulk-edit-tracking.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntAlertComponent,
    IgntButtonComponent,
    IgntCheckboxComponent,
    IgntDialogContentComponent,
    IgntDialogFooterComponent,
    IgntDialogHeaderComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-cross-event-bulk-edit-ticket-type-panel',
  styleUrl: './cross-event-bulk-edit-ticket-type-panel.component.scss',
  templateUrl: './cross-event-bulk-edit-ticket-type-panel.component.html',
})
export class CrossEventBulkEditTicketTypePanelComponent {
  readonly #chevronDownIcon: IgntButtonIcon = { name: 'chevron-down', variant: 'light' };
  readonly #chevronUpIcon: IgntButtonIcon = { name: 'chevron-up', variant: 'light' };
  readonly #dialogRef = inject<IgntDialogRef<void> | null>(IGNT_DIALOG_REF, { optional: true });
  readonly #expandedRowKeys = signal<ReadonlySet<string>>(new Set());
  readonly #fzTracking = inject(FzTrackingService);
  readonly #partnerService = inject(PartnerService);
  readonly #sessionTypeService = inject(SessionTypeService);
  readonly #store = inject(CrossEventBulkEditStore);
  readonly #userService = inject(UserService);

  protected readonly isContinueUnavailable = computed(() => !this.#store.canContinueFromTicketTypes());
  protected readonly isLoading = signal(true);
  protected readonly isTicketTypeSelectionFull = this.#store.isTicketTypeSelectionFull;
  protected readonly loadFailed = signal(false);
  protected readonly rows = signal<CrossEventBulkEditTicketTypeRow[]>([]);
  protected readonly searchControl = new FormControl('', { nonNullable: true });
  protected readonly searchLeadIcon: [string, string] = ['far', 'search'];
  readonly #searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  protected readonly selectedPlanCount = computed(() => this.#store.selectedPlanIds().length);
  protected readonly selectionLimit = crossEventBulkEditTicketTypeSelectionLimit;
  protected readonly sortColumn = signal<CrossEventBulkEditTicketTypeSortColumn | null>(null);
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');

  protected readonly visibleRows = computed(() => {
    const query = this.#searchTerm().trim().toLocaleLowerCase();
    const rows = this.rows().filter(row => {
      if (query === '') {
        return true;
      }

      return row.label.toLocaleLowerCase().includes(query) || row.groupName.toLocaleLowerCase().includes(query);
    });
    const column = this.sortColumn();
    if (column === null) {
      return rows;
    }

    return [...rows].sort((left, right) => compareRows(left, right, column, this.sortDirection()));
  });

  protected readonly appearsInIcons = computed((): Readonly<Record<string, IgntButtonIcon>> => {
    const expandedRowKeys = this.#expandedRowKeys();
    const icons: Record<string, IgntButtonIcon> = {};
    for (const row of this.visibleRows()) {
      icons[row.key] = expandedRowKeys.has(row.key) ? this.#chevronUpIcon : this.#chevronDownIcon;
    }
    return icons;
  });

  protected readonly appearsInSortIcon = computed((): IgntButtonIcon => this.#sortTrailingIcon('appearsIn'));
  protected readonly groupSortIcon = computed((): IgntButtonIcon => this.#sortTrailingIcon('group'));

  protected readonly isSelectAllChecked = computed(() => {
    const rows = this.visibleRows();
    if (rows.length === 0) {
      return false;
    }

    const selectedCount = rows.filter(row => isRowSelected(row, this.#store.selectedTicketTypeIds())).length;
    if (selectedCount === 0) {
      return false;
    }

    return selectedCount === rows.length || this.isTicketTypeSelectionFull();
  });

  protected readonly incompleteSelectedTicketTypeCount = computed(() => {
    const selectedPlanCount = this.selectedPlanCount();
    const selectedTicketTypeIds = this.#store.selectedTicketTypeIds();
    return this.rows().filter(row => isRowSelected(row, selectedTicketTypeIds) && row.plans.length < selectedPlanCount).length;
  });

  constructor() {
    this.#fetchTicketTypes().pipe(takeUntilDestroyed()).subscribe();
  }

  protected isExpanded(key: string): boolean {
    return this.#expandedRowKeys().has(key);
  }

  protected isRowChecked(row: CrossEventBulkEditTicketTypeRow): boolean {
    return isRowSelected(row, this.#store.selectedTicketTypeIds());
  }

  protected isRowDisabled(row: CrossEventBulkEditTicketTypeRow): boolean {
    if (isRowSelected(row, this.#store.selectedTicketTypeIds())) {
      return false;
    }

    return !canSelectIds(this.#store.selectedTicketTypeIds(), row.sessionTypeIds, this.selectionLimit);
  }

  protected onContinue(): void {
    if (!this.#store.canContinueFromTicketTypes()) {
      return;
    }

    this.#fzTracking.track(
      crossEventBulkEditStepCompleted(toSelectProductsStepCompletedData(this.#store.selectedTicketTypeIds(), this.#store.sessionTypes())),
    );
    this.#store.setPanelStep(CrossEventBulkEditPanelStep.properties);
  }

  protected onDiscard(): void {
    this.#dialogRef?.close();
  }

  protected onSort(column: CrossEventBulkEditTicketTypeSortColumn): void {
    if (this.sortColumn() === column) {
      this.sortDirection.update(direction => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortColumn.set(column);
    this.sortDirection.set('asc');
  }

  protected onToggleAll(): void {
    const rows = this.visibleRows();
    const sessionTypeIds = rows.flatMap(row => row.sessionTypeIds);
    if (this.isSelectAllChecked()) {
      this.#store.deselectTicketTypes(sessionTypeIds);
      return;
    }

    const selectedTicketTypeIds = new Set(this.#store.selectedTicketTypeIds());
    const incoming: number[] = [];
    for (const row of rows) {
      const missing = row.sessionTypeIds.filter(sessionTypeId => !selectedTicketTypeIds.has(sessionTypeId));
      if (selectedTicketTypeIds.size + incoming.length + missing.length > this.selectionLimit) {
        continue;
      }

      incoming.push(...missing);
    }
    this.#store.selectTicketTypes(incoming);
  }

  protected onToggleAppearsIn(key: string): void {
    this.#expandedRowKeys.update(current => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
        return next;
      }

      next.add(key);
      return next;
    });
  }

  protected onToggleRow(row: CrossEventBulkEditTicketTypeRow): void {
    if (isRowSelected(row, this.#store.selectedTicketTypeIds())) {
      this.#store.deselectTicketTypes(row.sessionTypeIds);
      return;
    }

    if (!canSelectIds(this.#store.selectedTicketTypeIds(), row.sessionTypeIds, this.selectionLimit)) {
      return;
    }

    this.#store.selectTicketTypes(row.sessionTypeIds);
  }

  #failLoad(): void {
    this.isLoading.set(false);
    this.loadFailed.set(true);
    this.rows.set([]);
  }

  #fetchTicketTypes(): Observable<(CrossEventBulkEditLoadedInventory | null)[]> {
    const planIds = this.#store.selectedPlanIds();
    if (planIds.length === 0) {
      this.isLoading.set(false);
      this.loadFailed.set(false);
      this.rows.set([]);
      return EMPTY;
    }

    const partnerId = this.#partnerService.getPartner()?.id;
    if (partnerId === undefined) {
      this.#failLoad();
      return EMPTY;
    }

    this.isLoading.set(true);
    this.loadFailed.set(false);

    return forkJoin(
      planIds.map(planId =>
        this.#sessionTypeService.getSessionTypesInventoryByPlanId(planId, { isArchived: false }).pipe(
          map(inventory => this.#toLoadedInventory(planId, inventory)),
          catchError(() => of(null)),
        ),
      ),
    ).pipe(
      tap(results => {
        if (!results.every((result): result is CrossEventBulkEditLoadedInventory => result !== null)) {
          this.#failLoad();
          return;
        }

        const rows = groupTicketTypes(results.flatMap(result => result.ticketTypes));
        const ticketTypes = results.flatMap(result => result.ticketTypes);
        this.rows.set(rows);
        this.#store.rememberSessionTypes(results.flatMap(result => result.sessionTypes));
        this.#store.rememberSessionTypeGroups(results.flatMap(result => result.sessionTypeGroups));
        this.#store.rememberSessionTypePlanIds(Object.fromEntries(ticketTypes.map(ticketType => [ticketType.id, ticketType.planId])));
        this.#store.retainTicketTypes(rows.flatMap(row => row.sessionTypeIds));
        this.isLoading.set(false);
      }),
    );
  }

  #sortTrailingIcon(column: CrossEventBulkEditTicketTypeSortColumn): IgntButtonIcon {
    if (this.sortColumn() === column && this.sortDirection() === 'asc') {
      return this.#chevronUpIcon;
    }

    return this.#chevronDownIcon;
  }

  #toLoadedInventory(planId: number, inventory: SessionTypeInventory | null): CrossEventBulkEditLoadedInventory | null {
    if (inventory === null) {
      return null;
    }

    const userCanModifyTicketProtection = canModifyTicketProtection(this.#userService.getUser());
    const sessionTypes = inventory.sessionTypes.filter(
      (sessionType: SessionType) =>
        sessionType.archivedAt === null &&
        (userCanModifyTicketProtection || sessionType.addOnConfiguration?.category !== AddOnCategory.cancellationInsurance),
    );
    const planName = this.#store.planNames()[planId] ?? '';
    return {
      sessionTypeGroups: inventory.sessionTypeGroups,
      sessionTypes,
      ticketTypes: sessionTypes.map(sessionType => toTicketType(planId, planName, sessionType)),
    };
  }
}

function canSelectIds(selectedTicketTypeIds: readonly number[], incomingIds: readonly number[], limit: number): boolean {
  const selected = new Set(selectedTicketTypeIds);
  const missing = incomingIds.filter(sessionTypeId => !selected.has(sessionTypeId));
  return selected.size + missing.length <= limit;
}

function compareRows(
  left: CrossEventBulkEditTicketTypeRow,
  right: CrossEventBulkEditTicketTypeRow,
  column: CrossEventBulkEditTicketTypeSortColumn,
  direction: 'asc' | 'desc',
): number {
  const factor = direction === 'asc' ? 1 : -1;
  if (column === 'group') {
    return left.groupName.localeCompare(right.groupName) * factor;
  }

  return (left.plans.length - right.plans.length) * factor;
}

function groupTicketTypes(ticketTypes: readonly CrossEventBulkEditTicketType[]): CrossEventBulkEditTicketTypeRow[] {
  const rows = new Map<string, CrossEventBulkEditTicketTypeRow>();
  for (const ticketType of ticketTypes) {
    const key = `${ticketType.label}\u0000${ticketType.groupName}`;
    const current = rows.get(key);
    const plan = { id: ticketType.planId, name: ticketType.planName };
    if (current === undefined) {
      rows.set(key, {
        groupName: ticketType.groupName,
        key,
        label: ticketType.label,
        plans: [plan],
        sessionTypeIds: [ticketType.id],
      });
      continue;
    }

    const sessionTypeIds = current.sessionTypeIds.includes(ticketType.id)
      ? current.sessionTypeIds
      : [...current.sessionTypeIds, ticketType.id];
    const plans = current.plans.some(existing => existing.id === ticketType.planId) ? current.plans : [...current.plans, plan];
    rows.set(key, { ...current, plans, sessionTypeIds });
  }

  return [...rows.values()];
}

function isRowSelected(row: CrossEventBulkEditTicketTypeRow, selectedTicketTypeIds: readonly number[]): boolean {
  const selected = new Set(selectedTicketTypeIds);
  return row.sessionTypeIds.every(sessionTypeId => selected.has(sessionTypeId));
}

function toTicketType(planId: number, planName: string, sessionType: SessionType): CrossEventBulkEditTicketType {
  return {
    groupName: sessionType.groups[0]?.name ?? '',
    id: sessionType.id,
    label: sessionType.label,
    planId,
    planName,
  };
}
