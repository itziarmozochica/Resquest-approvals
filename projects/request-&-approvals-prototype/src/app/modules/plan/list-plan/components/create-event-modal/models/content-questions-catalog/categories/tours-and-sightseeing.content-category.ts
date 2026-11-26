import type { ContentCategory } from '../../content-questions.model';

export const toursAndSightseeingContentCategory: ContentCategory = {
  id: 'tours_and_sightseeing',
  labelKey: 'tours_and_sightseeing',
  questions: [
    {
      helpKey: 'add_what_the_tour_includes',
      key: 'whats_included',
      labelKey: 'whats_included',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_languages_the_tour_runs_in',
      key: 'languages_available',
      labelKey: 'languages_available',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_anything_visitors_need_to_bring',
      key: 'what_to_bring',
      labelKey: 'what_to_bring',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'local_activities',
};
