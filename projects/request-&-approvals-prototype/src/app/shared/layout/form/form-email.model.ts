interface EmailParams {
  name: string;
  formValue: string;
}

export interface EmailContent {
  planId: string;
  planName: string;
  partnerId: string;
  partnerName: string;
  _subject: string;
  _cc?: string;
}

interface BusinessEmailContent extends EmailContent {
  businessId: string;
}

export interface BusinessFormEmailModel {
  content: BusinessEmailContent;
  dynamicContent?: EmailParams[];
  formId: string;
}

export interface FormEmailModel {
  content: EmailContent | BusinessEmailContent;
  dynamicContent?: EmailParams[];
  formId: string;
}
