import moment from 'moment-timezone';

export interface RemainingCartTimeslotParams {
  readonly cartDatetimes: readonly string[];
  readonly selectedDatetime: string;
  readonly timezone: string;
}

interface CartTimeslotCandidate {
  readonly datetime: string;
  readonly instantMs: number;
}

const venueDayFormat = 'YYYY-MM-DD';

export function pickRemainingCartTimeslot(params: RemainingCartTimeslotParams): string | null {
  const selectedInstantMs = Date.parse(params.selectedDatetime);
  if (Number.isNaN(selectedInstantMs)) {
    return null;
  }

  const candidates: CartTimeslotCandidate[] = params.cartDatetimes
    .map(datetime => ({ datetime, instantMs: Date.parse(datetime) }))
    .filter(candidate => !Number.isNaN(candidate.instantMs));
  if (candidates.some(candidate => candidate.instantMs === selectedInstantMs)) {
    return null;
  }

  const selectedVenueDay = moment.tz(selectedInstantMs, params.timezone).format(venueDayFormat);
  const sameDayCandidates = candidates.filter(
    candidate => moment.tz(candidate.instantMs, params.timezone).format(venueDayFormat) === selectedVenueDay,
  );
  if (sameDayCandidates.length === 0) {
    return null;
  }

  return sameDayCandidates.reduce((latest, candidate) => (candidate.instantMs > latest.instantMs ? candidate : latest)).datetime;
}
