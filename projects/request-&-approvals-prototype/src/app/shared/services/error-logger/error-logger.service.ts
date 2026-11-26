import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export abstract class ErrorLoggerService {
  abstract print(error: unknown): void;

  abstract trace(error: Error): void;
}
