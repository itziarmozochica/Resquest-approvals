import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslateModule],
  selector: 'app-list-plan-header',
  standalone: true,
  styleUrl: './list-plan-header.component.scss',
  templateUrl: './list-plan-header.component.html',
})
export class ListPlanHeaderComponent {
  readonly #userService = inject(UserService);

  protected readonly welcomeTitle = computed(() => {
    const userName = this.#userService.getUser()?.name?.trim();

    return userName ?? '';
  });
}
