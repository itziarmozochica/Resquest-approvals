import { NgTemplateOutlet, UpperCasePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  Signal,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import { FeatureFlags } from '@fz-original/app/shared/optimizely/feature-flags';
import { OptimizelyService } from '@fz-original/app/shared/optimizely/optimizely.service';
import { IgntAlertComponent, IgntPillComponent } from '@ignite/common';
import { IgntFieldErrorComponent } from '@ignite/legacy/components/ignt-field-error/ignt-field-error.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntRadioComponent } from '@ignite/legacy/components/ignt-radio/ignt-radio.component';
import { NgSelectModule } from '@ng-select/ng-select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { map, Observable } from 'rxjs';

import {
  isSamePaymentTerminalId,
  isViablePaymentTerminalPrefix,
  PAYMENT_TERMINAL_FORMATS,
  PAYMENT_TERMINAL_PATTERNS,
  PaymentTerminalFormat,
  supportsPaymentTerminals,
} from '../../../shared/constants/payment-terminal-patterns.constants';
import {
  AdyenLocalProviderConfig,
  PayhereProviderConfig,
  PaymentConfigurationAssignedOnsiteSetup,
  PaymentConfigurationAvailableMethodsCatalog,
  PaymentConfigurationCatalogMethod,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationProviderConfig,
  PaymentConfigurationTerminalInput,
  SquareProviderConfig,
} from '../../../shared/models/payment-configuration';
import { MethodChecklistComponent } from '../method-checklist/method-checklist.component';
import { MethodSwitchListComponent } from '../method-switch-list/method-switch-list.component';
import { PaymentConfigurationAdyenLocalKeyComponent } from '../payment-configuration-adyen-local-key/payment-configuration-adyen-local-key.component';
import { PaymentConfigurationAdyenLocalKeyChange } from '../payment-configuration-adyen-local-key/payment-configuration-adyen-local-key.model';
import { PaymentConfigurationConnectDeviceTarget } from '../payment-configuration-connect-device-dialog/payment-configuration-connect-device-dialog.model';
import { PaymentConfigurationConnectDeviceComponent } from '../payment-configuration-connect-device/payment-configuration-connect-device.component';
import {
  PaymentConfigurationAdyenLocalMode,
  PaymentConfigurationGatewayEditorChange,
  PaymentConfigurationGatewayEditorState,
} from './payment-configuration-gateway-editor.model';

const TERMINAL_INPUT_CLEAR_DELAY_MS = 100;

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.redesign]': 'redesign()' },
  imports: [
    FormsModule,
    IgntAlertComponent,
    IgntFieldErrorComponent,
    IgntPillComponent,
    IgntInputFieldComponent,
    IgntRadioComponent,
    MethodChecklistComponent,
    MethodSwitchListComponent,
    NgSelectModule,
    NgTemplateOutlet,
    PaymentConfigurationAdyenLocalKeyComponent,
    PaymentConfigurationConnectDeviceComponent,
    TranslateModule,
    UpperCasePipe,
  ],
  selector: 'app-payment-configuration-gateway-editor',
  standalone: true,
  styleUrl: './payment-configuration-gateway-editor.component.scss',
  templateUrl: './payment-configuration-gateway-editor.component.html',
})
export class PaymentConfigurationGatewayEditorComponent {
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #translateService = inject(TranslateService);
  readonly #tapToPayFlagEnabled: Signal<boolean> = toSignal(
    this.#optimizelyService
      .observeUserData()
      .pipe(map(() => this.#optimizelyService.isFeatureEnabled(FeatureFlags.ADYEN_LOCAL_TAP_TO_PAY) === true)),
    { initialValue: false },
  );
  private readonly terminalField = viewChild<IgntInputFieldComponent>('terminalField');
  #clearTerminalTimer: ReturnType<typeof setTimeout> | undefined;

  readonly catalog = input.required<PaymentConfigurationAvailableMethodsCatalog>();
  readonly assignedOnsiteSetups = input<readonly PaymentConfigurationAssignedOnsiteSetup[]>([]);
  readonly configurationId = input<string | null>(null);
  readonly disabled = input<boolean>(false);
  readonly placeId = input<number | null>(null);
  readonly saveBeforeConnect = input.required<() => Observable<PaymentConfigurationConnectDeviceTarget>>();
  readonly initialState = input<PaymentConfigurationGatewayEditorState | null>(null);
  readonly redesign = input<boolean>(false);
  readonly showErrors = input<boolean>(false);

  readonly gatewayChange = output<PaymentConfigurationGatewayEditorChange>();

  protected readonly provider = signal<PaymentConfigurationGatewayProvider | null>(null);
  protected readonly selectedMethodCodes = signal<readonly string[]>([]);
  protected readonly terminals = signal<readonly PaymentConfigurationTerminalInput[]>([]);
  protected readonly terminalSearch = signal<string>('');
  protected readonly terminalInput = signal<string>('');

  protected readonly applicationId = signal<string>('');
  protected readonly squareLocationId = signal<string>('');
  protected readonly merchantId = signal<string>('');
  protected readonly storedAdyenLocalKey = signal<AdyenLocalProviderConfig | null>(null);
  protected readonly tapToPayEnabled = signal<boolean>(false);

  readonly #adyenLocalKey = signal<PaymentConfigurationAdyenLocalKeyChange | null>(null);

  protected readonly adyenLocalModes = PaymentConfigurationAdyenLocalMode;
  protected readonly adyenLocalMode = computed<PaymentConfigurationAdyenLocalMode>(() =>
    this.tapToPayEnabled() ? PaymentConfigurationAdyenLocalMode.TapToPay : PaymentConfigurationAdyenLocalMode.Terminals,
  );

  protected readonly providerItems = computed<{ label: string; value: PaymentConfigurationGatewayProvider | '' }[]>(() => [
    ...this.catalog().providers.map(({ provider }) => ({
      label: this.#translateService.instant(`paymentConfig.editor.gateway.provider.${provider}`),
      value: provider,
    })),
    { label: this.#translateService.instant('paymentConfig.editor.gateway.provider.none'), value: '' },
  ]);

  protected readonly availableMethods = computed<PaymentConfigurationCatalogMethod[]>(() => {
    const current = this.provider();
    if (current === null) {
      return [];
    }
    return this.catalog().providers.find(p => p.provider === current)?.methods ?? [];
  });

  protected readonly showProviderConfig = computed<boolean>(() => this.provider() === 'square' || this.provider() === 'payhere');
  protected readonly showTerminals = computed<boolean>(() => supportsPaymentTerminals(this.provider()));

  protected readonly showCardMode = computed<boolean>(() => {
    const initialConfig = this.initialState()?.providerConfig ?? null;
    const storedTapToPay = initialConfig !== null && 'tapToPayEnabled' in initialConfig && initialConfig.tapToPayEnabled;
    return this.provider() === 'adyen_local' && (this.#tapToPayFlagEnabled() || storedTapToPay);
  });
  /**
   * `adyen_local` has no terminal input: the id is read off the terminal certificate when the
   * device is connected (D21), so the section explains that and lists what is already there.
   */
  protected readonly showAdyenLocalTerminals = computed<boolean>(() => this.provider() === 'adyen_local');
  readonly #savedTerminals = computed<readonly PaymentConfigurationTerminalInput[]>(() =>
    this.provider() === 'adyen_local' && this.tapToPayEnabled() ? [] : this.terminals(),
  );
  protected readonly showTerminalsRemovedWarning = computed<boolean>(
    () => this.provider() === 'adyen_local' && this.tapToPayEnabled() && this.terminals().length > 0,
  );
  /** Nothing to seal until the key block is complete, so the connect button waits for it. */
  protected readonly hasAdyenLocalCredentials = computed<boolean>(() => this.#adyenLocalKey()?.valid === true);

  protected readonly assignedOnsiteSetupNames = computed<string[]>(() => this.assignedOnsiteSetups().map(setup => setup.name));
  protected readonly showTerminalsChangedWarning = computed<boolean>(() => {
    if (this.assignedOnsiteSetups().length === 0) {
      return false;
    }
    const initialIds = (this.initialState()?.terminals ?? []).map(terminal => terminal.externalId).sort();
    const currentIds = this.#savedTerminals()
      .map(terminal => terminal.externalId)
      .sort();
    return initialIds.length !== currentIds.length || initialIds.some((id, index) => id !== currentIds[index]);
  });
  protected readonly filteredTerminals = computed<readonly PaymentConfigurationTerminalInput[]>(() => {
    const term = this.terminalSearch().trim().toLowerCase();
    const terminals = this.terminals();
    return term === '' ? terminals : terminals.filter(terminal => terminal.externalId.toLowerCase().includes(term));
  });

  protected readonly terminalPattern = computed<string>(() => {
    const provider = this.provider();
    return supportsPaymentTerminals(provider) ? PAYMENT_TERMINAL_PATTERNS[provider] : '';
  });

  readonly #terminalFormats = computed<readonly PaymentTerminalFormat[]>(() => {
    const provider = this.provider();
    return supportsPaymentTerminals(provider) ? PAYMENT_TERMINAL_FORMATS[provider] : [];
  });

  protected readonly terminalInputError = computed<boolean>(() => {
    const value = this.terminalInput().trim();
    return value.length > 0 && !isViablePaymentTerminalPrefix(value, this.#terminalFormats());
  });

  readonly #valid = computed<boolean>(() => {
    const current = this.provider();
    if (current === null) {
      return true;
    }
    if (this.selectedMethodCodes().length === 0) {
      return false;
    }
    if (current === 'square' && !(this.applicationId().trim().length > 0 && this.squareLocationId().trim().length > 0)) {
      return false;
    }
    if (current === 'payhere' && this.merchantId().trim().length === 0) {
      return false;
    }
    if (current === 'adyen_local' && this.#adyenLocalKey()?.valid !== true) {
      return false;
    }
    if (this.showTerminals() && this.terminals().length === 0) {
      return false;
    }
    return true;
  });

  protected readonly methodsError = computed<boolean>(
    () => this.showErrors() && this.provider() !== null && this.selectedMethodCodes().length === 0,
  );
  protected readonly terminalsError = computed<boolean>(() => this.showErrors() && this.showTerminals() && this.terminals().length === 0);
  protected readonly squareLocationIdError = computed<boolean>(
    () => this.showErrors() && this.provider() === 'square' && this.squareLocationId().trim().length === 0,
  );
  protected readonly squareApplicationIdError = computed<boolean>(
    () => this.showErrors() && this.provider() === 'square' && this.applicationId().trim().length === 0,
  );
  protected readonly merchantIdError = computed<boolean>(
    () => this.showErrors() && this.provider() === 'payhere' && this.merchantId().trim().length === 0,
  );

  #lastEmittedSignature: string | null = null;

  constructor() {
    effect(() => {
      const initialState = this.initialState();
      untracked(() => this.#syncFromInitialState(initialState));
    });
  }

  protected onAdyenLocalKeyChange(change: PaymentConfigurationAdyenLocalKeyChange): void {
    this.#adyenLocalKey.set(change);
    this.#emitChange();
  }

  protected onApplicationIdChange(value: string): void {
    this.applicationId.set(value);
    this.#emitChange();
  }

  protected onMerchantIdChange(value: string): void {
    this.merchantId.set(value);
    this.#emitChange();
  }

  protected onMethodsSelectionChange(codes: string[]): void {
    this.selectedMethodCodes.set(codes);
    this.#emitChange();
  }

  protected onProviderChange(rawValue: PaymentConfigurationGatewayProvider | ''): void {
    const next = rawValue === '' ? null : rawValue;
    if (next === this.provider()) {
      return;
    }
    this.provider.set(next);
    this.selectedMethodCodes.set([]);
    this.terminals.set([]);
    this.terminalSearch.set('');
    this.terminalInput.set('');
    this.applicationId.set('');
    this.squareLocationId.set('');
    this.merchantId.set('');
    this.storedAdyenLocalKey.set(null);
    this.tapToPayEnabled.set(false);
    this.#adyenLocalKey.set(null);
    this.#emitChange();
  }

  protected onAdyenLocalModeChange(mode: PaymentConfigurationAdyenLocalMode): void {
    this.tapToPayEnabled.set(mode === PaymentConfigurationAdyenLocalMode.TapToPay);
    this.#emitChange();
  }

  protected onSquareLocationIdChange(value: string): void {
    this.squareLocationId.set(value);
    this.#emitChange();
  }

  protected onTerminalInputChange(value: string): void {
    const externalId = value.trim();
    if (!new RegExp(this.terminalPattern()).test(externalId)) {
      this.terminalInput.set(value);
      return;
    }

    this.terminalInput.set(value);
    clearTimeout(this.#clearTerminalTimer);
    this.#clearTerminalTimer = setTimeout(() => {
      // Skip if the user already started typing something new.
      if (this.terminalInput() !== value) {
        return;
      }
      this.terminalInput.set('');
      this.#clearTerminalField();
    }, TERMINAL_INPUT_CLEAR_DELAY_MS);
    if (this.terminals().some(terminal => terminal.externalId === externalId)) {
      return;
    }
    this.terminals.set([...this.terminals(), { externalId, ipAddress: null }]);
    this.#emitChange();
  }

  /**
   * The enrolment endpoint already created the terminal row, so the editor adopts it: a later save
   * must send the terminal back instead of an empty list that would unpick it.
   */
  protected onDeviceConnected(terminal: PaymentConfigurationTerminalInput): void {
    this.terminals.update(terminals => [
      ...terminals.filter(existing => !isSamePaymentTerminalId(existing.externalId, terminal.externalId)),
      { ...terminal },
    ]);
    this.#emitChange();
  }

  protected onTerminalSearch(value: string): void {
    this.terminalSearch.set(value);
  }

  protected removeTerminal(externalId: string): void {
    // Bare icon has no native disabled state, so the handler guards it.
    if (this.disabled() === true) {
      return;
    }
    this.terminals.set(this.terminals().filter(terminal => terminal.externalId !== externalId));
    this.#emitChange();
  }

  #buildProviderConfig(provider: PaymentConfigurationGatewayProvider | null): PaymentConfigurationProviderConfig | null {
    if (provider === 'square') {
      return {
        applicationId: this.applicationId().trim(),
        squareLocationId: this.squareLocationId().trim(),
      } satisfies SquareProviderConfig;
    }
    if (provider === 'payhere') {
      return { merchantId: this.merchantId().trim() } satisfies PayhereProviderConfig;
    }
    if (provider === 'adyen_local') {
      const key = this.#adyenLocalKey();
      const state = key === null ? this.storedAdyenLocalKey() : key.state;
      return state === null ? null : { ...state, tapToPayEnabled: this.tapToPayEnabled() };
    }
    return null;
  }

  #buildState(): PaymentConfigurationGatewayEditorState {
    const provider = this.provider();
    return {
      provider,
      providerConfig: this.#buildProviderConfig(provider),
      selectedMethodCodes: [...this.selectedMethodCodes()],
      terminals: this.#savedTerminals().map(terminal => ({ ...terminal })),
    };
  }

  #clearTerminalField(): void {
    const field = this.terminalField();
    if (field === undefined) {
      return;
    }
    field.writeValue('');
    if (field.inputElement !== undefined) {
      (field.inputElement.nativeElement as HTMLInputElement).value = '';
    }
  }

  #emitChange(): void {
    const state = this.#buildState();
    const valid = this.#valid();
    const signature = JSON.stringify({ state, valid });
    // Skip identical re-emits so syncing from initialState cannot drive a feedback loop.
    if (signature === this.#lastEmittedSignature) {
      return;
    }
    this.#lastEmittedSignature = signature;
    this.gatewayChange.emit({ state, valid });
  }

  #syncFromInitialState(initialState: PaymentConfigurationGatewayEditorState | null): void {
    if (initialState === null) {
      return;
    }
    this.provider.set(initialState.provider);
    this.selectedMethodCodes.set(initialState.selectedMethodCodes);
    this.terminals.set(initialState.terminals.map(terminal => ({ ...terminal })));
    const config = initialState.providerConfig;
    this.applicationId.set(config !== null && 'applicationId' in config ? config.applicationId : '');
    this.squareLocationId.set(config !== null && 'squareLocationId' in config ? config.squareLocationId : '');
    this.merchantId.set(config !== null && 'merchantId' in config ? config.merchantId : '');
    this.storedAdyenLocalKey.set(config !== null && 'adyenMerchantAccount' in config ? config : null);
    this.tapToPayEnabled.set(config !== null && 'tapToPayEnabled' in config ? config.tapToPayEnabled : false);
    this.#emitChange();
  }
}
