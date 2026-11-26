export interface ReservationNote {
  id: string;
  title: string;
  message: string;
  userId: number;
  username: string;
  modifiedAt: string;
  createdAt?: string;
  updatedAt?: string;
  userEmail?: string;
}

export interface ReservationNoteData {
  id: string;
  title: string;
  message: string;
  user_id: number;
  username: string;
  modified_at: string;
  created_at?: string;
  updated_at?: string;
  user_email?: string;
}
