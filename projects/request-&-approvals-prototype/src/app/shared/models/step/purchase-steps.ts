import { Step } from './step.model';

export const ticketSelectorStep = new Step(1, 'common.ticketingSteps.ticket');
export const seatingSelectorStep = new Step(2, 'common.ticketingStep.seating');

export const contactInformationSelectorStep = new Step(3, 'boxOffice.steps.contactInformation');
export const guestsInformationSelectorStep = new Step(3, 'invitations.steps.guestInformation');
