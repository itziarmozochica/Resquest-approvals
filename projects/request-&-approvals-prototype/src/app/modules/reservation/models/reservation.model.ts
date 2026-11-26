import { Deposit } from '../../../shared/models/deposit/deposit.model';
import { Journey } from '../../../shared/models/journey/journey.model';
import { Money } from '../../../shared/models/money.model';
import { SessionSelectorType } from '../../../shared/services/session-availability/session-selector-type.enum';
import { BusinessTypeEnum } from '../../settings/shared/models/business-type.enum';
import { ReservationsListAudience } from '../enums/reservations-list-audience.enum';
import { ReservationAttendanceEnum } from './reservation-attendance.enum';
import { ReservationNote } from './reservation-note.model';
import { ReservationPlanSummary } from './reservation-plan-summary.model';
import { ReservationSessionItemTicketsAllowed } from './reservation-session-item-tickets-allowed.model';
import { ReservationStatus } from './reservation-status.enum';

export class Reservation {
  partnerId?: number;
  distributorId?: number | null;

  constructor(
    /**
     * ID can be undefined when the reservation is still local and does not exists in the database yet.
     *
     * We can't set it as optional at this point though, since the param ordering does not allow us to do that.
     */
    public id: string,
    public locator: string | null,
    public status: ReservationStatus,
    public b2bUserName: string,
    public b2bUserEmail: string,
    public b2bUserUsername: string,
    public businessId: string | null,
    public businessName: string | null,
    public businessType: BusinessTypeEnum | null,
    public businessEmail: string | null,
    public businessPhone: string | null,
    public totalToBePaid: Money,
    public totalNumberOfTickets: number,
    public sessionStartsAt: string,
    public createdAt: string,
    public placeId: number,
    public placeName: string,
    public planName: string,
    public planId: number,
    public plans: ReservationPlanSummary[],
    public planDefaultLanguage: string,
    public planAvailableLanguages: string[],
    public planHasBookingQuestions: boolean,
    public cartId: string,
    public cityId: number,
    public cityName: string,
    public orderId: string,
    public channelId: string,
    public expirationDate?: string,
    public attendanceStatus?: ReservationAttendanceEnum,
    public ownerFullName?: string,
    public ownerEmail?: string,
    public ownerFirstName?: string,
    public ownerLastName?: string,
    public ownerNameEditable?: boolean,
    public note?: ReservationNote,
    public deposit?: Deposit,
    public externalReservationId?: string | null,
    public ticketsAllowedPerBookingBySessionId?: ReadonlyMap<number, ReservationSessionItemTicketsAllowed>,
    public purchaseUrn?: string | null,
    public source?: ReservationsListAudience,
    public hasAssetBasedBooking?: boolean,
    public planSessionSelectorType?: SessionSelectorType,
    public servingTimesBySessionId?: ReadonlyMap<number, string>,
    public journey?: Journey,
  ) {}
}
