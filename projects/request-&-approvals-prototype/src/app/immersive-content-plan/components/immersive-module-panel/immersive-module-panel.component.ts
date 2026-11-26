import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { IgntButtonComponent, IgntMenuComponent, IgntMenuItemComponent, IgntMenuTriggerForDirective } from '@ignite/common';
import { IgntIconComponent } from '@ignite/icon';
import { IgntListItemComponent } from '@ignite/legacy/components/ignt-list-item/ignt-list-item.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { IgntWrapperCardComponent } from '@ignite/legacy/components/ignt-wrapper-card/ignt-wrapper-card.component';
import { TranslateModule } from '@ngx-translate/core';

import { GENERAL_SETTINGS_ID } from '../../models/immersive-content-plan-editor.model';
import type { ImmersiveContentPlanModuleGapView } from '../../models/immersive-content-plan-screen-state.model';
import type { ImmersiveModuleType } from '../../models/immersive-layout-module-type.model';
import { buildAddableModuleCatalog, type AddableModuleCatalogEntry } from '../../utils/immersive-layout-module-catalog.util';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CdkDrag,
    CdkDragHandle,
    CdkDropList,
    IgntButtonComponent,
    IgntIconComponent,
    IgntListItemComponent,
    IgntMenuComponent,
    IgntMenuItemComponent,
    IgntMenuTriggerForDirective,
    IgntTagComponent,
    IgntWrapperCardComponent,
    TranslateModule,
  ],
  selector: 'app-immersive-module-panel',
  standalone: true,
  styleUrl: './immersive-module-panel.component.scss',
  templateUrl: './immersive-module-panel.component.html',
})
export class ImmersiveModulePanelComponent {
  readonly generalEdited = input(false);
  readonly modules = input.required<readonly ImmersiveContentPlanModuleGapView[]>();
  readonly selectedModuleId = input.required<string>();
  readonly moduleAdd = output<ImmersiveModuleType>();
  readonly moduleMoved = output<{ from: number; to: number }>();
  readonly moduleSelected = output<string>();

  protected readonly addableModules = computed<readonly AddableModuleCatalogEntry[]>(() =>
    buildAddableModuleCatalog(new Set(this.modules().map(module => module.type))),
  );

  protected readonly generalSettingsId = GENERAL_SETTINGS_ID;
  protected readonly isGeneralSelected = computed(() => this.selectedModuleId() === GENERAL_SETTINGS_ID);

  protected addModule(type: ImmersiveModuleType): void {
    this.moduleAdd.emit(type);
  }

  protected moduleDropped(event: CdkDragDrop<unknown>): void {
    this.moduleMoved.emit({ from: event.previousIndex, to: event.currentIndex });
  }

  protected selectModule(moduleId: string): void {
    this.moduleSelected.emit(moduleId);
  }

  // Index 0 (the hero) is unreachable in both directions: `[cdkDragDisabled]` keeps it from being
  // the source, and this predicate keeps it from being the target.
  protected sortPredicate(index: number): boolean {
    return index > 0;
  }
}
