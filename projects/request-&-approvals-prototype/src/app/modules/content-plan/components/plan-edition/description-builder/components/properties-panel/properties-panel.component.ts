import { ChangeDetectionStrategy, Component, input, output, ViewEncapsulation } from '@angular/core';

import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { Observable } from 'rxjs';

import { COMPONENT_TYPES } from '../../blocks/block-palette';
import { EventDetailsPropertiesComponent } from '../../blocks/event-details/event-details-properties.component';
import { FullImagePropertiesComponent } from '../../blocks/full-image/full-image-properties.component';
import { FullVideoPropertiesComponent } from '../../blocks/full-video/full-video-properties.component';
import { ImageGridPropertiesComponent } from '../../blocks/image-grid/image-grid-properties.component';
import { InfoCardPropertiesComponent } from '../../blocks/info-card/info-card-properties.component';
import { ParagraphPropertiesComponent } from '../../blocks/paragraph/paragraph-properties.component';
import { SpacerPropertiesComponent } from '../../blocks/spacer/spacer-properties.component';
import { TabsPropertiesComponent } from '../../blocks/tabs/tabs-properties.component';
import { TitlePropertiesComponent } from '../../blocks/title/title-properties.component';
import { Block, BlockProps } from '../../models/block.model';

/**
 * Thin dispatcher: shared chrome (header with the block's icon + label,
 * empty-state hint, delete action) plus an `@switch` that hands the selected
 * block to its per-type properties section
 * (`blocks/<type>/<type>-properties.component.*`). All per-type editors and
 * their state (card/tab cursors, color handlers…) live in those components.
 *
 * The public contract is stable on purpose: selector `app-db-properties-panel`,
 * inputs `block`/`uploadImageCallback`/`disabled`/`highlightMissingMandatory`
 * and outputs `propsChange`/`deleteBlock` are consumed by
 * `DescriptionBuilderComponent`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  // `None` so the shared `.prop*` form styles in this component's SCSS
  // cascade into the per-type properties sections (which render the markup
  // those rules target). Editor-only — the export never renders this panel.
  encapsulation: ViewEncapsulation.None,
  imports: [
    IgntButtonComponent,
    TranslateModule,
    TitlePropertiesComponent,
    ParagraphPropertiesComponent,
    SpacerPropertiesComponent,
    FullImagePropertiesComponent,
    FullVideoPropertiesComponent,
    ImageGridPropertiesComponent,
    EventDetailsPropertiesComponent,
    InfoCardPropertiesComponent,
    TabsPropertiesComponent,
  ],
  selector: 'app-db-properties-panel',
  standalone: true,
  styleUrl: './properties-panel.component.scss',
  templateUrl: './properties-panel.component.html',
})
export class PropertiesPanelComponent {
  readonly block = input<Block | null>(null);
  readonly uploadImageCallback = input.required<(file: File) => Observable<string>>();
  /**
   * Locks every editable field when `true`: text inputs/textareas, action
   * buttons (delete block, add/remove card or tab, color presets, color
   * picker, segmented selectors) are all disabled, and embedded editors
   * propagate the flag to their rich-text / image-upload children. The
   * "active card" and "active tab" selectors stay clickable — switching
   * between cards/tabs is navigation, not edition. Typically wired to
   * `!canEditPlan() || !hasEditContentPermission()`.
   */
  readonly disabled = input<boolean>(false);
  /**
   * Paints empty mandatory fields as errors in the per-type sections (red
   * label/border plus `aria-invalid`). Turned on by the consumer after a
   * publish attempt with missing mandatory content.
   */
  readonly highlightMissingMandatory = input<boolean>(false);
  readonly propsChange = output<BlockProps>();
  readonly deleteBlock = output<void>();

  readonly COMPONENT_TYPES = COMPONENT_TYPES;
}
