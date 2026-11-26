import type { ContentCategory } from '../../content-questions.model';

export const conventionContentCategory: ContentCategory = {
  id: 'convention',
  labelKey: 'convention',
  questions: [
    {
      key: 'format_lecture_panel_hands_on',
      labelKey: 'format_lecture_panel_hands_on',
      options: [
        { key: 'lecture_or_keynote' },
        { key: 'panel_discussion' },
        { key: 'hands_on_workshop' },
        { key: 'networking_sessions' },
        { key: 'exhibition_area' },
        { key: 'screenings_or_demos' },
        { extra: 'text', key: 'other_specify' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_the_languages_the_programme_runs_in',
      key: 'languages',
      labelKey: 'languages',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      key: 'certificate_of_attendance',
      labelKey: 'certificate_of_attendance',
      options: [{ key: 'yes_included' }, { key: 'yes_available_on_request' }, { key: 'no' }],
      requiredWhen: { kind: 'never' },
      type: 'yes_no',
    },
  ],
  verticalId: 'fairs_and_conventions',
};
