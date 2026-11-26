import { inject } from '@angular/core';
import { ResolveFn, Router } from '@angular/router';

import { AmbassadorProgram } from '@fz-original/app/ambassadors/models/ambassador-program.model';
import { AmbassadorProgramService } from '@fz-original/app/ambassadors/services/ambassador-program.service';
import { SpinnerService } from '@fz-original/app/shared/layout/spinner/spinner.service';
import { of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export const ambassadorProgramRegisterResolver: ResolveFn<AmbassadorProgram | false> = route => {
  const programId = route.paramMap.get('id');
  const router = inject(Router);
  const ambassadorProgramService = inject(AmbassadorProgramService);
  inject(SpinnerService).show();

  if (!programId) {
    router.navigate(['/ambassador-programs/not-found']);
    return of(false);
  }

  return ambassadorProgramService.getPublicProgram(programId).pipe(
    catchError(error => {
      router.navigate(['/ambassador-programs/not-found']);
      return throwError(() => error);
    }),
  );
};
