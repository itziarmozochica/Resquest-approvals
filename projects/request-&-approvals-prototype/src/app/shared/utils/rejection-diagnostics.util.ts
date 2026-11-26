import { RejectionContext, RejectionDiagnostics } from '../models/rejection-diagnostics.model';
import { isErrorLike } from './is-error.utils';

export function buildRejectionDiagnostics(reason: unknown, visibilityState: DocumentVisibilityState): RejectionDiagnostics {
  const context: RejectionContext = {
    code: reason instanceof DOMException ? reason.code : null,
    constructorName: getConstructorName(reason),
    hasStack: isErrorLike(reason) && typeof reason.stack === 'string' && reason.stack.length > 0,
    message: getMessage(reason),
    name: getName(reason),
    visibilityState,
  };

  return {
    context,
    tags: {
      'rejection.has_stack': context.hasStack,
      'rejection.name': context.name,
    },
  };
}

function getConstructorName(reason: unknown): string {
  if (reason === null || reason === undefined) {
    return String(reason);
  }

  const prototype: { constructor?: { name?: string } } | null = Object.getPrototypeOf(Object(reason));

  return prototype?.constructor?.name ?? 'unknown';
}

function getMessage(reason: unknown): string | null {
  if (isErrorLike(reason)) {
    return reason.message;
  }

  return typeof reason === 'string' ? reason : null;
}

function getName(reason: unknown): string {
  const name: unknown = isErrorLike(reason) ? reason.name : undefined;

  return typeof name === 'string' && name.length > 0 ? name : getConstructorName(reason);
}
