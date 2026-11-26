import { Step } from '../../../shared/models/step/step.model';

export enum KioskStepId {
  Datetime = 10,
  FreeSeatingMap = 11,
  RegularNonSeated = 12,
  AddOns = 13,
}

export const createKioskSteps = () => ({
  datetimeStep: new Step(KioskStepId.Datetime, 'common.ticketingSteps.ticket'),
  freeSeatingMapStep: new Step(KioskStepId.FreeSeatingMap, 'common.ticketingSteps.seating'),
  regularNonSeatedStep: new Step(KioskStepId.RegularNonSeated, 'boxOffice.steps.ticket'),
  addOnsStep: new Step(KioskStepId.AddOns, 'kiosk.steps.addOns'),
});
