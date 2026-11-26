import { Component, input, Input } from '@angular/core';

import { Formspree } from '@fz-original/environments/environment.model';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { environment } from '../../../../../environments/environment';
import { FormEmailModel } from '../../../../shared/layout/form/form-email.model';
import { Partner } from '../../../../shared/models/partner/partner.model';
import { PlanDetail } from '../../../../shared/models/plan/plan-detail.model';
import { ActionOptionEnum } from '../../models/action-option.enum';
import { ActionOption } from '../../models/action-option.model';
import { NewDescriptionComponent } from '../email-modal/new-description-modal/new-description-modal.component';
import { NewNameComponent } from '../email-modal/new-name-modal/new-name-modal.component';
import { NewPhotoComponent } from '../email-modal/new-photo-modal/new-photo-modal.component';

@Component({
  selector: 'app-content-plan-details',
  standalone: false,
  templateUrl: './content-plan-details.component.html',
  styleUrls: ['./content-plan-details.component.scss'],
})
export class ContentPlanDetailsComponent {
  actionOptions: Array<ActionOption> = [
    new ActionOption(ActionOptionEnum.NewName, 'planDetail.suggestNewName', { name: 'text-size', variant: 'light' }),
    new ActionOption(ActionOptionEnum.NewDescription, 'planDetail.suggestNewDescription', { name: 'pen', variant: 'light' }),
    new ActionOption(ActionOptionEnum.NewPicture, 'planDetail.suggestNewPicture', { name: 'camera', variant: 'light' }),
  ];
  modalRef?: ReturnType<NgbModal['open']>;
  @Input() partner?: Partner;
  @Input() plan?: PlanDetail;
  readonly showTitle = input(true);

  constructor(private modalService: NgbModal) {}

  clickOnOption(option: ActionOptionEnum): void {
    const { partner, plan } = this;
    if (!partner || !plan) {
      return;
    }

    switch (option) {
      case ActionOptionEnum.NewName:
        this.modalRef = this.modalService.open(NewNameComponent);
        this.modalRef.componentInstance.defaultName = plan.name;
        this.showModal('New name suggestion', 'newNameform', partner, plan);
        break;

      case ActionOptionEnum.NewDescription:
        this.modalRef = this.modalService.open(NewDescriptionComponent);
        this.modalRef.componentInstance.defaultDescription = plan.description;
        this.showModal('New description suggestion', 'newDescriptionForm', partner, plan);
        break;

      case ActionOptionEnum.NewPicture:
        this.modalRef = this.modalService.open(NewPhotoComponent);
        this.showModal('New photo suggestion', 'newPictureForm', partner, plan);
        break;
    }
  }

  private showModal(subject: string, formId: keyof Formspree, partner: Partner, plan: PlanDetail): void {
    const formspreeFormId = environment.formspree[formId];
    if (!this.modalRef || !formspreeFormId) {
      return;
    }

    this.modalRef.componentInstance.emailInfo = this.buildEmailConfiguration(subject, formspreeFormId, partner, plan);
  }

  private buildEmailConfiguration(subject: string, formId: string, partner: Partner, plan: PlanDetail): FormEmailModel {
    return {
      content: {
        planId: plan.id.toString(),
        planName: plan.name,
        partnerId: partner.id.toString(),
        partnerName: partner.name,
        _subject: subject,
      },
      formId,
    };
  }
}
