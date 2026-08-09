import { auth } from './auth.js';

export { auth };
export type AuthSession = typeof auth.$Infer.Session;
