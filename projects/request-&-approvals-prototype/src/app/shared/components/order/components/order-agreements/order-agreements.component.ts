import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
  viewChildren,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';

import { IndividualAgreementStatus } from '@fz-original/app/agreements/signing/enums/individual-agreement-status.enum';
import { AgreementStatusTagComponent } from '@fz-original/app/agreements/signing/modal/components/agreement-status-tag/agreement-status-tag.component';
import { AgreementSigningModalService } from '@fz-original/app/agreements/signing/modal/services/agreement-signing-modal.service';
import { getAgreementSignerLabels } from '@fz-original/app/agreements/signing/modal/utils/agreement-signer-label.util';
import { IndividualAgreement } from '@fz-original/app/agreements/signing/models/individual-agreement.model';
import type { OrderAgreementSigner } from '@fz-original/app/agreements/signing/models/order-agreement-signer.model';
import type { OrderAgreementAction, OrderAgreements } from '@fz-original/app/agreements/signing/models/order-agreements.model';
import { AgreementSigningService } from '@fz-original/app/agreements/signing/services/agreement-signing.service';
import { resolveAgreementListErrorKey } from '@fz-original/app/agreements/signing/utils/agreement-list-error.util';
import { isTicketAlreadyValidatedError } from '@fz-original/app/agreements/signing/utils/agreement-sign-error.util';
import type { MultiStepModalResult } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';
import { IgntDialogService, IgntToastService, type IgntDialogRef } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import {
  IgntButtonDropdownComponent,
  type IgntButtonDropdownOption,
} from '@ignite/legacy/components/ignt-button-dropdown/ignt-button-dropdown.component';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntTagComponent, type TagSentiment } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { catchError, defer, EMPTY, filter, finalize, map, of, scan, startWith, Subject, switchMap, take, tap, type Observable } from 'rxjs';

import { FeatureFlags } from '../../../../optimizely/feature-flags';
import { OptimizelyService } from '../../../../optimizely/optimizely.service';
import { PartnerService } from '../../../../services/partner/partner.service';
import { Permissions } from '../../../../services/user/permissions';
import { UserService } from '../../../../services/user/user.service';
import type { OrderAgreementsListState, OrderAgreementsRequest, OrderAgreementsView } from '../../models/order-agreements-view.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class.order-agreements--tile]': 'tileLayout()' },
  imports: [
    AgreementStatusTagComponent,
    IgntButtonDropdownComponent,
    IgntIconComponent,
    IgntListItemComponent,
    IgntTagComponent,
    TranslateModule,
  ],
  selector: 'app-order-agreements',
  styleUrl: './order-agreements.component.scss',
  templateUrl: './order-agreements.component.html',
})
export class OrderAgreementsComponent {
  static readonly hiddenView: OrderAgreementsView = { agreements: [], errorKey: null, pending: 0, state: 'hidden' };
  static readonly loadingView: OrderAgreementsView = { agreements: [], errorKey: null, pending: 0, state: 'loading' };

  readonly #agreementSigningModalService = inject(AgreementSigningModalService);
  readonly #agreementSigningService = inject(AgreementSigningService);
  readonly #destroyRef = inject(DestroyRef);
  readonly #dialogService = inject(IgntDialogService);
  readonly #optimizelyService = inject(OptimizelyService);
  readonly #partnerService = inject(PartnerService);
  readonly #toastService = inject(IgntToastService);
  readonly #translateService = inject(TranslateService);
  readonly #userService = inject(UserService);

  readonly hasReleaseConditions: InputSignal<boolean> = input<boolean>(false);
  readonly tileLayout = input(false);
  readonly orderId: InputSignal<number | null> = input<number | null>(null);
  readonly orderPartnerId: InputSignal<number | null> = input<number | null>(null);
  /** Emits when an action or the signing modal may have held or released one of the order's tickets. */
  readonly ticketUpdated: OutputEmitterRef<void> = output<void>();

  protected readonly hasManageAgreementsPermission: boolean = this.#userService.hasPermission(Permissions.CAN_MANAGE_AGREEMENTS);
  protected readonly isActing: WritableSignal<boolean> = signal<boolean>(false);
  protected readonly isCollapsed: WritableSignal<boolean> = signal<boolean>(true);
  protected readonly rowActions: IgntButtonDropdownOption<OrderAgreementAction>[] = [
    { label: this.#translateService.instant('validateTicketsNew.orderAgreements.actions.waive'), value: 'waive', variant: 'danger' },
    { label: this.#translateService.instant('validateTicketsNew.orderAgreements.actions.recheck'), value: 'recheck' },
    { label: this.#translateService.instant('validateTicketsNew.orderAgreements.actions.reopen'), value: 'reopen' },
  ];
  protected readonly rowMenus: Signal<readonly IgntButtonDropdownComponent<OrderAgreementAction>[]> =
    viewChildren<IgntButtonDropdownComponent<OrderAgreementAction>>(IgntButtonDropdownComponent);
  // A signed row has nothing left to waive or re-check.
  protected readonly signedRowActions: IgntButtonDropdownOption<OrderAgreementAction>[] = this.rowActions.filter(
    (option: IgntButtonDropdownOption<OrderAgreementAction>) => option.value === 'reopen',
  );
  protected readonly signedStatus: IndividualAgreementStatus = IndividualAgreementStatus.signed;
  // fever2 refuses to reopen a row nobody has claimed.
  protected readonly unclaimedRowActions: IgntButtonDropdownOption<OrderAgreementAction>[] = this.rowActions.filter(
    (option: IgntButtonDropdownOption<OrderAgreementAction>) => option.value !== 'reopen',
  );

  #openSigningDialog: IgntDialogRef<MultiStepModalResult> | null = null;
  readonly #isRefreshing: WritableSignal<boolean> = signal<boolean>(false);
  readonly #reload$: Subject<void> = new Subject<void>();
  readonly #request: Signal<OrderAgreementsRequest> = computed(() => ({
    hasReleaseConditions: this.hasReleaseConditions(),
    orderId: this.orderId() ?? null,
    partnerId: this.orderPartnerId() ?? this.#partnerService.getPartner()?.id ?? null,
  }));

  readonly #view: Signal<OrderAgreementsView> = toSignal(this.#loadOnIdentity(), { initialValue: OrderAgreementsComponent.hiddenView });

  protected readonly agreements: Signal<Array<IndividualAgreement>> = computed(() => this.#view().agreements);
  readonly #signers: Signal<OrderAgreementSigner[]> = toSignal(this.#loadSignersOnExpand(), { initialValue: [] });
  protected readonly signerLabels: Signal<Record<string, string | null>> = computed(() =>
    getAgreementSignerLabels(this.agreements(), this.#signers(), this.#translateService),
  );
  protected readonly isBusy: Signal<boolean> = computed(() => this.isActing() || this.#isRefreshing());
  protected readonly state: Signal<OrderAgreementsListState> = computed(() => this.#view().state);

  protected readonly isVisible: Signal<boolean> = computed(() => {
    const view = this.#view();
    return view.state === 'error' || (view.state === 'loaded' && view.agreements.length > 0);
  });

  protected readonly errorKey: Signal<string> = computed(() => this.#view().errorKey ?? 'agreements.signing.modal.list.error');

  protected readonly summaryLabelKey: Signal<string> = computed(() =>
    this.#view().pending === 0
      ? 'validateTicketsNew.orderAgreements.summary.allSigned'
      : 'validateTicketsNew.orderAgreements.summary.pending',
  );

  protected readonly summarySentiment: Signal<TagSentiment> = computed(() => (this.#view().pending === 0 ? 'positive' : 'warning'));

  protected readonly pendingCount: Signal<number> = computed(() => this.#view().pending);

  protected activateRow(event: Event, individualAgreementId: string): void {
    event.preventDefault();
    this.openAgreement(individualAgreementId);
  }

  protected onRowAction(
    action: OrderAgreementAction,
    agreement: IndividualAgreement,
    menu: IgntButtonDropdownComponent<OrderAgreementAction>,
  ): void {
    menu.close();
    const { partnerId } = this.#request();
    if (partnerId === null || this.isBusy()) {
      return;
    }
    this.isActing.set(true);
    const isSignedReopen: boolean = action === 'reopen' && agreement.status === IndividualAgreementStatus.signed;
    const confirmed$: Observable<boolean | undefined> =
      action === 'waive' ? this.#confirmWaive(agreement) : isSignedReopen ? this.#confirmReopen() : of(true);
    confirmed$
      .pipe(
        take(1),
        filter((confirmed: boolean | undefined) => confirmed === true),
        switchMap(() =>
          isSignedReopen
            ? this.#agreementSigningService.reopen(partnerId, agreement.id, true)
            : this.#agreementSigningService[action](partnerId, agreement.id),
        ),
        finalize(() => this.isActing.set(false)),
        takeUntilDestroyed(this.#destroyRef),
      )
      .subscribe({
        error: (error: unknown) => {
          this.#toastService.danger(this.#translateService.instant(this.#errorKey(action, error)));
          if (this.#isRowPossiblyChanged(error)) {
            this.#reload$.next();
            this.ticketUpdated.emit();
          }
        },
        next: () => {
          this.#toastService.positive(this.#translateService.instant(`validateTicketsNew.orderAgreements.actions.${action}Success`));
          this.#reload$.next();
          this.ticketUpdated.emit();
        },
      });
  }

  protected onRowMenuOpenedChange(opened: boolean, self: IgntButtonDropdownComponent<OrderAgreementAction>): void {
    if (!opened) {
      return;
    }
    for (const menu of this.rowMenus()) {
      if (menu !== self) {
        menu.close();
      }
    }
  }

  protected openAgreement(individualAgreementId: string): void {
    const { orderId, partnerId } = this.#request();
    if (orderId === null || partnerId === null || this.#openSigningDialog !== null || this.isBusy()) {
      return;
    }
    this.#openSigningDialog = this.#agreementSigningModalService.open({ individualAgreementId, orderId, partnerId });
    this.#openSigningDialog.closed$.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => {
      this.#openSigningDialog = null;
      this.#reload$.next();
      // The modal does not report whether anything was signed, so a close without a signature refreshes the order too.
      this.ticketUpdated.emit();
    });
  }

  protected toggle(): void {
    this.isCollapsed.update((collapsed: boolean) => !collapsed);
  }

  protected toggleFromSpace(event: Event): void {
    event.preventDefault();
    this.toggle();
  }

  #confirmReopen(): Observable<boolean | undefined> {
    return this.#dialogService.openConfirmModal(
      this.#translateService.instant('validateTicketsNew.orderAgreements.actions.reopenConfirmTitle'),
      this.#translateService.instant('validateTicketsNew.orderAgreements.actions.reopenConfirmMessage'),
      { isDestructive: true },
    ).closed$;
  }

  #confirmWaive(agreement: IndividualAgreement): Observable<boolean | undefined> {
    const messageKey =
      agreement.participant === null
        ? 'validateTicketsNew.orderAgreements.actions.waiveConfirmMessageWholeOrder'
        : 'validateTicketsNew.orderAgreements.actions.waiveConfirmMessage';
    return this.#dialogService.openConfirmModal(
      this.#translateService.instant('validateTicketsNew.orderAgreements.actions.waiveConfirmTitle'),
      this.#translateService.instant(messageKey),
      { isDestructive: true },
    ).closed$;
  }

  /**
   * fever2 answers 403 when the operator may not manage the order's agreements, 404 when the row is
   * no longer active (already waived, transferred or cancelled), 409 when it is no longer in a state
   * the action applies to, and 410 when the agreement can no longer be signed.
   */
  #errorKey(action: OrderAgreementAction, error: unknown): string {
    if (this.#hasStatus(error, 403)) {
      return 'validateTicketsNew.orderAgreements.actions.notAllowed';
    }
    if (this.#hasStatus(error, 404)) {
      return 'validateTicketsNew.orderAgreements.actions.notActive';
    }
    if (this.#hasStatus(error, 410)) {
      return 'validateTicketsNew.orderAgreements.actions.notAvailable';
    }
    if (action === 'reopen' && isTicketAlreadyValidatedError(error)) {
      return 'validateTicketsNew.orderAgreements.actions.reopenSignedConflict';
    }
    return this.#hasStatus(error, 409) && action !== 'recheck'
      ? `validateTicketsNew.orderAgreements.actions.${action}Conflict`
      : 'validateTicketsNew.orderAgreements.actions.error';
  }

  #loadOnIdentity(): Observable<OrderAgreementsView> {
    return toObservable(this.#request).pipe(
      switchMap(({ hasReleaseConditions, orderId, partnerId }: OrderAgreementsRequest) => {
        // Read per request: at construction Optimizely may still answer `null`, which would latch the panel off.
        if (this.#optimizelyService.isFeatureEnabled(FeatureFlags.AGREEMENTS_VIEW) !== true) {
          return of(OrderAgreementsComponent.hiddenView);
        }
        if (!hasReleaseConditions || orderId === null || partnerId === null) {
          return of(OrderAgreementsComponent.hiddenView);
        }
        const view$: Observable<OrderAgreementsView> = defer(() => this.#agreementSigningService.listForOrder(partnerId, orderId)).pipe(
          map((orderAgreements: OrderAgreements) => this.#toView(orderAgreements.individualAgreements)),
          catchError((error: unknown) => {
            // fever2 answers 404 for a fully cancelled order or one with no tickets: nothing to show, not an error.
            if (this.#hasStatus(error, 404)) {
              return of(OrderAgreementsComponent.hiddenView);
            }
            return of<OrderAgreementsView>({
              agreements: [],
              errorKey: resolveAgreementListErrorKey(error),
              pending: 0,
              state: 'error',
            });
          }),
        );
        return this.#reload$.pipe(
          map(() => false),
          startWith(true),
          switchMap((isFirstLoad: boolean) =>
            isFirstLoad
              ? view$.pipe(startWith(OrderAgreementsComponent.loadingView))
              : view$.pipe(
                  tap({
                    finalize: () => this.#isRefreshing.set(false),
                    next: (view: OrderAgreementsView) => this.#notifyFailedRefresh(view),
                    subscribe: () => this.#isRefreshing.set(true),
                  }),
                ),
          ),
          scan((previous: OrderAgreementsView, next: OrderAgreementsView) =>
            next.state === 'error' && previous.state === 'loaded' ? previous : next,
          ),
        );
      }),
    );
  }

  #loadSignersOnExpand(): Observable<OrderAgreementSigner[]> {
    const expanded$: Observable<boolean> = toObservable(this.isCollapsed).pipe(filter((isCollapsed: boolean) => !isCollapsed));
    return toObservable(this.agreements).pipe(
      switchMap((agreements: IndividualAgreement[]) => (agreements.length > 0 ? expanded$.pipe(take(1)) : EMPTY)),
      switchMap(() => {
        const { orderId, partnerId } = this.#request();
        return orderId === null || partnerId === null
          ? of([])
          : this.#agreementSigningService.listSignersForOrder(partnerId, orderId).pipe(
              catchError(() => of([])),
              startWith([]),
            );
      }),
    );
  }

  #hasStatus(error: unknown, status: number | null): boolean {
    return typeof error === 'object' && error !== null && 'status' in error && error.status === status;
  }

  /**
   * A 404 or 409 means the row moved on elsewhere. A timeout carries no status and may have landed
   * all the same, so the list is read again to show what fever2 now holds.
   */
  #isRowPossiblyChanged(error: unknown): boolean {
    return this.#hasStatus(error, 404) || this.#hasStatus(error, 409) || this.#hasStatus(error, null);
  }

  #notifyFailedRefresh(view: OrderAgreementsView): void {
    if (view.state === 'error') {
      this.#toastService.danger(this.#translateService.instant('validateTicketsNew.orderAgreements.refreshError'));
    }
  }

  #toView(agreements: Array<IndividualAgreement>): OrderAgreementsView {
    const pending = agreements.filter((agreement: IndividualAgreement) => agreement.status !== IndividualAgreementStatus.signed).length;
    return { agreements, errorKey: null, pending, state: 'loaded' };
  }
}
