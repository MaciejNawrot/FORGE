export function buildCookieHeader(cookies: ReadonlyArray<{ name: string; value: string }>): string {
  return cookies.map(({ name, value }) => `${name}=${value}`).join('; ');
}
