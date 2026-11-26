import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  Injector,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';

import {
  IgntBreadcrumbComponent,
  IgntBreadcrumbItem,
  IgntButtonComponent,
  IgntButtonIcon,
  IgntDialogRef,
  IgntDialogService,
  MENU,
} from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { IgntInputFieldComponent } from '@ignite/legacy/components/ignt-input-field/ignt-input-field.component';
import { IgntTabsItemComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs-item/ignt-tabs-item.component';
import { IgntTabsComponent } from '@ignite/legacy/components/ignt-tabs/ignt-tabs.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntToggleComponent } from '@ignite/legacy/components/ignt-toggle/ignt-toggle.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, EMPTY, finalize, forkJoin, map, Observable, of, tap, throwError } from 'rxjs';

import { BaseErrorResponse } from '../../../../../shared/models/base-response';
import { ToastService } from '../../../../../shared/services/toast/toast.service';
import {
  PaymentConfigurationAssignedOnsiteSetup,
  PaymentConfigurationAvailableMethodsCatalog,
  PaymentConfigurationCatalogMethod,
  PaymentConfigurationCheckout,
  PaymentConfigurationCheckoutFlow,
  PaymentConfigurationConfiguredMethod,
  PaymentConfigurationDetail,
  PaymentConfigurationGatewayProvider,
  PaymentConfigurationInput,
  PaymentConfigurationMethodInput,
  PaymentConfigurationQuickAction,
  PaymentConfigurationV2,
  PaymentConfigurationV2Input,
} from '../../../shared/models/payment-configuration';
import { PaymentMethodCode } from '../../../shared/models/payment-method';
import { AdyenLocalConnectDeviceError } from '../../../shared/services/adyen-local-device/adyen-local-connect-device.error';
import { PaymentConfigurationsService } from '../../../shared/services/payment-configurations/payment-configurations.service';
import { PaymentFlowFeatureService } from '../../../shared/services/payment-flow-feature/payment-flow-feature.service';
import { methodLabelSuffixKey } from '../../../shared/utils/direct-payment-buttons.util';
import { PaymentConfigurationCheckoutFlowsComponent } from '../../components/payment-configuration-checkout-flows/payment-configuration-checkout-flows.component';
import { PaymentConfigurationCheckoutPreviewComponent } from '../../components/payment-configuration-checkout-preview/payment-configuration-checkout-preview.component';
import { PaymentConfigurationConnectDeviceTarget } from '../../components/payment-configuration-connect-device-dialog/payment-configuration-connect-device-dialog.model';
import { PaymentConfigurationDelegatedEditorComponent } from '../../components/payment-configuration-delegated-editor/payment-configuration-delegated-editor.component';
import { PaymentConfigurationDirectButtonsPreviewComponent } from '../../components/payment-configuration-direct-buttons-preview/payment-configuration-direct-buttons-preview.component';
import { PaymentConfigurationDirectButtonsPreviewButton } from '../../components/payment-configuration-direct-buttons-preview/payment-configuration-direct-buttons-preview.model';
import { PaymentConfigurationDirectButtonsComponent } from '../../components/payment-configuration-direct-buttons/payment-configuration-direct-buttons.component';
import {
  PaymentConfigurationDirectButtonSlot,
  PaymentConfigurationDirectButtonSlotChange,
  PaymentConfigurationDirectButtonSlotToggle,
} from '../../components/payment-configuration-direct-buttons/payment-configuration-direct-buttons.model';
import { PaymentConfigurationGatewayEditorComponent } from '../../components/payment-configuration-gateway-editor/payment-configuration-gateway-editor.component';
import {
  PaymentConfigurationGatewayEditorChange,
  PaymentConfigurationGatewayEditorState,
} from '../../components/payment-configuration-gateway-editor/payment-configuration-gateway-editor.model';
import { PaymentConfigurationMethodsPreviewComponent } from '../../components/payment-configuration-methods-preview/payment-configuration-methods-preview.component';
import {
  PaymentConfigurationMethodsPreviewItem,
  paymentMethodPreviewIcon,
} from '../../components/payment-configuration-methods-preview/payment-configuration-methods-preview.model';
import { PaymentConfigurationPreviewPanelComponent } from '../../components/payment-configuration-preview-panel/payment-configuration-preview-panel.component';
import { PaymentConfigurationPreviewPanelData } from '../../components/payment-configuration-preview-panel/payment-configuration-preview-panel.model';
import { openConfirmActionDialog } from '../../utils/open-confirm-action-dialog.util';
import {
  DEFAULT_CHECKOUT_FLOWS,
  defaultCheckout,
  PaymentConfigurationFlowSetting,
  reconcileCheckout,
  toFlowSettings,
  withMultiFlow,
  withQuickActions,
} from '../../utils/payment-configuration-checkout.util';
import {
  toDirectButtonSlots,
  withDirectButtonLimit,
  withDirectButtonRow,
  withDirectButtonSlot,
  withMainDirectButtonKept,
} from '../../utils/payment-configuration-direct-buttons.util';
import { resolvePaymentConfigurationErrorMessage } from '../../utils/payment-configuration-error-message.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    FormsModule,
    IgntBreadcrumbComponent,
    IgntButtonComponent,
    IgntIconButtonComponent,
    IgntIconComponent,
    IgntInputFieldComponent,
    IgntTabsComponent,
    IgntTabsItemComponent,
    IgntTagComponent,
    IgntToggleComponent,
    MENU,
    PaymentConfigurationCheckoutFlowsComponent,
    PaymentConfigurationCheckoutPreviewComponent,
    PaymentConfigurationDelegatedEditorComponent,
    PaymentConfigurationDirectButtonsComponent,
    PaymentConfigurationDirectButtonsPreviewComponent,
    PaymentConfigurationGatewayEditorComponent,
    PaymentConfigurationMethodsPreviewComponent,
    TranslateModule,
  ],
  selector: 'app-payment-configuration-editor',
  styleUrl: './payment-configuration-editor.component.scss',
  templateUrl: './payment-configuration-editor.component.html',
})
export class PaymentConfigurationEditorComponent implements OnInit {
  static readonly paymentMethodsTab = 1;

  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #injector = inject(Injector);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #service = inject(PaymentConfigurationsService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);
  #previewRef: IgntDialogRef | null = null;

  readonly placeId = input.required<number>();
  readonly configurationId = input<string | null>(null);

  readonly cancelled = output<void>();
  readonly deleted = output<void>();
  readonly duplicated = output<void>();
  readonly saved = output<void>();

  protected readonly catalog = signal<PaymentConfigurationAvailableMethodsCatalog | null>(null);
  protected readonly detail = signal<PaymentConfigurationDetail | PaymentConfigurationV2 | null>(null);
  protected readonly loading = signal<boolean>(true);
  protected readonly loadError = signal<boolean>(false);
  protected readonly saving = signal<boolean>(false);

  protected readonly summaryProvider = computed<PaymentConfigurationGatewayProvider | null>(() => this.gatewayState()?.provider ?? null);
  protected readonly summaryMethodCount = computed<number>(() => this.gatewayState()?.selectedMethodCodes.length ?? 0);
  protected readonly summaryDelegatedCount = computed<number>(() => this.delegatedSelection().length);
  protected readonly createdAt = computed<string | null>(() => this.detail()?.createdAt ?? null);
  protected readonly assignedOnsiteSetups = computed<PaymentConfigurationAssignedOnsiteSetup[]>(
    () => this.detail()?.assignedToOnsiteSetups ?? [],
  );
  protected readonly name = signal<string>('');

  protected readonly gatewayState = signal<PaymentConfigurationGatewayEditorState | null>(null);
  protected readonly gatewayValid = signal<boolean>(true);
  protected readonly delegatedSelection = signal<string[]>([]);
  protected readonly allowSplitPayments = signal<boolean>(false);
  protected readonly checkoutFlows = signal<PaymentConfigurationFlowSetting[]>(toFlowSettings(DEFAULT_CHECKOUT_FLOWS));
  protected readonly quickActions = signal<PaymentConfigurationQuickAction[] | null>(null);
  protected readonly usesV2 = signal<boolean>(false);
  protected readonly detailsExpanded = signal<boolean>(false);
  protected readonly summaryToggleIcon = computed<IgntButtonIcon>(() => ({
    name: this.detailsExpanded() ? 'chevron-up' : 'chevron-down',
    variant: 'light',
  }));

  readonly #selectedTab = signal<number>(0);
  protected readonly selectedTab = this.#selectedTab.asReadonly();

  protected readonly showCheckoutOptions = computed<boolean>(() => this.usesV2() && this.allowSplitPayments());
  protected readonly previewFlows = computed<PaymentConfigurationCheckoutFlow[]>(() =>
    this.checkoutFlows()
      .filter(setting => setting.enabled)
      .map(setting => setting.flow),
  );

  protected readonly gatewayValue = signal<PaymentConfigurationGatewayEditorState | null>(null);

  readonly #createdConfigurationId = signal<string | null>(null);
  readonly #lastPersisted = signal<PaymentConfigurationV2 | null>(null);
  readonly #editedConfigurationId = computed<string | null>(() => this.configurationId() ?? this.#createdConfigurationId());

  protected readonly isEdit = computed<boolean>(() => this.#editedConfigurationId() !== null);

  readonly #currentLang = toSignal(this.#translateService.onLangChange.pipe(map(event => event.lang)), {
    initialValue: this.#translateService.currentLang,
  });
  protected readonly breadcrumbItems = computed<IgntBreadcrumbItem[]>(() => {
    this.#currentLang();
    return [
      { label: this.#translateService.instant('menu.boxOffice'), type: 'label' },
      { label: this.#translateService.instant('menu.oboSettings'), type: 'label' },
      { id: 'list', label: this.#translateService.instant('paymentConfig.list.title'), type: 'action' },
      {
        label: this.#translateService.instant(
          this.isEdit() ? 'paymentConfig.editor.breadcrumb.edit' : 'paymentConfig.editor.breadcrumb.create',
        ),
        type: 'label',
      },
    ];
  });

  protected readonly delegatedMethods = computed<PaymentConfigurationCatalogMethod[]>(() => this.catalog()?.delegatedMethods ?? []);

  protected readonly submitted = signal<boolean>(false);

  readonly #methods = computed<PaymentConfigurationMethodInput[]>(() => {
    const gateway = this.gatewayState();
    const provider = gateway?.provider ?? null;
    const integratedMethods: PaymentConfigurationMethodInput[] =
      gateway === null || provider === null
        ? []
        : gateway.selectedMethodCodes.map(methodCode => ({ gatewayProvider: provider, methodCode }));
    const delegatedMethods: PaymentConfigurationMethodInput[] = this.delegatedSelection().map(methodCode => ({
      gatewayProvider: 'delegated',
      methodCode,
    }));
    return [...integratedMethods, ...delegatedMethods];
  });

  readonly #checkout = computed<PaymentConfigurationCheckout>(() => {
    const saved = this.#lastPersisted();
    const savedMethods = saved === null ? [] : this.#configuredMethodsOf(saved);
    const configuredMethods = this.#toConfiguredMethods(this.#methods(), savedMethods);
    const reconciled =
      saved === null ? defaultCheckout(configuredMethods) : reconcileCheckout(saved.checkout, savedMethods, configuredMethods);
    const requested = this.quickActions() ?? saved?.checkout.quickActions ?? [];
    return withDirectButtonLimit(
      withMainDirectButtonKept(
        withQuickActions(withMultiFlow(reconciled, this.allowSplitPayments(), this.checkoutFlows()), this.quickActions()),
        requested,
      ),
    );
  });

  protected readonly directButtonSlots = computed<PaymentConfigurationDirectButtonSlot[]>(() => {
    this.#currentLang();
    return toDirectButtonSlots(this.#checkout(), {
      pay: this.#translateService.instant('paymentConfig.editor.directButtons.pay'),
      seeMore: this.#translateService.instant('boxOffice.seeMoreOptions'),
      methodLabel: method => this.#methodLabel(method),
    });
  });
  protected readonly directButtonsPreview = computed<PaymentConfigurationDirectButtonsPreviewButton[]>(() => {
    const slots = this.directButtonSlots();
    const pay = slots.find(slot => slot.kind === 'pay');
    if (pay !== undefined && pay.label !== null) {
      return [{ label: pay.label, slot: 'primary' }];
    }
    const { quickActions } = this.#checkout();
    return slots.flatMap((slot): PaymentConfigurationDirectButtonsPreviewButton[] => {
      if (!slot.enabled) {
        return [];
      }
      if (slot.method !== null) {
        return [
          {
            icon: { name: paymentMethodPreviewIcon(slot.method.methodCode), variant: 'light' },
            label: this.#boxOfficeLabel(slot.method, quickActions),
            slot: slot.id,
          },
        ];
      }
      return slot.label === null ? [] : [{ label: slot.label, slot: slot.id }];
    });
  });
  protected readonly summaryDirectButtonCount = computed<number>(() => this.directButtonsPreview().length);
  protected readonly previewMethods = computed<PaymentConfigurationMethodsPreviewItem[]>(() => {
    this.#currentLang();
    return this.#checkout().paymentMethods.map(method => ({
      caption: this.#translateService.instant(this.#providerKey(method)),
      icon: paymentMethodPreviewIcon(method.methodCode),
      key: `${method.gatewayProvider}:${method.methodCode}`,
      label: this.#methodName(method),
    }));
  });

  readonly #formSnapshot = computed<string>(() => {
    const gateway = this.gatewayState();
    return JSON.stringify({
      allowSplitPayments: this.allowSplitPayments(),
      checkout: this.usesV2() ? this.#checkout() : null,
      delegated: [...this.delegatedSelection()].sort(),
      gateway: gateway === null ? null : { ...gateway, selectedMethodCodes: [...gateway.selectedMethodCodes].sort() },
      name: this.name().trim(),
    });
  });
  readonly #loadedSnapshot = signal<string | null>(null);
  protected readonly hasChanges = computed<boolean>(() => {
    const loaded = this.#loadedSnapshot();
    return loaded !== null && loaded !== this.#formSnapshot();
  });

  protected readonly actionsSentinel = viewChild<ElementRef<HTMLElement>>('actionsSentinel');
  protected readonly actionsDocked = signal<boolean>(false);

  readonly #provider = computed<PaymentConfigurationGatewayProvider | null>(() => this.gatewayState()?.provider ?? null);
  protected readonly isDuplicateAllowed = computed<boolean>(() => !this.usesV2() && this.#provider() !== 'adyen_local');

  protected readonly delegatedRequiredError = computed<boolean>(
    () => this.submitted() && this.#provider() === null && this.delegatedSelection().length === 0,
  );

  readonly #isValid = computed<boolean>(() => {
    if (this.catalog() === null || this.name().trim().length === 0) {
      return false;
    }
    if (!this.gatewayValid()) {
      return false;
    }
    return this.#provider() !== null || this.delegatedSelection().length > 0;
  });

  constructor() {
    this.#destroyRef.onDestroy(() => this.#previewRef?.close());
    effect(onCleanup => {
      const sentinel = this.actionsSentinel()?.nativeElement;
      if (!sentinel) {
        return;
      }
      const observer = new IntersectionObserver(entries => {
        this.actionsDocked.set(entries.some(entry => entry.isIntersecting));
      });
      observer.observe(sentinel);
      onCleanup(() => observer.disconnect());
    });
  }

  ngOnInit(): void {
    this.#load();
  }

  protected cancel(): void {
    if (this.saving()) {
      return;
    }
    if (!this.hasChanges()) {
      this.cancelled.emit();
      return;
    }
    const key = this.isEdit() ? 'cancelEdition' : 'cancelCreation';
    openConfirmActionDialog(this.#dialogService, {
      actionLabel: this.#translateService.instant(`paymentConfig.confirm.${key}.action`),
      description: this.#translateService.instant('paymentConfig.confirm.unsavedChanges'),
      dismissLabel: this.#translateService.instant('paymentConfig.confirm.keepEditing'),
      kind: 'cancel',
      question: this.#translateService.instant(`paymentConfig.confirm.${key}.question`),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.cancelled.emit();
        }
      });
  }

  protected duplicate(): void {
    const detail = this.detail();
    if (detail === null || this.saving() || this.isDuplicateAllowed() === false) {
      return;
    }
    openConfirmActionDialog(this.#dialogService, {
      actionLabel: this.#translateService.instant('paymentConfig.confirm.duplicate.action'),
      description: this.#translateService.instant('paymentConfig.confirm.duplicate.description'),
      dismissLabel: this.#translateService.instant('paymentConfig.confirm.duplicate.dismiss'),
      kind: 'duplicate',
      question: this.#translateService.instant('paymentConfig.confirm.duplicate.question', { name: detail.name }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.#executeDuplicate(detail);
        }
      });
  }

  protected onDelegatedSelectionChange(codes: string[]): void {
    this.delegatedSelection.set(codes);
  }

  protected onGatewayChange(change: PaymentConfigurationGatewayEditorChange): void {
    this.gatewayState.set(change.state);
    this.gatewayValid.set(change.valid);
  }

  protected onNameChange(value: string): void {
    this.name.set(value);
  }

  protected onCheckoutFlowsChange(flows: PaymentConfigurationFlowSetting[]): void {
    this.checkoutFlows.set(flows);
  }

  protected onDirectButtonSlotChange(change: PaymentConfigurationDirectButtonSlotChange): void {
    this.quickActions.set(withDirectButtonSlot(this.#checkout(), change));
  }

  protected onDirectButtonSlotToggle(toggle: PaymentConfigurationDirectButtonSlotToggle): void {
    this.quickActions.set(withDirectButtonRow(this.#checkout(), toggle));
  }

  protected onSplitPaymentsChange(): void {
    this.allowSplitPayments.update(checked => !checked);
  }

  protected openPreview(data: PaymentConfigurationPreviewPanelData): void {
    this.#previewRef = this.#dialogService.openSidePanel(PaymentConfigurationPreviewPanelComponent, { data, size: 'md' });
  }

  protected remove(): void {
    const id = this.#editedConfigurationId();
    const detail = this.detail();
    if (id === null || detail === null || this.saving()) {
      return;
    }
    openConfirmActionDialog(this.#dialogService, {
      actionLabel: this.#translateService.instant('paymentConfig.confirm.remove.action'),
      description: this.#translateService.instant('paymentConfig.confirm.remove.description'),
      dismissLabel: this.#translateService.instant('paymentConfig.confirm.remove.dismiss'),
      kind: 'remove',
      question: this.#translateService.instant('paymentConfig.confirm.remove.question', { name: detail.name }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.#executeRemove(id);
        }
      });
  }

  protected readonly saveForConnect = (): Observable<PaymentConfigurationConnectDeviceTarget> => {
    this.submitted.set(true);
    if (this.saving() || !this.#isValid()) {
      return throwError(() => new AdyenLocalConnectDeviceError('save_failed'));
    }
    const id = this.#editedConfigurationId();
    const input = this.#buildInput();
    this.saving.set(true);
    return this.#persist(id, input).pipe(
      tap(configurationId => {
        if (id === null) {
          this.#createdConfigurationId.set(configurationId);
        }
        this.#loadedSnapshot.set(this.#formSnapshot());
      }),
      map(configurationId => ({ configurationId })),
      finalize(() => this.saving.set(false)),
    );
  };

  protected save(): void {
    this.submitted.set(true);
    if (this.saving() || !this.#isValid()) {
      this.#showPaymentMethodsErrors();
      return;
    }
    const request$ = this.#persist(this.#editedConfigurationId(), this.#buildInput());
    const successKey = this.isEdit() ? 'paymentConfig.editor.toasts.updateSuccess' : 'paymentConfig.editor.toasts.createSuccess';

    this.#runWithSavingFeedback(
      request$,
      successKey,
      () => this.saved.emit(),
      error => this.#showActionError(error, 'paymentConfig.editor.toasts.saveError'),
    );
  }

  protected selectTab(index: number): void {
    this.#selectedTab.set(index);
  }

  protected toggleDetails(): void {
    this.detailsExpanded.update(expanded => !expanded);
  }

  #buildInput(): PaymentConfigurationInput {
    const gateway = this.gatewayState();
    return {
      allowSplitPayments: this.allowSplitPayments(),
      integratedGatewayProvider: gateway?.provider ?? null,
      methods: this.#methods(),
      name: this.name().trim(),
      providerConfig: gateway?.providerConfig ?? null,
      terminals: gateway?.terminals ?? [],
    };
  }

  #buildV2Input(input: PaymentConfigurationInput, isCreate: boolean): PaymentConfigurationV2Input {
    return {
      ...input,
      checkout: this.#checkout(),
      version: isCreate ? null : (this.#lastPersisted()?.version ?? null),
    };
  }

  #configuredMethodsOf(configuration: PaymentConfigurationV2): PaymentConfigurationConfiguredMethod[] {
    return [
      ...configuration.gateways.flatMap(gateway =>
        gateway.methods.map(method => ({
          displayNameKey: method.defaultDisplayNameKey,
          gatewayProvider: gateway.provider,
          methodCode: method.methodCode,
        })),
      ),
      ...configuration.delegatedMethods.map(method => ({
        displayNameKey: method.defaultDisplayNameKey,
        gatewayProvider: 'delegated' as const,
        methodCode: method.methodCode,
      })),
    ];
  }

  #executeDuplicate(detail: PaymentConfigurationDetail | PaymentConfigurationV2): void {
    const name = this.#translateService.instant('paymentConfig.actions.duplicate.copyName', { name: detail.name });
    this.#runWithSavingFeedback(
      this.#persist(null, { ...this.#buildInput(), name }),
      'paymentConfig.actions.duplicate.success',
      () => this.duplicated.emit(),
      error => this.#showActionError(error, 'paymentConfig.actions.duplicate.error'),
    );
  }

  #executeRemove(id: string): void {
    this.#runWithSavingFeedback(
      this.#service.deletePaymentConfiguration(this.placeId(), id),
      'paymentConfig.actions.delete.success',
      () => this.deleted.emit(),
      error => this.#showActionError(error, 'paymentConfig.actions.delete.error'),
    );
  }

  #load(): void {
    const placeId = this.placeId();
    const id = this.configurationId();
    this.loading.set(true);
    this.loadError.set(false);

    this.usesV2.set(this.#paymentFlowFeatureService.isPaymentConfigurationV2Enabled());
    const catalog$ = this.#service.getAvailableMethods(placeId);
    const request$ =
      id === null
        ? forkJoin({ catalog: catalog$, detail: of<PaymentConfigurationDetail | PaymentConfigurationV2 | null>(null) })
        : forkJoin({ catalog: catalog$, detail: this.#loadDetail(placeId, id) });

    request$
      .pipe(
        catchError(() => {
          this.loading.set(false);
          this.loadError.set(true);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(({ catalog, detail }) => {
        this.catalog.set(catalog);
        if (detail !== null) {
          this.#prefillFromDetail(detail);
        } else {
          this.name.set(this.#translateService.instant('paymentConfig.editor.name.default'));

          const adyenMethods = catalog.providers.find(provider => provider.provider === 'adyen')?.methods ?? [];
          const initialGateway: PaymentConfigurationGatewayEditorState = {
            provider: 'adyen',
            providerConfig: null,
            selectedMethodCodes: adyenMethods.some(method => method.code === PaymentMethodCode.CARD) ? [PaymentMethodCode.CARD] : [],
            terminals: [],
          };
          this.gatewayValue.set(initialGateway);
          this.gatewayState.set(initialGateway);

          if (catalog.delegatedMethods.some(method => method.code === PaymentMethodCode.CASH)) {
            this.delegatedSelection.set([PaymentMethodCode.CASH]);
          }
        }
        this.loading.set(false);
        afterNextRender(() => this.#loadedSnapshot.set(this.#formSnapshot()), { injector: this.#injector });
      });
  }

  #loadDetail(placeId: number, id: string): Observable<PaymentConfigurationDetail | PaymentConfigurationV2> {
    return this.usesV2()
      ? this.#service.getPaymentConfigurationV2(placeId, id).pipe(tap((detail: PaymentConfigurationV2) => this.#prefillCheckout(detail)))
      : this.#service
          .getPaymentConfiguration(placeId, id)
          .pipe(tap((detail: PaymentConfigurationDetail) => this.allowSplitPayments.set(detail.allowSplitPayments)));
  }

  #boxOfficeLabel(method: PaymentConfigurationMethodInput, quickActions: PaymentConfigurationQuickAction[]): string {
    const name = this.#methodName(method);
    const onBothPaths = quickActions.some(
      action =>
        action.type === 'payment_method' && action.methodCode === method.methodCode && action.gatewayProvider !== method.gatewayProvider,
    );
    const suffixKey = methodLabelSuffixKey(method.gatewayProvider);
    return onBothPaths && suffixKey !== null ? `${name} (${this.#translateService.instant(suffixKey)})` : name;
  }

  #methodLabel(method: PaymentConfigurationMethodInput): string {
    return `${this.#methodName(method)} (${this.#translateService.instant(this.#providerKey(method))})`;
  }

  #methodName(method: PaymentConfigurationMethodInput): string {
    const catalog = this.catalog();
    const methods =
      method.gatewayProvider === 'delegated'
        ? catalog?.delegatedMethods
        : catalog?.providers.find(provider => provider.provider === method.gatewayProvider)?.methods;
    return methods?.find(candidate => candidate.code === method.methodCode)?.name ?? method.methodCode;
  }

  #persist(id: string | null, input: PaymentConfigurationInput): Observable<string> {
    const placeId = this.placeId();
    if (!this.usesV2()) {
      return id === null
        ? this.#service.createPaymentConfiguration(placeId, input).pipe(map(result => result.id))
        : this.#service.updatePaymentConfiguration(placeId, id, input).pipe(map(() => id));
    }
    const v2Input = this.#buildV2Input(input, id === null);
    const request$ =
      id === null
        ? this.#service.createPaymentConfigurationV2(placeId, v2Input)
        : this.#service.updatePaymentConfigurationV2(placeId, id, v2Input);
    return request$.pipe(
      tap(result => this.#lastPersisted.set(result)),
      map(result => result.id),
    );
  }

  #prefillCheckout(detail: PaymentConfigurationV2): void {
    this.#lastPersisted.set(detail);
    this.allowSplitPayments.set(detail.allowSplitPayments && detail.checkout.multiFlow.enabled);
    this.checkoutFlows.set(toFlowSettings(detail.checkout.multiFlow.flows));
  }

  #prefillFromDetail(detail: PaymentConfigurationDetail | PaymentConfigurationV2): void {
    this.detail.set(detail);
    this.name.set(detail.name);
    const delegatedCodes = detail.delegatedMethods.map(method => method.methodCode);
    this.delegatedSelection.set(delegatedCodes);

    const gateway = detail.gateways[0] ?? null;
    if (gateway === null) {
      this.gatewayState.set(null);
      return;
    }
    const gatewayState: PaymentConfigurationGatewayEditorState = {
      provider: gateway.provider,
      providerConfig: gateway.providerConfig,
      selectedMethodCodes: gateway.methods.map(method => method.methodCode),
      terminals: gateway.terminals.map(terminal => ({
        externalId: terminal.externalId,
        ipAddress: terminal.ipAddress,
        label: terminal.label ?? undefined,
      })),
    };
    this.gatewayValue.set(gatewayState);
    this.gatewayState.set(gatewayState);
  }

  #providerKey(method: PaymentConfigurationMethodInput): string {
    return method.gatewayProvider === 'delegated'
      ? 'paymentConfig.editor.split.quickActions.delegated'
      : `paymentConfig.editor.gateway.provider.${method.gatewayProvider}`;
  }

  #runWithSavingFeedback(
    request$: Observable<unknown>,
    successKey: string,
    onSuccess: () => void,
    onError: (error: BaseErrorResponse) => void,
  ): void {
    this.saving.set(true);
    request$
      .pipe(
        catchError((error: BaseErrorResponse) => {
          this.saving.set(false);
          onError(error);
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.saving.set(false);
        this.#toastService.add({ message: this.#translateService.instant(successKey), sentiment: AlertSentiment.positive });
        onSuccess();
      });
  }

  #showActionError(error: BaseErrorResponse, fallbackKey: string): void {
    this.#toastService.add({
      message: resolvePaymentConfigurationErrorMessage(this.#translateService, error?.code, fallbackKey),
      sentiment: AlertSentiment.danger,
    });
  }

  #showPaymentMethodsErrors(): void {
    if (this.name().trim().length > 0) {
      this.#selectedTab.set(PaymentConfigurationEditorComponent.paymentMethodsTab);
    }
  }

  #toConfiguredMethods(
    methods: PaymentConfigurationMethodInput[],
    known: PaymentConfigurationConfiguredMethod[],
  ): PaymentConfigurationConfiguredMethod[] {
    const catalog = this.catalog();
    return methods.map(method => {
      const catalogMethods =
        method.gatewayProvider === 'delegated'
          ? catalog?.delegatedMethods
          : catalog?.providers.find(provider => provider.provider === method.gatewayProvider)?.methods;
      const displayNameKey =
        known.find(entry => entry.gatewayProvider === method.gatewayProvider && entry.methodCode === method.methodCode)?.displayNameKey ??
        catalogMethods?.find(entry => entry.code === method.methodCode)?.defaultDisplayNameKey ??
        method.methodCode;
      return { ...method, displayNameKey };
    });
  }
}
