export type CustomLabelType = 'event' | 'marketing';

export interface CustomLabelData {
  id: number;
  text: string;
}

export interface CustomLabelGroupData {
  labels: CustomLabelData[];
  max_labels_per_plan: number | null;
  type: CustomLabelType;
}

export interface PlanTaxonomyTermData {
  id: number;
  name: string;
}

export interface PlanTaxonomyHierarchyData {
  id: number;
  name: string;
  terms: PlanTaxonomyTermData[];
}

export interface PlanTagsData {
  custom_labels: CustomLabelGroupData[];
  taxonomies: PlanTaxonomyHierarchyData[];
}

export interface TaxonomyTermData {
  id: number;
  name: string;
  parent_id: number | null;
}

export interface TaxonomyHierarchyData {
  description: string | null;
  id: number;
  max_terms_per_plan: number | null;
  name: string;
  required: boolean;
  terms: TaxonomyTermData[];
}

export interface AvailableTagsData {
  custom_labels: CustomLabelGroupData[];
  taxonomies: TaxonomyHierarchyData[];
}

export interface CustomLabel {
  id: number;
  text: string;
}

export interface CustomLabelGroup {
  labels: CustomLabel[];
  maxLabelsPerPlan: number | null;
  type: CustomLabelType;
}

export interface PlanTaxonomyTerm {
  id: number;
  name: string;
}

export interface PlanTaxonomyHierarchy {
  id: number;
  name: string;
  terms: PlanTaxonomyTerm[];
}

export interface PlanTags {
  customLabels: CustomLabelGroup[];
  taxonomies: PlanTaxonomyHierarchy[];
}

export interface TaxonomyTerm {
  id: number;
  name: string;
  parentId: number | null;
}

export interface TaxonomyHierarchy {
  description: string | null;
  id: number;
  maxTermsPerPlan: number | null;
  name: string;
  required: boolean;
  terms: TaxonomyTerm[];
}

export interface AvailableTags {
  customLabels: CustomLabelGroup[];
  taxonomies: TaxonomyHierarchy[];
}

export interface UpdatePlanTagsData {
  custom_label_ids: number[];
  taxonomy_term_ids: number[];
}

export interface UpdatePlanTags {
  customLabelIds: number[];
  taxonomyTermIds: number[];
}
