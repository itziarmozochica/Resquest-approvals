import { Directive, Input, OnInit, TemplateRef, ViewContainerRef } from '@angular/core';

import { Partner } from '@fz-original/app/shared/models/partner/partner.model';

import { PartnerService } from '../services/partner/partner.service';
import { SelectedPlanContextService } from '../services/selected-plan-context/selected-plan-context.service';
import { OptimizelyService } from './optimizely.service';

export interface OptimizelyFeatureContext {
  variables: Record<string, any>;
}

@Directive({
  selector: '[optimizelyFeature]',
  standalone: false,
})
export class OptimizelyFeatureDirective implements OnInit {
  @Input('optimizelyFeatureEnabled') enabled = false;
  @Input('optimizelyFeature') id = '';
  @Input('optimizelyFeatureModule') module = '';

  constructor(
    private viewContainerRef: ViewContainerRef,
    private templateRef: TemplateRef<OptimizelyFeatureContext>,
    private service: OptimizelyService,
    private partnerService: PartnerService,
    private selectedPlanContextService: SelectedPlanContextService,
  ) {}

  ngOnInit(): void {
    if (!this.id) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
      return;
    }

    const partner: Partner | null = this.partnerService.getPartner();

    if (!this.service.getPartnerId()) {
      if (partner !== null) {
        this.service.setPartnerId(partner.id.toString());
      }
    }

    if (!this.service.getPartnerCountry()) {
      if (partner !== null) {
        this.service.setPartnerCountry(partner.countryCode);
      }
    }

    if (!this.service.getOrganizationType()) {
      if (partner !== null && partner.type !== undefined) {
        this.service.setOrganizationType(partner.type);
      }
    }

    if (!this.service.getPlanId()) {
      const planId: number | undefined = this.selectedPlanContextService?.currentContext?.planId;
      if (planId !== undefined) {
        this.service.setPlanId(planId.toString());
      }
    }

    const featureEnabled = this.service.isFeatureEnabled(this.id);
    if (typeof featureEnabled === 'boolean' && featureEnabled === this.enabled) {
      this.viewContainerRef.createEmbeddedView(this.templateRef);
    }
  }
}
