import type { ContentCategory } from '../../content-questions.model';

export const exhibitionContentCategory: ContentCategory = {
  id: 'exhibition',
  labelKey: 'exhibition',
  questions: [
    {
      helpKey: 'add_the_artist_collection_or_theme',
      key: 'artist_collection_theme',
      labelKey: 'artist_collection_theme',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },

    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included',
      labelKey: 'whats_included',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_guided_or_self_paced_options',
      key: 'guided_options_guided_tour_audio_guide_or_self_paced',
      labelKey: 'guided_options_guided_tour_audio_guide_or_self_paced',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_languages_available_for_guides_or_audio_guides',
      key: 'languages_available',
      labelKey: 'languages_available',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'exhibitions_and_light_shows',
};
