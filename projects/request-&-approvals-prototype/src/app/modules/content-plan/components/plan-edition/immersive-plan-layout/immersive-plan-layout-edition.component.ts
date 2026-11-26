import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';

import { ImmersiveContentPlanEditorComponent } from '@fz-original/app/immersive-content-plan/containers/immersive-content-plan-editor/immersive-content-plan-editor.component';
import { WithUnsavedChangesGuardComponent } from '@fz-original/app/shared/models/with-unsaved-changes-guard-component.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ImmersiveContentPlanEditorComponent],
  selector: 'app-immersive-plan-layout-edition',
  standalone: true,
  templateUrl: './immersive-plan-layout-edition.component.html',
})
export class ImmersivePlanLayoutEditionComponent implements WithUnsavedChangesGuardComponent {
  protected readonly editor = viewChild.required(ImmersiveContentPlanEditorComponent);

  areChangesUnsaved(): boolean {
    return this.editor().areChangesUnsaved();
  }
}
