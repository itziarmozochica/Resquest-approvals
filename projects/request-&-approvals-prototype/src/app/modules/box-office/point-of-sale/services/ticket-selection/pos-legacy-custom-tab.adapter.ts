import { IconName, IconPrefix, IconProp } from '@fortawesome/fontawesome-svg-core';
import { OnsiteSetupOssCustomTab } from '@fz-original/app/modules/box-office/shared/models/onsite-setup';
import {
  CustomTileTargetType,
  type CustomTabState,
  type CustomTile,
  type CustomTileExtraInfo,
  type HierarchyCategory,
  type HierarchyExtraInfo,
  type HierarchyProduct,
  type HierarchyProductVariation,
  type Session,
  type SessionTypeExtraInfo,
} from '@fz/ticketing';

import {
  OssCustomTabData,
  OssCustomTileExtraInfo,
  OssCustomTileWrapper,
  OssHierarchyCategory,
  OssHierarchyProduct,
  OssHierarchyProductVariation,
  OssSessionAvailability,
  OssTargetElementType,
} from '../../../one-stop-shop/models';
import { adaptLegacySessionAvailability } from '../availability/pos-legacy-availability.adapter';

export function parseSetupIconString(iconString: string | null | undefined): IconProp {
  if (!iconString) {
    return ['fal', 'heart'];
  }
  const hyphenIndex = iconString.indexOf('-');
  if (hyphenIndex === -1) {
    return ['fal', iconString as IconName];
  }
  const prefix = iconString.substring(0, hyphenIndex) as IconPrefix;
  const iconName = iconString.substring(hyphenIndex + 1) as IconName;
  return [prefix, iconName];
}

export function toOssCustomTabData(customTab: CustomTabState | null, setup: OnsiteSetupOssCustomTab | null): OssCustomTabData | null {
  if (customTab === null) {
    return null;
  }

  return {
    datetimeSelected: customTab.datetimeSelected,
    isLoading: customTab.isLoading,
    setupIcon: parseSetupIconString(setup?.icon),
    setupId: customTab.setupId,
    setupName: setup?.name ?? '',
    tilesData: customTab.tiles === null ? null : { customTiles: customTab.tiles.map(toOssCustomTileWrapper) },
  };
}

function toOssCustomTileWrapper(tile: CustomTile): OssCustomTileWrapper {
  return {
    customTile: {
      color: tile.color,
      name: tile.name,
      position: tile.position,
      sessions: tile.sessions.map(toOssSessionAvailability),
      targetElementExtraInfo: toOssExtraInfo(tile.targetType, tile.extraInfo),
      targetElementType: toOssTargetElementType(tile.targetType),
    },
  };
}

function toOssTargetElementType(targetType: CustomTileTargetType): OssTargetElementType {
  switch (targetType) {
    case CustomTileTargetType.HierarchyElement:
      return OssTargetElementType.HIERARCHY_ELEMENT;
    case CustomTileTargetType.ParentHierarchyElement:
      return OssTargetElementType.PARENT_HIERARCHY_ELEMENT;
    case CustomTileTargetType.Product:
      return OssTargetElementType.PRODUCT;
    default:
      return OssTargetElementType.SESSION_TYPE;
  }
}

function toOssExtraInfo(targetType: CustomTileTargetType, extraInfo: CustomTileExtraInfo | null): OssCustomTileExtraInfo | null {
  if (extraInfo === null) {
    return null;
  }

  if (targetType === CustomTileTargetType.SessionType) {
    const sessionTypeInfo = extraInfo as SessionTypeExtraInfo;

    return { placeCityTimezone: sessionTypeInfo.placeCityTimezone, placeName: sessionTypeInfo.placeName };
  }

  const hierarchyInfo = extraInfo as HierarchyExtraInfo;

  return {
    children: hierarchyInfo.children === null ? undefined : hierarchyInfo.children.map(toOssHierarchyCategory),
    name: hierarchyInfo.name,
    placeCityTimezone: hierarchyInfo.placeCityTimezone,
    products: hierarchyInfo.products === null ? undefined : hierarchyInfo.products.map(toOssHierarchyProduct),
    productVariations:
      hierarchyInfo.productVariations === null ? undefined : hierarchyInfo.productVariations.map(toOssHierarchyProductVariation),
  };
}

function toOssHierarchyCategory(category: HierarchyCategory): OssHierarchyCategory {
  return {
    children: category.children === null ? undefined : category.children.map(toOssHierarchyCategory),
    name: category.name,
    products: category.products === null ? undefined : category.products.map(toOssHierarchyProduct),
    productVariations: category.productVariations === null ? undefined : category.productVariations.map(toOssHierarchyProductVariation),
  };
}

function toOssHierarchyProduct(product: HierarchyProduct): OssHierarchyProduct {
  return { name: product.name, productVariations: product.productVariations.map(toOssHierarchyProductVariation) };
}

function toOssHierarchyProductVariation(variation: HierarchyProductVariation): OssHierarchyProductVariation {
  return { sessionId: variation.sessionId };
}

/**
 * `addCustomTileSessionsToTicketTypes` calls class methods on these (`getMaximumSelectableTickets`,
 * `isDisabled`) and pushes them into `state.productSessions`, so the legacy class instance — not a
 * plain object — is what the frozen domains need.
 */
function toOssSessionAvailability(session: Session): OssSessionAvailability {
  const legacySession = adaptLegacySessionAvailability(session, { placeId: session.placeId ?? undefined });
  const ossSession = new OssSessionAvailability(
    legacySession.id,
    legacySession.name,
    legacySession.startsAt,
    legacySession.endsAt,
    legacySession.ticketPrice,
    legacySession.isPurchasable,
    legacySession.availableTickets,
    legacySession.minimumTicketsAllowedPerBooking,
    legacySession.maximumTicketsAllowedPerBooking,
    legacySession.purchasableFromDate,
    legacySession.purchasableUntilDate,
    legacySession.isHidden,
    legacySession.surchargePerTicket,
    legacySession.seating,
    legacySession.bookingQuestions,
    legacySession.minutesBeforeToExpire,
    legacySession.sessionType,
    legacySession.details,
    legacySession.mainPlanId,
    legacySession.venueId,
  );

  ossSession.isPack = legacySession.isPack;
  ossSession.overrideAvailableTickets = legacySession.overrideAvailableTickets;
  ossSession.ruleMaximumTicketsAllowedPerBooking = legacySession.ruleMaximumTicketsAllowedPerBooking;
  ossSession.ruleMinimumTicketsAllowedPerBooking = legacySession.ruleMinimumTicketsAllowedPerBooking;
  ossSession.sharedAvailabilityRule = legacySession.sharedAvailabilityRule;
  ossSession.strikethroughPrice = legacySession.strikethroughPrice;

  return ossSession;
}
