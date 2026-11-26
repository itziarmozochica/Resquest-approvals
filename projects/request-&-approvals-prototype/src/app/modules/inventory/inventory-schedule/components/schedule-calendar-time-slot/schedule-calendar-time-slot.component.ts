import { NgIf } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, EventEmitter, inject, Input, Output, signal, WritableSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';

import { setIfDifferent } from '@fz-original/app/modules/inventory/shared/utils/signals.util';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { TranslateService } from '@ngx-translate/core';

import { safeClone } from '../../../shared/utils/object.util';
import { ScheduleTimeSlot } from '../../models/schedule-calendar-detail.model';
import { CLOSED_TIER_COLOR, GenericOption } from '../../models/schedule-calendar-options.models';
import { TierTypeaheadComponent } from './tier-typeahead/tier-typeahead.component';

interface ColoredSelectOption extends SelectOption {
  color?: string;
}

const CLOSED_TIER_OPTION_ID: SelectOption['id'] = null;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntTypeaheadModule, NgIf, TierTypeaheadComponent],
  selector: 'app-schedule-calendar-time-slot',
  standalone: true,
  styleUrls: ['./schedule-calendar-time-slot.component.scss'],
  templateUrl: './schedule-calendar-time-slot.component.html',
})
export class ScheduleCalendarTimeSlotComponent {
  readonly #translate = inject(TranslateService);
  readonly #langChange = toSignal(this.#translate.onLangChange);

  readonly #capacityOptions: WritableSignal<GenericOption[]> = signal([]);
  readonly #defaultCapacityTemplateId: WritableSignal<string | null> = signal(null);
  readonly #hideCapacityTemplate: WritableSignal<boolean> = signal(false);
  readonly #tierOptions: WritableSignal<GenericOption[]> = signal<GenericOption[]>([]);
  readonly #timeSlot: WritableSignal<ScheduleTimeSlot | null> = signal(null);

  readonly #closedTierOption = computed<ColoredSelectOption>(() => {
    this.#langChange();
    return {
      id: CLOSED_TIER_OPTION_ID,
      title: this.#translate.instant('inventory.schedule.scheduleForm.closedTier'),
      color: CLOSED_TIER_COLOR,
    };
  });

  readonly capacityTemplateOption = computed<ColoredSelectOption | undefined>(() => {
    const slot = this.#timeSlot();
    const overwriteId = slot?.overwrittenCapacityTemplateId;
    if (overwriteId) {
      return this.capacityTemplateSelectOptions().find(o => o.id === overwriteId);
    }
    const defaultId = this.#defaultCapacityTemplateId();
    if (defaultId) {
      return this.capacityTemplateSelectOptions().find(o => o.id === defaultId);
    }
    return undefined;
  });
  readonly capacityTemplateSelectOptions = computed<ColoredSelectOption[]>(() => {
    this.#langChange();
    const originalOptions = this.#capacityOptions();
    const defaultId = this.#defaultCapacityTemplateId();
    return originalOptions.map(option => ({
      ...option,
      title:
        option.id === defaultId
          ? option.title + ' (' + this.#translate.instant('inventory.schedule.scheduleForm.default') + ')'
          : option.title,
    }));
  });
  readonly tierSelectOptions = computed<ColoredSelectOption[]>(() => [...this.#tierOptions(), this.#closedTierOption()]);
  readonly tierOption = computed<ColoredSelectOption>(() => {
    const tierId = this.#timeSlot()?.tierId;
    if (tierId == null) {
      return this.#closedTierOption();
    }
    return this.tierSelectOptions().find(option => option.id === tierId) ?? this.#closedTierOption();
  });

  @Input({ required: true }) set capacityOptions(value: GenericOption[]) {
    setIfDifferent(this.#capacityOptions, safeClone(value));
  }
  @Input({ required: true }) set defaultCapacityTemplateId(value: string | null) {
    setIfDifferent(this.#defaultCapacityTemplateId, value);
  }
  @Input() set hideCapacityTemplate(value: boolean) {
    setIfDifferent(this.#hideCapacityTemplate, value);
  }
  @Input({ required: true }) set tierOptions(value: GenericOption[]) {
    setIfDifferent(this.#tierOptions, safeClone(value));
  }
  @Input() set timeSlot(value: ScheduleTimeSlot | null) {
    setIfDifferent(this.#timeSlot, value ? safeClone(value) : null);
  }
  @Input() disabled = false;
  @Input({ required: true }) time!: string;

  @Output() tierDragStart = new EventEmitter<{ tierId: number | null; capacityTemplateId: string | null }>();
  @Output() timeSlotChange = new EventEmitter<ScheduleTimeSlot | null>();

  onCapacityTemplateSelected(option: ColoredSelectOption | null): void {
    if (this.disabled) {
      return;
    }
    if (this.#timeSlot()?.tierId == null) {
      return;
    }
    const overwrittenCapacityTemplateId = option && typeof option.id === 'string' ? option.id : null;
    this.#updateSlot({ overwrittenCapacityTemplateId });
  }

  onTierMouseDown(event: MouseEvent): void {
    if (this.disabled || event.button !== 0) {
      return;
    }
    this.#emitTierDragStart();
  }

  onTierTouchStart(): void {
    if (this.disabled) {
      return;
    }
    this.#emitTierDragStart();
  }

  onTierSelected(option: ColoredSelectOption | null): void {
    if (this.disabled) {
      return;
    }
    if (!option || option.id == null) {
      this.#clearSlot();
      return;
    }
    if (typeof option.id === 'number') {
      this.#updateSlot({ tierId: option.id });
    }
  }

  shouldShowCapacitySelect(): boolean {
    const slot = this.#timeSlot();
    return !this.#hideCapacityTemplate() && slot != null && slot.tierId != null;
  }

  #emitTierDragStart(): void {
    if (this.disabled) {
      return;
    }
    const slot = this.#timeSlot();
    const tierId = slot?.tierId ?? null;
    const capacityTemplateId = slot?.overwrittenCapacityTemplateId ?? null;
    this.tierDragStart.emit({ tierId, capacityTemplateId });
  }

  #buildEmptyTimeSlot(): ScheduleTimeSlot {
    return { disabled: false, isVisible: true, overwrittenCapacityTemplateId: null, tierId: null, time: this.time };
  }

  #clearSlot(): void {
    this.#timeSlot.set(null);
    this.timeSlotChange.emit(null);
  }

  #updateSlot(patch: Partial<ScheduleTimeSlot>): void {
    const current = this.#timeSlot() ?? this.#buildEmptyTimeSlot();
    const updated: ScheduleTimeSlot = { ...current, ...patch };
    this.#timeSlot.set(updated);
    this.timeSlotChange.emit(updated);
  }
}
