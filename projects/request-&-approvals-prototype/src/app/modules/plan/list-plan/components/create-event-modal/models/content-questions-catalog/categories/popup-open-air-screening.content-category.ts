import type { ContentCategory } from '../../content-questions.model';

export const popupOpenAirScreeningContentCategory: ContentCategory = {
  id: 'popup_open_air_screening',
  labelKey: 'popup_open_air_screening',
  questions: [
    {
      key: 'genre_only_applicable_to_movie_plans',
      labelKey: 'genre_only_applicable_to_movie_plans',
      options: [
        { key: 'action' },
        { key: 'comedy' },
        { key: 'drama' },
        { key: 'horror' },
        { key: 'sci_fi' },
        { key: 'romance' },
        { key: 'animation' },
        { key: 'documentary' },
        { key: 'family' },
        { key: 'cult_or_classic' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_the_language_and_subtitle_options',
      key: 'language_subtitles',
      labelKey: 'language_subtitles',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_age_rating',
      key: 'age_rating',
      labelKey: 'age_rating',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },
  ],
  verticalId: 'cinema_and_screenings',
};
