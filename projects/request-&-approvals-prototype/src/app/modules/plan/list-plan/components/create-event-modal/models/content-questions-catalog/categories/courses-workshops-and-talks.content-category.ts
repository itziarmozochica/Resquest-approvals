import type { ContentCategory } from '../../content-questions.model';

export const coursesWorkshopsAndTalksContentCategory: ContentCategory = {
  id: 'courses_workshops_and_talks',
  labelKey: 'courses_workshops_and_talks',
  questions: [
    {
      helpKey: 'add_the_languages_the_session_runs_in',
      key: 'languages',
      labelKey: 'languages',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_the_materials_included',
      key: 'materials_included_slides_recordings_certificates_etc',
      labelKey: 'materials_included_slides_recordings_certificates_etc',
      requiredWhen: { kind: 'never' },
      type: 'open_text',
    },

    {
      helpKey: 'add_any_health_age_or_other_restrictions',
      key: 'contraindications_restrictions_pregnancy_conditions_age_gender_allergies_to_products',
      labelKey: 'contraindications_restrictions_pregnancy_conditions_age_gender_allergies_to_products',
      requiredWhen: { kind: 'always' },
      type: 'open_text',
    },
  ],
  verticalId: 'local_activities',
};
