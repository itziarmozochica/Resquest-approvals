import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  Signal,
  untracked,
  WritableSignal,
} from '@angular/core';

import { Block } from '@fz-original/app/modules/content-plan/components/plan-edition/description-builder/models/block.model';
import { Observable } from 'rxjs';

import {
  DescriptionField,
  DescriptionFieldChange,
  DescriptionSection,
  DescriptionTranslationOverlay,
  DescriptionTranslationStatusMap,
} from '../../models/description-translation.model';
import { buildDescriptionTranslationSections } from '../../utils/description-translation.adapter';
import { DescriptionTranslationSectionComponent } from '../description-translation-section/description-translation-section.component';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DescriptionTranslationSectionComponent],
  selector: 'app-description-translation',
  standalone: true,
  styleUrl: './description-translation.component.scss',
  templateUrl: './description-translation.component.html',
})
export class DescriptionTranslationComponent {
  readonly baseSchema = input.required<readonly Block[]>();
  readonly uploadFileCallback = input.required<(file: File) => Observable<string>>();
  readonly hideOriginal = input<boolean>(false);
  readonly showStatus = input<boolean>(true);
  readonly readOnly = input<boolean>(false);
  readonly statusByCode = input<DescriptionTranslationStatusMap>({});
  readonly translationOverlay = input<DescriptionTranslationOverlay>({});

  readonly fieldChange = output<DescriptionFieldChange>();
  readonly validate = output<DescriptionField>();

  protected readonly sections: Signal<DescriptionSection[]> = computed<DescriptionSection[]>(() =>
    buildDescriptionTranslationSections(this.baseSchema(), this.translationOverlay(), this.statusByCode()),
  );

  protected readonly expandedBlockIds: WritableSignal<Set<string>> = signal<Set<string>>(new Set<string>());
  protected readonly selectedItemByBlock: WritableSignal<Record<string, number>> = signal<Record<string, number>>({});

  constructor() {
    effect(() => {
      const ids = new Set<string>(this.sections().map((section: DescriptionSection) => section.blockId));
      untracked(() => {
        const currentIds = this.expandedBlockIds();
        const nextIds = new Set<string>([...currentIds].filter((id: string) => ids.has(id)));
        if (nextIds.size !== currentIds.size) {
          this.expandedBlockIds.set(nextIds);
        }
        const currentItems = this.selectedItemByBlock();
        const keptBlockIds = Object.keys(currentItems).filter((id: string) => ids.has(id));
        if (keptBlockIds.length !== Object.keys(currentItems).length) {
          this.selectedItemByBlock.set(Object.fromEntries(keptBlockIds.map((id: string) => [id, currentItems[id]])));
        }
      });
    });
  }

  protected onItemSelected(blockId: string, index: number): void {
    this.selectedItemByBlock.update((map: Record<string, number>) => ({ ...map, [blockId]: index }));
  }

  protected onSectionToggled(blockId: string): void {
    this.expandedBlockIds.update((ids: Set<string>) => {
      const next = new Set<string>(ids);
      if (next.has(blockId)) {
        next.delete(blockId);
      } else {
        next.add(blockId);
      }
      return next;
    });
  }
}
