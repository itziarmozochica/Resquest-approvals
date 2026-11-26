import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { BUILT_IN_STEPPER_TEMPLATES } from '@fz-original/app/modules/ir-approval/information-requests/models/built-in-stepper-templates';
import { InformationRequestTemplateSummary } from '@fz-original/app/modules/ir-approval/information-requests/models/information-request-template.model';
import {
  StepperTemplate,
  StepperTemplateSummary,
} from '@fz-original/app/modules/ir-approval/information-requests/models/stepper-template.model';
import { IgntButtonComponent } from '@ignite/legacy/components/ignt-button/ignt-button.component';
import { TranslateModule } from '@ngx-translate/core';
import { forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { Permissions } from '../../../../shared/services/user/permissions';
import { UserService } from '../../../../shared/services/user/user.service';
import { CreateCustomFieldDraft, CreateFieldDialogComponent } from '../../components/create-field-dialog/create-field-dialog.component';
import { CreateTemplateDialogComponent } from '../../components/create-template-dialog/create-template-dialog.component';
import { StepperCatalogPanelComponent } from '../../components/stepper-catalog-panel/stepper-catalog-panel.component';
import { StepperTemplateEditorComponent } from '../../components/stepper-template-editor/stepper-template-editor.component';
import { TemplateEditorComponent } from '../../components/template-editor/template-editor.component';
import { TemplateListPanelComponent } from '../../components/template-list-panel/template-list-panel.component';
import {
  addCustomField,
  applyCustomFieldPatch,
  applyOverridePatch,
  buildRowsForTemplate,
  CatalogRow,
  commitFlatOrderForTemplate,
  newCustomFieldId,
  nextOrderForNewCustomField,
  removeCustomField as removeCustomFieldFromMap,
  reorderRows,
} from '../../domain/catalog-editor';
import { addFieldToLayout, removeFieldFromLayout } from '../../domain/layout-editing';
import { mergeStepperCatalog, StepperCatalogEntry } from '../../domain/stepper-catalog';
import {
  CustomFieldsByTemplate,
  LayoutsByTemplate,
  MergedTemplate,
  OverridesByTemplate,
  ServiceCatalogCustomField,
  ServiceCatalogSettings,
  TemplateLayout,
  TemplateQuestionOverride,
} from '../../models/service-catalog.model';
import { AdminProjectManagementSettingsService, TypeDefinitionKind } from '../../services/admin-project-management-settings.service';

type Banner = 'loadFailed' | 'saveFailed' | 'saved' | null;
type Tab = 'IR' | 'APPROVAL' | 'STEPPER';

@Component({
  selector: 'app-admin-project-management-settings',
  templateUrl: './admin-project-management-settings.component.html',
  styleUrls: ['./admin-project-management-settings.component.scss'],
  imports: [
    CommonModule,
    TranslateModule,
    IgntButtonComponent,
    TemplateListPanelComponent,
    TemplateEditorComponent,
    CreateFieldDialogComponent,
    CreateTemplateDialogComponent,
    StepperCatalogPanelComponent,
    StepperTemplateEditorComponent,
  ],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminProjectManagementSettingsComponent {
  readonly loading = signal<boolean>(true);
  readonly saving = signal<boolean>(false);
  readonly banner = signal<Banner>(null);

  readonly tab = signal<Tab>('IR');

  readonly templates = signal<InformationRequestTemplateSummary[]>([]);
  readonly approvalTemplates = signal<InformationRequestTemplateSummary[]>([]);
  readonly mergedByTemplate = signal<Record<string, MergedTemplate>>({});
  readonly templateLoading = signal<string | null>(null);

  readonly settings = signal<ServiceCatalogSettings | null>(null);
  readonly approvalSettings = signal<ServiceCatalogSettings | null>(null);
  readonly overrides = signal<OverridesByTemplate>({});
  readonly customFields = signal<CustomFieldsByTemplate>({});
  readonly layouts = signal<LayoutsByTemplate>({});
  readonly approvalOverrides = signal<OverridesByTemplate>({});
  readonly approvalCustomFields = signal<CustomFieldsByTemplate>({});
  readonly approvalLayouts = signal<LayoutsByTemplate>({});
  readonly hiddenTemplateKeys = signal<string[]>([]);
  readonly globallyOrdered = signal<boolean>(false);
  readonly approvalHiddenTemplateKeys = signal<string[]>([]);
  readonly approvalGloballyOrdered = signal<boolean>(false);

  readonly expandedKey = signal<string | null>(null);
  readonly createDialogOpen = signal<boolean>(false);
  readonly createTemplateDialogOpen = signal<boolean>(false);

  readonly stepperTemplates = signal<StepperTemplateSummary[]>([]);
  readonly stepperCatalog = computed<StepperCatalogEntry[]>(() => mergeStepperCatalog(this.stepperTemplates(), BUILT_IN_STEPPER_TEMPLATES));
  readonly stepperTemplatesLoaded = signal<boolean>(false);
  readonly selectedStepperKey = signal<string | null>(null);
  readonly stepperLoadingKey = signal<string | null>(null);
  readonly currentStepperTemplate = signal<StepperTemplate | null>(null);
  readonly createStepperDialogOpen = signal<boolean>(false);

  readonly #destroyRef = inject(DestroyRef);
  readonly #service = inject(AdminProjectManagementSettingsService);
  readonly #userService = inject(UserService);

  readonly canAdminApproval = this.#userService.hasPermission(Permissions.CAN_ADMIN_APPROVAL);
  readonly canAdminInformationRequest = this.#userService.hasPermission(Permissions.CAN_ADMIN_INFORMATION_REQUEST);

  constructor() {
    if (this.canAdminInformationRequest) {
      this.#bootstrap();
      this.#loadStepperTemplates();
    } else if (this.canAdminApproval) {
      this.tab.set('APPROVAL');
      this.#loadApprovalCatalog();
    } else {
      this.#bootstrap();
    }
  }

  selectTab(tab: Tab): void {
    this.tab.set(tab);
    this.expandedKey.set(null);
    this.banner.set(null);
    if (tab === 'APPROVAL' && this.approvalSettings() === null) {
      this.#loadApprovalCatalog();
    }
    if (tab === 'STEPPER' && !this.stepperTemplatesLoaded()) {
      this.#loadStepperTemplates();
    }
  }

  currentKind(): TypeDefinitionKind {
    return this.tab() === 'APPROVAL' ? 'APPROVAL' : 'IR';
  }

  currentTemplates(): InformationRequestTemplateSummary[] {
    return this.tab() === 'APPROVAL' ? this.approvalTemplates() : this.templates();
  }

  currentOverrides(): OverridesByTemplate {
    return this.tab() === 'APPROVAL' ? this.approvalOverrides() : this.overrides();
  }

  currentCustomFields(): CustomFieldsByTemplate {
    return this.tab() === 'APPROVAL' ? this.approvalCustomFields() : this.customFields();
  }

  currentLayouts(): LayoutsByTemplate {
    return this.tab() === 'APPROVAL' ? this.approvalLayouts() : this.layouts();
  }

  currentHiddenKeys(): string[] {
    return this.tab() === 'APPROVAL' ? this.approvalHiddenTemplateKeys() : this.hiddenTemplateKeys();
  }

  currentGloballyOrdered(): boolean {
    return this.tab() === 'APPROVAL' ? this.approvalGloballyOrdered() : this.globallyOrdered();
  }

  toggleTemplateHidden(key: string): void {
    const signalRef = this.tab() === 'APPROVAL' ? this.approvalHiddenTemplateKeys : this.hiddenTemplateKeys;
    signalRef.update(keys => (keys.includes(key) ? keys.filter(k => k !== key) : [...keys, key]));
  }

  toggleGlobalOrder(): void {
    const signalRef = this.tab() === 'APPROVAL' ? this.approvalGloballyOrdered : this.globallyOrdered;
    signalRef.update(value => !value);
  }

  toggleTemplate(key: string): void {
    if (this.expandedKey() === key) {
      this.expandedKey.set(null);
      return;
    }
    this.expandedKey.set(key);
    if (!this.mergedByTemplate()[key]) {
      this.#loadMergedTemplate(key);
    }
  }

  onOverridePatch(templateKey: string, questionId: string, patch: Partial<TemplateQuestionOverride>): void {
    if (this.tab() === 'APPROVAL') {
      this.approvalOverrides.update(current => applyOverridePatch(current, templateKey, questionId, patch));
    } else {
      this.overrides.update(current => applyOverridePatch(current, templateKey, questionId, patch));
    }
  }

  onCustomFieldPatch(templateKey: string, fieldId: string, patch: Partial<ServiceCatalogCustomField>): void {
    if (this.tab() === 'APPROVAL') {
      this.approvalCustomFields.update(current => applyCustomFieldPatch(current, templateKey, fieldId, patch));
    } else {
      this.customFields.update(current => applyCustomFieldPatch(current, templateKey, fieldId, patch));
    }
  }

  onRemoveCustomField(templateKey: string, fieldId: string): void {
    if (this.tab() === 'APPROVAL') {
      this.approvalCustomFields.update(current => removeCustomFieldFromMap(current, templateKey, fieldId));
      this.approvalLayouts.update(current => this.#stripFieldFromLayoutMap(current, templateKey, fieldId));
    } else {
      this.customFields.update(current => removeCustomFieldFromMap(current, templateKey, fieldId));
      this.layouts.update(current => this.#stripFieldFromLayoutMap(current, templateKey, fieldId));
    }
  }

  onLayoutChange(templateKey: string, layout: TemplateLayout): void {
    if (this.tab() === 'APPROVAL') {
      this.approvalLayouts.update(current => ({ ...current, [templateKey]: layout }));
    } else {
      this.layouts.update(current => ({ ...current, [templateKey]: layout }));
    }
  }

  onReorder(templateKey: string, rows: CatalogRow[], fromIndex: number, toIndex: number): void {
    const reordered = reorderRows(rows, fromIndex, toIndex);
    const out = commitFlatOrderForTemplate(
      reordered,
      templateKey,
      this.currentOverrides(),
      this.currentCustomFields(),
      this.currentLayouts(),
    );
    if (this.tab() === 'APPROVAL') {
      this.approvalOverrides.set(out.overrides);
      this.approvalCustomFields.set(out.customFields);
      this.approvalLayouts.set(out.layouts);
    } else {
      this.overrides.set(out.overrides);
      this.customFields.set(out.customFields);
      this.layouts.set(out.layouts);
    }
  }

  openCreateDialog(): void {
    this.createDialogOpen.set(true);
  }

  closeCreateDialog(): void {
    this.createDialogOpen.set(false);
  }

  confirmCreateField(draft: CreateCustomFieldDraft): void {
    const templateKey = this.expandedKey();
    if (!templateKey) return;

    const merged = this.mergedByTemplate()[templateKey];
    const rows: CatalogRow[] = merged
      ? buildRowsForTemplate(templateKey, merged, this.currentCustomFields()[templateKey] ?? [], this.currentOverrides()[templateKey] ?? {})
      : [];
    const order = nextOrderForNewCustomField(rows, draft.section);
    const field: ServiceCatalogCustomField = {
      id: newCustomFieldId(),
      label: draft.label.trim(),
      type: draft.type,
      section: draft.section.trim() || 'General',
      order,
      required: draft.required,
      helpText: draft.helpText || null,
      options: draft.options.length ? draft.options : null,
      removalLocked: false,
      kind: draft.kind,
      ...(draft.kind === 'grid'
        ? {
            gridColumns: draft.gridColumns ?? null,
            tableColumnPicklists: draft.tableColumnPicklists ?? null,
            gridMinRows: draft.gridMinRows ?? null,
          }
        : {}),
      ...(draft.kind === 'faq' ? { faqMinPairs: draft.faqMinPairs ?? null } : {}),
      ...(draft.kind === 'stepperRef'
        ? {
            stepperTemplateKey: draft.stepperTemplateKey ?? null,
            multiInstance: draft.multiInstance ?? null,
          }
        : {}),
    };
    if (this.tab() === 'APPROVAL') {
      this.approvalCustomFields.update(current => addCustomField(current, templateKey, field));
      this.approvalLayouts.update(current => this.#placeFieldInLayoutMap(current, templateKey, field));
    } else {
      this.customFields.update(current => addCustomField(current, templateKey, field));
      this.layouts.update(current => this.#placeFieldInLayoutMap(current, templateKey, field));
    }
    this.createDialogOpen.set(false);
  }

  #stripFieldFromLayoutMap(layouts: LayoutsByTemplate, templateKey: string, fieldId: string): LayoutsByTemplate {
    const layout = layouts[templateKey];
    if (!layout) return layouts;
    return { ...layouts, [templateKey]: removeFieldFromLayout(layout, fieldId) };
  }

  #placeFieldInLayoutMap(layouts: LayoutsByTemplate, templateKey: string, field: ServiceCatalogCustomField): LayoutsByTemplate {
    const layout = layouts[templateKey];
    // Only place into an existing sectioned layout; without one the editor renders the flat field list.
    if (!layout || !layout.sections.length) return layouts;
    return { ...layouts, [templateKey]: addFieldToLayout(layout, field.id, field.section) };
  }

  openCreateTemplateDialog(): void {
    this.createTemplateDialogOpen.set(true);
  }

  closeCreateTemplateDialog(): void {
    this.createTemplateDialogOpen.set(false);
  }

  confirmCreateTemplate(label: string): void {
    const kind = this.currentKind();
    this.banner.set(null);
    this.#service
      .createTemplate(label, kind)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error || !response.data) {
          this.banner.set('saveFailed');
          return;
        }
        const created = response.data;
        const signalRef = kind === 'APPROVAL' ? this.approvalTemplates : this.templates;
        signalRef.update(list => [...list, created]);
        this.createTemplateDialogOpen.set(false);
        this.toggleTemplate(created.key);
      });
  }

  onDeleteTemplate(templateKey: string): void {
    const kind = this.currentKind();
    this.banner.set(null);
    this.#service
      .deleteTemplate(templateKey, kind)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error || !response.data) {
          this.banner.set('saveFailed');
          return;
        }
        const signalRef = kind === 'APPROVAL' ? this.approvalTemplates : this.templates;
        signalRef.update(list => list.filter(t => t.key !== templateKey));
        this.mergedByTemplate.update(current => {
          const next = { ...current };
          delete next[templateKey];
          return next;
        });
        if (this.expandedKey() === templateKey) {
          this.expandedKey.set(null);
        }
      });
  }

  save(): void {
    if (this.saving()) return;
    this.saving.set(true);
    this.banner.set(null);

    const kind = this.currentKind();
    const overrides = this.currentOverrides();
    const customFields = this.currentCustomFields();
    const layouts = this.currentLayouts();
    const meta = { hiddenTemplateKeys: this.currentHiddenKeys(), globallyOrdered: this.currentGloballyOrdered() };

    forkJoin([
      this.#service.updateOverrides(overrides, kind),
      this.#service.updateCustomFields(customFields, kind),
      this.#service.updateLayouts(layouts, kind, meta),
    ])
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe({
        next: ([overridesRes, customsRes, layoutsRes]) => {
          this.saving.set(false);
          const last = layoutsRes.data ?? customsRes.data ?? overridesRes.data;
          if (overridesRes.error || customsRes.error || layoutsRes.error || !last) {
            this.banner.set('saveFailed');
            return;
          }
          this.#applyServerSettings(last, kind);
          this.banner.set('saved');
        },
        error: () => {
          this.saving.set(false);
          this.banner.set('saveFailed');
        },
      });
  }

  #bootstrap(): void {
    this.loading.set(true);
    this.#service
      .listTemplates('IR')
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        switchMap(templatesResp => {
          if (templatesResp.error) {
            this.banner.set('loadFailed');
            return of(null);
          }
          this.templates.set(templatesResp.data ?? []);
          return this.#service.getSettings('IR');
        }),
      )
      .subscribe(settingsResp => {
        this.loading.set(false);
        if (!settingsResp) return;
        if (settingsResp.error) {
          this.banner.set('loadFailed');
          return;
        }
        if (settingsResp.data) {
          this.#applyServerSettings(settingsResp.data, 'IR');
        }
      });
  }

  #loadApprovalCatalog(): void {
    this.loading.set(true);
    this.#service
      .listTemplates('APPROVAL')
      .pipe(
        takeUntilDestroyed(this.#destroyRef),
        switchMap(templatesResp => {
          if (templatesResp.error) {
            this.banner.set('loadFailed');
            return of(null);
          }
          this.approvalTemplates.set(templatesResp.data ?? []);
          return this.#service.getSettings('APPROVAL');
        }),
      )
      .subscribe(settingsResp => {
        this.loading.set(false);
        if (!settingsResp) return;
        if (settingsResp.error) {
          this.banner.set('loadFailed');
          return;
        }
        if (settingsResp.data) {
          this.#applyServerSettings(settingsResp.data, 'APPROVAL');
        }
      });
  }

  #applyServerSettings(settings: ServiceCatalogSettings, kind: TypeDefinitionKind): void {
    if (kind === 'APPROVAL') {
      this.approvalSettings.set(settings);
      this.approvalOverrides.set(settings.overrides);
      this.approvalCustomFields.set(settings.customFields);
      this.approvalLayouts.set(settings.layouts);
      this.approvalHiddenTemplateKeys.set(settings.hiddenTemplateKeys);
      this.approvalGloballyOrdered.set(settings.globallyOrdered);
    } else {
      this.settings.set(settings);
      this.overrides.set(settings.overrides);
      this.customFields.set(settings.customFields);
      this.layouts.set(settings.layouts);
      this.hiddenTemplateKeys.set(settings.hiddenTemplateKeys);
      this.globallyOrdered.set(settings.globallyOrdered);
    }
  }

  #loadMergedTemplate(templateKey: string): void {
    const kind = this.currentKind();
    this.templateLoading.set(templateKey);
    this.#service
      .getMergedTemplate(templateKey, kind)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.templateLoading.set(null);
        if (response.error || !response.data) {
          this.banner.set('loadFailed');
          return;
        }
        this.mergedByTemplate.update(current => ({ ...current, [templateKey]: response.data as MergedTemplate }));
      });
  }

  openStepperTemplate(key: string): void {
    if (this.selectedStepperKey() === key && this.currentStepperTemplate()) {
      this.selectedStepperKey.set(null);
      this.currentStepperTemplate.set(null);
      return;
    }
    this.selectedStepperKey.set(key);
    this.currentStepperTemplate.set(null);

    const isBackend = this.stepperTemplates().some(t => t.key === key);
    const builtin = BUILT_IN_STEPPER_TEMPLATES[key];
    if (!isBackend && builtin) {
      this.currentStepperTemplate.set(builtin);
      return;
    }

    this.stepperLoadingKey.set(key);
    this.#service
      .getStepperTemplate(key)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.stepperLoadingKey.set(null);
        if (response.error || !response.data) {
          this.banner.set('loadFailed');
          return;
        }
        this.currentStepperTemplate.set(response.data);
      });
  }

  openCreateStepperDialog(): void {
    this.createStepperDialogOpen.set(true);
  }

  closeCreateStepperDialog(): void {
    this.createStepperDialogOpen.set(false);
  }

  confirmCreateStepperTemplate(label: string): void {
    this.banner.set(null);
    this.#service
      .createStepperTemplate(label)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error || !response.data) {
          this.banner.set('saveFailed');
          return;
        }
        const created = response.data;
        this.stepperTemplates.update(list => [...list, created]);
        this.createStepperDialogOpen.set(false);
        this.openStepperTemplate(created.key);
      });
  }

  onDeleteStepperTemplate(key: string): void {
    this.banner.set(null);
    this.#service
      .deleteStepperTemplate(key)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error || !response.data) {
          this.banner.set('saveFailed');
          return;
        }
        this.stepperTemplates.update(list => list.filter(t => t.key !== key));
        if (this.selectedStepperKey() === key) {
          this.selectedStepperKey.set(null);
          this.currentStepperTemplate.set(null);
        }
      });
  }

  closeStepperEditor(): void {
    this.selectedStepperKey.set(null);
    this.currentStepperTemplate.set(null);
  }

  saveStepperTemplate(template: StepperTemplate): void {
    this.saving.set(true);
    this.banner.set(null);
    this.#service
      .updateStepperTemplate(template)
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        this.saving.set(false);
        if (response.error || !response.data) {
          this.banner.set('saveFailed');
          return;
        }
        const saved = response.data;
        this.currentStepperTemplate.set(saved);
        const summary: StepperTemplateSummary = { key: saved.key, label: saved.label, multiInstance: saved.multiInstance };
        this.stepperTemplates.update(list =>
          list.some(t => t.key === saved.key) ? list.map(t => (t.key === saved.key ? summary : t)) : [...list, summary],
        );
        this.banner.set('saved');
      });
  }

  #loadStepperTemplates(): void {
    this.#service
      .listStepperTemplates()
      .pipe(takeUntilDestroyed(this.#destroyRef))
      .subscribe(response => {
        if (response.error) {
          this.banner.set('loadFailed');
          return;
        }
        this.stepperTemplates.set(response.data ?? []);
        this.stepperTemplatesLoaded.set(true);
      });
  }
}
