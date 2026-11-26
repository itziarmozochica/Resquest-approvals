import { Injectable } from '@angular/core';

import { AvailableTags, AvailableTagsData, CustomLabelGroup, TaxonomyHierarchy } from '../../models/tags.model';

@Injectable({
  providedIn: 'root',
})
export class AvailableTagsAdapter {
  fromApi(data: AvailableTagsData): AvailableTags {
    return {
      customLabels: data.custom_labels.map(
        (group): CustomLabelGroup => ({
          labels: group.labels.map(label => ({ id: label.id, text: label.text })),
          maxLabelsPerPlan: group.max_labels_per_plan,
          type: group.type,
        }),
      ),
      taxonomies: data.taxonomies.map(
        (taxonomy): TaxonomyHierarchy => ({
          description: taxonomy.description,
          id: taxonomy.id,
          maxTermsPerPlan: taxonomy.max_terms_per_plan,
          name: this.#formatName(taxonomy.name),
          required: taxonomy.required,
          terms: taxonomy.terms.map(term => ({
            id: term.id,
            name: term.name,
            parentId: term.parent_id,
          })),
        }),
      ),
    };
  }

  #formatName(name: string): string {
    const spaced = name.replace(/_/g, ' ');
    return spaced.charAt(0).toUpperCase() + spaced.slice(1);
  }
}
