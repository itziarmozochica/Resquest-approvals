import { JsonObject } from '../../models/json-object';
import { ErrorWithContext } from './error-with-context';

/**
 * Error with context but stack.
 * It is useful when we don't want to trace the place of which the instance is created.
 */
export class ErrorLikeWithContext extends ErrorWithContext {
  constructor(m: string, context?: JsonObject) {
    super(m, context);
    this.stack = undefined;
  }
}
