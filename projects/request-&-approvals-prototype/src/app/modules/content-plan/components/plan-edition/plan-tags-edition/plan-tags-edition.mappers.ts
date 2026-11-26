import { SelectOption } from '../../../../../shared/layout/filters/select/select.interface';
import { CustomLabel, TaxonomyTerm } from '../../../models/tags.model';

export interface OrphanOption {
  id: number;
  name: string;
}

export function mapTaxonomyTermsToOptions(terms: TaxonomyTerm[], orphanTerms: OrphanOption[] = []): SelectOption[] {
  const active: SelectOption[] = terms.map(term => ({ id: term.id, title: term.name }));
  const orphans: SelectOption[] = orphanTerms.map(term => ({
    disabled: true,
    disabledDescription: 'planEdition.tags.orphanTooltip',
    id: term.id,
    title: term.name,
  }));
  return [...active, ...orphans].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}

export function mapCustomLabelsToOptions(labels: CustomLabel[], orphanLabels: OrphanOption[] = []): SelectOption[] {
  const active: SelectOption[] = labels.map(label => ({ id: label.id, title: label.text }));
  const orphans: SelectOption[] = orphanLabels.map(label => ({
    disabled: true,
    disabledDescription: 'planEdition.tags.orphanTooltip',
    id: label.id,
    title: label.name,
  }));
  return [...active, ...orphans].sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
}
