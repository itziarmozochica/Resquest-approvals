import { OboSecondScreenCart } from './obo-second-screen-cart.model';
import { OboSecondScreenPayment } from './obo-second-screen-payment.model';
import { OboSecondScreenPlan } from './obo-second-screen-plan.model';
import { OboSecondScreenStoredSeatingMap } from './seating-map/obo-second-screen-seating-map.model';

export class OboSecondScreenData {
  seatingMap?: OboSecondScreenStoredSeatingMap;

  constructor(
    public partnerId: number,
    public plan?: OboSecondScreenPlan,
    public cart?: OboSecondScreenCart,
    public payment?: OboSecondScreenPayment,
    public placeId?: number,
    public isSeatingMapVisible: boolean = false,
    public isContactInfoActive: boolean = false,
    public isSurveyCompleted: boolean = false,
    public showSurvey: boolean = false,
  ) {}

  static from(data: OboSecondScreenData | null | undefined): OboSecondScreenData | null {
    if (data == null) {
      return null;
    }
    const secondScreenData = new OboSecondScreenData(
      data.partnerId,
      data.plan
        ? {
            places: data.plan.places?.map(place => ({
              id: place.id,
              name: place.name,
            })),
            name: data.plan.name,
            imageUrl: data.plan.imageUrl,
          }
        : undefined,
      data.cart ? OboSecondScreenCart.from(data.cart) : undefined,
      data.payment ? OboSecondScreenPayment.from(data.payment) : undefined,
      data.placeId ? data.placeId : undefined,
      data.isSeatingMapVisible ?? false,
      data.isContactInfoActive ?? false,
      data.isSurveyCompleted,
      data.showSurvey,
    );
    if (data.seatingMap) {
      const { provider, sessionIds } = data.seatingMap;
      // Left out rather than emptied when unusable: an empty list means no line of the current plan and hides the map
      secondScreenData.seatingMap = Array.isArray(sessionIds) ? { provider, sessionIds: [...sessionIds] } : { provider };
    }
    return secondScreenData;
  }

  resetCartData(): void {
    this.cart = undefined;
    this.payment = undefined;
    this.seatingMap = undefined;
    this.isSeatingMapVisible = false;
    this.isContactInfoActive = false;
    this.isSurveyCompleted = false;
  }
}
