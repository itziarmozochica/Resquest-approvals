import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, DoCheck, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';

import { PartnerTransportProviderSummary } from '@fz-original/app/modules/settings/shared/models/partner-transport-provider-summary.model';
import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { IgntTypeaheadModule } from '../../../../shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { TransportSectionConfig } from '../../models/settings-configs.model';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';
import { TransportConfigurationFormGroup } from './transport-configuration-section.types';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FeverOnlyMarkerComponent,
    IgntInputFieldComponent,
    IgntToggleComponent,
    IgntTypeaheadModule,
    IgntWrapperCardComponent,
    ReactiveFormsModule,
    TranslateModule,
  ],
  selector: 'app-transport-configuration-section',
  standalone: true,
  styleUrls: ['./transport-configuration-section.component.scss'],
  templateUrl: './transport-configuration-section.component.html',
})
export class TransportConfigurationSectionComponent implements DoCheck {
  readonly #cdr = inject(ChangeDetectorRef);
  readonly #userService = inject(UserService);
  #lastForm: TransportConfigurationFormGroup | undefined;
  #lastFormValueSnapshot = '';

  form = input.required<TransportConfigurationFormGroup>();
  config = input<TransportSectionConfig | null>(null);
  providers = input<PartnerTransportProviderSummary[]>([]);
  readonly canEditPlan = input<boolean>(true);

  enabledChange = output<boolean>();

  protected providerOptions = computed<SelectOption[]>(() =>
    this.providers().map(provider => ({
      id: provider.transportProviderId,
      title: provider.transportProviderName,
    })),
  );

  protected isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  ngDoCheck(): void {
    const fg = this.form();
    if (fg !== this.#lastForm) {
      this.#lastForm = fg;
      this.#lastFormValueSnapshot = '';
    }
    const snapshot = JSON.stringify(fg.getRawValue());
    if (snapshot !== this.#lastFormValueSnapshot) {
      this.#lastFormValueSnapshot = snapshot;
      this.#cdr.markForCheck();
    }
  }

  onProviderSelect(option: SelectOption): void {
    if (!this.canEditPlan()) {
      return;
    }
    const transportProviderId = Number(option.id);
    if (!Number.isInteger(transportProviderId) || transportProviderId <= 0) {
      return;
    }

    this.form().controls.transportProviderId.setValue(transportProviderId);
    this.form().markAsDirty();
  }

  onToggleChange(event: Event): void {
    if (!this.canEditPlan() || !(this.config()?.transportConfiguration?.editable ?? false)) {
      return;
    }

    const checked = (event.target as HTMLInputElement).checked;
    this.form().controls.enabled.setValue(checked);
    this.form().markAsDirty();
    this.enabledChange.emit(checked);
  }

  protected get enabled(): boolean {
    return this.form().controls.enabled.value;
  }

  protected get selectedProvider(): SelectOption | null {
    const selectedId = this.form().controls.transportProviderId.value;
    return this.providerOptions().find(option => option.id === selectedId) ?? null;
  }
}
