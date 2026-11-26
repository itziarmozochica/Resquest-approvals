import { Component, computed, DestroyRef, EventEmitter, inject, Input, input, output, Output, type Signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationStart, Router } from '@angular/router';

import { UserService } from '@fz-original/app/shared/services/user/user.service';

import { OnsiteSetupsStorageService } from '../../../modules/box-office/shared/services/onsite-setups/onsite-setups-storage.service';
import { PaymentConfiguration } from '../../../modules/box-office/shared/services/payment-configuration.model';
import { PaymentConfigStorageService } from '../../../modules/box-office/shared/services/payment/payment-config-storage.service';
import { canPrintOnAdyenTerminal } from '../../../modules/box-office/shared/utils/adyen-terminal-printing.util';
import { PrinterDocumentType } from '../../../modules/kiosk/services/printer/models/printer-instruction.model';
import { Order } from '../../models/order/order.model';
import { TicketReleaseConditionAction } from '../../models/order/release-condition.model';
import { FeatureFlags } from '../../optimizely/feature-flags';
import { OptimizelyService } from '../../optimizely/optimizely.service';
import { DualScreenStorageService } from '../../services/dual-screen/dual-screen-storage.service';

@Component({
  selector: 'order-detail',
  standalone: false,
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
})
export class OrderDetailComponent {
  #destroyRef = inject(DestroyRef);
  #dualScreenStorageService = inject(DualScreenStorageService);
  readonly #onsiteSetupsStorageService = inject(OnsiteSetupsStorageService);
  #optimizelyService = inject(OptimizelyService);
  #paymentConfigStorageService = inject(PaymentConfigStorageService);
  #router = inject(Router);
  #userService = inject(UserService);
  readonly agreementAction = input<TicketReleaseConditionAction | null>(null);
  readonly agreementBlocked = input(false);
  @Output() goToOrderDetailClicked = new EventEmitter();
  hasAdyenDeviceConfig: boolean = this.#checkAdyenConfig();
  @Input() hasViewTicketDisabled = false;
  isDualScreen: boolean = this.#dualScreenStorageService.containsData();
  isMobilePos: boolean = this.#paymentConfigStorageService.isMobilePos();
  @Input() loadingDeliveryNote = false;
  @Output() newOrderEvent = new EventEmitter<void>();
  readonly openAgreementList = output<void>();
  @Input({ required: true }) order!: Order;
  @Output() printAdyenEvent = new EventEmitter<PrinterDocumentType>();
  @Output() printDeliveryNote = new EventEmitter<string>();
  @Output() showTicketEvent = new EventEmitter<void>();
  @Input() showValidateButton = false;
  @Output() validateTicketEvent = new EventEmitter();
  #onsiteAgreementsEnabled: boolean = this.#optimizelyService.isFeatureEnabled(FeatureFlags.BOX_OFFICE_ONSITE_AGREEMENTS) === true;

  /**
   * The entry point to the agreement documents is flag-gated, and the backend can also switch the
   * affordance off per order through `releaseCondition.action.isEnabled`. With no action at all we
   * still offer it behind a local label, so a blocked order is never a dead end. The CTA sits in
   * the order button groups next to validate / view-tickets, which render always, so the blocked
   * condition lives here rather than around the markup.
   */
  protected readonly showAgreementAction: Signal<boolean> = computed(() => {
    const action = this.agreementAction();
    return this.agreementBlocked() && this.#onsiteAgreementsEnabled && (action === null || action.isEnabled);
  });

  constructor() {
    this.#router.events.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(event => {
      if (event instanceof NavigationStart && event.navigationTrigger === 'popstate') {
        this.#router.navigate(['/box-office'], { queryParamsHandling: 'merge' });
      }
    });
  }

  clickOnDeliveryNote(): void {
    this.loadingDeliveryNote = true;
    this.printDeliveryNote.emit(this.order.reservationId);
  }

  clickOnGoToOrderDetail(): void {
    this.goToOrderDetailClicked.emit();
  }

  clickOnNewOrder(): void {
    this.newOrderEvent.emit();
  }

  clickOnPrintReceipt(): void {
    this.printAdyenEvent.emit(PrinterDocumentType.receipt);
  }

  clickOnPrintTicket(): void {
    this.printAdyenEvent.emit(PrinterDocumentType.ticket);
  }

  clickOnShowTicket(): void {
    this.showTicketEvent.emit();
  }

  clickOnValidateTicket(): void {
    this.validateTicketEvent.emit();
  }

  #checkAdyenConfig(): boolean {
    const paymentConfig: PaymentConfiguration | undefined = this.#paymentConfigStorageService.getConfiguration();

    return Boolean(paymentConfig?.deviceId) && canPrintOnAdyenTerminal(paymentConfig, this.#onsiteSetupsStorageService.getConfiguration());
  }
}
