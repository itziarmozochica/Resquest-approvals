import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { BusinessContactEmailComponent } from './business-contact-email/business-contact-email.component';
import { ContactEmailComponent } from './contact-email/contact-email.component';

const routes: Routes = [
  { path: 'email', component: ContactEmailComponent },
  {
    path: 'business-email',
    component: BusinessContactEmailComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SupportRoutingModule {}
