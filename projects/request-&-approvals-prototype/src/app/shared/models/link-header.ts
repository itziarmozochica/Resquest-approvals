export class LinkHeader {
  constructor(
    public next: string | null,
    public prev: string | null,
    public first: string | null,
    public last: string | null,
  ) {}
}
