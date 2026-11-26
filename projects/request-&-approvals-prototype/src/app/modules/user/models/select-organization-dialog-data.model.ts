import { Signal } from '@angular/core';

import { Organization } from '../../../shared/models/organization/organization.model';

/**
 * Data the sidebar passes when it opens `SelectOrganizationComponent` as an Ignite dialog.
 * The opener keeps writing the signals while the dialog is open; the callbacks replace the
 * component's outputs, and the selected organization id travels as the dialog close result.
 */
export interface SelectOrganizationDialogData {
  loading: Signal<boolean>;
  organizations: Signal<Organization[]>;
  onLoadMoreOrganizations: () => void;
  onOpenControlPanel: () => void;
  onSearchOrganization: (searchParam: string) => void;
  onShowDeletedChanged: (showDeleted: boolean) => void;
}
