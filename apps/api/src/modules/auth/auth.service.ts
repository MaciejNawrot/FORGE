import { auth } from '@acme/auth';
import type { LoginInput, RegisterInput } from '@acme/contracts';
import { Injectable } from '@nestjs/common';

export type RawHeaders = Record<string, string | string[] | undefined>;

export function toFetchHeaders(rawHeaders: RawHeaders): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(rawHeaders)) {
    if (Array.isArray(value)) {
      for (const item of value) headers.append(key, item);
    } else if (value !== undefined) {
      headers.set(key, value);
    }
  }
  return headers;
}

@Injectable()
export class AuthService {
  async register(input: RegisterInput) {
    const { response, headers } = await auth.api.signUpEmail({ body: input, returnHeaders: true });
    const session = await this.getSessionForToken(response.token);
    return { user: response.user, expiresAt: session?.session.expiresAt, headers };
  }

  async login(input: LoginInput) {
    const { response, headers } = await auth.api.signInEmail({ body: input, returnHeaders: true });
    const session = await this.getSessionForToken(response.token);
    return { user: response.user, expiresAt: session?.session.expiresAt, headers };
  }

  async logout(rawHeaders: RawHeaders) {
    return auth.api.signOut({ headers: toFetchHeaders(rawHeaders), returnHeaders: true });
  }

  async getSession(rawHeaders: RawHeaders) {
    return auth.api.getSession({ headers: toFetchHeaders(rawHeaders) });
  }

  private async getSessionForToken(token: string | null) {
    if (!token) return null;
    return auth.api.getSession({ headers: new Headers({ authorization: `Bearer ${token}` }) });
  }
}
