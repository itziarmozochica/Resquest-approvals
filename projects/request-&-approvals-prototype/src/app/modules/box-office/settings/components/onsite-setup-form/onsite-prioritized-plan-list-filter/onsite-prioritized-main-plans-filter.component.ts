import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDragPlaceholder, CdkDropList, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgForOf } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, input, output, signal, WritableSignal } from '@angular/core';

import { MultiSelectModule } from '@fz-original/app/shared/layout/filters/multi-select/multi-select.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { IgntIconComponent } from '@ignite/icon';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-onsite-prioritized-main-plans-filter',
  standalone: true,
  imports: [NgForOf, TranslateModule, CdkDropList, IgntIconComponent, CdkDrag, CdkDragHandle, MultiSelectModule, CdkDragPlaceholder],
  templateUrl: './onsite-prioritized-main-plans-filter.component.html',
  styleUrls: ['./onsite-prioritized-main-plans-filter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnsitePrioritizedMainPlansFilterComponent {
  readonly planOptions = input<SelectOption[]>([]);
  readonly prioritizedMainPlans = input<number[]>([]);
  readonly selected = output<SelectOption[]>();

  readonly selectedPlans: WritableSignal<SelectOption[]> = signal<SelectOption[]>([]);

  constructor() {
    effect(() => {
      this.#syncSelectedPlansFromInputs(this.prioritizedMainPlans(), this.planOptions());
    });
  }

  deletePlan(planIndex: number): void {
    const newSelectedPlans = [...this.selectedPlans()];
    newSelectedPlans.splice(planIndex, 1);
    this.selectedPlans.set(newSelectedPlans);
    this.selected.emit(this.selectedPlans());
  }

  dropChangePlan({ previousIndex, currentIndex }: CdkDragDrop<SelectOption[]>): void {
    const plans = [...this.selectedPlans()];
    moveItemInArray(plans, previousIndex, currentIndex);
    this.selectedPlans.set(plans);
    this.selected.emit(this.selectedPlans());
  }

  updatePlanSelection(selectedPlans: SelectOption[] = []): void {
    this.selectedPlans.set(selectedPlans);
    this.selected.emit(this.selectedPlans());
  }

  #syncSelectedPlansFromInputs(prioritizedMainPlans: number[], planOptions: SelectOption[]): void {
    const selectedPlans = prioritizedMainPlans
      .map(planId => planOptions.find(({ id }) => id === planId))
      .filter((plan): plan is SelectOption => plan !== undefined);
    this.selectedPlans.set(selectedPlans);
  }
}
