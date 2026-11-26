import { ChangeDetectionStrategy, Component, computed, inject, input, InputSignal, untracked } from '@angular/core';

import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { StorageKey } from '@fz-original/app/app/enums/storage.enum';
import { OrganizationFavoriteStarComponent } from '@fz-original/app/shared/components/organization-favorite-star/organization-favorite-star.component';
import { Organization } from '@fz-original/app/shared/models/organization/organization.model';
import { Partner } from '@fz-original/app/shared/models/partner/partner.model';
import { OrganizationPreferencesService } from '@fz-original/app/shared/services/organization-preferences/organization-preferences.service';
import { UserService } from '@fz-original/app/shared/services/user/user.service';
import { STORAGE_SERVICE } from '@fz/storage';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent, OrganizationFavoriteStarComponent],
  selector: 'app-user-info',
  standalone: true,
  styleUrls: ['./user-info.component.scss'],
  templateUrl: './user-info.component.html',
})
export class UserInfoComponent {
  readonly #organizationPreferencesService = inject(OrganizationPreferencesService);
  readonly #storage = inject(STORAGE_SERVICE);
  readonly #userService = inject(UserService);
  readonly #canFavorite = this.#userService.getNumberOfOrganizations() > 1;
  partner: InputSignal<Partner | null> = input<Partner | null>(null);
  userName: InputSignal<string | null> = input<string | null>(null);
  readonly favoriteOrganization = computed<Organization | null>(() => {
    const partner = this.partner();
    if (partner === null || !this.#canFavorite || !this.#organizationPreferencesService.loaded()) {
      return null;
    }
    return untracked(() => this.#toOrganization(partner));
  });

  constructor() {
    if (this.#canFavorite) {
      this.#organizationPreferencesService.ensureLoaded();
    }
  }

  #toOrganization(partner: Partner): Organization | null {
    const selected = this.#storage.get<Organization>(StorageKey.selectedOrganization);
    if (selected?.id !== partner.id) {
      return null;
    }
    return new Organization(
      selected.id,
      selected.name,
      selected.countryCode,
      selected.cityCode,
      selected.type,
      selected.deletedAt,
      selected.userRoleInOrganization,
      selected.category,
      selected.partnerOrganizationIds,
    );
  }
}
