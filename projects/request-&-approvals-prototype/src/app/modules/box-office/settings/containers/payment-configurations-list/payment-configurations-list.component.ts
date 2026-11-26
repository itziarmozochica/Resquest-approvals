import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, Signal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';

import { IgntDialogService, MENU } from '@ignite/common';
import { AlertSentiment } from '@ignite/legacy/components/ignt-alert/ignt-alert.component';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import {
  IGNT_TABLE_TRANSLATIONS,
  IgntTableColumnComponent,
  IgntTableColumnTemplateDirective,
  IgntTableComponent,
  IgntTableRowInteractionEvent,
  IgntTableSearchConfig,
  IgntTableTranslations,
} from '@ignite/table';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  catchError,
  combineLatest,
  distinctUntilChanged,
  EMPTY,
  finalize,
  map,
  Observable,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';

import { BaseErrorResponse } from '../../../../../shared/models/base-response';
import { ToastService } from '../../../../../shared/services/toast/toast.service';
import { parsePlaceId } from '../../../shared/helpers/parse-place-id';
import { PaymentConfigurationSummary } from '../../../shared/models/payment-configuration';
import { PaymentConfigurationsService } from '../../../shared/services/payment-configurations/payment-configurations.service';
import { PaymentFlowFeatureService } from '../../../shared/services/payment-flow-feature/payment-flow-feature.service';
import { SettingsListSectionState } from '../../components/settings-list-section/settings-list-section-state.model';
import { SettingsListSectionComponent } from '../../components/settings-list-section/settings-list-section.component';
import { openConfirmActionDialog } from '../../utils/open-confirm-action-dialog.util';
import { resolvePaymentConfigurationErrorMessage } from '../../utils/payment-configuration-error-message.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IgntIconButtonComponent,
    IgntTableColumnComponent,
    IgntTableColumnTemplateDirective,
    IgntTableComponent,
    MENU,
    SettingsListSectionComponent,
    TranslateModule,
  ],
  providers: [
    {
      multi: true,
      provide: IGNT_TABLE_TRANSLATIONS,
      useFactory: (): Signal<Partial<IgntTableTranslations>> => {
        const translateService = inject(TranslateService);
        const resolve = (): Partial<IgntTableTranslations> => ({
          searchLabel: translateService.instant('paymentConfig.list.table.searchLabel'),
        });
        return toSignal(translateService.onLangChange.pipe(map(resolve)), { initialValue: resolve() });
      },
    },
  ],
  selector: 'app-payment-configurations-list',
  styleUrl: './payment-configurations-list.component.scss',
  templateUrl: './payment-configurations-list.component.html',
})
export class PaymentConfigurationsListComponent {
  static readonly pageSize = 20;

  readonly #route = inject(ActivatedRoute);
  readonly #router = inject(Router);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #paymentFlowFeatureService = inject(PaymentFlowFeatureService);
  readonly #service = inject(PaymentConfigurationsService);
  readonly #toastService = inject(ToastService);
  readonly #translateService = inject(TranslateService);

  readonly #actionInProgress = signal<boolean>(false);
  readonly #placeId = signal<number | undefined>(undefined);
  readonly #reload$ = new Subject<void>();
  readonly #searchQuery = signal<string>('');

  protected readonly pageSize = PaymentConfigurationsListComponent.pageSize;
  protected readonly configurations = signal<PaymentConfigurationSummary[]>([]);
  protected readonly loading = signal<boolean>(true);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly rows = computed<PaymentConfigurationSummary[]>(() => {
    const query = this.#searchQuery().trim().toLowerCase();
    return query === '' ? this.configurations() : this.configurations().filter(row => row.name.toLowerCase().includes(query));
  });
  protected readonly hasPagination = computed<boolean>(() => this.rows().length > PaymentConfigurationsListComponent.pageSize);
  protected readonly searchConfig = computed<IgntTableSearchConfig>(() => ({ searchQuery: this.#searchQuery() }));
  protected readonly tableColumnTypeSample = computed<PaymentConfigurationSummary | undefined>(() => this.configurations()[0]);

  protected readonly state = computed<SettingsListSectionState>(() => {
    const errorMessage = this.errorMessage();
    if (errorMessage !== null) {
      return { kind: 'error', message: errorMessage };
    }
    if (this.loading()) {
      return { kind: 'results' };
    }
    if (this.configurations().length === 0) {
      return { kind: 'empty', message: this.#translateService.instant('paymentConfig.list.empty') };
    }
    return { kind: 'results' };
  });

  constructor() {
    combineLatest([
      this.#route.queryParamMap.pipe(
        map(params => parsePlaceId(params.get('venueId'))),
        distinctUntilChanged(),
      ),
      this.#reload$.pipe(startWith(undefined)),
    ])
      .pipe(
        tap(([placeId]) => {
          this.#placeId.set(placeId);
          this.loading.set(placeId !== undefined);
          this.errorMessage.set(null);
          if (placeId === undefined) {
            this.configurations.set([]);
          }
        }),
        switchMap(([placeId]) => (placeId === undefined ? EMPTY : this.#service.getPaymentConfigurations({ placeId }))),
        takeUntilDestroyed(),
      )
      .subscribe(response => {
        this.loading.set(false);
        if (response.error) {
          this.configurations.set([]);
          this.errorMessage.set(this.#translateService.instant('paymentConfig.list.error'));
          return;
        }
        this.configurations.set(response.data ?? []);
      });
  }

  protected deleteConfiguration(configuration: PaymentConfigurationSummary): void {
    if (this.#actionInProgress()) {
      return;
    }
    openConfirmActionDialog(this.#dialogService, {
      actionLabel: this.#translateService.instant('paymentConfig.confirm.remove.action'),
      description: this.#translateService.instant('paymentConfig.confirm.remove.description'),
      dismissLabel: this.#translateService.instant('paymentConfig.confirm.remove.dismiss'),
      kind: 'remove',
      question: this.#translateService.instant('paymentConfig.confirm.remove.question', { name: configuration.name }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.#executeDelete(configuration);
        }
      });
  }

  protected duplicateConfiguration(configuration: PaymentConfigurationSummary): void {
    if (this.#actionInProgress()) {
      return;
    }
    openConfirmActionDialog(this.#dialogService, {
      actionLabel: this.#translateService.instant('paymentConfig.confirm.duplicate.action'),
      description: this.#translateService.instant('paymentConfig.confirm.duplicate.description'),
      dismissLabel: this.#translateService.instant('paymentConfig.confirm.duplicate.dismiss'),
      kind: 'duplicate',
      question: this.#translateService.instant('paymentConfig.confirm.duplicate.question', { name: configuration.name }),
    })
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.#executeDuplicate(configuration);
        }
      });
  }

  protected editConfiguration(configuration: PaymentConfigurationSummary): void {
    this.#router.navigate(['payment-configurations', configuration.id], { queryParamsHandling: 'preserve', relativeTo: this.#route });
  }

  protected isDuplicateAllowed(configuration: PaymentConfigurationSummary): boolean {
    return this.#paymentFlowFeatureService.isPaymentConfigurationV2Enabled() && configuration.integratedGatewayProvider !== 'adyen_local';
  }

  protected onRowInteraction(event: IgntTableRowInteractionEvent<PaymentConfigurationSummary>): void {
    this.editConfiguration(event.item);
  }

  protected onSearch(query: string): void {
    this.#searchQuery.set(query);
  }

  #executeDelete(configuration: PaymentConfigurationSummary): void {
    const placeId = this.#placeId();
    if (placeId === undefined) {
      return;
    }
    this.#runAction(
      this.#service.deletePaymentConfiguration(placeId, configuration.id),
      'paymentConfig.actions.delete.success',
      'paymentConfig.actions.delete.error',
    );
  }

  #executeDuplicate(configuration: PaymentConfigurationSummary): void {
    const placeId = this.#placeId();
    if (placeId === undefined) {
      return;
    }
    const name = this.#translateService.instant('paymentConfig.actions.duplicate.copyName', { name: configuration.name });
    this.#runAction(
      this.#service.duplicatePaymentConfigurationV2(placeId, configuration.id, name),
      'paymentConfig.actions.duplicate.success',
      'paymentConfig.actions.duplicate.error',
    );
  }

  #runAction(request$: Observable<unknown>, successKey: string, errorKey: string): void {
    this.#actionInProgress.set(true);
    request$
      .pipe(
        finalize(() => this.#actionInProgress.set(false)),
        catchError((error: BaseErrorResponse) => {
          this.#toastService.add({
            message: resolvePaymentConfigurationErrorMessage(this.#translateService, error.code, errorKey),
            sentiment: AlertSentiment.danger,
          });
          return EMPTY;
        }),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe(() => {
        this.#toastService.add({ message: this.#translateService.instant(successKey), sentiment: AlertSentiment.positive });
        this.#reload$.next();
      });
  }
}
