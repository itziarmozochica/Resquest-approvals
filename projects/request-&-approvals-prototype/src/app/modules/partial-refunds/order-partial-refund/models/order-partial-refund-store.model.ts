import type { MultiStepNavigationState } from '@fz-original/app/shared/multi-step-modal/store/multi-step-navigation.model';

import { initialPartialRefundDefinitionState } from '../../models/partial-refund-definition.model';
import { requestIdle } from '../../utils/request-state.util';
import type { OrderPartialRefundContext, OrderPartialRefundStepId } from './order-partial-refund-context.model';

export interface OrderPartialRefundStoreState extends MultiStepNavigationState<OrderPartialRefundStepId> {
  context: OrderPartialRefundContext;
}

export const initialOrderPartialRefundState: OrderPartialRefundStoreState = {
  context: {
    ...initialPartialRefundDefinitionState,
    itemStatuses: new Map(),
    orderBlockers: [],
    orderId: Number.NaN,
    partnerId: Number.NaN,
    selectedOrderItemIds: new Set(),
    status: requestIdle(),
    ticketsSummaries: [],
  },
  currentStepId: null,
  history: [],
};
