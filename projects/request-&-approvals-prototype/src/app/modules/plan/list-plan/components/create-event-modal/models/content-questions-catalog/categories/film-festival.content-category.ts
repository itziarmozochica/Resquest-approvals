import type { ContentCategory } from '../../content-questions.model';

export const filmFestivalContentCategory: ContentCategory = {
  id: 'film_festival',
  labelKey: 'film_festival',
  questions: [
    {
      helpKey: 'add_the_films_included_or_say_if_the_programme_isnt_announced_yet',
      key: 'line_up_films_included',
      labelKey: 'line_up_films_included',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_age_rating',
      key: 'age_rating',
      labelKey: 'age_rating',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'cinema_and_screenings',
};
