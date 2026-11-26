import { JourneyAssetDTO, JourneyDTO, JourneyLegDTO, JourneyStepDTO } from './journey.dto';
import { Journey, JourneyAsset, JourneyLeg, JourneyStep } from './journey.model';

function assetFromDto(asset: JourneyAssetDTO): JourneyAsset {
  return {
    assetName: asset.asset_name,
    bookedSlotIds: [...asset.booked_slot_ids],
    isProvisional: asset.is_provisional,
    partySizes: [...asset.party_sizes],
  };
}

function legFromDto(leg: JourneyLegDTO): JourneyLeg {
  return {
    activityId: leg.activity_id,
    activityName: leg.activity_name,
    assets: leg.assets.map(assetFromDto),
    attendees: leg.attendees,
    endsAt: leg.ends_at,
    isExclusiveHire: leg.is_exclusive_hire,
    sequenceNumber: leg.sequence_number,
    startsAt: leg.starts_at,
  };
}

function stepFromDto(step: JourneyStepDTO): JourneyStep {
  return {
    endsAt: step.ends_at,
    isParallel: step.is_parallel,
    legs: step.legs.map(legFromDto),
    startsAt: step.starts_at,
    stepNumber: step.step_number,
  };
}

export function journeyFromDto(journey: JourneyDTO): Journey {
  return {
    attendees: journey.attendees,
    endsAt: journey.ends_at,
    endsAtIsEstimated: journey.ends_at_is_estimated,
    isMultiDay: journey.is_multi_day,
    startsAt: journey.starts_at,
    steps: journey.steps.map(stepFromDto),
    timezone: journey.timezone,
  };
}
