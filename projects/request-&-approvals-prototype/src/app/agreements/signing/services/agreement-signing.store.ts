import { computed, inject } from '@angular/core';

import { withMultiStepNavigation } from '@fz-original/app/shared/multi-step-modal/store/with-multi-step-navigation.feature';
import { IGNT_DIALOG_DATA } from '@ignite/common';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { setAllEntities, updateEntity, withEntities } from '@ngrx/signals/entities';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { catchError, EMPTY, exhaustMap, pipe, switchMap, tap } from 'rxjs';

import { SignerRole } from '../../requirements/enums/signer-role.enum';
import { IndividualAgreementStatus } from '../enums/individual-agreement-status.enum';
import type {
  AgreementSigningContext,
  AgreementSigningIntent,
  AgreementSigningModalData,
  AgreementSigningStepId,
} from '../modal/models/agreement-signing-modal.model';
import { AgreementSigningError } from '../models/agreement-signing-error.model';
import { IndividualAgreement } from '../models/individual-agreement.model';
import { OrderAgreementSigner } from '../models/order-agreement-signer.model';
import { SignAgreementsPayload, SignedIndividualAgreement } from '../models/sign-agreements.model';
import { SignReceipt } from '../models/sign-receipt.model';
import { initialState, type AgreementSigningState, type SigningListState } from '../models/store/agreement-signing-store.model';
import { resolveAgreementListErrorKey } from '../utils/agreement-list-error.util';
import { isAgreementVersionSupersededError } from '../utils/agreement-sign-error.util';
import { setError, setPending, setSignError, setSignPending, setSignSuccess, setSuccess } from '../utils/request-state.util';
import { isGuardianSignature } from '../utils/signer-role.util';
import { AgreementSigningService } from './agreement-signing.service';

/**
 * Opening the modal without an order is a wiring bug, and an empty listing reads as "this order is
 * clean" - the one message that must never be shown by accident. Fail closed onto the error state,
 * whether the order is missing at the door or by the time a document is asked for.
 */
const missingModalDataError: AgreementSigningError = {
  code: 'MISSING_MODAL_DATA',
  message: 'errors.generic',
  status: null,
};

const emptySignPayloadError: AgreementSigningError = {
  code: 'EMPTY_SIGN_PAYLOAD',
  message: 'errors.generic',
  status: null,
};

export const AgreementSigningStore = signalStore(
  withEntities<IndividualAgreement>(),
  withState<AgreementSigningState>(initialState),
  withMultiStepNavigation<AgreementSigningContext, AgreementSigningStepId, AgreementSigningIntent>(),
  withComputed(store => ({
    allSigned: computed(() => {
      const rows = store.entities();
      return rows.length > 0 && rows.every(row => row.status === IndividualAgreementStatus.signed);
    }),
    errorKey: computed(() => resolveAgreementListErrorKey(store.error())),
    listState: computed<SigningListState>(() => {
      if (store.error() != null) {
        return 'error';
      }
      if (store.isLoading()) {
        return 'loading';
      }
      return store.hasLoaded() ? 'loaded' : 'idle';
    }),
    selectedAgreement: computed(() => {
      const id = store.context().selectedAgreementId;
      return id == null ? null : (store.entityMap()[id] ?? null);
    }),
    selectedAgreementId: computed(() => store.context().selectedAgreementId),
    signedCount: computed(() => store.entities().filter(row => row.status === IndividualAgreementStatus.signed).length),
  })),
  withComputed(store => ({
    documentError: computed<unknown>(() => {
      if (store.signContextError() !== null) {
        return store.signContextError();
      }
      if (!store.isOpenedForOneAgreement()) {
        return null;
      }
      return store.error();
    }),
    isLoadingDocument: computed(() => store.isLoadingSignContext() || (store.isOpenedForOneAgreement() && store.listState() === 'loading')),
    isSelectedAgreementMissing: computed(
      () => store.isOpenedForOneAgreement() && store.listState() === 'loaded' && store.selectedAgreement() === null,
    ),
  })),
  withMethods((store, service = inject(AgreementSigningService)) => {
    /**
     * The selection lives only in the navigation context, which the config guards (`canEnter` on
     * the document step) read; `selectedAgreementId` is derived from it rather than copied.
     */
    const patchContext = (patch: Partial<AgreementSigningContext>): void => {
      patchState(store, { context: { ...store.context(), ...patch } });
    };

    const fetchList = rxMethod<{ orderId: number; partnerId: number }>(
      pipe(
        switchMap(({ orderId, partnerId }) => {
          patchState(store, setPending());
          return service.listForOrder(partnerId, orderId).pipe(
            tap(orderAgreements => {
              patchState(store, setSuccess(), setAllEntities(orderAgreements.individualAgreements), {
                hasLoaded: true,
                summary: orderAgreements.summary,
              });
            }),
            catchError((error: unknown) => {
              patchState(store, setError(error));
              return EMPTY;
            }),
          );
        }),
      ),
    );

    const fetchSigners = rxMethod<{ orderId: number; partnerId: number }>(
      pipe(
        switchMap(({ orderId, partnerId }: { orderId: number; partnerId: number }) =>
          service.listSignersForOrder(partnerId, orderId).pipe(
            tap((signers: OrderAgreementSigner[]) => {
              patchState(store, { signers });
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    );

    return {
      sign: rxMethod<SignAgreementsPayload>(
        pipe(
          exhaustMap(payload => {
            const { orderId, partnerId } = store.context();
            if (orderId == null || partnerId == null) {
              patchState(store, setSignError(missingModalDataError));
              return EMPTY;
            }
            if (payload.individualAgreements.length === 0) {
              patchState(store, setSignError(emptySignPayloadError));
              return EMPTY;
            }
            patchState(store, setSignPending(), { isVersionSuperseded: false });
            return service.sign(partnerId, payload).pipe(
              tap(result => {
                const signedAgreement = store.signContext()?.agreements[0] ?? null;
                const signReceipt: SignReceipt | null =
                  signedAgreement === null
                    ? null
                    : {
                        acceptedAt: result.acceptedAt,
                        agreementTitle: signedAgreement.title,
                        coveringLabel: isGuardianSignature(signedAgreement.signerRole, store.answeredSignerRole())
                          ? (store.selectedAgreement()?.participant?.label ?? null)
                          : null,
                        signerEmail: payload.signer.email,
                        version: signedAgreement.version,
                      };
                const signers = store
                  .signers()
                  .filter((entry: OrderAgreementSigner) =>
                    result.individualAgreements.every((row: SignedIndividualAgreement) => row.id !== entry.individualAgreementId),
                  );
                patchState(
                  store,
                  ...result.individualAgreements.map(row =>
                    updateEntity<IndividualAgreement>({ changes: { status: row.status }, id: row.id }),
                  ),
                  setSignSuccess(),
                  { answeredSignerRole: null, signContext: null, signContextError: null, signers, signReceipt },
                );
                patchContext({ selectedAgreementId: null });
                fetchSigners({ orderId, partnerId });
                store.transition('signCompleted');
              }),
              catchError((error: unknown) => {
                if (isAgreementVersionSupersededError(error)) {
                  // Retrying would resend the outdated version. The document step fetches the current
                  // text on entry, and it has to be acknowledged again.
                  patchState(store, setSignSuccess(), { isVersionSuperseded: true });
                  store.goBack();
                  return EMPTY;
                }
                patchState(store, setSignError(error));
                return EMPTY;
              }),
            );
          }),
        ),
      ),
      loadSignContext: rxMethod<string>(
        pipe(
          switchMap(individualAgreementId => {
            const partnerId = store.context().partnerId;
            if (partnerId == null) {
              patchState(store, { isLoadingSignContext: false, signContextError: missingModalDataError });
              return EMPTY;
            }
            patchState(store, {
              isLoadingSignContext: true,
              signContext: null,
              signContextError: null,
            });
            patchContext({ selectedAgreementId: individualAgreementId });
            return service.getSignContext(partnerId, [individualAgreementId]).pipe(
              tap(signContext => {
                patchState(store, { isLoadingSignContext: false, signContext });
              }),
              catchError((error: unknown) => {
                patchState(store, { isLoadingSignContext: false, signContextError: error });
                return EMPTY;
              }),
            );
          }),
        ),
      ),
      answerSignerRole(signerRole: Exclude<SignerRole, SignerRole.AgeBased>): void {
        patchState(store, { answeredSignerRole: signerRole });
      },
      clearSignError(): void {
        patchState(store, { signError: null });
      },
      clearSignContext(): void {
        patchState(store, {
          answeredSignerRole: null,
          isVersionSuperseded: false,
          signContext: null,
          signContextError: null,
          signError: null,
        });
        patchContext({ selectedAgreementId: null });
      },
      finishSigning(): void {
        patchState(store, { signReceipt: null });
        store.transition('finishSigning');
      },
      selectAgreement(individualAgreementId: string | null): void {
        // A document opened from the list is a first read, whatever an earlier refusal or answer said.
        patchState(store, { answeredSignerRole: null, isVersionSuperseded: false });
        patchContext({ selectedAgreementId: individualAgreementId });
      },
      load(input: { orderId: number; partnerId: number; individualAgreementId?: string }): void {
        patchState(store, setAllEntities<IndividualAgreement>([]), {
          answeredSignerRole: null,
          hasLoaded: false,
          isOpenedForOneAgreement: input.individualAgreementId !== undefined,
          isVersionSuperseded: false,
          signContext: null,
          signContextError: null,
          signers: [],
          signReceipt: null,
          summary: null,
        });
        patchContext({ orderId: input.orderId, partnerId: input.partnerId, selectedAgreementId: input.individualAgreementId ?? null });
        fetchList({ orderId: input.orderId, partnerId: input.partnerId });
        fetchSigners({ orderId: input.orderId, partnerId: input.partnerId });
      },
    };
  }),
  withMethods(store => ({
    retryDocument(): void {
      const { orderId, partnerId, selectedAgreementId } = store.context();
      if (orderId === null || partnerId === null || selectedAgreementId === null) {
        return;
      }
      if (store.isOpenedForOneAgreement() && store.error() !== null) {
        store.load({ individualAgreementId: selectedAgreementId, orderId, partnerId });
      }
      store.loadSignContext(selectedAgreementId);
    },
  })),
  withHooks({
    onInit(store): void {
      const data = inject<AgreementSigningModalData | null>(IGNT_DIALOG_DATA, { optional: true });
      if (data == null) {
        patchState(store, setError(missingModalDataError));
      } else {
        store.load({ individualAgreementId: data.individualAgreementId, orderId: data.orderId, partnerId: data.partnerId });
      }
      store.initNavigation();
    },
  }),
);
