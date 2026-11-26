import { AsyncPipe, NgIf } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
  WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { CopyPaymentLinkEvent } from '@fz-original/app/core/tracking/core/events/copy-payment-link';
import { SendPaymentLinkEmailEvent } from '@fz-original/app/core/tracking/core/events/send-payment-link-email';
import { TrackingService } from '@fz-original/app/core/tracking/tracking.service';
import { PaymentUrlSendEmailStatus } from '@fz-original/app/modules/reservation/models/payment-url-send-email.status';
import { ReservationPaymentUrl } from '@fz-original/app/modules/reservation/models/reservation-payment-url.model';
import { LanguageCodeSelectorComponent } from '@fz-original/app/shared/components/language-selector/language-code-selector.component';
import { IconsModule } from '@fz-original/app/shared/icons/icons.module';
import { IgntTypeaheadModule } from '@fz-original/app/shared/layout/filters/ignt-typeahead/ignt-typeahead.module';
import { SelectOption } from '@fz-original/app/shared/layout/filters/select/select.interface';
import { ModalContentModule } from '@fz-original/app/shared/layout/modal/modal-content.module';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { isPlaceholderEmail } from '@fz-original/app/shared/utils/placeholder-email.util';
import { IgntAlertComponent } from '@ignite/common';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { ClipboardModule } from 'ngx-clipboard';
import { BehaviorSubject } from 'rxjs';

@Component({
  selector: 'app-reservations-payment-url-modal',
  templateUrl: './reservations-payment-url-modal.component.html',
  styleUrls: ['./reservations-payment-url-modal.component.scss'],
  standalone: true,
  imports: [
    ClipboardModule,
    IconsModule,
    IgntButtonComponent,
    IgntTypeaheadModule,
    ModalContentModule,
    NgIf,
    TranslateModule,
    PipesModule,
    IgntAlertComponent,
    AsyncPipe,
    LanguageCodeSelectorComponent,
    IgntInputFieldComponent,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationsPaymentUrlModalComponent implements OnInit {
  private readonly NON_RECOVERABLE_EMAIL_ERROR_CODES = [59020001];
  private readonly SHOW_COPIED_MESSAGE_TIMEOUT = 3000;
  private readonly WHITELABEL_PREFIX = 'accor';

  @Input() paymentUrls: ReservationPaymentUrl[] = [];
  @Input() set reservationEmail(value: string) {
    this.#reservationEmail.set(value ?? '');
  }
  get reservationEmail(): string {
    return this.#reservationEmail();
  }
  @Input({ required: true }) mailStatus!: BehaviorSubject<PaymentUrlSendEmailStatus>;
  @Input() set availableLanguages(value: string[] | undefined) {
    this._availableLanguages = this.#excludeWhitelabelLanguages(value) ?? [];
  }
  @Input({ required: true }) cartId!: string;
  @Input() defaultLanguage?: string;
  @Input({ required: true }) planId!: number;

  @Output() sendEmail = new EventEmitter<{ applicationId: string }>();
  @Output() languageSelected = new EventEmitter<string>();
  @Output() linkCopied = new EventEmitter<void>();

  _availableLanguages: string[] = [];
  paymentUrlOptions: SelectOption[] = [];
  paymentUrlIndexSelected = signal<number>(0);
  paymentUrlSelected = signal<string | null>(null);
  applicationIdSelected = signal<string | null>(null);
  selectedLanguage: string | undefined;
  mailStatusErrorCode: WritableSignal<number | undefined> = signal(undefined);
  isSendingEmail = signal(false);
  showCopiedMessage = signal(false);
  isLoadingPaymentUrls: WritableSignal<boolean> = signal(false);
  readonly PaymentUrlSendEmailStatus = PaymentUrlSendEmailStatus;

  #destroyRef = inject(DestroyRef);
  #modal = inject(NgbActiveModal);
  #trackingService = inject(TrackingService);

  readonly #reservationEmail = signal('');
  readonly hasPlaceholderEmail = computed(() => isPlaceholderEmail(this.#reservationEmail()));

  get initialLanguage(): string | undefined {
    if (this._availableLanguages.length === 0) {
      return undefined;
    }

    const isDefaultLanguageValid = this.defaultLanguage && this._availableLanguages.includes(this.defaultLanguage);
    return isDefaultLanguageValid ? this.defaultLanguage : this._availableLanguages[0];
  }

  get isNonRecoverableEmailError(): boolean {
    const errorCode = this.mailStatusErrorCode();
    return errorCode !== undefined && this.NON_RECOVERABLE_EMAIL_ERROR_CODES.includes(errorCode);
  }

  ngOnInit(): void {
    this.mailStatus.next(PaymentUrlSendEmailStatus.PENDING);
    this.#initializePaymentUrls();
    this.#emitDefaultLanguageIfNeeded();
    this.#setupEmailStatusSubscription();
  }

  onClose(): void {
    this.#modal.close();
  }

  onCopy(): void {
    this.linkCopied.emit();
    this.displayCopiedMessage();
    this.#trackingService.track(
      new CopyPaymentLinkEvent({
        application_id: this.paymentUrls[this.paymentUrlIndexSelected()].applicationId,
        application_name: this.paymentUrls[this.paymentUrlIndexSelected()].applicationName,
        cart_id: this.cartId,
        language: this.selectedLanguage ?? this.defaultLanguage ?? '',
        plan_id: this.planId,
        payment_link: this.paymentUrlSelected() ?? '',
      }),
    );
  }

  displayCopiedMessage(): void {
    this.showCopiedMessage.set(true);

    setTimeout(() => {
      this.showCopiedMessage.set(false);
    }, this.SHOW_COPIED_MESSAGE_TIMEOUT);
  }

  selectPaymentApplication(optionSelected: SelectOption): void {
    const index = this.#getPaymentUrlByOptionId(optionSelected.id);
    this.paymentUrlIndexSelected.set(index);
    this.paymentUrlSelected.set(this.paymentUrls[index].url);
    this.applicationIdSelected.set(this.paymentUrls[index].applicationId);
  }

  selectLanguage(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedLanguage = target.value;
    this.languageSelected.emit(target.value);
  }

  handleSendEmail(applicationId: string | null): void {
    if (this.hasPlaceholderEmail()) {
      return;
    }
    if (!applicationId) {
      return;
    }
    this.sendEmail.emit({ applicationId });
    this.isSendingEmail.set(true);
    this.#trackingService.track(
      new SendPaymentLinkEmailEvent({
        application_id: applicationId,
        application_name: this.paymentUrls[this.paymentUrlIndexSelected()].applicationName,
        cart_id: this.cartId,
        language: this.selectedLanguage ?? this.defaultLanguage ?? '',
        plan_id: this.planId,
        payment_link: this.paymentUrlSelected() ?? '',
      }),
    );
  }

  updatePaymentUrls(paymentUrls: ReservationPaymentUrl[], resetSelectedValues: boolean = true): void {
    this.paymentUrls = paymentUrls;
    this.#initializePaymentUrls(resetSelectedValues);
  }

  #emitDefaultLanguageIfNeeded(): void {
    const initialLanguage = this.initialLanguage;
    if (initialLanguage && initialLanguage !== this.defaultLanguage) {
      this.selectedLanguage = initialLanguage;
      this.languageSelected.emit(initialLanguage);
    }
  }

  #getPaymentUrlOptionIdByIndex(index: number): number {
    return index + 1;
  }

  #getPaymentUrlByOptionId(optionId: number): number {
    return optionId - 1;
  }

  #initializePaymentUrls(resetSelectedValues: boolean = true): void {
    if (this.paymentUrls.length === 0) {
      return;
    }

    this.paymentUrlOptions = this.paymentUrls.map((url, index) => ({
      id: this.#getPaymentUrlOptionIdByIndex(index),
      title: url.applicationName,
    }));

    if (resetSelectedValues) {
      this.paymentUrlIndexSelected.set(0);
      this.paymentUrlSelected.set(this.paymentUrls[0].url);
      this.applicationIdSelected.set(this.paymentUrls[0].applicationId);
    } else {
      this.paymentUrlSelected.set(this.paymentUrls[this.paymentUrlIndexSelected()].url);
      this.applicationIdSelected.set(this.paymentUrls[this.paymentUrlIndexSelected()].applicationId);
    }
  }

  #excludeWhitelabelLanguages(languages?: string[]): string[] | undefined {
    if (!languages || languages.length === 0) {
      return languages;
    }

    const isWhiteLabelLanguage = (language: string) => language.startsWith(this.WHITELABEL_PREFIX);
    return languages.filter(language => !isWhiteLabelLanguage(language));
  }

  #setupEmailStatusSubscription(): void {
    this.mailStatus.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe((status: PaymentUrlSendEmailStatus) => {
      this.isSendingEmail.set(false);
      if (status === PaymentUrlSendEmailStatus.SENT) {
        this.onClose();
      }
    });
  }
}
