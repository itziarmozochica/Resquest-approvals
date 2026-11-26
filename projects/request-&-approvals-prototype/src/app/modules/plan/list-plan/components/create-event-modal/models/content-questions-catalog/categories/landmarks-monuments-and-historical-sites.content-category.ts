import type { ContentCategory } from '../../content-questions.model';

export const landmarksMonumentsAndHistoricalSitesContentCategory: ContentCategory = {
  id: 'landmarks_monuments_and_historical_sites',
  labelKey: 'landmarks_monuments_and_historical_sites',
  questions: [
    {
      key: 'focus_art_history_heritage_literature_architecture',
      labelKey: 'focus_art_history_heritage_literature_architecture',
      options: [
        { key: 'art' },
        { key: 'history' },
        { key: 'heritage' },
        { key: 'literature' },
        { key: 'architecture' },
        { key: 'religion' },
        { key: 'panoramic_views' },
        { key: 'science_and_technology' },
        { key: 'nature' },
      ],
      requiredWhen: { kind: 'always' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_what_the_ticket_includes',
      key: 'whats_included',
      labelKey: 'whats_included',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      key: 'guided_options_guided_tour_audio_guide_or_self_paced',
      labelKey: 'guided_options_guided_tour_audio_guide_or_self_paced',
      options: [
        { key: 'guided_tour' },
        { key: 'audio_guide' },
        { key: 'app_based_guide' },
        { key: 'self_paced_no_guide' },
        { key: 'guided_tour_available_as_an_add_on' },
      ],
      requiredWhen: { kind: 'never' },
      type: 'multi_select',
    },

    {
      helpKey: 'add_the_languages_available_for_guides_or_audio_guides',
      key: 'languages_available',
      labelKey: 'languages_available',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },
  ],
  verticalId: 'permanent_attractions',
};
