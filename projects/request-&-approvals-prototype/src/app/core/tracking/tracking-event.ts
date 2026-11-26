export class TrackingEvent<T> {
  constructor(
    readonly id: string,
    readonly data?: T,
  ) {}
}
