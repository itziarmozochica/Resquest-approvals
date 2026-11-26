import { environment } from '../../../environments/environment';

export function shouldWriteToConsole(): boolean {
  return !environment.production;
}
