import { NgForOf } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { posConfigDeviceChanged } from '@fz-original/app/modules/box-office/one-stop-shop/tracking/events/pos-config-device-changed.event';
import { PaymentConfiguration } from '@fz-original/app/modules/box-office/shared/services/payment-configuration.model';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { FzTrackingService } from '@fz/fz-tracking/src/public-api';
import { IgntButtonComponent } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';

type OssPaymentProvider = 'adyen' | 'adyenLocal' | 'razorpay' | 'payhere';

@Component({
  selector: 'app-oss-linked-device-modal',
  standalone: true,
  imports: [TranslateModule, FormsModule, ModalContentModule, NgForOf, IgntButtonComponent, IgntIconComponent],
  templateUrl: './oss-linked-device-modal.component.html',
  styleUrls: ['./oss-linked-device-modal.component.scss'],
})
export class OssLinkedDeviceModalComponent implements OnInit {
  #activeModal = inject(NgbActiveModal);
  readonly #fzTracking = inject(FzTrackingService);

  activeProvider: OssPaymentProvider | null = null;
  availableDevices: string[] = [];
  @Input() paymentConfiguration!: PaymentConfiguration;
  selectedDeviceId = '';

  ngOnInit(): void {
    this.selectedDeviceId = this.paymentConfiguration?.deviceId || '';
    this.#detectActiveProvider();
    this.#loadAvailableDevices();
  }

  onDeviceSelect(deviceId: string): void {
    this.selectedDeviceId = deviceId;
  }

  onSave(): void {
    if (this.paymentConfiguration && this.selectedDeviceId) {
      const fromDeviceId = this.paymentConfiguration.deviceId || null;

      if (fromDeviceId !== this.selectedDeviceId) {
        this.#fzTracking.track(
          posConfigDeviceChanged({
            fromDeviceId,
            toDeviceId: this.selectedDeviceId,
          }),
        );
      }

      this.#activeModal.close(this.selectedDeviceId);
    }
  }

  onCancel(): void {
    this.#activeModal.close();
  }

  #detectActiveProvider(): void {
    if (this.paymentConfiguration?.adyenConfiguration) {
      this.activeProvider = 'adyen';
    } else if (this.paymentConfiguration?.adyenLocalConfiguration) {
      this.activeProvider = 'adyenLocal';
    } else if (this.paymentConfiguration?.razorpayConfiguration) {
      this.activeProvider = 'razorpay';
    } else if (this.paymentConfiguration?.payhereConfiguration) {
      this.activeProvider = 'payhere';
    }
  }

  #loadAvailableDevices(): void {
    if (!this.activeProvider) {
      this.availableDevices = [];
      return;
    }

    switch (this.activeProvider) {
      case 'adyen':
        this.availableDevices = this.paymentConfiguration?.adyenConfiguration?.devicesIds || [];
        break;
      case 'adyenLocal':
        this.availableDevices = this.paymentConfiguration?.adyenLocalConfiguration?.devicesIds || [];
        break;
      case 'razorpay':
        this.availableDevices = this.paymentConfiguration?.razorpayConfiguration?.devicesIds || [];
        break;
      case 'payhere':
        this.availableDevices = this.paymentConfiguration?.payhereConfiguration?.devicesIds || [];
        break;
      default:
        this.availableDevices = [];
    }
  }
}
