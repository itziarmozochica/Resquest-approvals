import { OboSecondScreenData } from './obo-second-screen-data.model';

export interface OboSecondScreenDataChange {
  current: OboSecondScreenData | null;
  previous: OboSecondScreenData | null;
}
