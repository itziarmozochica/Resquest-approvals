export interface OboSecondScreenPlace {
  id: number;
  name: string;
}

export interface OboSecondScreenPlan {
  places?: OboSecondScreenPlace[];
  name?: string;
  imageUrl?: string;
}
