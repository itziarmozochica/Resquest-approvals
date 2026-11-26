import { JsonObject } from '../../models/json-object';

export class ErrorWithContext extends Error {
  context?: JsonObject;

  constructor(m: string, context?: JsonObject) {
    let parsedContext: string;
    try {
      parsedContext = JSON.stringify(context);
    } catch (err) {
      parsedContext = 'Cannot stringify context object';
    }

    super(parsedContext ? m + ` - CONTEXT: ${parsedContext}` : m);
    this.context = context;
  }
}
