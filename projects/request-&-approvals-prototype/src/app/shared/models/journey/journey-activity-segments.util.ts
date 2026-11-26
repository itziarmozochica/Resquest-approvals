import moment from 'moment-timezone';

import {
  ActivityRow,
  ActivityRowAsset,
} from '../../../modules/asset-based/asset-based-calendar-view/components/booking-detail-panel/models/activity-row.model';
import { ActivitySegment } from '../../../modules/asset-based/asset-based-calendar-view/components/booking-detail-panel/models/activity-segment.model';
import { Journey, JourneyAsset, JourneyLeg, JourneyStep } from './journey.model';

const timeFormat = 'h:mm A';
const dateTimeFormat = 'D MMM, h:mm A';

export function formatJourneyInstant(isoDate: string, timezone: string, includeDate: boolean): string {
  return moment
    .utc(isoDate)
    .tz(timezone)
    .format(includeDate ? dateTimeFormat : timeFormat);
}

function toActivityRowAsset(asset: JourneyAsset, leg: JourneyLeg): ActivityRowAsset {
  return {
    assetName: asset.assetName,
    bookedSlotId: asset.bookedSlotIds[0],
    canLocate: false,
    canMove: false,
    groups: asset.partySizes.length,
    isProvisional: asset.isProvisional,
    partySizes: asset.partySizes,
    showGroups: showsHeadcountPerAsset(leg) && (leg.assets.length > 1 || asset.partySizes.length > 1),
  };
}

function showsHeadcountPerAsset(leg: JourneyLeg): boolean {
  return !leg.isExclusiveHire;
}

function toActivityRow(leg: JourneyLeg, stepNumber: number, journey: Journey): ActivityRow {
  const start = formatJourneyInstant(leg.startsAt, journey.timezone, journey.isMultiDay);
  const end = formatJourneyInstant(leg.endsAt, journey.timezone, journey.isMultiDay);

  return {
    activityName: leg.activityName,
    assets: leg.assets.map(asset => toActivityRowAsset(asset, leg)),
    isExclusiveHire: false,
    isExpanded: true,
    key: `${stepNumber}-${leg.sequenceNumber}-${leg.activityId}`,
    pax: leg.attendees,
    timeRange: `${start} - ${end}`,
  };
}

function toActivitySegment(step: JourneyStep, journey: Journey): ActivitySegment {
  return {
    isParallel: step.isParallel,
    key: `journey-step-${step.stepNumber}`,
    position: step.stepNumber,
    rows: step.legs.map(leg => toActivityRow(leg, step.stepNumber, journey)),
    startTime: formatJourneyInstant(step.startsAt, journey.timezone, journey.isMultiDay),
  };
}

export function journeyToActivitySegments(journey: Journey): ActivitySegment[] {
  return journey.steps.map(step => toActivitySegment(step, journey));
}
