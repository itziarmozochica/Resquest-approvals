import type { ContentCategory } from '../content-questions.model';
import { bigConcertContentCategory } from './categories/big-concert.content-category';
import { botanicalGardenContentCategory } from './categories/botanical-garden.content-category';
import { competitiveSportActivitiesContentCategory } from './categories/competitive-sport-activities.content-category';
import { conventionContentCategory } from './categories/convention.content-category';
import { coursesWorkshopsAndTalksContentCategory } from './categories/courses-workshops-and-talks.content-category';
import { entertainmentCenterContentCategory } from './categories/entertainment-center.content-category';
import { exhibitionContentCategory } from './categories/exhibition.content-category';
import { experienceContentCategory } from './categories/experience.content-category';
import { fairContentCategory } from './categories/fair.content-category';
import { filmFestivalContentCategory } from './categories/film-festival.content-category';
import { foodAndDrinkFestivalContentCategory } from './categories/food-and-drink-festival.content-category';
import { immersivePermanentAttractionMuseumContentCategory } from './categories/immersive-permanent-attraction-museum.content-category';
import { landmarksMonumentsAndHistoricalSitesContentCategory } from './categories/landmarks-monuments-and-historical-sites.content-category';
import { lightShowContentCategory } from './categories/light-show.content-category';
import { liveShowContentCategory } from './categories/live-show.content-category';
import { liveSportsContentCategory } from './categories/live-sports.content-category';
import { musicFestivalContentCategory } from './categories/music-festival.content-category';
import { partyContentCategory } from './categories/party.content-category';
import { popUpAndThemedDiningContentCategory } from './categories/pop-up-and-themed-dining.content-category';
import { popupOpenAirScreeningContentCategory } from './categories/popup-open-air-screening.content-category';
import { restaurantsAndDiningContentCategory } from './categories/restaurants-and-dining.content-category';
import { smallConcertContentCategory } from './categories/small-concert.content-category';
import { socialActivitiesAndGamesContentCategory } from './categories/social-activities-and-games.content-category';
import { tastingAndPairingsContentCategory } from './categories/tasting-and-pairings.content-category';
import { themeWaterParkContentCategory } from './categories/theme-water-park.content-category';
import { toursAndSightseeingContentCategory } from './categories/tours-and-sightseeing.content-category';
import { traditionalMuseumContentCategory } from './categories/traditional-museum.content-category';
import { wellnessActivityContentCategory } from './categories/wellness-activity.content-category';
import { zoosAndAquariumsContentCategory } from './categories/zoos-and-aquariums.content-category';

export const contentQuestionsCategories: readonly ContentCategory[] = [
  partyContentCategory,
  entertainmentCenterContentCategory,
  bigConcertContentCategory,
  smallConcertContentCategory,
  liveShowContentCategory,
  liveSportsContentCategory,
  exhibitionContentCategory,
  landmarksMonumentsAndHistoricalSitesContentCategory,
  immersivePermanentAttractionMuseumContentCategory,
  experienceContentCategory,
  musicFestivalContentCategory,
  traditionalMuseumContentCategory,
  lightShowContentCategory,
  competitiveSportActivitiesContentCategory,
  popupOpenAirScreeningContentCategory,
  fairContentCategory,
  popUpAndThemedDiningContentCategory,
  botanicalGardenContentCategory,
  tastingAndPairingsContentCategory,
  socialActivitiesAndGamesContentCategory,
  zoosAndAquariumsContentCategory,
  wellnessActivityContentCategory,
  foodAndDrinkFestivalContentCategory,
  restaurantsAndDiningContentCategory,
  toursAndSightseeingContentCategory,
  themeWaterParkContentCategory,
  coursesWorkshopsAndTalksContentCategory,
  filmFestivalContentCategory,
  conventionContentCategory,
];
