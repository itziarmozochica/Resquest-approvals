import type { MultiStepModalConfig } from '@fz-original/app/shared/multi-step-modal/models/multi-step-modal.model';

import { canConfirmDefinition, isDefinitionPreviewed } from '../../utils/partial-refund-definition.util';
import type {
  OrderPartialRefundContext,
  OrderPartialRefundIntent,
  OrderPartialRefundStepId,
} from '../models/order-partial-refund-context.model';
import { hasNoUnsavedInput, hasSelection, hasUnsavedInput } from './order-partial-refund.guards';

export type OrderPartialRefundConfig = MultiStepModalConfig<OrderPartialRefundContext, OrderPartialRefundStepId, OrderPartialRefundIntent>;

type OrderPartialRefundStep = OrderPartialRefundConfig['steps'][OrderPartialRefundStepId];

/**
 * One Cancel button to the operator, two actions to the machine, the same way the split-refund
 * cancellation does it: an untouched modal takes the reserved `cancel` and anything entered routes
 * through the discard confirmation.
 */
const exitActions: OrderPartialRefundStep['actions'] = [
  {
    id: 'cancel',
    intent: 'cancel',
    kind: 'secondary',
    labelKey: 'common.cancel',
    placement: 'leading',
    sentiment: 'danger',
    visibleWhen: hasNoUnsavedInput,
  },
  {
    id: 'requestExit',
    intent: 'requestExit',
    kind: 'secondary',
    labelKey: 'common.cancel',
    placement: 'leading',
    sentiment: 'danger',
    visibleWhen: hasUnsavedInput,
  },
];

const plainChrome: OrderPartialRefundStep['chrome'] = { disableClose: true, showBack: false, showClose: false, showProgress: false };

/** Declared, not implied: the same machine the cancellation flow runs on. */
export const orderPartialRefundConfig: OrderPartialRefundConfig = {
  initialStepId: 'selectTickets',
  steps: {
    confirmDiscard: {
      actions: [
        {
          id: 'keepEditing',
          intent: 'back',
          kind: 'secondary',
          labelKey: 'orders.partialRefund.discardModal.keepEditing',
          placement: 'leading',
        },
        { id: 'discard', intent: 'cancel', kind: 'primary', labelKey: 'orders.partialRefund.discardModal.confirm', sentiment: 'danger' },
      ],
      canEnter: hasUnsavedInput,
      chrome: { ...plainChrome, centerTitle: true, compactLayout: true },
      id: 'confirmDiscard',
      titleKey: 'orders.partialRefund.discardModal.title',
      transitions: [],
      loader: () => import('../containers/steps/confirm-discard/confirm-discard-step.component').then(m => m.ConfirmDiscardStepComponent),
    },
    defineRefund: {
      actions: [
        ...exitActions,
        { id: 'back', intent: 'back', kind: 'secondary', labelKey: 'common.back' },
        { enabledWhen: isDefinitionPreviewed, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
      ],
      canEnter: hasSelection,
      chrome: plainChrome,
      id: 'defineRefund',
      prefetch: ['review', 'confirmDiscard'],
      titleKey: 'orders.partialRefund.defineRefund.title',
      transitions: [
        { guard: isDefinitionPreviewed, on: 'continue', target: 'review' },
        { guard: hasUnsavedInput, on: 'requestExit', target: 'confirmDiscard' },
      ],
      loader: () => import('../containers/steps/define-refund/define-refund-step.component').then(m => m.DefineRefundStepComponent),
    },
    queued: {
      actions: [{ id: 'close', intent: 'close', kind: 'primary', labelKey: 'orders.partialRefund.queued.close' }],
      chrome: { ...plainChrome, closeCompletes: true, compactLayout: true, fullWidthPrimary: true },
      id: 'queued',
      titleKey: 'orders.bulkPartialRefunds.reviewConfirm.queued.title',
      transitions: [],
      loader: () => import('../containers/steps/submit-outcome/submit-outcome-step.component').then(m => m.SubmitOutcomeStepComponent),
    },
    /** No Cancel: the only ways out are back to the definition or through with it. */
    review: {
      actions: [
        { id: 'back', intent: 'back', kind: 'secondary', labelKey: 'common.back', placement: 'leading' },
        {
          enabledWhen: canConfirmDefinition,
          id: 'confirm',
          intent: 'confirm',
          kind: 'primary',
          labelKey: 'orders.partialRefund.review.confirm',
        },
      ],
      canEnter: isDefinitionPreviewed,
      chrome: plainChrome,
      id: 'review',
      prefetch: ['submitting'],
      titleKey: 'orders.bulkPartialRefunds.steps.reviewConfirm.label',
      transitions: [{ guard: canConfirmDefinition, on: 'confirm', target: 'submitting' }],
      loader: () => import('../containers/steps/review/review-step.component').then(m => m.ReviewStepComponent),
    },
    selectTickets: {
      actions: [
        ...exitActions,
        { enabledWhen: hasSelection, id: 'continue', intent: 'continue', kind: 'primary', labelKey: 'common.continue' },
      ],
      chrome: plainChrome,
      id: 'selectTickets',
      prefetch: ['defineRefund', 'confirmDiscard'],
      titleKey: 'orders.partialRefund.selectTickets.title',
      transitions: [
        { guard: hasSelection, on: 'continue', target: 'defineRefund' },
        { guard: hasUnsavedInput, on: 'requestExit', target: 'confirmDiscard' },
      ],
      loader: () => import('../containers/steps/select-tickets/select-tickets-step.component').then(m => m.SelectTicketsStepComponent),
    },
    /** `dismiss`, not `cancel`: acknowledging a failed submit is not giving the task up. */
    submitFailed: {
      actions: [{ id: 'close', intent: 'dismiss', kind: 'primary', labelKey: 'common.close' }],
      chrome: plainChrome,
      id: 'submitFailed',
      titleKey: 'orders.partialRefund.title',
      transitions: [],
      loader: () => import('../containers/steps/submit-outcome/submit-outcome-step.component').then(m => m.SubmitOutcomeStepComponent),
    },
    /** No actions: the store answers the job and moves the flow on by itself. */
    submitting: {
      actions: [],
      canEnter: canConfirmDefinition,
      chrome: plainChrome,
      id: 'submitting',
      titleKey: 'orders.partialRefund.title',
      transitions: [
        { on: 'submitFailed', target: 'submitFailed' },
        { on: 'submitSucceeded', target: 'queued' },
      ],
      loader: () => import('../containers/steps/submit-outcome/submit-outcome-step.component').then(m => m.SubmitOutcomeStepComponent),
    },
  },
};
