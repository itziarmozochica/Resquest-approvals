import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { AbstractControl, FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NgbModal, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { Observable, of, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { MessageModalComponent } from '../../../../../shared/components/message-modal/message-modal.component';
import { PartnerService } from '../../../../../shared/services/partner/partner.service';
import { PlanRequestImage } from '../../models/plan-request-image/plan-request-image.model';
import { PlanRequest } from '../../models/plan-request/plan-request.model';
import { PlanRequestService } from '../../services/plan-request.service';

const MAX_FILE_SIZE_IN_BYTES = 5 * Math.pow(2, 20);
const MIN_FILE_RESOLUTION_IN_PX = 800;

@Component({
  selector: 'app-plan-request-photos',
  standalone: false,
  templateUrl: './photos.component.html',
  styleUrls: ['./photos.component.scss'],
})
export class PhotosComponent implements OnInit, OnDestroy {
  @Output() updatePlanRequest: EventEmitter<PlanRequest> = new EventEmitter<PlanRequest>();
  @Input() planRequest: PlanRequest;
  private destroy$ = new Subject<void>();
  photosForm: FormGroup;
  mandatoryFields: string[] = ['images'];
  uploadError = false;

  constructor(
    private formBuilder: FormBuilder,
    private planRequestService: PlanRequestService,
    private partnerService: PartnerService,
    private modalService: NgbModal,
    private translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.photosForm = this.formBuilder.group({
      webUrl: [this.planRequest.webUrl || '', []],
      images: this.formBuilder.array([]),
    });
    this.setImages();
    this.onValueChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
  }

  private setImages(): void {
    const images = this.planRequest.images;

    if (images === undefined || images.length == 0) {
      return;
    }

    for (const image of images) {
      const imageFormGroup = this.formBuilder.group({
        imageUrl: [image.imageUrl, []],
      });
      this.images().push(imageFormGroup);
    }
  }

  images(): FormArray {
    return this.photosForm.get('images') as FormArray;
  }

  private newImage(url: string): FormGroup {
    return this.formBuilder.group({
      imageUrl: [url, []],
    });
  }

  private addImage(url: string): void {
    this.images().push(this.newImage(url));
  }

  removeImage(index: number): void {
    this.images().removeAt(index);
    this.planRequest['images'] = this.getImages(this.images());
    this.updatePlanRequest.emit(this.planRequest);
  }

  uploadFileCallback(file: File): void {
    this.uploadError = false;
    this.planRequestService.uploadFile(this.planRequest.partnerId, file, this.planRequest.id).subscribe(response => {
      if (response.data == null) {
        this.uploadError = true;
      } else {
        this.addImage(response.data);
        this.uploadError = false;
        this.planRequest['images'] = this.getImages(this.images());
        this.updatePlanRequest.emit(this.planRequest);
      }
    });
  }

  private getImages(FormImages: FormArray): PlanRequestImage[] {
    return FormImages.value.map((image: PlanRequestImage) => {
      return new PlanRequestImage(image.imageUrl);
    });
  }

  private onValueChanges(): void {
    this.photosForm.valueChanges.pipe(debounceTime(200), distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(formObject => {
      this.planRequest['webUrl'] = formObject['webUrl'] || undefined;
      this.updatePlanRequest.emit(this.planRequest);
    });
  }

  getControlClass(control: AbstractControl, showValidStatus?: boolean): string {
    if (!control.valid && control.touched) {
      return 'form-input--invalid';
    }
    if (control.value !== '') {
      return control.hasValidator(Validators.required) || showValidStatus ? 'form-input--valid' : '';
    }
    return '';
  }

  requestUploadImage(): void {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', '.png,.jpg,.jpeg');
    input.click();

    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        this.isValidImage(file).subscribe(valid => {
          if (!valid) {
            this.displayMessageModal('planRequest.photos.invalidImageTitle', ['planRequest.photos.invalidImageMessage']);
            return;
          }
          this.uploadFileCallback(file);
        });
      }
    };
  }

  loadPhotographyPracticesUrl(): string {
    const partner = this.partnerService.getPartner();
    return this.planRequestService.getPhotographyPracticesUrl(partner?.countryCode);
  }

  private isValidImage(file: File): Observable<boolean> {
    const validExtension = ['image/png', 'image/jpeg'].includes(file.type);
    const validSize = file.size <= MAX_FILE_SIZE_IN_BYTES;
    if (!validExtension || !validSize) {
      return of(false);
    }
    return new Observable(subscriber => {
      const img = new Image();
      img.src = window.URL.createObjectURL(file);
      img.onload = function () {
        subscriber.next(img.naturalWidth === img.naturalHeight && img.naturalWidth >= MIN_FILE_RESOLUTION_IN_PX);
        subscriber.complete();
      };
    });
  }

  private displayMessageModal(titleKey: string, messageKeys: Array<string>): NgbModalRef {
    const modal = this.modalService.open(MessageModalComponent);
    modal.componentInstance.title = this.translate.instant(titleKey);
    modal.componentInstance.messages = messageKeys.map(key => this.translate.instant(key));
    return modal;
  }
}
