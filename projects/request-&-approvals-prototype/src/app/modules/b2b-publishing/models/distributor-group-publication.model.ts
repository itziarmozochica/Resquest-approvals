import { DistributorGroupPublicationStatusEnum } from './distributor-group-publication-status.enum';

export class DistributorGroupPublication {
  constructor(
    public id: string,
    public groupId: string,
    public groupName: string,
    public status: DistributorGroupPublicationStatusEnum,
    public requestedCount: number,
    public publishedCount: number | null,
    public failedCount: number,
    public runRequestedCount: number = requestedCount,
  ) {}
}
