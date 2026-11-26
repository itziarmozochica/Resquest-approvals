export interface OrderNote {
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
