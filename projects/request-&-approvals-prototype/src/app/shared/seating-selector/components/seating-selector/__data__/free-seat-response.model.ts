import { SeatInfo } from './seat-info.model';

export class FreeSeatResponse {
  constructor(
    public sessionId: number,
    public seatInfo: SeatInfo,
    public adding: boolean,
    public holdToken?: string,
  ) {}
}
