import { contract } from '@acme/contracts';
import { initClient, type OverrideableClientArgs } from '@ts-rest/core';

export interface CreateApiClientOptions {
  baseUrl: string;
  credentials?: OverrideableClientArgs['credentials'];
  headers?: Record<string, string>;
}

export function createApiClient(options: CreateApiClientOptions) {
  return initClient(contract, {
    baseUrl: options.baseUrl,
    credentials: options.credentials ?? 'include',
    baseHeaders: options.headers ?? {},
  });
}

export type ApiClient = ReturnType<typeof createApiClient>;
