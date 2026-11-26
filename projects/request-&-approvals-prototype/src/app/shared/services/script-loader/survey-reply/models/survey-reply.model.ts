export interface SurveyReplyData {
  id: string;
  external_id: string;
  reply_at: Date;
  next_scheduled_reply_at?: Date;
}

export class SurveyReply {
  constructor(
    public id: string,
    public externalId: string,
    public replyAt: Date,
    public nextScheduledReplyAt?: Date,
  ) {}
}
