export const memberBenefitsNotAppliedMessage = 'boxOffice.memberAccount.applyBenefits.failed';

export class MemberBenefitsNotAppliedError extends Error {
  constructor(readonly messageKey: string) {
    super(messageKey);
    this.name = 'MemberBenefitsNotAppliedError';
  }
}
