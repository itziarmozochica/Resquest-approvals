export interface PlanRequestImageData {
  image_url: string;
  id: string;
  plan_request_id: string;
}

export class PlanRequestImage {
  constructor(
    public imageUrl: string,
    public id?: string,
    public planRequestId?: string,
  ) {}
}
