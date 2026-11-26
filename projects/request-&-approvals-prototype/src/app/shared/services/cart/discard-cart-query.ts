export interface DiscardCartQuery {
  cartId: string;
  partnerId: number;
  viaCashRegister?: boolean;
}

export type DiscardCartRoute = 'fever2' | 'partners';
