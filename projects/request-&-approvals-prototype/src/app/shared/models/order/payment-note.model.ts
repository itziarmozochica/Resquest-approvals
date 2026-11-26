export interface PaymentNoteDTO {
  created_at: string;
  id: string;
  message: string;
  modified_at: string;
  title: string;
  user_id: number;
  username: string;
}

export interface PaymentNote {
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
