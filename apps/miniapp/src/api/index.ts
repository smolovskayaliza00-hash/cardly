import { createHttpClient } from './httpClient';
import { createMockClient } from './mockClient';
import type { ApiClient } from './types';

const mode = import.meta.env.VITE_API_MODE === 'http' ? 'http' : 'mock';

export const api: ApiClient =
  mode === 'http' ? createHttpClient(import.meta.env.VITE_API_BASE_URL ?? '') : createMockClient();

export { ApiError } from './types';
export type { ApiClient } from './types';
