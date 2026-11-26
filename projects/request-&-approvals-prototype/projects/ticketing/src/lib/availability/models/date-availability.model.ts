export interface DateAvailability {
  readonly date: string;
  readonly isPurchasable: boolean;
}

export interface DatesAvailability {
  readonly dates: Readonly<Record<string, DateAvailability>>;
  readonly nextAvailableDate: string | null;
}
