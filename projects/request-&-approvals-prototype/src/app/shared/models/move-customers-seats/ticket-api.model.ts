import { BaseErrorResponse } from '../base-response';

export type SeatingRelocatedApiResponse = { message: string } | { data: unknown | null; error: BaseErrorResponse | null };
