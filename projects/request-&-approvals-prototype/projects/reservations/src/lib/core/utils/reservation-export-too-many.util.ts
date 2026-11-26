export const RESERVATION_EXPORT_TOO_MANY_CODE = 23020010;

interface HttpFailure {
  readonly error?: unknown;
  readonly status: number;
}

export async function isReservationExportTooMany(error: unknown): Promise<boolean> {
  const failure = httpFailureOf(error);
  if (failure === null) {
    return false;
  }

  const body: unknown = failure.error instanceof Blob ? await parseBlob(failure.error) : failure.error;
  const code = (body as { error?: { code?: unknown } } | null)?.error?.code;

  return code === RESERVATION_EXPORT_TOO_MANY_CODE;
}

function httpFailureOf(error: unknown): HttpFailure | null {
  if (isHttpFailure(error)) {
    return error;
  }
  const wrapped = (error as { error?: unknown } | null)?.error;

  return isHttpFailure(wrapped) ? wrapped : null;
}

function isHttpFailure(candidate: unknown): candidate is HttpFailure {
  return typeof candidate === 'object' && candidate !== null && typeof (candidate as { status?: unknown }).status === 'number';
}

async function parseBlob(blob: Blob): Promise<unknown> {
  try {
    return JSON.parse(await readText(blob));
  } catch {
    return null;
  }
}

async function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : '');
    };
    reader.onerror = () => {
      reject(new Error('reservation export body could not be read'));
    };
    reader.readAsText(blob);
  });
}
