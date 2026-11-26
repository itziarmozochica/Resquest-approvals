export class Step {
  constructor(
    public id: number,
    public label: string,
    public nextStep?: Step,
    public previousStep?: Step,
  ) {}
}

export const ticketSelectorStep = new Step(1, 'boxOffice.steps.ticket');
export const seatingSelectorStep = new Step(2, 'boxOffice.steps.ticket');

export const eventSetUpFormStep = new Step(1, 'planRequest.steps');
export const ticketsInformationFormStep = new Step(2, 'planRequest.steps');
export const photosFormStep = new Step(3, 'planRequest.steps');
export const reviewFormStep = new Step(4, 'planRequest.steps');

export const usernameStep = new Step(1, 'login.steps');
export const passwordStep = new Step(2, 'login.steps');
