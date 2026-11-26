import { ChangeDetectionStrategy, Component, effect, input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { PlanType } from '../../models/general-section.enum';
import {
  ContractSectionConfig,
  GeneralSectionConfig,
  PricesSectionConfig,
  ValidationSectionConfig,
} from '../../models/settings-configs.model';
import { ContractSectionComponent } from '../contract-section/contract-section.component';
import { GeneralSettingsSectionComponent } from '../general-settings-section/general-settings-section.component';
import { PricesSectionComponent } from '../prices-section/prices-section.component';
import { ValidationSectionComponent } from '../validation-section/validation-section.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    GeneralSettingsSectionComponent,
    ValidationSectionComponent,
    ContractSectionComponent,
    PricesSectionComponent,
  ],
  selector: 'app-main-settings-form',
  standalone: true,
  styleUrls: ['./main-settings-form.component.scss'],
  templateUrl: './main-settings-form.component.html',
})
export class MainSettingsFormComponent {
  readonly canEditPlan = input<boolean>(true);
  contractConfig = input<ContractSectionConfig | null>(null);
  form = input.required<FormGroup>();
  generalConfig = input<GeneralSectionConfig | null>(null);
  mainPlanId = input<number | null>(null);
  planType = input<PlanType | undefined>(undefined);
  pricesConfig = input<PricesSectionConfig | null>(null);
  validationConfig = input<ValidationSectionConfig | null>(null);

  constructor() {
    effect(() => {
      const form = this.form();
      if (this.canEditPlan()) {
        form.enable({ emitEvent: false });
      } else {
        form.disable({ emitEvent: false });
      }
    });
  }
}
