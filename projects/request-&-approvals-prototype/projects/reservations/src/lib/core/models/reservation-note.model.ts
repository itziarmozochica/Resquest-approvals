export interface ReservationNoteApi {
  id: string;
  message: string;
  modified_at: string;
  title: string;
  username: string;
  user_id: number;
  created_at?: string;
  updated_at?: string;
  user_email?: string;
}

export interface ReservationNote {
  readonly id: string;
  readonly message: string;
  readonly modifiedAt: string;
  readonly title: string;
  readonly username: string;
  readonly userId: number;
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly userEmail?: string;
}
