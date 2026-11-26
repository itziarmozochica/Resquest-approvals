import type { ContentCategory } from '../../content-questions.model';

export const socialActivitiesAndGamesContentCategory: ContentCategory = {
  id: 'social_activities_and_games',
  labelKey: 'social_activities_and_games',
  questions: [
    {
      key: 'whats_included',
      labelKey: 'whats_included',
      options: [
        { key: 'entry' },
        { key: 'equipment' },
        { key: 'host_or_game_master' },
        { extra: 'number', key: 'a_set_number_of_rounds_specify' },
        { key: 'drink' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'what_to_bring',
      labelKey: 'what_to_bring',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'local_activities',
};
