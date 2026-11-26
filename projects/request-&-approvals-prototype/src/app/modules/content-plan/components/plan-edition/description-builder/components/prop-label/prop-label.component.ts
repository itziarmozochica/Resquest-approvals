import { ChangeDetectionStrategy, Component, computed, input, ViewEncapsulation } from '@angular/core';

import { TranslateModule } from '@ngx-translate/core';

import { DescriptionFieldContract } from '../../blocks/_shared/field-contract.types';
import { findFieldSpec } from '../../blocks/block-validation.util';

/**
 * Renders a properties-panel field label from its field contract: the label
 * text (`spec.labelKey`) plus a permanent `*` mark when the field is mandatory.
 * Driven entirely by the contract so the asterisk can never drift from the
 * declared `required` flag, and the per-field `@if`/`<span>` boilerplate lives
 * in one place. Editor-only — never part of the exported HTML.
 *
 * `None` encapsulation so the shared `.prop-label` / `.prop-required-mark`
 * styles in `properties-panel.component.scss` reach the rendered markup; the
 * host is `display: contents` so it does not perturb the `.prop` layout.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [TranslateModule],
  selector: 'app-db-prop-label',
  standalone: true,
  styles: ['app-db-prop-label { display: contents; }'],
  template: `
    <label class="prop-label">
      {{ labelKey() | translate }}
      @if (required()) {
        <span class="prop-required-mark" aria-hidden="true" [title]="REQUIRED_MARK_KEY | translate">*</span>
      }
    </label>
  `,
})
export class PropLabelComponent {
  readonly contract = input.required<DescriptionFieldContract>();
  readonly field = input.required<string>();

  protected readonly REQUIRED_MARK_KEY = 'planEdition.contentEdition.builder.validation.requiredMark';

  readonly #spec = computed(() => findFieldSpec(this.contract(), this.field()));
  protected readonly labelKey = computed(() => this.#spec()?.labelKey ?? '');
  protected readonly required = computed(() => this.#spec()?.required ?? false);
}
