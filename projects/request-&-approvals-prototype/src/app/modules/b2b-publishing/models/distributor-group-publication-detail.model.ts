import { DistributorGroupPublicationStatusEnum } from './distributor-group-publication-status.enum';

export class DistributorGroupPublicationFailedEvent {
  constructor(
    public eventId: number,
    public eventName: string | null,
    public code: string,
    public reason: string,
  ) {}
}

export class DistributorGroupPublicationDetail {
  constructor(
    public id: string,
    public groupId: string,
    public status: DistributorGroupPublicationStatusEnum,
    public failures: DistributorGroupPublicationFailedEvent[],
  ) {}
}
