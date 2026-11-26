import { SessionType, SessionTypeBulkEditPropertyValue } from '@fz-original/app/shared/services/sessions/session-type.model';

import {
  CrossEventBulkEditReviewTicketType,
  crossEventBulkEditReviewTitleMany,
  crossEventBulkEditReviewTitleOneEvent,
  crossEventBulkEditReviewTitleOneTicketType,
  crossEventBulkEditReviewTitleOneTicketTypeOneEvent,
} from '../models/cross-event-bulk-edit-review.model';

export function joinTranslatedPropertyNames(names: readonly string[], conjunction: string): string {
  if (names.length < 2) {
    return names.join('');
  }

  return `${names.slice(0, -1).join(', ')} ${conjunction} ${names[names.length - 1]}`;
}

export function listedReviewTicketTypes(
  sessionTypes: readonly SessionType[],
  selectedTicketTypeIds: readonly number[],
): readonly CrossEventBulkEditReviewTicketType[] {
  const selected = new Set(selectedTicketTypeIds);

  return sessionTypes.reduce<readonly CrossEventBulkEditReviewTicketType[]>(
    (listed: readonly CrossEventBulkEditReviewTicketType[], sessionType: SessionType) => {
      if (!selected.has(sessionType.id)) {
        return listed;
      }

      const groupName = sessionType.groups[0]?.name ?? '';
      if (listed.some((row: CrossEventBulkEditReviewTicketType) => row.groupName === groupName && row.label === sessionType.label)) {
        return listed;
      }

      return [
        ...listed,
        {
          caption: groupName === '' ? sessionType.label : `${groupName} | ${sessionType.label}`,
          groupName,
          label: sessionType.label,
        },
      ];
    },
    [],
  );
}

export function reviewTitleTranslateKey(ticketTypeCount: number, eventCount: number): string {
  if (ticketTypeCount === 1 && eventCount === 1) {
    return crossEventBulkEditReviewTitleOneTicketTypeOneEvent;
  }

  if (ticketTypeCount === 1) {
    return crossEventBulkEditReviewTitleOneTicketType;
  }

  if (eventCount === 1) {
    return crossEventBulkEditReviewTitleOneEvent;
  }

  return crossEventBulkEditReviewTitleMany;
}

export function translatedPropertyNames(
  properties: readonly SessionTypeBulkEditPropertyValue[],
  translate: (key: string) => string,
): readonly string[] {
  return properties.map(property => translate(`inventory.ticketTypes.bulkEdit.confirmation.propertyNames.${property}`));
}
