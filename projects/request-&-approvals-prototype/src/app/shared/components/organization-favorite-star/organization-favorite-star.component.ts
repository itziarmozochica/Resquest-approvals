import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, Renderer2 } from '@angular/core';

import { IconProp } from '@fortawesome/fontawesome-svg-core';
import { Organization } from '@fz-original/app/shared/models/organization/organization.model';
import { OrganizationPreferencesService } from '@fz-original/app/shared/services/organization-preferences/organization-preferences.service';
import { IgntIconButtonComponent } from '@ignite/legacy/components/ignt-icon-button/ignt-icon-button.component';
import { TranslateService } from '@ngx-translate/core';

const FAVORITE_ICON: IconProp = ['fas', 'star'];
const NOT_FAVORITE_ICON: IconProp = ['fal', 'star'];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IgntIconButtonComponent],
  selector: 'app-organization-favorite-star',
  styleUrl: './organization-favorite-star.component.scss',
  templateUrl: './organization-favorite-star.component.html',
})
export class OrganizationFavoriteStarComponent {
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  readonly #translate = inject(TranslateService);
  protected readonly addLabel: string = this.#translate.instant('selectOrganization.addFavorite');
  protected readonly favoriteIcon = FAVORITE_ICON;
  readonly organization = input.required<Organization>();
  readonly isFavorite = computed(() => this.#organizationPreferencesService.favoriteOrganizationIds().has(this.organization().id));
  readonly isPending = computed(() => this.#organizationPreferencesService.pendingFavoriteIds().has(this.organization().id));
  protected readonly notFavoriteIcon = NOT_FAVORITE_ICON;
  protected readonly removeLabel: string = this.#translate.instant('selectOrganization.removeFavorite');

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const stopListening = inject(Renderer2).listen(host, 'click', (event: Event) => {
      event.stopPropagation();
      this.#organizationPreferencesService.toggleFavorite(this.organization());
    });
    inject(DestroyRef).onDestroy(stopListening);
  }
}
