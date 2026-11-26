import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NoteInput } from '@fz-original/app/shared/components/notes/notes-edit-form/notes-edit-form.component';
import { PipesModule } from '@fz-original/app/shared/pipes/pipes.module';
import { IgntIconComponent } from '@ignite/icon';
import { IgntLinkComponent } from '@ignite/legacy/components/ignt-link/ignt-link.component';
import { IgntTagComponent } from '@ignite/legacy/components/ignt-tag/ignt-tag.component';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconComponent, IgntLinkComponent, IgntTagComponent, PipesModule, TranslateModule],
  selector: 'app-notes-entries',
  styleUrl: './notes-entries.component.scss',
  templateUrl: './notes-entries.component.html',
})
export class NotesEntriesComponent {
  readonly canAddNote = input(false);
  readonly canEditCustomerNotes = input(true);
  readonly canEditStaffNote = input(false);
  readonly customerNotes = input<NoteInput[]>([]);
  readonly showAudienceTags = input(false);
  readonly staffEditLabelKey = input('boxOffice.order.notes.editTitle');
  readonly staffNote = input<NoteInput | null>(null);

  readonly addNote = output<void>();
  readonly editCustomerNote = output<NoteInput>();
  readonly editStaffNote = output<NoteInput>();
}
