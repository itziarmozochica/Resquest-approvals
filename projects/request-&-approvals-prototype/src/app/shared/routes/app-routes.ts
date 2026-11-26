import { Injectable } from '@angular/core';

const CHUNK_LOAD_ERROR_RELOAD_STORAGE_KEY = 'feverzoneclient.chunkLoadErrorReloadAt';
const CHUNK_LOAD_ERROR_RELOAD_WINDOW_MS = 10_000;
const DYNAMIC_IMPORT_ERROR_MESSAGES: string[] = ['Failed to fetch dynamically imported module', 'Importing a module script failed'];

interface RouteLoadError {
  readonly message?: string;
  readonly name?: string;
}

export function reloadIfChunkLoadError(err: unknown): Promise<never> {
  console.warn('Route loadChildren() error::::', err);

  const routeLoadError = toRouteLoadError(err);

  if (isChunkLoadError(routeLoadError) && !hasRecentlyReloadedAfterChunkLoadError()) {
    markChunkLoadErrorReload();
    window.location.reload();
    return new Promise<never>(() => {}); // Never resolves - page reloads immediately
  }

  return Promise.reject(err);
}

function toRouteLoadError(err: unknown): RouteLoadError {
  if (typeof err === 'string') {
    return { message: err };
  }

  if (err === null || typeof err !== 'object') {
    return {};
  }

  return {
    message: 'message' in err && typeof err.message === 'string' ? err.message : undefined,
    name: 'name' in err && typeof err.name === 'string' ? err.name : undefined,
  };
}

function isChunkLoadError({ message, name }: RouteLoadError): boolean {
  return name === 'ChunkLoadError' || isDynamicImportError(message);
}

function isDynamicImportError(message: string | undefined): boolean {
  if (message === undefined) {
    return false;
  }

  return DYNAMIC_IMPORT_ERROR_MESSAGES.some((dynamicImportErrorMessage: string) => message.includes(dynamicImportErrorMessage));
}

function hasRecentlyReloadedAfterChunkLoadError(): boolean {
  try {
    const storedReloadAt = window.sessionStorage.getItem(CHUNK_LOAD_ERROR_RELOAD_STORAGE_KEY);

    if (storedReloadAt === null) {
      return false;
    }

    const reloadAt = Number(storedReloadAt);

    return Number.isFinite(reloadAt) && Date.now() - reloadAt < CHUNK_LOAD_ERROR_RELOAD_WINDOW_MS;
  } catch {
    return false;
  }
}

function markChunkLoadErrorReload(): void {
  try {
    window.sessionStorage.setItem(CHUNK_LOAD_ERROR_RELOAD_STORAGE_KEY, String(Date.now()));
  } catch (storageError: unknown) {
    void storageError;
  }
}

@Injectable({
  providedIn: 'root',
})
export class RoutesFactory {
  protected static reloadIfChunkLoadError(err: unknown): Promise<never> {
    return reloadIfChunkLoadError(err);
  }
}
