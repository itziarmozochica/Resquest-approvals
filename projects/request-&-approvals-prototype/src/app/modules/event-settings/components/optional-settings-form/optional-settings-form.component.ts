import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';

import { PartnerTransportProviderSummary } from '@fz-original/app/modules/settings/shared/models/partner-transport-provider-summary.model';
import { FeverOnlyMarkerComponent } from '@fz-original/app/shared/components/fever-only-marker/fever-only-marker.component';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { parseStrictPositiveIntegerString } from '@fz-original/app/shared/utils/number.util';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';
import { combineLatest } from 'rxjs';

import { DeclarativeInventorySectionState } from '../../models/declarative-inventory.model';
import {
  CancellationSettingsSectionConfig,
  DisallowIndexingSectionConfig,
  EventRedirectSectionConfig,
  ExternalPlatformsSectionConfig,
  OverrideCapacitySectionConfig,
  PostPurchaseSectionConfig,
  SelectorSettingsSectionConfig,
  TransportSectionConfig,
} from '../../models/settings-configs.model';
import { WaitingRoomVisibilityService } from '../../services/waiting-room-visibility.service';
import { isSuperuserOnlyField as isSuperuserOnlyFieldUtil } from '../../utils/is-superuser-only-field.util';
import { BundleDiscountApplicationModeSectionComponent } from '../bundle-discount-application-mode-section/bundle-discount-application-mode-section.component';
import { CancellationSettingsSectionComponent } from '../cancellation-settings-section/cancellation-settings-section.component';
import type { CancellationSettingsFormHost } from '../cancellation-settings-section/cancellation-settings-section.types';
import { isCancellationSettingsFormHost } from '../cancellation-settings-section/cancellation-settings-section.utils';
import { DisallowIndexingSectionComponent } from '../disallow-indexing-section/disallow-indexing-section.component';
import { EventRedirectSectionComponent } from '../event-redirect-section/event-redirect-section.component';
import { ExternalPlatformsSectionComponent } from '../external-platforms-section/external-platforms-section.component';
import { PostPurchaseSectionComponent } from '../post-purchase-section/post-purchase-section.component';
import { SelectorSettingsSectionComponent } from '../selector-settings-section/selector-settings-section.component';
import { SelfServiceSettingsSectionComponent } from '../self-service-settings-section/self-service-settings-section.component';
import { TransportConfigurationSectionComponent } from '../transport-configuration-section/transport-configuration-section.component';
import { TransportConfigurationFormGroup } from '../transport-configuration-section/transport-configuration-section.types';
import { WaitingRoomSectionComponent } from './waiting-room-section/waiting-room-section.component';
import { waitingRoomFormControlName } from './waiting-room-section/waiting-room-section.constants';
import type { WaitingRoomFormGroup } from './waiting-room-section/waiting-room-section.types';
import { hasWaitingRoomId, setWaitingRoomDetailFieldsDisabled } from './waiting-room-section/waiting-room-section.utils';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BundleDiscountApplicationModeSectionComponent,
    CancellationSettingsSectionComponent,
    DisallowIndexingSectionComponent,
    EventRedirectSectionComponent,
    ExternalPlatformsSectionComponent,
    FeverOnlyMarkerComponent,
    IgntToggleComponent,
    IgntWrapperCardComponent,
    PostPurchaseSectionComponent,
    ReactiveFormsModule,
    SelectorSettingsSectionComponent,
    SelfServiceSettingsSectionComponent,
    TransportConfigurationSectionComponent,
    TranslateModule,
    WaitingRoomSectionComponent,
  ],
  selector: 'app-optional-settings-form',
  standalone: true,
  styleUrls: ['./optional-settings-form.component.scss'],
  templateUrl: './optional-settings-form.component.html',
})
export class OptionalSettingsFormComponent {
  readonly #destroyRef = inject(DestroyRef);
  readonly #userService = inject(UserService);
  #waitingRoomVisibilityService = inject(WaitingRoomVisibilityService);

  form = input.required<FormGroup>();
  allowPublishingInOta = input(false);
  bundleDiscountApplicationModeVisible = input(false);
  readonly canEditPlan = input<boolean>(true);
  readonly cancellationsConfig = input<CancellationSettingsSectionConfig | null>(null);
  readonly declarativeInventoryState = input<DeclarativeInventorySectionState>({
    hasLoadFailed: false,
    isLoading: false,
    nonConformities: [],
  });
  disallowIndexingConfig = input<DisallowIndexingSectionConfig | null>(null);
  eventRedirectConfig = input<EventRedirectSectionConfig | null>(null);
  externalPlatformsConfig = input<ExternalPlatformsSectionConfig | null>(null);
  overrideCapacityConfig = input<OverrideCapacitySectionConfig | null>(null);
  overrideCapacityEnabled = input(false);
  readonly onFormDirtyChange = input<((dirty: boolean) => void) | undefined>(undefined);
  postPurchaseConfig = input<PostPurchaseSectionConfig | null>(null);
  selectorConfig = input<SelectorSettingsSectionConfig | null>(null);
  transportConfig = input<TransportSectionConfig | null>(null);
  transportProviders = input<PartnerTransportProviderSummary[]>([]);

  readonly selfServiceSettingsVisible = input(false);

  protected readonly showSelfServiceSettings = computed(
    () => this.selfServiceSettingsVisible() && this.form().get('declarativeInventory') !== null,
  );

  canViewWaitingRoomConfig = computed(() => this.#waitingRoomVisibilityService.canViewWaitingRoomConfig());

  readonly cancellationsForm = computed<CancellationSettingsFormHost | null>(() =>
    this.cancellationsConfig() !== null ? this.#getCancellationsForm() : null,
  );

  transportForm = computed<TransportConfigurationFormGroup | null>(() => (this.transportConfig() ? this.#getTransportForm() : null));

  waitingRoomForm = computed(() => (this.canViewWaitingRoomConfig() ? this.#getWaitingRoomForm() : null));

  allowPublishingInOtaChange = output<Event>();

  overrideCapacityEnabledChange = output<Event>();
  overrideCapacityLimitChange = output<number | null>();
  redirectConfigChange = output<number | null>();
  redirectEnabledChange = output<Event>();
  transportEnabledChange = output<boolean>();
  constructor() {
    combineLatest([toObservable(this.form), toObservable(this.canEditPlan)])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(([form, canEditPlan]) => {
        if (canEditPlan) {
          form.enable({ emitEvent: false });
          const waitingRoomForm = form.get(waitingRoomFormControlName) as WaitingRoomFormGroup | null;
          if (waitingRoomForm) {
            setWaitingRoomDetailFieldsDisabled(waitingRoomForm, hasWaitingRoomId(waitingRoomForm.controls.waitingRoomId.value));
          }
        } else {
          form.disable({ emitEvent: false });
        }
      });
  }

  isSuperuserOnlyField(fieldConfig: Parameters<typeof isSuperuserOnlyFieldUtil>[0], isEditableInUi = true): boolean {
    return isSuperuserOnlyFieldUtil(fieldConfig, this.#userService.getUser()?.isStaff() ?? false, isEditableInUi);
  }

  onAllowPublishingInOtaChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.allowPublishingInOtaChange.emit(event);
  }

  onOverrideCapacityEnabledChange(event: Event): void {
    if (!this.canEditPlan() || !this.overrideCapacityConfig()?.limit.editable) {
      return;
    }
    this.overrideCapacityEnabledChange.emit(event);
  }

  onOverrideCapacityLimitInput(event: Event): void {
    if (!this.canEditPlan() || !this.overrideCapacityConfig()?.limit.editable) {
      return;
    }
    const target = event.target as HTMLInputElement;
    const rawValue = target.value;

    const limitControl = this.form().get('overrideCapacityLimit');
    const previousNumeric = limitControl?.value as number | null | undefined;
    const previousDisplay =
      previousNumeric != null && Number.isInteger(previousNumeric) && previousNumeric >= 1 ? String(previousNumeric) : '';

    if (rawValue.trim() === '') {
      if (target.validity.badInput) {
        target.value = previousDisplay;
        return;
      }
      this.overrideCapacityLimitChange.emit(null);
      return;
    }

    const parsed = parseStrictPositiveIntegerString(rawValue);
    if (parsed === null) {
      target.value = previousDisplay;
      return;
    }

    this.overrideCapacityLimitChange.emit(parsed);
    if (target.value !== String(parsed)) {
      target.value = String(parsed);
    }
  }

  onRedirectConfigChange(redirectToId: number | null): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.redirectConfigChange.emit(redirectToId);
  }

  onRedirectEnabledChange(event: Event): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.redirectEnabledChange.emit(event);
  }

  onTransportEnabledChange(enabled: boolean): void {
    if (!this.canEditPlan()) {
      return;
    }
    this.transportEnabledChange.emit(enabled);
  }

  #getCancellationsForm(): CancellationSettingsFormHost | null {
    const form = this.form();
    return isCancellationSettingsFormHost(form) ? form : null;
  }

  #getTransportForm(): TransportConfigurationFormGroup | null {
    return this.form().get('transportConfiguration') as TransportConfigurationFormGroup | null;
  }

  #getWaitingRoomForm(): WaitingRoomFormGroup | null {
    return this.form().get(waitingRoomFormControlName) as WaitingRoomFormGroup | null;
  }
}
