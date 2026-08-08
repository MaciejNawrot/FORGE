import { describe, expect, it } from 'vitest';
import { contract } from './index.js';

describe('contract', () => {
  it('exposes the users resource with the expected routes', () => {
    expect(contract.users.list.method).toBe('GET');
    expect(contract.users.list.path).toBe('/users');
    expect(contract.users.get.path).toBe('/users/:id');
    expect(contract.users.create.method).toBe('POST');
    expect(contract.users.update.method).toBe('PATCH');
    expect(contract.users.remove.method).toBe('DELETE');
  });

  it('exposes the auth routes', () => {
    expect(contract.auth.login.path).toBe('/auth/login');
    expect(contract.auth.register.path).toBe('/auth/register');
    expect(contract.auth.session.method).toBe('GET');
  });
});
