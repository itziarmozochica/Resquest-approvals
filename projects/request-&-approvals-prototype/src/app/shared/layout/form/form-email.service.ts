import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { AbstractControl, UntypedFormGroup } from '@angular/forms';

import { Observable } from 'rxjs';

import { EmailContent, FormEmailModel } from './form-email.model';

@Injectable({
  providedIn: 'root',
})
export class FormEmailService {
  constructor(private httpClient: HttpClient) {}

  sendEmail(emailInfo: FormEmailModel, form: UntypedFormGroup): Observable<any> {
    const data = this.buildFormData(emailInfo, form);
    const formUrl = this.getFormUrl(emailInfo.formId);

    return this.httpClient.post(formUrl, data);
  }

  private getFormUrl(formId: string): string {
    return `https://formspree.io/${formId}`;
  }

  private buildFormData(emailInfo: FormEmailModel, form: UntypedFormGroup): FormData {
    const formData = new FormData();
    Object.keys(emailInfo.content).forEach((key: string) => {
      const emailInfoContentElement: string | undefined = emailInfo.content[key as keyof EmailContent];
      if (emailInfoContentElement !== undefined) {
        formData.append(key, emailInfoContentElement);
      }
    });
    if (emailInfo.dynamicContent) {
      emailInfo.dynamicContent.forEach(value => {
        if (form.get(value.name) !== null) {
          formData.append(value.formValue, (form.get(value.name) as AbstractControl).value);
        }
      });
    }

    return formData;
  }
}
