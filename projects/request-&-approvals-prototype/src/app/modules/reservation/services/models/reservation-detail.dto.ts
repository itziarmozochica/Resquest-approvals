import { OrderDTO } from '../../../../shared/services/purchase/models/orders.dto';
import { ReservationDTO } from './reservation.dto';

export interface ReservationDetailDTO {
  orders?: OrderDTO[];
  reservation: ReservationDTO;
  order?: OrderDTO | null;
}
