import { Injectable } from '@angular/core';

import {
  CustomLabelGroup,
  PlanTags,
  PlanTagsData,
  PlanTaxonomyHierarchy,
  UpdatePlanTags,
  UpdatePlanTagsData,
} from '../../models/tags.model';

@Injectable({
  providedIn: 'root',
})
export class PlanTagsAdapter {
  fromApi(data: PlanTagsData): PlanTags {
    return {
      customLabels: data.custom_labels.map(
        (group): CustomLabelGroup => ({
          type: group.type,
          maxLabelsPerPlan: group.max_labels_per_plan,
          labels: group.labels.map(label => ({ id: label.id, text: label.text })),
        }),
      ),
      taxonomies: data.taxonomies.map(
        (hierarchy): PlanTaxonomyHierarchy => ({
          id: hierarchy.id,
          name: hierarchy.name,
          terms: hierarchy.terms.map(term => ({ id: term.id, name: term.name })),
        }),
      ),
    };
  }

  toApi(data: UpdatePlanTags): UpdatePlanTagsData {
    return {
      taxonomy_term_ids: data.taxonomyTermIds,
      custom_label_ids: data.customLabelIds,
    };
  }
}
