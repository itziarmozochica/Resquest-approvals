import { NgFor, NgIf, NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  Signal,
  signal,
  ViewChild,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { PaymentService } from '@fz-original/app/app/services/payment/payment.service';
import { BoxOfficePaymentMethodsService } from '@fz-original/app/modules/box-office/shared/services/payment-methods/box-office-payment-methods.service';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';

import { BreakpointStateService } from '../../../app/services/breakpoint/breakpoint-state.service';
import { SquareConnectionEvent } from '../../../core/tracking/core/events/square-connection';
import { TrackingService } from '../../../core/tracking/tracking.service';
import { SquareConnectionModalComponent } from '../../../modules/box-office/shared/components/square-connection-modal/square-connection-modal.component';
import { OnsiteSetup, PriceViewerEnum } from '../../../modules/box-office/shared/models/onsite-setup';
import { PaymentConfiguration } from '../../../modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '../../../modules/box-office/shared/services/payment/payment-config-storage.service';
import { PartnerService } from '../../../shared/services/partner/partner.service';
import { IconsModule } from '../../icons/icons.module';
import { Place } from '../../models/plan/place.model';
import { Plan } from '../../models/plan/plan.model';
import { PipesModule } from '../../pipes/pipes.module';
import { SharedComponentsModule } from '../shared-components.module';
import { PriceViewerComponent } from './components/price-viewer.component';

@Component({
  selector: 'app-plan-detail-card',
  templateUrl: './plan-detail-card.component.html',
  styleUrls: ['./plan-detail-card.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    NgIf,
    NgFor,
    SharedComponentsModule,
    PriceViewerComponent,
    IconsModule,
    TranslateModule,
    NgTemplateOutlet,
    PipesModule,
    IgntWrapperCardComponent,
  ],
})
export class PlanDetailCardComponent implements OnInit {
  #boxOfficePaymentMethodsService = inject(BoxOfficePaymentMethodsService);
  #breakpointStateService = inject(BreakpointStateService);
  #destroyRef = inject(DestroyRef);
  #modalService = inject(NgbModal);
  #partnerService = inject(PartnerService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #paymentService = inject(PaymentService);
  #planPaymentConfigurationSubject = new BehaviorSubject<PaymentConfiguration | undefined>(undefined);
  #trackingService = inject(TrackingService);
  @ViewChild('adyenSelect') adyenSelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('razorpaySelect') razorpaySelectRef?: ElementRef<HTMLSelectElement>;
  @ViewChild('payhereSelect') payhereSelectRef?: ElementRef<HTMLSelectElement>;
  /**
   * @deprecated use the onsite setup config
   */
  @Input() set planPaymentConfiguration(value: PaymentConfiguration | null) {
    if (value === null) {
      this.#planPaymentConfigurationSubject.next(undefined);
    } else {
      this.#planPaymentConfigurationSubject.next(value);
    }
  }
  @Input() set selectedVenue(value: number | null) {
    if (value) {
      this.venue.set((this.plan?.places ?? []).find(place => place.id === value) ?? null);
    }
  }
  @Output() connectSquareToggled = new EventEmitter<void>();
  @Input() deviceSelectionInvalid = false;
  @Output() deviceSelected = new EventEmitter<string>();
  @Input() isLoadingPaymentConfiguration = false;
  isMobile: Signal<boolean> = this.#breakpointStateService.getStateProp('isMobile');
  isMobilePOS = false;
  paymentConfiguration: PaymentConfiguration | undefined;
  paymentDeviceSelected: string | undefined;
  @Input() plan: Plan | null = null;
  @Input() selectedOnsiteSetup: OnsiteSetup | null = null;
  @Input() showOnsiteSetup = false;
  @Output() showOnsiteSetupModal = new EventEmitter<void>();
  @Input() showPaymentConfiguration = false;
  showSettings = false;
  showSettingsMobile = false;
  @Input() showShadow = false;
  venue: WritableSignal<Place | null> = signal<Place | null>(null);

  hasPaymentConfig(): boolean {
    return !this.isLoadingPaymentConfiguration && this.showPaymentConfiguration;
  }

  hasPriceViewerConfig(): boolean {
    return !!this.selectedOnsiteSetup && this.selectedOnsiteSetup.price_viewer !== PriceViewerEnum.none;
  }

  hasSettings(): boolean {
    return this.hasSetupConfig() || this.hasPaymentConfig() || this.hasPriceViewerConfig();
  }

  hasSetupConfig(): boolean {
    return Boolean(this.showOnsiteSetup && this.selectedOnsiteSetup);
  }

  ngOnInit(): void {
    this.#planPaymentConfigurationSubject
      .pipe(
        map(planConfig => [planConfig, this.#paymentConfigStorageService.getConfiguration()]),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(([planConfig, storageConfig]) => {
        this.#handlePaymentConfigFromStorage(planConfig, storageConfig);
      });
    this.isMobilePOS = this.#paymentConfigStorageService.isMobilePos();
  }

  focusDeviceSelect(): void {
    const selectRef = this.adyenSelectRef ?? this.razorpaySelectRef ?? this.payhereSelectRef;
    if (selectRef) {
      selectRef.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => selectRef.nativeElement.focus(), 300);
    }
  }

  selectAdyenDeviceId(deviceId: string): void {
    this.paymentDeviceSelected = deviceId;
    this.deviceSelected.emit(deviceId);
    if (this.paymentConfiguration !== undefined) {
      const newConfig = this.paymentConfiguration.clone();
      const devicesIds =
        this.paymentConfiguration.adyenConfiguration?.devicesIds ?? this.paymentConfiguration.adyenLocalConfiguration?.devicesIds ?? [];
      newConfig.deviceId = this.#getDeviceId(devicesIds, deviceId);
      this.#paymentConfigStorageService.setConfiguration(newConfig);
    }
  }

  selectPayhereDeviceId(deviceId: string): void {
    this.paymentDeviceSelected = deviceId;
    this.deviceSelected.emit(deviceId);
    if (!this.paymentConfiguration?.payhereConfiguration) {
      return;
    }
    const newConfig = this.paymentConfiguration.clone();
    newConfig.deviceId = this.#getDeviceId(this.paymentConfiguration.payhereConfiguration.devicesIds, deviceId);
    this.#paymentConfigStorageService.setConfiguration(newConfig);
    if (!deviceId) {
      return;
    }
    const partnerId = this.#partnerService.getPartner()!.id;
    this.#paymentService
      .pairPayHere(partnerId, deviceId, deviceId, this.selectedOnsiteSetup?.id ?? '')
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe();
  }

  selectRazorpayDeviceId(deviceId: string): void {
    this.paymentDeviceSelected = deviceId;
    this.deviceSelected.emit(deviceId);
    if (this.paymentConfiguration !== undefined) {
      this.#paymentConfigStorageService.setConfiguration(
        new PaymentConfiguration(
          this.paymentConfiguration.adyenConfiguration,
          this.paymentConfiguration.squareConfiguration,
          {
            devicesIds: [deviceId],
          },
          undefined,
          deviceId,
        ),
      );
    }
  }

  toggleConnectSquare(): void {
    if (
      this.paymentConfiguration === undefined ||
      (this.paymentConfiguration !== undefined && this.paymentConfiguration.squareConfiguration === undefined) ||
      this.plan === null
    ) {
      return;
    }
    const modal: NgbModalRef = this.#modalService.open(SquareConnectionModalComponent);
    modal.componentInstance.squareConfiguration = this.paymentConfiguration.squareConfiguration;
    modal.componentInstance.deviceId = this.paymentConfiguration.deviceId;
    modal.componentInstance.planId = this.plan.id;
    const previousDevice = this.paymentConfiguration.deviceId as string;
    modal.result
      .then(
        (result: { deviceId: string | undefined } | null) => {
          if (result === null || this.plan === null || this.plan.id === undefined) {
            return;
          }
          this.#sendSquareConnection(result.deviceId || previousDevice, Boolean(result.deviceId));
          if (this.paymentConfiguration !== undefined) {
            const newConfig: PaymentConfiguration = this.paymentConfiguration.clone();
            newConfig.deviceId = result.deviceId;
            this.#paymentConfigStorageService.setConfiguration(newConfig);
            this.paymentConfiguration = newConfig;
            this.paymentDeviceSelected = newConfig.deviceId ?? undefined;
          }
        },
        () => {},
      )
      .finally(() => this.connectSquareToggled.emit());
  }

  toggleSettings(): void {
    if (this.isMobile()) {
      this.showSettingsMobile = !this.showSettingsMobile;
    } else {
      this.showSettings = !this.showSettings;
    }
  }

  #getDeviceId(deviceIds: string[], deviceSelected: string): string | undefined {
    return deviceIds.find(deviceId => deviceId === deviceSelected);
  }

  #handlePaymentConfigFromStorage(planConfig: PaymentConfiguration | undefined, storageConfig?: PaymentConfiguration): void {
    const isConfigValid: boolean = planConfig === undefined || (storageConfig?.isConfigApplicable() ?? false);
    const hasDeviceId: boolean = storageConfig?.deviceId !== undefined;
    const isMobilePos: boolean = this.#paymentConfigStorageService.isMobilePos();
    const setupConfig: PaymentConfiguration = this.#boxOfficePaymentMethodsService.buildPaymentConfiguration(
      this.selectedOnsiteSetup,
      storageConfig?.deviceId,
    );

    this.paymentConfiguration = undefined;

    if (setupConfig.hasCardConfig()) {
      this.paymentConfiguration = setupConfig;
    } else if (hasDeviceId && (isMobilePos || isConfigValid)) {
      this.paymentConfiguration = storageConfig?.clone();
    } else {
      this.paymentConfiguration = planConfig?.clone();
    }

    this.#selectDeviceByDefault(this.paymentConfiguration);
    this.#showSettingsWhenDeviceNotSelected(this.paymentConfiguration);
  }

  /**
   * Selects device at the start of the component
   * @param newConfig
   * @private
   */
  #selectDeviceByDefault(newConfig: PaymentConfiguration | undefined): void {
    if (newConfig === undefined) return;

    let deviceId;
    if (newConfig?.deviceId) {
      deviceId = newConfig.deviceId;
    } else {
      let devices: string[] = [];

      if (newConfig.adyenConfiguration) {
        devices = newConfig.adyenConfiguration.devicesIds;
      } else if (newConfig.adyenLocalConfiguration) {
        devices = newConfig.adyenLocalConfiguration.devicesIds;
      } else if (newConfig.razorpayConfiguration) {
        devices = newConfig.razorpayConfiguration.devicesIds;
      } else if (newConfig.payhereConfiguration) {
        devices = newConfig.payhereConfiguration.devicesIds;
      }

      if (devices.length === 1) {
        deviceId = devices[0];
      }
    }

    if ((newConfig.adyenConfiguration || newConfig.adyenLocalConfiguration) && deviceId) {
      this.selectAdyenDeviceId(deviceId);
    } else if (newConfig.razorpayConfiguration && deviceId) {
      this.selectRazorpayDeviceId(deviceId);
    } else if (newConfig.payhereConfiguration && deviceId) {
      this.selectPayhereDeviceId(deviceId);
    } else if (newConfig.squareConfiguration && deviceId) {
      this.paymentDeviceSelected = deviceId;
    }
  }

  #sendSquareConnection(device_id: string, connected: boolean): void {
    this.#trackingService.track(
      new SquareConnectionEvent({
        device_id,
        plan_id: this.plan?.id as number,
        connected,
      }),
    );
  }

  #showSettingsWhenDeviceNotSelected(config: PaymentConfiguration | undefined): void {
    const hasPaymentConfig =
      config?.squareConfiguration ||
      config?.adyenConfiguration ||
      config?.adyenLocalConfiguration ||
      config?.razorpayConfiguration ||
      config?.payhereConfiguration;
    if (hasPaymentConfig && !this.paymentDeviceSelected) {
      this.showSettings = true;
    }
  }
}
