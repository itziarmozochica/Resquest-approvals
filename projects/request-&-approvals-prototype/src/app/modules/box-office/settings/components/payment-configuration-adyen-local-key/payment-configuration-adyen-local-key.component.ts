import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { parseStrictPositiveIntegerString } from '@fz-original/app/shared/utils/number.util';
import { IgntAlertComponent } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { TranslateModule } from '@ngx-translate/core';

import { AdyenLocalProviderConfig } from '../../../shared/models/payment-configuration';
import { PaymentConfigurationAdyenLocalKeyChange } from './payment-configuration-adyen-local-key.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IgntAlertComponent, IgntFieldErrorComponent, IgntInputFieldComponent, TranslateModule],
  selector: 'app-payment-configuration-adyen-local-key',
  standalone: true,
  styleUrl: './payment-configuration-adyen-local-key.component.scss',
  templateUrl: './payment-configuration-adyen-local-key.component.html',
})
export class PaymentConfigurationAdyenLocalKeyComponent {
  readonly disabled = input<boolean>(false);
  readonly showErrors = input<boolean>(false);
  readonly storedKey = input<AdyenLocalProviderConfig | null>(null);
  readonly tapToPayEnabled = input<boolean>(false);

  readonly keyChange = output<PaymentConfigurationAdyenLocalKeyChange>();

  protected readonly adyenMerchantAccount = signal<string>('');
  protected readonly keyIdentifier = signal<string>('');
  protected readonly keyPassphrase = signal<string>('');
  protected readonly keyVersion = signal<string>('');

  // The key is write-once, so an existing configuration only shows it and rotation replaces it.
  protected readonly hasStoredKey = computed<boolean>(() => (this.storedKey()?.keyIdentifier ?? null) !== null);

  readonly #keyVersionNumber = computed<number | null>(() => parseStrictPositiveIntegerString(this.keyVersion()));
  readonly #keyRequired = computed<boolean>(() => !this.tapToPayEnabled());

  protected readonly adyenMerchantAccountError = computed<boolean>(
    () => this.showErrors() && this.adyenMerchantAccount().trim().length === 0,
  );
  protected readonly keyIdentifierError = computed<boolean>(
    () => this.showErrors() && this.#keyRequired() && this.keyIdentifier().trim().length === 0,
  );
  protected readonly keyPassphraseError = computed<boolean>(
    () => this.showErrors() && this.#keyRequired() && this.keyPassphrase().length === 0,
  );
  protected readonly keyVersionError = computed<boolean>(() => {
    if (this.#keyVersionNumber() !== null) {
      return false;
    }
    return this.showErrors() || this.keyVersion().trim().length > 0;
  });

  readonly #valid = computed<boolean>(() => {
    if (this.hasStoredKey()) {
      return true;
    }
    if (this.adyenMerchantAccount().trim().length === 0) {
      return false;
    }
    if (!this.#keyRequired()) {
      return true;
    }
    return this.keyIdentifier().trim().length > 0 && this.#keyVersionNumber() !== null && this.keyPassphrase().length > 0;
  });

  constructor() {
    effect(() => {
      const storedKey = this.storedKey();
      untracked(() => this.#syncFromStoredKey(storedKey));
    });
    effect(() => {
      this.tapToPayEnabled();
      untracked(() => this.#emitChange());
    });
  }

  protected onAdyenMerchantAccountChange(value: string): void {
    this.adyenMerchantAccount.set(value);
    this.#emitChange();
  }

  protected onKeyIdentifierChange(value: string): void {
    this.keyIdentifier.set(value);
    this.#emitChange();
  }

  protected onKeyPassphraseChange(value: string): void {
    this.keyPassphrase.set(value);
    this.#emitChange();
  }

  protected onKeyVersionChange(value: string): void {
    this.keyVersion.set(value);
    this.#emitChange();
  }

  #buildState(): AdyenLocalProviderConfig | null {
    const adyenMerchantAccount = this.adyenMerchantAccount().trim();
    const tapToPayEnabled = this.tapToPayEnabled();
    if (!this.hasStoredKey() && !this.#keyRequired()) {
      return { adyenMerchantAccount, keyIdentifier: null, keyPassphrase: null, keyVersion: null, tapToPayEnabled };
    }
    const keyVersion = this.#keyVersionNumber();
    if (keyVersion === null) {
      return null;
    }
    return {
      adyenMerchantAccount,
      keyIdentifier: this.keyIdentifier().trim(),
      keyPassphrase: this.keyPassphrase().length > 0 ? this.keyPassphrase() : null,
      keyVersion,
      tapToPayEnabled,
    };
  }

  #emitChange(): void {
    this.keyChange.emit({ state: this.#buildState(), valid: this.#valid() });
  }

  #syncFromStoredKey(storedKey: AdyenLocalProviderConfig | null): void {
    this.adyenMerchantAccount.set(storedKey?.adyenMerchantAccount ?? '');
    this.keyIdentifier.set(storedKey?.keyIdentifier ?? '');
    this.keyVersion.set(storedKey?.keyVersion?.toString() ?? '');
    this.keyPassphrase.set('');
    this.#emitChange();
  }
}
